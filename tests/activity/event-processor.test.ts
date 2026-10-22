
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  updateWorkspaceSession: vi.fn(),
  evaluateSessionRules: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  db: {
    transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/server/db/schema", () => ({
  activityEvents: {
    eventId: "eventId",
    id: "id",
  },
  workspaces: {
    id: "id",
    userId: "userId",
  },
}));

vi.mock("@/lib/server/activity/session-manager", () => ({
  updateWorkspaceSession: mocks.updateWorkspaceSession,
}));

vi.mock("@/lib/server/reminders/evaluate-session-rules", () => ({
  evaluateSessionRules: mocks.evaluateSessionRules,
}));

import { processActivityEvent } from
  "@/lib/server/activity/event-processor";

const userId = "user-1";
const workspaceId = "workspace-1";

const event = {
  eventId: "7d8a2b91-4c63-4f7d-9e12-1b3c5a6d7e80",
  workspaceId,
  eventType: "workspace_focused" as const,
  occurredAt: "2026-10-22T13:15:00.000Z",
};

function setupTransaction(insertedEvent: boolean) {
  const workspaceQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    for: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: workspaceId }]),
  };

  const insertQuery = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(
      insertedEvent ? [{ id: "activity-1" }] : [],
    ),
  };

  const tx = {
    select: vi.fn().mockReturnValue(workspaceQuery),
    insert: vi.fn().mockReturnValue(insertQuery),
  };

  mocks.transaction.mockImplementation(
    async (callback: (transaction: typeof tx) => Promise<unknown>) =>
      callback(tx),
  );

  return { tx, insertQuery };
}

describe("processActivityEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not update sessions or evaluate reminders for duplicate events", async () => {
    setupTransaction(false);

    const result = await processActivityEvent({
      userId,
      event,
    });

    expect(result).toEqual({
      accepted: true,
      duplicate: true,
    });

    expect(mocks.updateWorkspaceSession).not.toHaveBeenCalled();
    expect(mocks.evaluateSessionRules).not.toHaveBeenCalled();
  });


it("processes a new event and evaluates session reminders", async () => {
    setupTransaction(true);
  
    mocks.updateWorkspaceSession.mockResolvedValue({
      updated: true,
      sessionId: "session-1",
      status: "active",
      activeSeconds: 0,
      idleSinceAt: null,
    });
  
    mocks.evaluateSessionRules.mockResolvedValue({
      evaluated: 1,
      jobsCreated: 0,
    });
  
    const result = await processActivityEvent({
      userId,
      event: {
        ...event,
        eventId: "8d8a2b91-4c63-4f7d-9e12-1b3c5a6d7e81",
      },
    });
  
    expect(result).toMatchObject({
      accepted: true,
      duplicate: false,
      session: {
        updated: true,
        sessionId: "session-1",
        status: "active",
      },
      reminderEvaluation: {
        evaluated: 1,
        jobsCreated: 0,
      },
    });
  
    expect(mocks.updateWorkspaceSession).toHaveBeenCalledOnce();
    expect(mocks.evaluateSessionRules).toHaveBeenCalledOnce();
  });
  

it("rejects an event when the workspace does not belong to the user", async () => {
    const { tx } = setupTransaction(false);
  
    const workspaceQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      for: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
  
    tx.select.mockReturnValue(workspaceQuery as never);
  
    await expect(
        processActivityEvent({ userId, event }),
      ).rejects.toThrow("Workspace not found.");
    expect(tx.insert).not.toHaveBeenCalled();
    expect(mocks.updateWorkspaceSession).not.toHaveBeenCalled();
    expect(mocks.evaluateSessionRules).not.toHaveBeenCalled();
  });


it("uses one server receipt timestamp for the event and session update", async () => {
    const { insertQuery } = setupTransaction(true);
  
    mocks.updateWorkspaceSession.mockResolvedValue({
      updated: true,
      sessionId: "session-1",
      status: "active",
      activeSeconds: 0,
      idleSinceAt: null,
    });
  
    mocks.evaluateSessionRules.mockResolvedValue({
      evaluated: 0,
      jobsCreated: 0,
    });
  
    const before = Date.now();
  
    await processActivityEvent({
      userId,
      event: {
        ...event,
        eventId: "9d8a2b91-4c63-4f7d-9e12-1b3c5a6d7e82",
      },
    });
  
    const after = Date.now();
    const insertedValues = insertQuery.values.mock.calls[0][0];
  
    expect(insertedValues.receivedAt).toBeInstanceOf(Date);
    expect(insertedValues.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(insertedValues.receivedAt.getTime()).toBeLessThanOrEqual(after);
  
    expect(mocks.updateWorkspaceSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        occurredAt: new Date(event.occurredAt),
        receivedAt: insertedValues.receivedAt,
      }),
    );
  });
  
  
});
