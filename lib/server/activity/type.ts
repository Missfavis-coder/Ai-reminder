
import { z } from "zod";

export const activityEventSchema = z.object({
  eventId: z.string().uuid(),
  workspaceId: z.string().uuid(),

  eventType: z.enum([
    "workspace_focused",
    "workspace_blurred",
    "heartbeat",
    "workspace_stopped",
    "idle_started",
    "idle_ended",
  ]),

  occurredAt: z.string().datetime({ offset: true }),
});

export type ActivityEventInput = z.infer<
  typeof activityEventSchema
>;

const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export function validateEventTimestamp(
  occurredAt: string,
  now = Date.now(),
) {
  const timestamp = new Date(occurredAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return {
      valid: false as const,
      reason: "invalid_timestamp",
    };
  }

  if (timestamp < now - MAX_EVENT_AGE_MS) {
    return {
      valid: false as const,
      reason: "event_too_old",
    };
  }

  if (timestamp > now + MAX_FUTURE_SKEW_MS) {
    return {
      valid: false as const,
      reason: "event_from_future",
    };
  }

  return { valid: true as const };
}
