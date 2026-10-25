
import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  reminderRules,
  workspaceSessions,
} from "@/lib/server/db/schema";
import { generateReminderMessage } from "@/lib/server/ai/reminder-generator";
import { reminderRuleConfigSchema } from "@/lib/server/rules/definition";
import { evaluateReminderRule } from "@/lib/server/rules/evaluator";
import { createReminderJob } from "@/lib/server/reminders/create-job";

export async function evaluateScheduledRules() {
  const now = new Date();

  const rules = await db
    .select()
    .from(reminderRules)
    .where(eq(reminderRules.status, "active"));

  let evaluated = 0;
  let due = 0;
  let jobsCreated = 0;

  for (const rule of rules) {
    const parsed = reminderRuleConfigSchema.safeParse(rule.config);

    if (!parsed.success || parsed.data.type !== rule.type) {
      console.error("Invalid reminder rule configuration", {
        ruleId: rule.id,
      });
      continue;
    }

    const config = parsed.data;

    if (
      config.type === "fixed_time" ||
      config.type === "deadline"
    ) {
      evaluated++;

      const result = evaluateReminderRule(rule.id, config, { now });

      if (!result.shouldTrigger || !result.idempotencyKey) {
        continue;
      }

      due++;

      const message = await generateReminderMessage({
        ruleName: rule.name,
        reason: result.reason,
        personalize: true,
      });

      const created = await createReminderJob({
        userId: rule.userId,
        ruleId: rule.id,
        scheduledAt: now,
        idempotencyKey: result.idempotencyKey,
        payload: {
          message,
          reason: result.reason,
          channelPending: true,
        },
      });

      if (created.created) jobsCreated++;
      continue;
    }

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

      const result = evaluateReminderRule(rule.id, config, {
        now,
        sessionId: session.id,
        activeSeconds: session.activeSeconds,
        idleSinceAt: session.idleSinceAt ?? undefined,
      });

      if (!result.shouldTrigger || !result.idempotencyKey) {
        continue;
      }

      due++;

      const message = await generateReminderMessage({
        ruleName: rule.name,
        reason: result.reason,
        personalize: true,
      });

      const created = await createReminderJob({
        userId: rule.userId,
        ruleId: rule.id,
        scheduledAt: now,
        idempotencyKey: result.idempotencyKey,
        payload: {
          message,
          reason: result.reason,
          workspaceId: session.workspaceId,
          sessionId: session.id,
          channelPending: true,
        },
      });

      if (created.created) jobsCreated++;
    }
  }

  return { evaluated, due, jobsCreated };
}
