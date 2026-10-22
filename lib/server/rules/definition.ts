
import { z } from "zod";

const durationSchema = z.number().int().min(60).max(86_400);

const activeWorkConfig = z.object({
  thresholdSeconds: durationSchema,
  workspaceId: z.string().uuid().optional(),
  repeat: z.boolean().default(false),
});

const inactivityConfig = z.object({
  thresholdSeconds: durationSchema,
  workspaceId: z.string().uuid().optional(),
  repeat: z.boolean().default(false),
});

const deadlineConfig = z.object({
  deadlineAt: z.string().datetime(),
  leadTimeSeconds: durationSchema,
});

const fixedTimeConfig = z.object({
  scheduledAt: z.string().datetime(),
});

export const reminderRuleConfigSchema = z.discriminatedUnion("type", [
  activeWorkConfig.extend({ type: z.literal("active_work") }),
  inactivityConfig.extend({ type: z.literal("inactivity") }),
  deadlineConfig.extend({ type: z.literal("deadline") }),
  fixedTimeConfig.extend({ type: z.literal("fixed_time") }),
]);

export type ReminderRuleConfig = z.infer<
  typeof reminderRuleConfigSchema
>;

export const REMINDER_RULE_DEFINITIONS = {
  active_work: {
    label: "Active work duration",
    description: "Remind after a configured amount of active work.",
  },
  inactivity: {
    label: "Workspace inactivity",
    description: "Remind after a configured period of inactivity.",
  },
  deadline: {
    label: "Deadline proximity",
    description: "Remind before a deadline.",
  },
  fixed_time: {
    label: "Fixed-time reminder",
    description: "Remind at a specific date and time.",
  },
} as const;
