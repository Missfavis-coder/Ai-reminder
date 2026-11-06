import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
} from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationChannels,
  reminderRules,
} from "@/lib/server/db/schema";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { reminderRuleConfigSchema } from "@/lib/server/rules/definition";

const createRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),

  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .default(""),

  config: reminderRuleConfigSchema,

  channelIds: z
    .array(z.string().uuid())
    .min(1)
    .max(5)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "A notification channel cannot be selected more than once.",
    ),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const rules = await db
      .select()
      .from(reminderRules)
      .where(eq(reminderRules.userId, userId))
      .orderBy(desc(reminderRules.createdAt));

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Failed to list reminder rules:", error);

    return NextResponse.json(
      { error: "Could not load reminder rules." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const input = createRuleSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      const selectedChannels = await tx
        .select({
          id: notificationChannels.id,
        })
        .from(notificationChannels)
        .where(
          and(
            eq(notificationChannels.userId, userId),
            eq(notificationChannels.enabled, true),
            isNotNull(notificationChannels.verifiedAt),
            isNotNull(notificationChannels.consentGrantedAt),
            inArray(
              notificationChannels.id,
              input.channelIds,
            ),
          ),
        );

      if (selectedChannels.length !== input.channelIds.length) {
        return {
          success: false as const,
        };
      }

      const [rule] = await tx
        .insert(reminderRules)
        .values({
          id: randomUUID(),
          userId,
          name: input.name,
          description: input.description || null,
          type: input.config.type,
          config: {
            ...input.config,
            channelIds: input.channelIds,
          },
          status: "active",
        })
        .returning();

      if (!rule) {
        throw new Error("Could not create reminder rule.");
      }

      return {
        success: true as const,
        rule,
      };
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "One or more selected channels are unavailable, unverified, or not connected to your account.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { rule: result.rule },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid reminder rule.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Failed to create reminder rule:", error);

    return NextResponse.json(
      { error: "Could not create reminder rule." },
      { status: 500 },
    );
  }
}