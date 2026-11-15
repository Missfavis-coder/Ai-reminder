import "server-only";

import { db } from "@/lib/server/db";
import { inAppNotifications } from "@/lib/server/db/schema";

type CreateInAppNotificationInput = {
  userId: string;
  title: string;
  description: string;
  sourceKey: string;
  category?: string;
  icon?: string;
  actionLabel?: string;
  actionHref?: string;
};

export async function createInAppNotification(
  input: CreateInAppNotificationInput,
) {
  try {
    const [notification] = await db
      .insert(inAppNotifications)
      .values({
        userId: input.userId,
        title: input.title,
        description: input.description,
        sourceKey: `${input.sourceKey}:in-app`,
        category: input.category ?? "Reminder",
        icon: input.icon ?? "reminder",
        actionLabel: input.actionLabel ?? "View reminders",
        actionHref: input.actionHref ?? "/reminders",
      })
      .onConflictDoNothing({
        target: inAppNotifications.sourceKey,
      })
      .returning({
        id: inAppNotifications.id,
      });

    return {
      created: Boolean(notification),
      notification: notification ?? null,
    };
  } catch (error) {
    // Notification delivery must not fail the primary action (login,
    // workspace connection, monitoring state change, or reminder job).
    console.error("Failed to create in-app notification:", error);

    return {
      created: false,
      notification: null,
    };
  }
}
