
import { db } from "@/lib/server/db";
import { notificationJobs } from "@/lib/server/db/schema";

type CreateReminderJobInput = {
  userId: string;
  ruleId: string;
  channelId?: string;
  scheduledAt: Date;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
};

export async function createReminderJob(
  input: CreateReminderJobInput,
) {
  const [job] = await db
    .insert(notificationJobs)
    .values({
      userId: input.userId,
      ruleId: input.ruleId,
      channelId: input.channelId ?? null,
      scheduledAt: input.scheduledAt,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload ?? {},
    })
    .onConflictDoNothing({
      target: notificationJobs.idempotencyKey,
    })
    .returning();

  return {
    created: Boolean(job),
    job: job ?? null,
  };
}
