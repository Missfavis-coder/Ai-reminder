
import "server-only";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/lib/server/db";
import {notificationChannels,reminderRules} from "@/lib/server/db/schema";

import { generateReminderMessage } from "@/lib/server/ai/reminder-generator";
import { reminderRuleConfigSchema } from "@/lib/server/rules/definition";
import { evaluateReminderRule } from "@/lib/server/rules/evaluator";
import { createReminderJob } from "@/lib/server/reminders/create-job";
import { createInAppNotification } from "@/lib/server/notifications/create-in-app-notification";

type SessionSnapshot = {
  sessionId: string;
  workspaceId: string;
  status: "active" | "idle" | "paused" | "ended";
  activeSeconds: number;
  idleSinceAt: Date | null;
};

export async function evaluateSessionRules(input: {
  userId: string;
  session: SessionSnapshot;
}) {
  const { userId, session } = input;
  const now = new Date();

  const rules = await db
    .select()
    .from(reminderRules)
    .where(
      and(
        eq(reminderRules.userId, userId),
        eq(reminderRules.status, "active"),
      ),
    );

  let evaluated = 0;
  let due = 0;
  let jobsCreated = 0;
  let inAppNotificationsCreated = 0;

  for (const rule of rules) {
    if (
      rule.type !== "active_work" &&
      rule.type !== "inactivity"
    ) {
      continue;
    }

    const parsed = reminderRuleConfigSchema.safeParse(rule.config);

    if (!parsed.success || parsed.data.type !== rule.type) {
      console.error("Invalid reminder rule configuration", {
        ruleId: rule.id,
      });
      continue;
    }

    const config = parsed.data;

    if (
      config.workspaceId &&
      config.workspaceId !== session.workspaceId
    ) {
      continue;
    }

    if (rule.type === "active_work" && session.status !== "active") {
      continue;
    }

    if (rule.type === "inactivity" && session.status !== "idle") {
      continue;
    }

    evaluated++;

    const result = evaluateReminderRule(rule.id, config, {
      now,
      sessionId: session.sessionId,
      activeSeconds: session.activeSeconds,
      idleSinceAt: session.idleSinceAt ?? undefined,
    });

    if (!result.shouldTrigger || !result.idempotencyKey) {
      continue;
    }

    due++;

    const inboxNotification = await createInAppNotification({
      userId,
      title: rule.name,
      description: rule.description?.trim()
        ? `${rule.description.trim()}\n\n${result.reason}`
        : result.reason,
      sourceKey: result.idempotencyKey,
    });

    if (inboxNotification.created) {
      inAppNotificationsCreated++;
    }

    const selectedChannelIds = [
      ...new Set(config.channelIds ?? []),
    ];

    if (selectedChannelIds.length === 0) {
      continue;
    }

    // Only verified, enabled WhatsApp channels are currently supported
    // by the notification dispatcher.
    const eligibleChannels = await db
      .select({
        id: notificationChannels.id,
        type: notificationChannels.type,
      })
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, userId),
          inArray(notificationChannels.id, selectedChannelIds),
          eq(notificationChannels.enabled, true),
          isNotNull(notificationChannels.consentGrantedAt),
          isNotNull(notificationChannels.verifiedAt),
        ),
      );

    const deliverableChannels = eligibleChannels.filter(
      (channel) => channel.type === "whatsapp",
    );

    if (deliverableChannels.length === 0) {
      console.info(
        "Activity reminder created in Inbox, but no selected verified WhatsApp channel is available.",
        { ruleId: rule.id },
      );
      continue;
    }

    const message = await generateReminderMessage({
      ruleName: rule.name,
      reason: result.reason,
      personalize: true,
    });

    for (const channel of deliverableChannels) {
      const created = await createReminderJob({
        userId,
        ruleId: rule.id,
        channelId: channel.id,
        scheduledAt: now,
        idempotencyKey: `${result.idempotencyKey}:${channel.id}`,
        payload: {
          title: rule.name,
          description: rule.description ?? "",
          message,
          reason: result.reason,
          workspaceId: session.workspaceId,
          sessionId: session.sessionId,
        },
      });

      if (created.created) {
        jobsCreated++;
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
