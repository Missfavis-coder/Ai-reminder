
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, insertMock, updateMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/server/db/schema", () => ({
  workspaceSessions: {
    id: "id",
    userId: "userId",
    workspaceId: "workspaceId",
    status: "status",
    startedAt: "startedAt",
    lastActivityAt: "lastActivityAt",
    lastEventOccurredAt: "lastEventOccurredAt",
    activeSeconds: "activeSeconds",
    idleSinceAt: "idleSinceAt",
    endedAt: "endedAt",
  },
}));

import { updateWorkspaceSession } from
  "@/lib/server/activity/session-manager";

const userId = "user-1";
const workspaceId = "workspace-1";

function createTransactionMock(existingSession: unknown) {
  const sessionQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(
      existingSession ? [existingSession] : [],
    ),
  };

  const insertQuery = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      { id: "session-1" },
    ]),
  };

  const updateQuery = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  selectMock.mockReturnValue(sessionQuery);
  insertMock.mockReturnValue(insertQuery);
  updateMock.mockReturnValue(updateQuery);

  return {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    insertQuery,
    updateQuery,
  };
}

describe("updateWorkspaceSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores an event older than the last processed event", async () => {
    const existingSession = {
      id: "session-1",
      userId,
      workspaceId,
      status: "active",
      startedAt: new Date("2026-10-22T10:00:00.000Z"),
      lastActivityAt: new Date("2026-10-22T10:00:30.000Z"),
      lastEventOccurredAt: new Date("2026-10-22T10:00:20.000Z"),
      activeSeconds: 30,
      idleSinceAt: null,
    };

    const tx = createTransactionMock(existingSession);

    const result = await updateWorkspaceSession(tx as never, {
      userId,
      workspaceId,
      eventType: "heartbeat",
      occurredAt: new Date("2026-10-22T10:00:10.000Z"),
      receivedAt: new Date("2026-10-22T10:00:31.000Z"),
    });

    expect(result).toMatchObject({
      updated: false,
      reason: "stale_event",
      sessionId: "session-1",
    });

    expect(tx.update).not.toHaveBeenCalled();
  });

  it("creates a session when the workspace is focused for the first time", async () => {
    const tx = createTransactionMock(null);

    const result = await updateWorkspaceSession(tx as never, {
      userId,
      workspaceId,
      eventType: "workspace_focused",
      occurredAt: new Date("2026-10-22T10:00:00.000Z"),
      receivedAt: new Date("2026-10-22T10:00:30.500Z"),
    });

    expect(result).toMatchObject({
      updated: true,
      sessionId: "session-1",
      status: "active",
      activeSeconds: 0,
      idleSinceAt: null,
    });

    expect(tx.insertQuery.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        workspaceId,
        status: "active",
        activeSeconds: 0,
        lastEventOccurredAt: new Date("2026-10-22T10:00:00.000Z"),
      }),
    );
  });

  it("accumulates active time when the next event arrives", async () => {
    const previousTime = new Date("2026-10-22T10:00:00.000Z");

    const existingSession = {
      id: "session-1",
      userId,
      workspaceId,
      status: "active",
      startedAt: previousTime,
      lastActivityAt: previousTime,
      lastEventOccurredAt: previousTime,
      activeSeconds: 0,
      idleSinceAt: null,
    };

    const tx = createTransactionMock(existingSession);

    const result = await updateWorkspaceSession(tx as never, {
      userId,
      workspaceId,
      eventType: "heartbeat",
      occurredAt: new Date("2026-10-22T10:00:30.000Z"),
      receivedAt: new Date("2026-10-22T10:00:30.500Z"),
    });

    expect(result).toMatchObject({
      updated: true,
      sessionId: "session-1",
      status: "active",
      activeSeconds: 30,
    });

    expect(tx.updateQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        activeSeconds: 30,
        lastEventOccurredAt: new Date("2026-10-22T10:00:30.000Z"),
      }),
    );
  });

  it("caps credited active time at 30 seconds per event", async () => {
    const previousTime = new Date("2026-10-22T10:00:00.000Z");

    const existingSession = {
      id: "session-1",
      userId,
      workspaceId,
      status: "active",
      startedAt: previousTime,
      lastActivityAt: previousTime,
      lastEventOccurredAt: previousTime,
      activeSeconds: 100,
      idleSinceAt: null,
    };

    const tx = createTransactionMock(existingSession);

    const result = await updateWorkspaceSession(tx as never, {
      userId,
      workspaceId,
      eventType: "heartbeat",
      occurredAt: new Date("2026-10-22T10:01:30.000Z"),
      receivedAt: new Date("2026-10-22T10:00:30.500Z"),
    });

    expect(result).toMatchObject({
      updated: true,
      activeSeconds: 130,
    });
  });

  it("ends a session and records its final eligible active time", async () => {
    const previousTime = new Date("2026-10-22T10:00:00.000Z");
    const stoppedAt = new Date("2026-10-22T10:00:30.000Z");

    const existingSession = {
      id: "session-1",
      userId,
      workspaceId,
      status: "active",
      startedAt: previousTime,
      lastActivityAt: previousTime,
      lastEventOccurredAt: previousTime,
      activeSeconds: 30,
      idleSinceAt: null,
    };

    const tx = createTransactionMock(existingSession);

    const result = await updateWorkspaceSession(tx as never, {
      userId,
      workspaceId,
      eventType: "workspace_stopped",
      occurredAt: stoppedAt,
      receivedAt: new Date("2026-10-22T10:00:30.500Z"),
    });

    expect(result).toMatchObject({
      updated: true,
      status: "ended",
      activeSeconds: 60,
      idleSinceAt: null,
    });

    expect(tx.updateQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ended",
        activeSeconds: 60,
        endedAt: new Date("2026-10-22T10:00:30.500Z"),
        idleSinceAt: null,
      }),
    );
  });

  it("credits at most 30 seconds after a long gap between events", async () => {
    const previousTime = new Date("2026-10-22T10:00:00.000Z");

    const existingSession = {
      id: "session-1",
      userId,
      workspaceId,
      status: "active",
      startedAt: previousTime,
      lastActivityAt: previousTime,
      lastEventOccurredAt: previousTime,
      activeSeconds: 100,
      idleSinceAt: null,
    };

    const tx = createTransactionMock(existingSession);

    const result = await updateWorkspaceSession(tx as never, {
      userId,
      workspaceId,
      eventType: "heartbeat",
      occurredAt: new Date("2026-10-22T10:01:30.000Z"),
      receivedAt: new Date("2026-10-22T10:00:30.500Z"),
    });

    expect(result).toMatchObject({
      updated: true,
      activeSeconds: 130,
    });
  });

  it("does not credit elapsed time when the previous session was idle", async () => {
    const previousTime = new Date("2026-10-22T10:00:00.000Z");

    const existingSession = {
      id: "session-1",
      userId,
      workspaceId,
      status: "idle",
      startedAt: previousTime,
      lastActivityAt: previousTime,
      lastEventOccurredAt: previousTime,
      activeSeconds: 120,
      idleSinceAt: previousTime,
    };

    const tx = createTransactionMock(existingSession);

    const result = await updateWorkspaceSession(tx as never, {
      userId,
      workspaceId,
      eventType: "idle_ended",
      occurredAt: new Date("2026-10-22T10:00:30.000Z"),
      receivedAt: new Date("2026-10-22T10:00:30.500Z"),
    });

    expect(result).toMatchObject({
      updated: true,
      status: "active",
      activeSeconds: 120,
      idleSinceAt: null,
    });
  });
});
