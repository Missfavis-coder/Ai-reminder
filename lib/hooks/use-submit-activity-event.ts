
"use client";

import { useMutation } from "@tanstack/react-query";

import { activityService } from "@/lib/services/activity-service";
import  { ActivityEventInput } from "@/lib/types/activity";

export function useSubmitActivityEvent() {
  return useMutation({
    mutationFn: (input: ActivityEventInput) =>
      activityService.submitEvent(input),
  });
}
