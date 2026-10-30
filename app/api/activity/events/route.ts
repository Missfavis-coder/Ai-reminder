import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { WorkspaceNotFoundError } from "@/lib/server/error";
import {
  activityEventSchema,
  validateEventTimestamp,
} from "@/lib/server/activity/type";
import { processActivityEvent } from
  "@/lib/server/activity/event-processor";
import { getCurrentUserId } from
  "@/lib/server/auth/session";
import { getUserIdFromExtensionToken } from
  "@/lib/server/auth/extension-token";

async function authenticateRequest(
  request: NextRequest,
): Promise<string | null> {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const match = authorization.match(/^Bearer ([^\s]+)$/i);

    if (!match) {
      return null;
    }

    return getUserIdFromExtensionToken(match[1]);
  }

  return getCurrentUserId();
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const event = activityEventSchema.parse(body);

    const timestampCheck = validateEventTimestamp(
      event.occurredAt,
    );

    if (!timestampCheck.valid) {
      return NextResponse.json(
        {
          error: "Activity event timestamp is outside the allowed window.",
          reason: timestampCheck.reason,
        },
        { status: 400 },
      );
    }

    const result = await processActivityEvent({
      userId,
      event,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid activity event.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Activity event processing failed.", {
      name: error instanceof Error
        ? error.name
        : "UnknownError",
    });

    return NextResponse.json(
      { error: "Could not process activity event." },
      { status: 500 },
    );
  }
}