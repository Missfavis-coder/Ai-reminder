
import type { ReminderRuleConfig } from "@/lib/server/rules/definition";

type EvaluationContext = {
  now: Date;
  sessionId?: string;
  activeSeconds?: number;
  idleSinceAt?: Date;
  lastTriggeredBucket?: number;
};

type EvaluationResult = {
  shouldTrigger: boolean;
  reason: string;
  idempotencyKey?: string;
};

export function evaluateReminderRule(
  ruleId: string,
  config: ReminderRuleConfig,
  context: EvaluationContext,
): EvaluationResult {
  const { now } = context;

  switch (config.type) {
    case "active_work": {
      const activeSeconds = context.activeSeconds ?? 0;
      const threshold = config.thresholdSeconds;

      const bucket = Math.floor(activeSeconds / threshold);

      if (bucket < 1) {
        return {
          shouldTrigger: false,
          reason: "Active-work threshold has not been reached.",
        };
      }

      if (!config.repeat && context.lastTriggeredBucket !== undefined) {
        return {
          shouldTrigger: false,
          reason: "Non-repeating rule has already triggered.",
        };
      }

      if (
        config.repeat &&
        bucket <= (context.lastTriggeredBucket ?? 0)
      ) {
        return {
          shouldTrigger: false,
          reason: "This active-work interval has already triggered.",
        };
      }

      return {
        shouldTrigger: true,
        reason: "Active-work threshold reached.",
        idempotencyKey: [
          ruleId,
          context.sessionId ?? "no-session",
          "active",
          config.repeat ? bucket : 1,
        ].join(":"),
      };
    }

    case "inactivity": {
      const idleSince = context.idleSinceAt;

      if (!idleSince) {
        return {
          shouldTrigger: false,
          reason: "No inactivity start time is available.",
        };
      }

      const idleSeconds = Math.max(
        0,
        Math.floor((now.getTime() - idleSince.getTime()) / 1000),
      );

      if (idleSeconds < config.thresholdSeconds) {
        return {
          shouldTrigger: false,
          reason: "Inactivity threshold has not been reached.",
        };
      }

      return {
        shouldTrigger: true,
        reason: "Inactivity threshold reached.",
        idempotencyKey: [
          ruleId,
          context.sessionId ?? "no-session",
          "idle",
          idleSince.getTime(),
        ].join(":"),
      };
    }

    case "deadline": {
      const deadline = new Date(config.deadlineAt);
      const triggerAt = new Date(
        deadline.getTime() - config.leadTimeSeconds * 1000,
      );

      if (now < triggerAt) {
        return {
          shouldTrigger: false,
          reason: "Deadline reminder is not due yet.",
        };
      }

      if (now >= deadline) {
        return {
          shouldTrigger: false,
          reason: "Deadline has already passed.",
        };
      }

      return {
        shouldTrigger: true,
        reason: "Deadline reminder is due.",
        idempotencyKey: `${ruleId}:deadline:${deadline.getTime()}`,
      };
    }

    case "fixed_time": {
      const scheduledAt = new Date(config.scheduledAt);

      if (now < scheduledAt) {
        return {
          shouldTrigger: false,
          reason: "Scheduled reminder is not due yet.",
        };
      }

      return {
        shouldTrigger: true,
        reason: "Scheduled reminder is due.",
        idempotencyKey: `${ruleId}:fixed:${scheduledAt.getTime()}`,
      };
    }
  }
}
