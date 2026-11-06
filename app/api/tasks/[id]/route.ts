
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { tasks } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";
import {
  cancelTaskReminder,
  syncTaskReminder,
} from "@/lib/server/reminders/task-reminder-service";

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

    const result = await db.transaction(async (tx) => {
      const [existingTask] = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, id),
            eq(tasks.userId, userId),
          ),
        )
        .limit(1);

      if (!existingTask) {
        return null;
      }

      const completed =
        input.status !== undefined
          ? input.status === "Completed"
          : input.completed ?? existingTask.completed;

      const dueAt =
        input.dueAt !== undefined
          ? input.dueAt === null
            ? null
            : new Date(input.dueAt)
          : existingTask.dueAt;

      const reminderAt =
        input.reminderAt !== undefined
          ? input.reminderAt === null
            ? null
            : new Date(input.reminderAt)
          : existingTask.reminderAt;

      const reminderEnabled =
        input.reminderEnabled ?? existingTask.reminderEnabled;

      const reminderChannelIds =
        input.reminderChannelIds ?? existingTask.reminderChannelIds;

      if (
        reminderEnabled &&
        reminderAt &&
        dueAt &&
        reminderAt > dueAt
      ) {
        throw new Error(
          "Reminder time cannot be after the task deadline.",
        );
      }

      if (
        reminderEnabled &&
        !completed &&
        !reminderAt
      ) {
        throw new Error(
          "Choose when the reminder should be sent.",
        );
      }

      if (
        reminderEnabled &&
        !completed &&
        reminderChannelIds.length === 0
      ) {
        throw new Error(
          "Choose at least one notification channel.",
        );
      }

      if (
        reminderEnabled &&
        !completed &&
        reminderAt &&
        reminderAt <= new Date()
      ) {
        throw new Error(
          "Reminder time must be in the future.",
        );
      }

      const [updatedTask] = await tx
        .update(tasks)
        .set({
          ...(input.title !== undefined && {
            title: input.title,
          }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.status !== undefined && {
            status: input.status,
          }),
          ...(input.priority !== undefined && {
            priority: input.priority,
          }),
          ...(input.category !== undefined && {
            category: input.category,
          }),
          completed,
          dueAt,
          reminderAt,
          reminderEnabled: completed ? false : reminderEnabled,
          reminderChannelIds,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tasks.id, id),
            eq(tasks.userId, userId),
          ),
        )
        .returning();

      if (!updatedTask) {
        throw new Error("Task update failed.");
      }

      await syncTaskReminder(
        {
          userId,
          taskId: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          reminderEnabled:
            updatedTask.reminderEnabled && !updatedTask.completed,
          reminderAt: updatedTask.reminderAt,
          reminderChannelIds: updatedTask.reminderChannelIds,
        },
        tx,
      );

      return updatedTask;
    });

    if (!result) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ task: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid task details.", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      const validationErrors = [
        "Reminder time cannot be after the task deadline.",
        "Choose when the reminder should be sent.",
        "Choose at least one notification channel.",
        "Reminder time must be in the future.",
        "Every selected channel must belong to you, be enabled, verified, and consented.",
      ];

      if (validationErrors.includes(error.message)) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        );
      }
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

    const deletedTask = await db.transaction(async (tx) => {
      const [existingTask] = await tx
        .select({
          id: tasks.id,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.id, id),
            eq(tasks.userId, userId),
          ),
        )
        .limit(1);

      if (!existingTask) {
        return null;
      }

      await cancelTaskReminder(userId, id, tx);

      const [deleted] = await tx
        .delete(tasks)
        .where(
          and(
            eq(tasks.id, id),
            eq(tasks.userId, userId),
          ),
        )
        .returning({
          id: tasks.id,
        });

      return deleted ?? null;
    });

    if (!deletedTask) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Task deleted.",
    });
  } catch (error) {
    console.error("Failed to delete task:", error);

    return NextResponse.json(
      { error: "Could not delete task." },
      { status: 500 },
    );
  }
}
