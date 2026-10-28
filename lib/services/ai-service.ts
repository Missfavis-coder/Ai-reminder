
import { apiClient } from "@/lib/api";
import type {
  ParseReminderInput,
  ParseReminderResponse,
} from "@/lib/types/ai";

export const aiService = {
  parseReminder(input: ParseReminderInput) {
    return apiClient.post<ParseReminderResponse>(
      "/api/ai/parse-reminder",
      input,
    );
  },
};
