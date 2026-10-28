
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import {
  tasks,
  reminderRules,
  notificationJobs,
  notificationChannels,
} from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

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

    if (
      input.reminderEnabled &&
      input.reminderAt &&
      input.dueAt &&
      new Date(input.reminderAt) > new Date(input.dueAt)
    ) {
      return NextResponse.json(
        { error: "Reminder time cannot be after the task deadline." },
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
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          priority: input.priority,
          category: input.category,
          reminderEnabled: input.reminderEnabled,
          reminderAt: input.reminderAt
            ? new Date(input.reminderAt)
            : null,
          reminderChannelIds: input.reminderChannelIds,
        })
        .returning();

      if (!task) {
        throw new Error("Task creation failed.");
      }

      if (!input.reminderEnabled || !input.reminderAt) {
        return { task };
      }

      const channels = await tx
        .select()
        .from(notificationChannels)
        .where(eq(notificationChannels.userId, userId));

      const selectedChannels = input.reminderChannelIds.map((id) => {
        const channel = channels.find((item) => item.id === id);

        if (
          !channel ||
          !channel.enabled ||
          !channel.verifiedAt ||
          !channel.consentGrantedAt
        ) {
          throw new Error(
            "Every selected channel must belong to you, be enabled, verified, and consented.",
          );
        }

        return channel;
      });

      const [rule] = await tx
        .insert(reminderRules)
        .values({
          userId,
          name: `Task reminder: ${task.title}`,
          type: "fixed_time",
          config: {
            type: "fixed_time",
            scheduledAt: input.reminderAt,
          },
          status: "active",
          taskId: task.id,
        })
        .returning();

      if (!rule) {
        throw new Error("Could not create task reminder rule.");
      }

      for (const channel of selectedChannels) {
        await tx.insert(notificationJobs).values({
          userId,
          ruleId: rule.id,
          channelId: channel.id,
          
          scheduledAt: new Date(input.reminderAt),
          idempotencyKey: `task:${task.id}:reminder:${new Date(input.reminderAt).getTime()}:channel:${channel.id}`,
          payload: {
            kind: "task_reminder",
            taskId: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
          },
        });
      }

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
