import "server-only";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationChannels,
  reminderRules,
} from "@/lib/server/db/schema";
import { generateReminderMessage } from "@/lib/server/ai/reminder-generator";
import { reminderRuleConfigSchema } from "@/lib/server/rules/definition";
import { evaluateReminderRule } from "@/lib/server/rules/evaluator";
import { createReminderJob } from "@/lib/server/reminders/create-job";

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

    const selectedChannelIds = config.channelIds ?? [];

    if (selectedChannelIds.length === 0) {
      console.error("Reminder rule has no selected notification channels", {
        ruleId: rule.id,
      });
      continue;
    }

    // Only WhatsApp is currently supported by the notification dispatcher.
    // Do not create jobs for channels that the dispatcher cannot deliver to.
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
      console.error(
        "No selected, verified WhatsApp notification channel is available for this reminder rule.",
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
  };
}
