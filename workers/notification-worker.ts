
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

  if (typeof message !== "string") {
    return null;
  }

  const normalized = message.trim();

  return normalized.length > 0 ? normalized : null;
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

async function markJobFailed(
  jobId: string,
  errorMessage: string,
): Promise<boolean> {
  const [updated] = await db
    .update(notificationJobs)
    .set({
      status: "failed",
      processingStartedAt: null,
      lastError: errorMessage.slice(0, 200),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(notificationJobs.id, jobId),
        eq(notificationJobs.status, "processing"),
      ),
    )
    .returning({ id: notificationJobs.id });

  return Boolean(updated);
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

    try {
      const message = getMessage(job.payload);

      if (!message) {
        await markJobFailed(
          job.id,
          "Notification job has no valid message.",
        );
        failed++;
        continue;
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
          const updated = await markJobFailed(
            job.id,
            "No eligible notification channel is configured.",
          );

          if (updated) failed++;
          else skipped++;

          continue;
        }

        channelId = channel.id;

        const [updated] = await db
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
          )
          .returning({ id: notificationJobs.id });

        if (!updated) {
          skipped++;
          continue;
        }
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
        const updated = await markJobFailed(
          job.id,
          errorMessage,
        );

        if (updated) {
          failed++;
        } else {
          // Another operation may have changed the job to review,
          // sent, failed, or another non-processing status.
          skipped++;
        }
      } catch {
        // Leave the job for reconciliation if persistence fails.
        console.error(
          "Could not update failed notification job status.",
          { jobId: job.id },
        );
        skipped++;
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
