
import "server-only";

import type { NotificationProvider } from "./type";
import { whatsappNotificationProvider } from
  "../notifications/providers/whatsapp";

const providers = {
  whatsapp: whatsappNotificationProvider,
} satisfies Partial<
  Record<NotificationProvider["provider"], NotificationProvider>
>;

export function getNotificationProvider(
  provider: keyof typeof providers,
): NotificationProvider {
  const implementation = providers[provider];

  if (!implementation) {
    throw new Error(
      `Notification provider "${provider}" is not implemented.`,
    );
  }

  if (!implementation.isConfigured()) {
    throw new Error(
      `Notification provider "${provider}" is not configured.`,
    );
  }

  return implementation;
}
