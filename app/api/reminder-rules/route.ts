
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { reminderRules } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";
import { reminderRuleConfigSchema } from
  "@/lib/server/rules/definition";

//export const //dynamic = "force-dynamic";

const createRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  config: reminderRuleConfigSchema,
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
  } catch {
    console.error("Failed to list reminder rules.");

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

    const [rule] = await db
      .insert(reminderRules)
      .values({
        id: randomUUID(),
        userId,
        name: input.name,
        type: input.config.type,
        config: input.config,
        status: "active",
      })
      .returning();

    if (!rule) {
      return NextResponse.json(
        { error: "Could not create reminder rule." },
        { status: 500 },
      );
    }

    return NextResponse.json({ rule }, { status: 201 });
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

    console.error("Failed to create reminder rule.");

    return NextResponse.json(
      { error: "Could not create reminder rule." },
      { status: 500 },
    );
  }
}
