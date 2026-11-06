
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { tasks } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";
import { syncTaskReminder } from "@/lib/server/reminders/task-reminder-service";

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(250),
  status: z.enum(["To Do", "In Progress", "Completed"]).default("To Do"),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  category: z.string().trim().min(1).max(100).default("General"),
  reminderEnabled: z.boolean().default(false),
  reminderAt: z.string().datetime().optional(),
  reminderChannelIds: z.array(z.string().uuid()).default([]),
}).superRefine((input, ctx) => {
  if (input.reminderEnabled && !input.reminderAt) {
    ctx.addIssue({
      code: "custom",
      path: ["reminderAt"],
      message: "Choose when the reminder should be sent.",
    });
  }

  if (
    input.reminderEnabled &&
    input.reminderChannelIds.length === 0
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["reminderChannelIds"],
      message: "Choose at least one notification channel.",
    });
  }
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

    const dueAt = input.dueAt
      ? new Date(input.dueAt)
      : null;

    const reminderAt = input.reminderAt
      ? new Date(input.reminderAt)
      : null;

    if (
      input.reminderEnabled &&
      reminderAt &&
      dueAt &&
      reminderAt > dueAt
    ) {
      return NextResponse.json(
        { error: "Reminder time cannot be after the task deadline." },
        { status: 400 },
      );
    }

    if (
      input.reminderEnabled &&
      reminderAt &&
      reminderAt <= new Date()
    ) {
      return NextResponse.json(
        { error: "Reminder time must be in the future." },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(tasks)
        .values({
          userId,
          title: input.title,
          description: input.description || null,
          status: input.status,
          completed: input.status === "Completed",
          dueAt,
          priority: input.priority,
          category: input.category,
          reminderEnabled: input.reminderEnabled,
          reminderAt,
          reminderChannelIds: input.reminderChannelIds,
        })
        .returning();

      if (!task) {
        throw new Error("Task creation failed.");
      }

      await syncTaskReminder(
        {
          userId,
          taskId: task.id,
          title: task.title,
          description: task.description,
          reminderEnabled:
            input.reminderEnabled && input.status !== "Completed",
          reminderAt,
          reminderChannelIds: input.reminderChannelIds,
        },
        tx,
      );

      return { task };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid task details.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to create task:", error);

    return NextResponse.json(
      { error: "Could not create task or schedule its reminder." },
      { status: 500 },
    );
  }
}
