
import "server-only";

import {
  and,
  asc,
  eq,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationJobs,
  notificationChannels,
} from "@/lib/server/db/schema";
import { dispatchNotification } from
  "@/lib/server/notifications/dispatcher";

const BATCH_SIZE = 10;

function getMessage(payload: unknown): string | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("message" in payload)
  ) {
    return null;
  }

  const message = payload.message;

  return typeof message === "string" &&
    message.trim().length > 0
    ? message.trim()
    : null;
}

async function claimNotificationJob(
  jobId: string,
  now: Date,
) {
  const [job] = await db
    .update(notificationJobs)
    .set({
      status: "processing",
      processingStartedAt: now,
      lastError: null,
      updatedAt: now,
      attempts: sql`${notificationJobs.attempts} + 1`,
    })
    .where(
      and(
        eq(notificationJobs.id, jobId),
        eq(notificationJobs.status, "pending"),
        lte(notificationJobs.scheduledAt, now),
      ),
    )
    .returning({
      id: notificationJobs.id,
      userId: notificationJobs.userId,
      channelId: notificationJobs.channelId,
      payload: notificationJobs.payload,
    });

  return job ?? null;
}

export async function processDueNotificationJobs() {
  const now = new Date();

  const candidates = await db
    .select({ id: notificationJobs.id })
    .from(notificationJobs)
    .where(
      and(
        eq(notificationJobs.status, "pending"),
        lte(notificationJobs.scheduledAt, now),
      ),
    )
    .orderBy(asc(notificationJobs.scheduledAt))
    .limit(BATCH_SIZE);

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const job = await claimNotificationJob(
      candidate.id,
      new Date(),
    );

    if (!job) {
      skipped++;
      continue;
    }

    const message = getMessage(job.payload);

    try {
      if (!message) {
        throw new Error(
          "Notification job has no valid message.",
        );
      }

      let channelId = job.channelId;

      if (!channelId) {
        const [channel] = await db
          .select({ id: notificationChannels.id })
          .from(notificationChannels)
          .where(
            and(
              eq(notificationChannels.userId, job.userId),
              eq(notificationChannels.type, "whatsapp"),
              eq(notificationChannels.enabled, true),
              isNotNull(notificationChannels.consentGrantedAt),
              isNotNull(notificationChannels.verifiedAt),
            ),
          )
          .limit(1);

        if (!channel) {
          await db
            .update(notificationJobs)
            .set({
              status: "pending",
              processingStartedAt: null,
              lastError:
                "No eligible notification channel is configured.",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(notificationJobs.id, job.id),
                eq(notificationJobs.status, "processing"),
              ),
            );

          skipped++;
          continue;
        }

        channelId = channel.id;

        await db
          .update(notificationJobs)
          .set({
            channelId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(notificationJobs.id, job.id),
              eq(notificationJobs.status, "processing"),
            ),
          );
      }

      await dispatchNotification({
        jobId: job.id,
        userId: job.userId,
        channelId,
        message,
      });

      processed++;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message.slice(0, 200)
          : "Unknown delivery error";

      try {
        await db
          .update(notificationJobs)
          .set({
            status: "failed",
            processingStartedAt: null,
            lastError: errorMessage,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(notificationJobs.id, job.id),
              eq(notificationJobs.status, "processing"),
            ),
          );

        failed++;
      } catch {
        console.error(
          "Could not update failed notification job status.",
          { jobId: job.id },
        );
      }

      console.error("Notification job failed", {
        jobId: job.id,
        error: errorMessage,
      });
    }
  }

  return {
    candidates: candidates.length,
    processed,
    failed,
    skipped,
  };
}
