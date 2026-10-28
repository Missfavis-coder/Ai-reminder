
import { apiClient } from "@/lib/api";
import type {
  ActivityEventInput,
  ActivityEventResponse,
} from "@/lib/types/activity";

export const activityService = {
  submitEvent(input: ActivityEventInput) {
    return apiClient.post<ActivityEventResponse>(
      "/api/activity/events",
      input,
    );
  },
};
