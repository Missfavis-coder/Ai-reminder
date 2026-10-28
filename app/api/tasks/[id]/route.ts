import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { tasks } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(250).optional(),
  completed: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const input = updateTaskSchema.parse(await request.json());

    if (input.title === undefined && input.completed === undefined) {
      return NextResponse.json(
        { error: "Provide a title or completion status." },
        { status: 400 },
      );
    }

    const [task] = await db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid task details.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to update task:", error);

    return NextResponse.json(
      { error: "Could not update task." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });

    if (!deletedTask) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Task deleted." });
  } catch (error) {
    console.error("Failed to delete task:", error);

    return NextResponse.json(
      { error: "Could not delete task." },
      { status: 500 },
    );
  }
}
















