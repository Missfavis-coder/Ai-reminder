import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { tasks } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(250),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().datetime().optional(),
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

    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json({ tasks: userTasks });
  } catch (error) {
    console.error("Failed to load tasks:", error);

    return NextResponse.json(
      { error: "Could not load tasks." },
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

    const input = createTaskSchema.parse(await request.json());

    const [task] = await db
      .insert(tasks)
      .values({
        userId,
        title: input.title,
        description: input.description,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      })
      .returning();

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid task details.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to create task:", error);

    return NextResponse.json(
      { error: "Could not create task." },
      { status: 500 },
    );
  }
}