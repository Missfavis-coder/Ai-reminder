
import { z } from "zod";

import {
  reminderRuleConfigSchema,
  type ReminderRuleConfig,
} from "@/lib/server/rules/definition";

export function validateReminderRule(input: unknown): ReminderRuleConfig {
  return reminderRuleConfigSchema.parse(input);
}

export function safeValidateReminderRule(input: unknown) {
  return reminderRuleConfigSchema.safeParse(input);
}

export function validateRuleTypeMatchesConfig(
  type: ReminderRuleConfig["type"],
  config: ReminderRuleConfig,
) {
  if (type !== config.type) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["type"],
        message: "Rule type must match the configuration type",
      },
    ]);
  }

  return config;
}
