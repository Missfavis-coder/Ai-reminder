
import type { ReminderRuleConfig } from "@/lib/server/rules/definition";
import { evaluateReminderRule } from "@/lib/server/rules/evaluator";

export const reminderRuleRegistry = {
  active_work: evaluateReminderRule,
  inactivity: evaluateReminderRule,
  deadline: evaluateReminderRule,
  fixed_time: evaluateReminderRule,
} satisfies Record<
  ReminderRuleConfig["type"],
  typeof evaluateReminderRule
>;

export function getReminderRuleEvaluator(
  type: ReminderRuleConfig["type"],
) {
  return reminderRuleRegistry[type];
}
