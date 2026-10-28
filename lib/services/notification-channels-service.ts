
import { apiClient } from "@/lib/api";
import type {
  NotificationChannel,
  NotificationChannelsResponse,
} from "@/lib/types/notification-channel";

export const notificationChannelsService = {
  async getAll(signal?: AbortSignal): Promise<NotificationChannel[]> {
    const response =
      await apiClient.get<NotificationChannelsResponse>(
        "/api/notification-channels",
        { signal },
      );

    return response.channels;
  },
};
