
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { reminderRulesService } from "@/lib/services/reminder-rules-service";
import { CreateReminderRuleInput } from "../types/reminder";

export const reminderRuleKeys = {
  all: ["reminder-rules"] as const,
  lists: () => [...reminderRuleKeys.all, "list"] as const,
};

export function useReminderRules() {
  return useQuery({
    queryKey: reminderRuleKeys.lists(),
    queryFn: ({ signal }) => reminderRulesService.getAll(signal),
  });
}

export function useCreateReminderRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReminderRuleInput) =>
      reminderRulesService.create(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: reminderRuleKeys.all,
      });
    },
  });
}
