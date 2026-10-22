
import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationChannels,
  notificationJobs,
  notificationDeliveries,
} from "@/lib/server/db/schema";

import { getNotificationProvider } from
  "@/lib/server/integrations/notification-registry";

type DispatchNotificationInput = {
  jobId: string;
  userId: string;
  channelId: string;
  message: string;
};

export async function dispatchNotification(
  input: DispatchNotificationInput,
) {
  const [job] = await db
    .select()
    .from(notificationJobs)
    .where(
      and(
        eq(notificationJobs.id, input.jobId),
        eq(notificationJobs.userId, input.userId),
      ),
    )
    .limit(1);

  if (!job) {
    throw new Error("Notification job not found.");
  }

  if (job.status !== "processing") {
    throw new Error("Notification job must be claimed before dispatch.");
  }

  if (job.channelId !== input.channelId) {
    throw new Error("Notification channel does not match the job.");
  }

  const [channel] = await db
    .select()
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.id, input.channelId),
        eq(notificationChannels.userId, input.userId),
      ),
    )
    .limit(1);

  if (!channel) {
    throw new Error("Notification channel not found.");
  }

  if (!channel.enabled) {
    throw new Error("Notification channel is disabled.");
  }

  if (!channel.consentGrantedAt) {
    throw new Error("User consent is required before sending.");
  }

  if (!channel.verifiedAt) {
    throw new Error("Notification destination has not been verified.");
  }

  if (channel.type !== "whatsapp") {
    throw new Error(
      `Provider "${channel.type}" is not implemented yet.`,
    );
  }

  const provider = getNotificationProvider("whatsapp");

  const [delivery] = await db
    .insert(notificationDeliveries)
    .values({
      jobId: job.id,
      status: "pending",
      attemptedAt: new Date(),
    })
    .returning({ id: notificationDeliveries.id });

  if (!delivery) {
    throw new Error("Could not create notification delivery record.");
  }

  try {
    const result = await provider.send({
      destination: channel.destination,
      message: input.message,
      idempotencyKey: job.idempotencyKey,
    });

    const completedAt = new Date();

    await db
      .update(notificationDeliveries)
      .set({
        status: "sent",
        providerMessageId: result.providerMessageId,
      })
      .where(eq(notificationDeliveries.id, delivery.id));

    await db
      .update(notificationJobs)
      .set({
        status: "sent",
        processingStartedAt: null,
        lastError: null,
        updatedAt: completedAt,
      })
      .where(
        and(
          eq(notificationJobs.id, job.id),
          eq(notificationJobs.status, "processing"),
        ),
      );

    return {
      success: true as const,
      jobId: job.id,
      deliveryId: delivery.id,
      providerMessageId: result.providerMessageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Unknown delivery error";

    await db
      .update(notificationDeliveries)
      .set({
        status: "failed",
        errorMessage,
      })
      .where(eq(notificationDeliveries.id, delivery.id));

    await db
      .update(notificationJobs)
      .set({
        status: "failed",
        processingStartedAt: null,
        lastError: errorMessage.slice(0, 200),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationJobs.id, job.id),
          eq(notificationJobs.status, "processing"),
        ),
      );

    throw error;
  }
}
