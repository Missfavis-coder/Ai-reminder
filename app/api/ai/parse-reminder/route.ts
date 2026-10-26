
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { getGeminiClient, getGeminiModel } from "@/lib/server/ai/client";
import { buildParseReminderPrompt } from "@/lib/server/ai/prompts/parse-reminder";
import { reminderRuleConfigSchema } from "@/lib/server/rules/definition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  request: z.string().trim().min(3).max(500),
  timezone: z.string().trim().min(1).max(100),
});

const modelResponseSchema = z.object({
  needsClarification: z.boolean(),
  question: z.string().nullable(),
  name: z.string().nullable(),
  config: z.unknown().nullable(),
});

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }

  const parsedRequest = requestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Provide a reminder request and an IANA timezone.",
        issues: parsedRequest.error.issues,
      },
      { status: 400 },
    );
  }

  const { request: reminderRequest, timezone } = parsedRequest.data;

  if (!isValidTimezone(timezone)) {
    return NextResponse.json(
      { error: "Invalid timezone. Use an IANA timezone such as Africa/Lagos." },
      { status: 400 },
    );
  }

  try {
    const ai = getGeminiClient();
    const model = getGeminiModel();

    const response = await ai.models.generateContent({
      model,
      contents: buildParseReminderPrompt({
        request: reminderRequest,
        timezone,
        now: new Date().toISOString(),
      }),
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 300,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 502 },
      );
    }

    let decoded: unknown;

    try {
      decoded = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

    const modelResult = modelResponseSchema.safeParse(decoded);

    if (!modelResult.success) {
      return NextResponse.json(
        { error: "AI returned an unsupported response." },
        { status: 502 },
      );
    }

    const suggestion = modelResult.data;

    if (suggestion.needsClarification) {
      return NextResponse.json({
        needsClarification: true,
        question: suggestion.question ?? "What date or time do you mean?",
      });
    }

    if (
      !suggestion.name ||
      !suggestion.config ||
      typeof suggestion.config !== "object"
    ) {
      return NextResponse.json(
        { error: "AI did not return a complete reminder rule." },
        { status: 502 },
      );
    }

    const config = reminderRuleConfigSchema.safeParse(
      suggestion.config,
    );

    if (!config.success) {
      return NextResponse.json(
        {
          error: "AI produced an invalid reminder configuration.",
          issues: config.error.issues,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      needsClarification: false,
      suggestion: {
        name: suggestion.name.trim().slice(0, 120),
        config: config.data,
      },
    });
  } catch (error) {
    console.error("AI reminder parsing failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      { error: "Could not interpret the reminder. Please try again." },
      { status: 502 },
    );
  }
}
