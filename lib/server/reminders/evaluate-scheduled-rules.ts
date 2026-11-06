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
  createReminderJob,
} from "@/lib/server/reminders/create-job";

import {
  createInAppNotification,
} from "@/lib/server/notifications/create-in-app-notification";

function getSelectedChannelIds(
  channelIds: string[] | undefined,
) {
  return [...new Set(channelIds ?? [])];
}

function getNotificationDescription(
  description: string | null,
  reason: string,
) {
  if (description?.trim()) {
    return `${description.trim()}\n\n${reason}`;
  }

  return reason;
}

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
    const parsed = reminderRuleConfigSchema.safeParse(
      rule.config,
    );

    if (!parsed.success || parsed.data.type !== rule.type) {
      console.error("Invalid reminder rule configuration", {
        ruleId: rule.id,
      });

      continue;
    }

    const config = parsed.data;

    const channelIds = getSelectedChannelIds(
      config.channelIds,
    );

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

      // Always create an Inbox notification when the reminder is due.
      // The source key prevents duplicate Inbox entries across cron runs.
      const inboxNotification = await createInAppNotification({
        userId: rule.userId,
        title: rule.name,
        description: getNotificationDescription(
          rule.description,
          result.reason,
        ),
        sourceKey: result.idempotencyKey,
      });

      if (inboxNotification.created) {
        inAppNotificationsCreated++;
      }

      // External delivery jobs are optional.
      // The Inbox notification does not depend on WhatsApp or another channel.
      if (channelIds.length === 0) {
        console.info(
          "Reminder created in Inbox without external delivery channels.",
          { ruleId: rule.id },
        );
      } else {
        const message = rule.description
          ? `${rule.name}\n\n${rule.description}`
          : rule.name;

        for (const channelId of channelIds) {
          const created = await createReminderJob({
            userId: rule.userId,
            ruleId: rule.id,
            channelId,
            scheduledAt: now,

            idempotencyKey:
              `${result.idempotencyKey}:${channelId}`,

            payload: {
              title: rule.name,
              description: rule.description ?? "",
              message,
              reason: result.reason,
              reminderType: config.type,
            },
          });

          if (created.created) {
            jobsCreated++;
          }
        }
      }

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
          idleSinceAt:
            session.idleSinceAt ?? undefined,
        },
      );

      if (!result.shouldTrigger || !result.idempotencyKey) {
        continue;
      }

      due++;

      const inboxNotification = await createInAppNotification({
        userId: rule.userId,
        title: rule.name,
        description: getNotificationDescription(
          rule.description,
          result.reason,
        ),
        sourceKey: result.idempotencyKey,
      });

      if (inboxNotification.created) {
        inAppNotificationsCreated++;
      }

      if (channelIds.length === 0) {
        console.info(
          "Activity reminder created in Inbox without external delivery channels.",
          { ruleId: rule.id, sessionId: session.id },
        );

        continue;
      }

      const message = await generateReminderMessage({
        ruleName: rule.name,
        reason: result.reason,
        personalize: true,
      });

      for (const channelId of channelIds) {
        const created = await createReminderJob({
          userId: rule.userId,
          ruleId: rule.id,
          channelId,
          scheduledAt: now,

          idempotencyKey:
            `${result.idempotencyKey}:${channelId}`,

          payload: {
            title: rule.name,
            description: rule.description ?? "",
            message,
            reason: result.reason,
            workspaceId: session.workspaceId,
            sessionId: session.id,
          },
        });

        if (created.created) {
          jobsCreated++;
        }
      }
    }
  }

  return {
    evaluated,
    due,
    jobsCreated,
    inAppNotificationsCreated,
  };
}