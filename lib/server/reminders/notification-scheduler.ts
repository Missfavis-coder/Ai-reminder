
import "server-only";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationChannels,
} from "@/lib/server/db/schema";

import { createReminderJob } from "@/lib/server/reminders/create-job";
import { createInAppNotification } from "@/lib/server/notifications/create-in-app-notification";

type ScheduleReminderNotificationsInput = {
  userId: string;
  ruleId: string;
  title: string;
  description: string | null;
  reason: string;
  sourceKey: string;
  scheduledAt: Date;
  channelIds?: string[];
  message?: string;
  payload?: Record<string, unknown>;
};

export async function scheduleReminderNotifications(
  input: ScheduleReminderNotificationsInput,
) {
  const {
    userId,
    ruleId,
    title,
    description,
    reason,
    sourceKey,
    scheduledAt,
    channelIds = [],
    payload = {},
  } = input;

  // Create the Inbox notification first.
  // The source key prevents duplicate Inbox entries.
  const notificationDescription = description?.trim()
    ? `${description.trim()}\n\n${reason}`
    : reason;

  const inboxNotification = await createInAppNotification({
    userId,
    title,
    description: notificationDescription,
    sourceKey,
  });

  // Remove duplicate channel IDs before processing.
  const selectedChannelIds = [...new Set(channelIds)];

  if (selectedChannelIds.length === 0) {
    return {
      inAppNotificationCreated: inboxNotification.created,
      jobsCreated: 0,
      eligibleChannels: 0,
    };
  }

  // Only enabled, verified and consented WhatsApp channels
  // are currently supported by the notification dispatcher.
  const eligibleChannels = await db
    .select({
      id: notificationChannels.id,
      type: notificationChannels.type,
    })
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.userId, userId),
        inArray(notificationChannels.id, selectedChannelIds),
        eq(notificationChannels.enabled, true),
        isNotNull(notificationChannels.consentGrantedAt),
        isNotNull(notificationChannels.verifiedAt),
      ),
    );

  const deliverableChannels = eligibleChannels.filter(
    (channel) => channel.type === "whatsapp",
  );

  const message =
    input.message ??
    (description?.trim()
      ? `${title}\n\n${description.trim()}`
      : title);

  let jobsCreated = 0;

  for (const channel of deliverableChannels) {
    const result = await createReminderJob({
      userId,
      ruleId,
      channelId: channel.id,
      scheduledAt,
      idempotencyKey: `${sourceKey}:${channel.id}`,
      payload: {
        title,
        description: description ?? "",
        message,
        reason,
        ...payload,
      },
    });

    if (result.created) {
      jobsCreated++;
    }
  }

  return {
    inAppNotificationCreated: inboxNotification.created,
    jobsCreated,
    eligibleChannels: deliverableChannels.length,
  };
}
