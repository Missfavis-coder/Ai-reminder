import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { tasks } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(250).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
  status: z.enum(["To Do", "In Progress", "Completed"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
  reminderChannelIds: z.array(z.string().uuid()).optional(),
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
    const { dueAt, reminderAt, reminderChannelIds, ...rest } = input;

    const updateData = {
      ...rest,
    
      ...(rest.status !== undefined && {
        completed: rest.status === "Completed",
      }),
    
      ...(dueAt !== undefined && {
        dueAt: dueAt === null ? null : new Date(dueAt),
      }),
    
      ...(reminderAt !== undefined && {
        reminderAt: reminderAt === null ? null : new Date(reminderAt),
      }),
    
      updatedAt: new Date(),
    };
    
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

if (!updatedTask) {
  return NextResponse.json(
    { error: "Task not found." },
    { status: 404 },
  );
}

return NextResponse.json({ task: updatedTask });
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
















