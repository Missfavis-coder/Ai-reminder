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
    // Lock the workspace while processing its activity.
    const [workspace] = await tx
      .select({
        id: workspaces.id,
        status: workspaces.status,
        monitoringEnabled: workspaces.monitoringEnabled,
      })
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

    // Do not record activity from disconnected workspaces.
    if (workspace.status !== "connected") {
      return {
        accepted: false as const,
        ignored: true as const,
        reason: "workspace_disconnected" as const,
      };
    }

    // Do not record activity when monitoring is disabled.
    if (!workspace.monitoringEnabled) {
      return {
        accepted: false as const,
        ignored: true as const,
        reason: "monitoring_disabled" as const,
      };
    }

    // Insert the activity event.
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
      .returning({
        id: activityEvents.id,
      });

    // Prevent duplicate events from triggering reminders.
    if (!inserted) {
      return {
        accepted: true as const,
        duplicate: true as const,
      };
    }

    // Update the workspace session.
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

  // Paused or disconnected workspaces are ignored.
  if ("ignored" in result && result.ignored) {
    return result;
  }

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
    // Do not report the event as unaccepted because reminder
    // evaluation failed.
    console.error("Session reminder evaluation failed.", {
      workspaceId: event.workspaceId,
      sessionId: session.sessionId,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
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