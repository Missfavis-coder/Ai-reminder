export type ReminderRuleType =
  | "active_work"
  | "inactivity"
  | "deadline"
  | "fixed_time";

export type ReminderRuleConfig =
  | {
      type: "active_work";
      thresholdSeconds: number;
      workspaceId?: string;
      repeat?: boolean;
    }
  | {
      type: "inactivity";
      thresholdSeconds: number;
      workspaceId?: string;
      repeat?: boolean;
    }
  | {
      type: "deadline";
      deadlineAt: string;
      leadTimeSeconds: number;
    }
  | {
      type: "fixed_time";
      scheduledAt: string;
    };

export type ReminderRuleStatus =
  | "active"
  | "paused"
  | "completed";

export interface ReminderRule {
  id: string;
  userId: string;
  name: string;
  type: ReminderRuleType;
  config: ReminderRuleConfig;
  status: ReminderRuleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderRulesResponse {
  rules: ReminderRule[];
}

export interface ReminderRuleResponse {
  rule: ReminderRule;
}

export interface CreateReminderRuleInput {
  name: string;
  config: ReminderRuleConfig;
}