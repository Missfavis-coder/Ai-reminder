import "server-only";

import { createHash } from "node:crypto";
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationDeliveries,
  notificationJobs,
  whatsappWebhookEvents,
} from "@/lib/server/db/schema";

const MAX_ATTEMPTS = 8;
const STALE_AFTER_MINUTES = 5;
const MAX_BATCH_SIZE = 500;

export type WhatsAppStatusEvent = {
    id: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp?: string;
    recipient_id?: string;
    errors?: unknown[];
    [key: string]: unknown;
  };

type WhatsAppStatus = "sent" | "delivered" | "read" | "failed";

type WhatsAppWebhookStatusPayload = {
  id: string;
  status: WhatsAppStatus;
  timestamp?: string;
  recipient_id?: string;
  errors?: unknown[];
  [key: string]: unknown;
};

type InboxEvent = typeof whatsappWebhookEvents.$inferSelect;

function retryDelayMinutes(attempts: number): number {
  return Math.min(60, 2 ** Math.max(1, attempts));
}

export function createWhatsAppEventKey(
  event: WhatsAppWebhookStatusPayload,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: event.id,
        status: event.status,
        timestamp: event.timestamp ?? null,
        recipient_id: event.recipient_id ?? null,
        errors: event.errors ?? null,
      }),
    )
    .digest("hex");
}

export async function saveWhatsAppWebhookEvent(
  event: WhatsAppStatusEvent,
): Promise<{ id: string | null; duplicate: boolean }> {
  const eventKey = createWhatsAppEventKey(event);

  const [saved] = await db
    .insert(whatsappWebhookEvents)
    .values({
      eventKey,
      providerMessageId: event.id,
      providerStatus: event.status,
      payload: event,
      status: "pending",
      nextAttemptAt: null,
    })
    .onConflictDoNothing({
      target: whatsappWebhookEvents.eventKey,
    })
    .returning({ id: whatsappWebhookEvents.id });

  if (saved) {
    return { id: saved.id, duplicate: false };
  }

  return { id: null, duplicate: true };
}

async function claimEvent(eventId: string) {
  const now = new Date();

  const [claimed] = await db
    .update(whatsappWebhookEvents)
    .set({
      status: "processing",
      processingStartedAt: now,
      attempts: sql`${whatsappWebhookEvents.attempts} + 1`,
      lastError: null,
    })
    .where(
      and(
        eq(whatsappWebhookEvents.id, eventId),
        eq(whatsappWebhookEvents.status, "pending"),
        lt(whatsappWebhookEvents.attempts, MAX_ATTEMPTS),
        or(
          isNull(whatsappWebhookEvents.nextAttemptAt),
          lt(whatsappWebhookEvents.nextAttemptAt, now),
        ),
      ),
    )
    .returning({
      id: whatsappWebhookEvents.id,
      attempts: whatsappWebhookEvents.attempts,
    });

  return claimed ?? null;
}

async function finishEvent(
  eventId: string,
  status: "processed" | "pending" | "failed",
  lastError: string | null = null,
  attempts?: number,
) {
  const nextAttemptAt =
    status === "pending"
      ? new Date(
          Date.now() +
            retryDelayMinutes(attempts ?? 1) * 60_000,
        )
      : null;

  await db
    .update(whatsappWebhookEvents)
    .set({
      status,
      processingStartedAt: null,
      nextAttemptAt,
      lastError,
      processedAt: status === "processed" ? new Date() : null,
    })
    .where(
      and(
        eq(whatsappWebhookEvents.id, eventId),
        eq(whatsappWebhookEvents.status, "processing"),
      ),
    );
}

function parseProviderTimestamp(value?: string): Date {
  if (value) {
    const seconds = Number(value);

    if (Number.isFinite(seconds) && seconds > 0) {
      return new Date(seconds * 1000);
    }
  }

  return new Date();
}

async function processClaimedEvent(
  event: InboxEvent,
  attempts: number,
): Promise<void> {
  const payload = event.payload as WhatsAppWebhookStatusPayload;

  if (
    !payload ||
    typeof payload.id !== "string" ||
    !["sent", "delivered", "read", "failed"].includes(payload.status)
  ) {
    await finishEvent(
      event.id,
      "failed",
      "Invalid WhatsApp webhook status payload.",
      attempts,
    );
    return;
  }

  const [delivery] = await db
    .select({
      id: notificationDeliveries.id,
      jobId: notificationDeliveries.jobId,
      status: notificationDeliveries.status,
    })
    .from(notificationDeliveries)
    .where(
      eq(notificationDeliveries.providerMessageId, payload.id),
    )
    .limit(1);

  if (!delivery) {
    const terminal = attempts >= MAX_ATTEMPTS;

    await finishEvent(
      event.id,
      terminal ? "failed" : "pending",
      `No delivery found for provider message ID ${payload.id}.`,
      attempts,
    );
    return;
  }

  const providerTime = parseProviderTimestamp(payload.timestamp);

  if (payload.status === "delivered" || payload.status === "read") {
    // A later delivery receipt must not reverse a known failure state.
    await db
      .update(notificationDeliveries)
      .set({
        status: "delivered",
        deliveredAt: providerTime,
        errorMessage: null,
      })
      .where(
        and(
          eq(notificationDeliveries.id, delivery.id),
          inArray(notificationDeliveries.status, [
            "pending",
            "sent",
            "unknown",
            "delivered",
          ]),
        ),
      );

    await db
      .update(notificationJobs)
      .set({
        status: "sent",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationJobs.id, delivery.jobId),
          inArray(notificationJobs.status, [
            "processing",
            "review",
            "sent",
          ]),
        ),
      );
  } else if (payload.status === "sent") {
    await db
      .update(notificationDeliveries)
      .set({
        status: "sent",
        errorMessage: null,
      })
      .where(
        and(
          eq(notificationDeliveries.id, delivery.id),
          inArray(notificationDeliveries.status, [
            "pending",
            "unknown",
            "sent",
          ]),
        ),
      );

    await db
      .update(notificationJobs)
      .set({
        status: "sent",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationJobs.id, delivery.jobId),
          inArray(notificationJobs.status, [
            "processing",
            "review",
            "sent",
          ]),
        ),
      );
  } else {
    const errorText = payload.errors?.length
      ? JSON.stringify(payload.errors)
      : "WhatsApp reported message delivery failure.";

    // A delayed failure must not overwrite a confirmed delivery.
    await db
      .update(notificationDeliveries)
      .set({
        status: "failed",
        errorMessage: errorText,
      })
      .where(
        and(
          eq(notificationDeliveries.id, delivery.id),
          inArray(notificationDeliveries.status, [
            "pending",
            "sent",
            "unknown",
            "failed",
          ]),
        ),
      );

    await db
      .update(notificationJobs)
      .set({
        status: "failed",
        lastError: errorText,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationJobs.id, delivery.jobId),
          inArray(notificationJobs.status, [
            "processing",
            "review",
            "sent",
          ]),
        ),
      );
  }

  await finishEvent(event.id, "processed", null, attempts);
}

export async function processPendingWhatsAppWebhookEvents(
  limit = 100,
): Promise<{ processed: number; retried: number; failed: number }> {
  const batchSize = Math.max(
    1,
    Math.min(Math.floor(limit), MAX_BATCH_SIZE),
  );

  const now = new Date();

  const candidates = await db
    .select({ id: whatsappWebhookEvents.id })
    .from(whatsappWebhookEvents)
    .where(
      and(
        eq(whatsappWebhookEvents.status, "pending"),
        lt(whatsappWebhookEvents.attempts, MAX_ATTEMPTS),
        or(
          isNull(whatsappWebhookEvents.nextAttemptAt),
          lt(whatsappWebhookEvents.nextAttemptAt, now),
        ),
      ),
    )
    .orderBy(asc(whatsappWebhookEvents.receivedAt))
    .limit(batchSize);

  let processed = 0;
  let retried = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const claimed = await claimEvent(candidate.id);

    // Another worker may have claimed it first.
    if (!claimed) continue;

    const [event] = await db
      .select()
      .from(whatsappWebhookEvents)
      .where(eq(whatsappWebhookEvents.id, claimed.id))
      .limit(1);

    if (!event) {
      await finishEvent(
        claimed.id,
        claimed.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        "Claimed webhook event could not be reloaded.",
        claimed.attempts,
      );

      if (claimed.attempts >= MAX_ATTEMPTS) failed++;
      else retried++;

      continue;
    }

    try {
      await processClaimedEvent(event, claimed.attempts);

      const [updated] = await db
        .select({ status: whatsappWebhookEvents.status })
        .from(whatsappWebhookEvents)
        .where(eq(whatsappWebhookEvents.id, event.id))
        .limit(1);

      if (updated?.status === "processed") processed++;
      else if (updated?.status === "failed") failed++;
      else retried++;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown webhook processing error.";

      const terminal = claimed.attempts >= MAX_ATTEMPTS;

      try {
        await finishEvent(
          event.id,
          terminal ? "failed" : "pending",
          message,
          claimed.attempts,
        );
      } catch {
        // Stale-event recovery handles events that remain processing.
      }

      if (terminal) failed++;
      else retried++;
    }
  }

  return { processed, retried, failed };
}

export async function recoverStaleWhatsAppWebhookEvents(): Promise<{
  recovered: number;
  exhausted: number;
}> {
  const cutoff = new Date(
    Date.now() - STALE_AFTER_MINUTES * 60_000,
  );

  const exhausted = await db
    .update(whatsappWebhookEvents)
    .set({
      status: "failed",
      processingStartedAt: null,
      nextAttemptAt: null,
      lastError:
        "Maximum attempts reached during stale processing; manual investigation required.",
    })
    .where(
      and(
        eq(whatsappWebhookEvents.status, "processing"),
        lt(whatsappWebhookEvents.processingStartedAt, cutoff),
        sql`${whatsappWebhookEvents.attempts} >= ${MAX_ATTEMPTS}`,
      ),
    )
    .returning({ id: whatsappWebhookEvents.id });

  const recovered = await db
    .update(whatsappWebhookEvents)
    .set({
      status: "pending",
      processingStartedAt: null,
      nextAttemptAt: new Date(Date.now() + 60_000),
      lastError: "Recovered stale processing event.",
    })
    .where(
      and(
        eq(whatsappWebhookEvents.status, "processing"),
        lt(whatsappWebhookEvents.processingStartedAt, cutoff),
        lt(whatsappWebhookEvents.attempts, MAX_ATTEMPTS),
      ),
    )
    .returning({ id: whatsappWebhookEvents.id });

  return {
    recovered: recovered.length,
    exhausted: exhausted.length,
  };
}