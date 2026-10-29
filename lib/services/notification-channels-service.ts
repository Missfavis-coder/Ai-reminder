
import { apiClient } from "@/lib/api";

import type {
  NotificationChannel,
  NotificationChannelsResponse,
} from "@/lib/types/notification-channel";

import type {
  SaveNotificationChannelInput,
  UpdateNotificationChannelInput,
} from "@/lib/hooks/use-notification-channels";

export const notificationChannelsService = {
  async getAll(signal?: AbortSignal): Promise<NotificationChannel[]> {
    const response =
      await apiClient.get<NotificationChannelsResponse>(
        "/api/notification-channels",
        { signal },
      );

    return response.channels;
  },

  async save(
    input: SaveNotificationChannelInput,
  ): Promise<NotificationChannel> {
    const response = await apiClient.post<{
      channel: NotificationChannel;
    }>("/api/notification-channels", input);

    return response.channel;
  },

  async update(
    id: string,
    input: Pick<UpdateNotificationChannelInput, "enabled">,
  ): Promise<NotificationChannel> {
    const response = await apiClient.patch<{
      channel: NotificationChannel;
    }>("/api/notification-channels", {
      id,
      ...input,
    });

    return response.channel;
  },
};
