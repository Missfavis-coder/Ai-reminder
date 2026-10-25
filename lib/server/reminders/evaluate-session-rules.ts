
import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";

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

    const [channel] = await db
      .select({ id: notificationChannels.id })
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, userId),
          eq(notificationChannels.type, "whatsapp"),
          eq(notificationChannels.enabled, true),
          isNotNull(notificationChannels.consentGrantedAt),
          isNotNull(notificationChannels.verifiedAt),
        ),
      )
      .limit(1);

    const message = await generateReminderMessage({
      ruleName: rule.name,
      reason: result.reason,
      personalize: true,
    });

    const created = await createReminderJob({
      userId,
      ruleId: rule.id,
      channelId: channel?.id,
      scheduledAt: now,
      idempotencyKey: result.idempotencyKey,
      payload: {
        message,
        reason: result.reason,
        workspaceId: session.workspaceId,
        sessionId: session.sessionId,
        channelPending: !channel,
      },
    });

    if (created.created) {
      jobsCreated++;
    }
  }

  return {
    evaluated,
    due,
    jobsCreated,
  };
}
