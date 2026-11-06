import "server-only";

import {
  and,
  asc,
  eq,
  lte,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/server/db";
import { notificationJobs } from "@/lib/server/db/schema";
import { dispatchNotification } from "@/lib/server/notifications/dispatcher";

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

async function claimNotificationJob(jobId: string, now: Date) {
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
    const job = await claimNotificationJob(candidate.id, new Date());

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

      // Never silently choose a channel the user did not select.
      if (!job.channelId) {
        await markJobFailed(
          job.id,
         "No eligible notification channel is configured."
        );
        failed++;
        continue;
      }

      await dispatchNotification({
        jobId: job.id,
        userId: job.userId,
        channelId: job.channelId,
        message,
      });

      processed++;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message.slice(0, 200)
          : "Unknown delivery error";

      try {
        const updated = await markJobFailed(job.id, errorMessage);

        if (updated) {
          failed++;
        } else {
          // The dispatcher may already have moved the job to review
          // after an uncertain provider outcome.
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
