
import "server-only";

import {
  and,
  desc,
  eq,
  inArray,
} from "drizzle-orm";

import { db } from "@/lib/server/db";
import { workspaceSessions } from "@/lib/server/db/schema";

type DbTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type SessionEvent = {
  userId: string;
  workspaceId: string;
  eventType:
    | "workspace_focused"
    | "workspace_blurred"
    | "heartbeat"
    | "workspace_stopped"
    | "idle_started"
    | "idle_ended";
  occurredAt: Date;
  receivedAt: Date;
};

const MAX_CREDIT_SECONDS = 30;

export async function updateWorkspaceSession(
  tx: DbTransaction,
  event: SessionEvent,
) {
  const [session] = await tx
    .select()
    .from(workspaceSessions)
    .where(
      and(
        eq(workspaceSessions.userId, event.userId),
        eq(workspaceSessions.workspaceId, event.workspaceId),
        inArray(workspaceSessions.status, ["active", "idle"]),
      ),
    )
    .orderBy(desc(workspaceSessions.startedAt))
    .limit(1);

  const isStopped = event.eventType === "workspace_stopped";

  const shouldBeIdle =
    event.eventType === "workspace_blurred" ||
    event.eventType === "idle_started";

  const shouldBeActive =
    event.eventType === "workspace_focused" ||
    event.eventType === "idle_ended";

  if (!session) {
    // Only an explicit focus event may create a new session.
    // Heartbeats and other events cannot restart an ended session.
    if (event.eventType !== "workspace_focused") {
      return {
        updated: false,
        reason: "no_active_session" as const,
      };
    }

    const [created] = await tx
      .insert(workspaceSessions)
      .values({
        userId: event.userId,
        workspaceId: event.workspaceId,
        status: "active",
        startedAt: event.receivedAt,
        lastActivityAt: event.receivedAt,
        lastEventOccurredAt: event.occurredAt,
        activeSeconds: 0,
        idleSinceAt: null,
      })
      .returning({ id: workspaceSessions.id });

    if (!created) {
      throw new Error("Failed to create workspace session.");
    }

    return {
      updated: true,
      sessionId: created.id,
      status: "active" as const,
      activeSeconds: 0,
      idleSinceAt: null,
    };
  }

  // Compare client event timestamps with previous client event timestamps.
  // lastActivityAt is server time, so it must not be used here.
  if (
    session.lastEventOccurredAt &&
    event.occurredAt.getTime() <
      session.lastEventOccurredAt.getTime()
  ) {
    return {
      updated: false,
      reason: "stale_event" as const,
      sessionId: session.id,
    };
  }

  // Calculate elapsed time using server timestamps and cap the credit.
  
  const elapsedSeconds = session.lastActivityAt
  ? Math.max(
      0,
      Math.min(
        MAX_CREDIT_SECONDS,
        Math.floor(
          (event.receivedAt.getTime() -
            session.lastActivityAt.getTime()) /
            1000,
        ),
      ),
    )
  : 0;

  // Only active sessions can accumulate time.
  const activeSeconds =
    session.activeSeconds +
    (session.status === "active" ? elapsedSeconds : 0);

  const status = isStopped
    ? "ended"
    : shouldBeIdle
      ? "idle"
      : shouldBeActive
        ? "active"
        : session.status;

  // Preserve the original idle start time while idle continues.
  const idleSinceAt =
    status === "idle"
      ? session.status === "idle"
        ? session.idleSinceAt ?? event.receivedAt
        : event.receivedAt
      : null;

  await tx
    .update(workspaceSessions)
    .set({
      status,
      activeSeconds,
      lastActivityAt: event.receivedAt,
      lastEventOccurredAt: event.occurredAt,
      endedAt: isStopped ? event.receivedAt : null,
      idleSinceAt,
    })
    .where(eq(workspaceSessions.id, session.id));

  return {
    updated: true,
    sessionId: session.id,
    status,
    activeSeconds,
    idleSinceAt,
  };
}
