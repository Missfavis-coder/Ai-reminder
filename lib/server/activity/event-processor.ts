import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  activityEvents,
  workspaces,
} from "@/lib/server/db/schema";
import { WorkspaceNotFoundError } from "@/lib/server/error";
import type { ActivityEventInput } from "./type";
import { updateWorkspaceSession } from "./session-manager";
import { evaluateSessionRules } from
  "@/lib/server/reminders/evaluate-session-rules";

export async function processActivityEvent(input: {
  userId: string;
  event: ActivityEventInput;
}) {
  const { userId, event } = input;

  const occurredAt = new Date(event.occurredAt);
  const receivedAt = new Date();

  const result = await db.transaction(async (tx) => {
    // Serialize event processing for this workspace.
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(
        and(
          eq(workspaces.id, event.workspaceId),
          eq(workspaces.userId, userId),
        ),
      )
      .for("update")
      .limit(1);

    if (!workspace) {
      throw new WorkspaceNotFoundError();
    }

    const [inserted] = await tx
      .insert(activityEvents)
      .values({
        eventId: event.eventId,
        userId,
        workspaceId: event.workspaceId,
        eventType: event.eventType,
        occurredAt,
        receivedAt,
        metadata: event.metadata ?? {},
      })
      .onConflictDoNothing({
        target: activityEvents.eventId,
      })
      .returning({ id: activityEvents.id });

    if (!inserted) {
      return {
        accepted: true as const,
        duplicate: true as const,
      };
    }

    const session = await updateWorkspaceSession(tx, {
      userId,
      workspaceId: event.workspaceId,
      eventType: event.eventType,
      occurredAt,
      receivedAt,
    });

    return {
      accepted: true as const,
      duplicate: false as const,
      session,
    };
  });

  // Duplicate events must not trigger reminder evaluation again.
  if (result.duplicate) {
    return result;
  }

  const session = result.session;

  // Some events may be valid without changing a session.
  if (!session.updated || !session.sessionId) {
    return result;
  }

  try {
    const reminderEvaluation = await evaluateSessionRules({
      userId,
      session: {
        sessionId: session.sessionId,
        workspaceId: event.workspaceId,
        status: session.status ?? "ended",
        activeSeconds: session.activeSeconds ?? 0,
        idleSinceAt: session.idleSinceAt ?? null,
      },
    });

    return {
      ...result,
      reminderEvaluation,
    };
  } catch (error) {
    // The activity event and session are already committed.
    // Do not report the event as unaccepted just because
    // reminder evaluation failed.
    console.error("Session reminder evaluation failed.", {
      workspaceId: event.workspaceId,
      sessionId: session.sessionId,
      error:
        error instanceof Error ? error.message : "Unknown error",
    });

    return {
      ...result,
      reminderEvaluation: {
        evaluated: 0,
        jobsCreated: 0,
        error: "evaluation_failed" as const,
      },
    };
  }
}