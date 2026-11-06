
import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";

import {
  reminderRules,
  workspaceSessions,
} from "@/lib/server/db/schema";

import {
  generateReminderMessage,
} from "@/lib/server/ai/reminder-generator";

import {
  reminderRuleConfigSchema,
} from "@/lib/server/rules/definition";

import {
  evaluateReminderRule,
} from "@/lib/server/rules/evaluator";

import {
  scheduleReminderNotifications,
} from "@/lib/server/reminders/notification-scheduler";

export async function evaluateScheduledRules() {
  const now = new Date();

  const rules = await db
    .select()
    .from(reminderRules)
    .where(eq(reminderRules.status, "active"));

  let evaluated = 0;
  let due = 0;
  let jobsCreated = 0;
  let inAppNotificationsCreated = 0;

  for (const rule of rules) {
    const parsed = reminderRuleConfigSchema.safeParse(rule.config);

    if (!parsed.success || parsed.data.type !== rule.type) {
      console.error("Invalid reminder rule configuration", {
        ruleId: rule.id,
      });

      continue;
    }

    const config = parsed.data;
    const channelIds = config.channelIds ?? [];

    // Fixed-time and deadline reminders.
    if (
      config.type === "fixed_time" ||
      config.type === "deadline"
    ) {
      evaluated++;

      const result = evaluateReminderRule(
        rule.id,
        config,
        { now },
      );

      if (!result.shouldTrigger || !result.idempotencyKey) {
        continue;
      }

      due++;

      const message = rule.description?.trim()
        ? `${rule.name}\n\n${rule.description.trim()}`
        : rule.name;

      const scheduled = await scheduleReminderNotifications({
        userId: rule.userId,
        ruleId: rule.id,
        title: rule.name,
        description: rule.description,
        reason: result.reason,
        sourceKey: result.idempotencyKey,
        scheduledAt: now,
        channelIds,
        message,
        payload: {
          reminderType: config.type,
        },
      });

      if (scheduled.inAppNotificationCreated) {
        inAppNotificationsCreated++;
      }

      jobsCreated += scheduled.jobsCreated;

      // A one-time fixed reminder should not be evaluated
      // and recreated on every subsequent cron execution.
      if (config.type === "fixed_time") {
        await db
          .update(reminderRules)
          .set({
            status: "completed",
            updatedAt: now,
          })
          .where(eq(reminderRules.id, rule.id));
      }

      continue;
    }

    // Activity-based reminders.
    if (
      config.type !== "active_work" &&
      config.type !== "inactivity"
    ) {
      continue;
    }

    const requiredStatus =
      config.type === "active_work" ? "active" : "idle";

    const sessions = await db
      .select()
      .from(workspaceSessions)
      .where(
        and(
          eq(workspaceSessions.userId, rule.userId),
          eq(workspaceSessions.status, requiredStatus),
        ),
      );

    for (const session of sessions) {
      if (
        config.workspaceId &&
        config.workspaceId !== session.workspaceId
      ) {
        continue;
      }

      evaluated++;

      const result = evaluateReminderRule(
        rule.id,
        config,
        {
          now,
          sessionId: session.id,
          activeSeconds: session.activeSeconds,
          idleSinceAt: session.idleSinceAt ?? undefined,
        },
      );

      if (!result.shouldTrigger || !result.idempotencyKey) {
        continue;
      }

      due++;

      const message = await generateReminderMessage({
        ruleName: rule.name,
        reason: result.reason,
        personalize: true,
      });

      const scheduled = await scheduleReminderNotifications({
        userId: rule.userId,
        ruleId: rule.id,
        title: rule.name,
        description: rule.description,
        reason: result.reason,
        sourceKey: result.idempotencyKey,
        scheduledAt: now,
        channelIds,
        message,
        payload: {
          workspaceId: session.workspaceId,
          sessionId: session.id,
        },
      });

      if (scheduled.inAppNotificationCreated) {
        inAppNotificationsCreated++;
      }

      jobsCreated += scheduled.jobsCreated;
    }
  }

  return {
    evaluated,
    due,
    jobsCreated,
    inAppNotificationsCreated,
  };
}
