
import "server-only";

import {
  and,
  eq,
  inArray,
  isNotNull,
} from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationChannels,
  notificationJobs,
  reminderRules,
} from "@/lib/server/db/schema";

type DbExecutor = Pick<
  typeof db,
  "select" | "insert" | "update"
>;

type TaskReminderInput = {
  userId: string;
  taskId: string;
  title: string;
  description: string | null;
  reminderEnabled: boolean;
  reminderAt: Date | null;
  reminderChannelIds: string[];
};

async function validateTaskReminderChannels(
  executor: DbExecutor,
  userId: string,
  channelIds: string[],
) {
  const uniqueIds = [...new Set(channelIds)];

  if (uniqueIds.length === 0) {
    throw new Error("Choose at least one notification channel.");
  }

  const channels = await executor
    .select({
      id: notificationChannels.id,
    })
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.userId, userId),
        inArray(notificationChannels.id, uniqueIds),
        eq(notificationChannels.enabled, true),
        isNotNull(notificationChannels.verifiedAt),
        isNotNull(notificationChannels.consentGrantedAt),
      ),
    );

  if (channels.length !== uniqueIds.length) {
    throw new Error(
      "Every selected channel must belong to you, be enabled, verified, and consented.",
    );
  }

  return uniqueIds;
}

async function cancelPendingTaskJobs(
  executor: DbExecutor,
  userId: string,
  ruleId: string,
) {
  await executor
    .update(notificationJobs)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notificationJobs.userId, userId),
        eq(notificationJobs.ruleId, ruleId),
        eq(notificationJobs.status, "pending"),
      ),
    );
}

export async function syncTaskReminder(
  input: TaskReminderInput,
  executor: DbExecutor = db,
) {
  const now = new Date();

  const [existingRule] = await executor
    .select()
    .from(reminderRules)
    .where(
      and(
        eq(reminderRules.userId, input.userId),
        eq(reminderRules.taskId, input.taskId),
      ),
    )
    .limit(1);

  if (
    !input.reminderEnabled ||
    !input.reminderAt ||
    input.reminderChannelIds.length === 0
  ) {
    if (existingRule) {
      await cancelPendingTaskJobs(
        executor,
        input.userId,
        existingRule.id,
      );

      await executor
        .update(reminderRules)
        .set({
          status: "paused",
          updatedAt: now,
        })
        .where(
          and(
            eq(reminderRules.id, existingRule.id),
            eq(reminderRules.userId, input.userId),
          ),
        );
    }

    return {
      reminderEnabled: false,
      ruleId: existingRule?.id ?? null,
    };
  }

  if (input.reminderAt <= now) {
    throw new Error("Reminder time must be in the future.");
  }

  const channelIds = await validateTaskReminderChannels(
    executor,
    input.userId,
    input.reminderChannelIds,
  );

  const config = {
    type: "fixed_time" as const,
    scheduledAt: input.reminderAt.toISOString(),
    channelIds,
  };

  if (existingRule) {
    await cancelPendingTaskJobs(
      executor,
      input.userId,
      existingRule.id,
    );

    await executor
      .update(reminderRules)
      .set({
        name: `Task reminder: ${input.title}`,
        description: input.description,
        type: "fixed_time",
        config,
        status: "active",
        updatedAt: now,
      })
      .where(
        and(
          eq(reminderRules.id, existingRule.id),
          eq(reminderRules.userId, input.userId),
        ),
      );

    return {
      reminderEnabled: true,
      ruleId: existingRule.id,
    };
  }

  const [createdRule] = await executor
    .insert(reminderRules)
    .values({
      userId: input.userId,
      taskId: input.taskId,
      name: `Task reminder: ${input.title}`,
      description: input.description,
      type: "fixed_time",
      config,
      status: "active",
    })
    .returning({
      id: reminderRules.id,
    });

  if (!createdRule) {
    throw new Error("Could not create the task reminder rule.");
  }

  return {
    reminderEnabled: true,
    ruleId: createdRule.id,
  };
}

export async function cancelTaskReminder(
  userId: string,
  taskId: string,
  executor: DbExecutor = db,
) {
  const [rule] = await executor
    .select({
      id: reminderRules.id,
    })
    .from(reminderRules)
    .where(
      and(
        eq(reminderRules.userId, userId),
        eq(reminderRules.taskId, taskId),
      ),
    )
    .limit(1);

  if (!rule) {
    return;
  }

  await cancelPendingTaskJobs(executor, userId, rule.id);

  await executor
    .update(reminderRules)
    .set({
      status: "paused",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reminderRules.id, rule.id),
        eq(reminderRules.userId, userId),
      ),
    );
}
