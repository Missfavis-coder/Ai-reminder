import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  dispatchNotification: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}));

vi.mock("@/lib/server/db/schema", () => ({
  notificationJobs: {
    id: "id",
    status: "status",
    scheduledAt: "scheduledAt",
    processingStartedAt: "processingStartedAt",
    lastError: "lastError",
    updatedAt: "updatedAt",
    attempts: "attempts",
    userId: "userId",
    channelId: "channelId",
    payload: "payload",
  },
  notificationChannels: {
    id: "id",
    userId: "userId",
    type: "type",
    enabled: "enabled",
    consentGrantedAt: "consentGrantedAt",
    verifiedAt: "verifiedAt",
  },
}));

vi.mock("@/lib/server/notifications/dispatcher", () => ({
  dispatchNotification: mocks.dispatchNotification,
}));

import { processDueNotificationJobs } from
  "@/workers/notification-worker";

function createSelectQuery<T>(result: T) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function createUpdateQuery<T>(result: T[] = []) {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

describe("processDueNotificationJobs", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.dispatchNotification.mockResolvedValue({
      success: true,
    });
  });

  it("skips a job another worker already claimed", async () => {
    mocks.select.mockReturnValue(
      createSelectQuery([{ id: "job-1" }]),
    );

    const claimQuery = createUpdateQuery([]);
    mocks.update.mockReturnValue(claimQuery);

    const result = await processDueNotificationJobs();

    expect(claimQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "processing",
        processingStartedAt: expect.any(Date),
      }),
    );

    expect(result).toMatchObject({
      candidates: 1,
      processed: 0,
      failed: 0,
      skipped: 1,
    });

    expect(mocks.dispatchNotification).not.toHaveBeenCalled();
  });

  it("claims and dispatches a job with an existing channel", async () => {
    mocks.select.mockReturnValue(
      createSelectQuery([{ id: "job-1" }]),
    );

    const claimQuery = createUpdateQuery([
      {
        id: "job-1",
        userId: "user-1",
        channelId: "channel-1",
        payload: { message: "Time for a break" },
      },
    ]);

    mocks.update.mockReturnValue(claimQuery);

    const result = await processDueNotificationJobs();

    expect(claimQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "processing",
        processingStartedAt: expect.any(Date),
      }),
    );

    expect(mocks.dispatchNotification).toHaveBeenCalledWith({
      jobId: "job-1",
      userId: "user-1",
      channelId: "channel-1",
      message: "Time for a break",
    });

    expect(result).toMatchObject({
      candidates: 1,
      processed: 1,
      failed: 0,
      skipped: 0,
    });
  });

  it("fails a job when no eligible channel exists", async () => {
    mocks.select
      .mockReturnValueOnce(
        createSelectQuery([{ id: "job-2" }]),
      )
      .mockReturnValueOnce(
        createSelectQuery([]),
      );

    const claimQuery = createUpdateQuery([
      {
        id: "job-2",
        userId: "user-1",
        channelId: null,
        payload: { message: "Time for a break" },
      },
    ]);

    const failureQuery = createUpdateQuery([
      { id: "job-2" },
    ]);

    mocks.update
      .mockReturnValueOnce(claimQuery)
      .mockReturnValueOnce(failureQuery);

    const result = await processDueNotificationJobs();

    expect(failureQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        processingStartedAt: null,
        lastError:
          "No eligible notification channel is configured.",
      }),
    );

    expect(result).toMatchObject({
      candidates: 1,
      processed: 0,
      failed: 1,
      skipped: 0,
    });

    expect(mocks.dispatchNotification).not.toHaveBeenCalled();
  });

  it("preserves review status when delivery outcome is uncertain", async () => {
    mocks.select
      .mockReturnValueOnce(
        createSelectQuery([{ id: "job-4" }]),
      )
      .mockReturnValueOnce(
        createSelectQuery([{ status: "review" }]),
      );
  
    const claimQuery = createUpdateQuery([
      {
        id: "job-4",
        userId: "user-1",
        channelId: "channel-4",
        payload: { message: "Time for a break" },
      },
    ]);
  
    const failureQuery = createUpdateQuery([]);
  
    mocks.update
      .mockReturnValueOnce(claimQuery)
      .mockReturnValueOnce(failureQuery);
  
    mocks.dispatchNotification.mockRejectedValue(
      new Error("Delivery outcome uncertain"),
    );
  
    const result = await processDueNotificationJobs();
  
    expect(failureQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
      }),
    );
  
    expect(result).toMatchObject({
      candidates: 1,
      processed: 0,
      failed: 0,
      skipped: 1,
    });
  });
});