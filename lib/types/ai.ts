import type { CreateReminderRuleInput } from "./reminder";

export interface ParseReminderInput {
  request: string;
  timezone: string;
}

export type ParseReminderResponse =
  | {
      needsClarification: true;
      question: string;
    }
  | {
      needsClarification: false;
      suggestion: CreateReminderRuleInput;
    };