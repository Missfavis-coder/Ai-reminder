
import { apiClient } from "@/lib/api";
import type {
  CreateReminderRuleInput,
  ReminderRuleResponse,
  ReminderRulesResponse,
} from "@/lib/types/reminder";

export const reminderRulesService = {
  async getAll(signal?: AbortSignal) {
    const response = await apiClient.get<ReminderRulesResponse>(
      "/api/reminder-rules",
      { signal },
    );

    return response.rules;
  },

  async create(input: CreateReminderRuleInput) {
    const response = await apiClient.post<ReminderRuleResponse>(
      "/api/reminder-rules",
      input,
    );

    return response.rule;
  },
};
