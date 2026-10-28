
"use client";

import { useMutation } from "@tanstack/react-query";

import { aiService } from "@/lib/services/ai-service";
import { ParseReminderInput } from "../types/ai";


export function useParseReminder() {
  return useMutation({
    mutationFn: (input: ParseReminderInput) =>
      aiService.parseReminder(input),
  });
}
