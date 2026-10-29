
import { apiClient } from "@/lib/api";

import type {
  NotificationChannel,
  NotificationChannelsResponse,
} from "@/lib/types/notification-channel";

import type {
  SaveNotificationChannelInput,
  UpdateNotificationChannelInput,
} from "@/lib/hooks/use-notification-channels";

interface WhatsAppVerificationResponse {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
}

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
    }>("/api/notification-channels", {
      type: input.type,
      destination: input.destination,
      consent: input.consentGranted,
    });

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

  async requestWhatsAppVerification(input: {
    phoneNumber: string;
    consent: boolean;
  }): Promise<WhatsAppVerificationResponse> {
    return apiClient.post<WhatsAppVerificationResponse>(
      "/api/notification-channels/whatsapp/verification",
      {
        action: "request",
        ...input,
      },
    );
  },

  async verifyWhatsApp(input: {
    phoneNumber: string;
    code: string;
  }): Promise<WhatsAppVerificationResponse> {
    return apiClient.post<WhatsAppVerificationResponse>(
      "/api/notification-channels/whatsapp/verification",
      {
        action: "verify",
        ...input,
      },
    );
  },
};
