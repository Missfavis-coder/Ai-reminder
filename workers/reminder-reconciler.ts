
import "server-only";

import {
  and,
  asc,
  eq,
  isNotNull,
  lt,
} from "drizzle-orm";

import { db } from "@/lib/server/db";
import { notificationJobs } from "@/lib/server/db/schema";

const STALE_AFTER_MINUTES = 15;
const BATCH_SIZE = 100;

export async function reconcileStaleNotificationJobs() {
  const now = new Date();

  const cutoff = new Date(
    now.getTime() - STALE_AFTER_MINUTES * 60 * 1000,
  );

  const staleJobs = await db
    .select({
      id: notificationJobs.id,
    })
    .from(notificationJobs)
    .where(
      and(
        eq(notificationJobs.status, "processing"),
        isNotNull(notificationJobs.processingStartedAt),
        lt(notificationJobs.processingStartedAt, cutoff),
      ),
    )
    .orderBy(asc(notificationJobs.processingStartedAt))
    .limit(BATCH_SIZE);

  let markedForReview = 0;
  let skipped = 0;

  for (const staleJob of staleJobs) {
    const reconciledAt = new Date();

    const [updated] = await db
      .update(notificationJobs)
      .set({
        status: "failed",
        lastError:
          "Processing timed out; delivery outcome requires review.",
        processingStartedAt: null,
        updatedAt: reconciledAt,
      })
      .where(
        and(
          eq(notificationJobs.id, staleJob.id),
          eq(notificationJobs.status, "processing"),
          isNotNull(notificationJobs.processingStartedAt),
          lt(notificationJobs.processingStartedAt, cutoff),
        ),
      )
      .returning({
        id: notificationJobs.id,
      });

    if (!updated) {
      // Another worker or reconciler changed the job first.
      skipped++;
      continue;
    }

    markedForReview++;

    console.warn("Stale notification job needs review", {
      jobId: updated.id,
    });
  }

  return {
    found: staleJobs.length,
    markedForReview,
    skipped,
  };
}
