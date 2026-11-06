import { apiClient } from "@/lib/api";

import type {
  InAppNotification,
  InAppNotificationsResponse,
  UpdateNotificationInput,
} from "@/lib/types/in-app-notifications";

export const inAppNotificationService = {
  async getAll(signal?: AbortSignal): Promise<InAppNotification[]> {
    const response =
      await apiClient.get<InAppNotificationsResponse>(
        "/api/notifications",
        { signal },
      );

    return response.notifications;
  },

  async update(
    id: string,
    input: UpdateNotificationInput,
  ): Promise<void> {
    await apiClient.patch(
      `/api/notifications/${id}`,
      input,
    );
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch("/api/notifications", {
      action: "mark_all_read",
    });
  },

  async delete(id: string): Promise<void> {
    await apiClient.del(`/api/notifications/${id}`);
  },
};