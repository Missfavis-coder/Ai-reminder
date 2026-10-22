
import "server-only";

import {
  sendWhatsAppText,
  getWhatsAppConfig,
} from "@/lib/server/integrations/providers/whatsapp/client";

import type {
  NotificationProvider,
  SendNotificationInput,
  SendNotificationResult,
} from "@/lib/server/integrations/type";

export const whatsappNotificationProvider: NotificationProvider = {
  provider: "whatsapp",

  isConfigured() {
    try {
      getWhatsAppConfig();
      return true;
    } catch {
      return false;
    }
  },

  async send(
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const result = await sendWhatsAppText(
      input.destination,
      input.message,
    );

    const messages = result?.messages;

    if (!Array.isArray(messages) || !messages[0]?.id) {
      throw new Error(
        "WhatsApp did not return a message ID.",
      );
    }

    return {
      providerMessageId: messages[0].id,
      accepted: true,
    };
  },
};
