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
      channelIds?: string[];
    }
  | {
      type: "inactivity";
      thresholdSeconds: number;
      workspaceId?: string;
      repeat?: boolean;
      channelIds?: string[];
    }
  | {
      type: "deadline";
      deadlineAt: string;
      leadTimeSeconds: number;
      channelIds?: string[];
    }
  | {
      type: "fixed_time";
      scheduledAt: string;
      channelIds?: string[];
    };

export type ReminderRuleStatus =
  | "active"
  | "paused"
  | "completed";

export interface ReminderRule {
  id: string;
  userId: string;
  taskId?: string | null;
  name: string;
  description?: string | null;
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
  description?: string;
  config: ReminderRuleConfig;
  channelIds: string[];
}