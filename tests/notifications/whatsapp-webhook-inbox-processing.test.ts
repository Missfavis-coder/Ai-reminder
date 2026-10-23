
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  selectResults: [] as unknown[][],
  updateResults: [] as unknown[][],
  updateCalls: [] as Array<{ table: unknown; values: unknown }>,
  limitCalls: [] as number[],
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}));

vi.mock("@/lib/server/db/schema", () => ({
  whatsappWebhookEvents: {
    id: "event.id",
    eventKey: "event.eventKey",
    providerMessageId: "event.providerMessageId",
    providerStatus: "event.providerStatus",
    payload: "event.payload",
    status: "event.status",
    attempts: "event.attempts",
    processingStartedAt: "event.processingStartedAt",
    nextAttemptAt: "event.nextAttemptAt",
    lastError: "event.lastError",
    receivedAt: "event.receivedAt",
    processedAt: "event.processedAt",
  },
  notificationDeliveries: {
    id: "delivery.id",
    jobId: "delivery.jobId",
    status: "delivery.status",
    providerMessageId: "delivery.providerMessageId",
    deliveredAt: "delivery.deliveredAt",
    errorMessage: "delivery.errorMessage",
  },
  notificationJobs: {
    id: "job.id",
    status: "job.status",
    lastError: "job.lastError",
    updatedAt: "job.updatedAt",
  },
}));

import {
  processPendingWhatsAppWebhookEvents,
  recoverStaleWhatsAppWebhookEvents,
} from "@/lib/server/notifications/whatsapp-webhook-inbox";

const EVENT_ID = "event-1";
const MESSAGE_ID = "wamid.test123";
const DELIVERY_ID = "delivery-1";
const JOB_ID = "job-1";

function makeEvent(
  status: "sent" | "delivered" | "read" | "failed",
  attempts = 1,
) {
  return {
    id: EVENT_ID,
    eventKey: "event-key",
    providerMessageId: MESSAGE_ID,
    providerStatus: status,
    payload: {
      id: MESSAGE_ID,
      status,
      timestamp: "1792730000",
      ...(status === "failed"
        ? { errors: [{ code: 131000, title: "Test failure" }] }
        : {}),
    },
    status: "processing",
    attempts,
    processingStartedAt: new Date(),
    nextAttemptAt: null,
    lastError: null,
    receivedAt: new Date(),
    processedAt: null,
  };
}

function setupMocks() {
  mocks.select.mockImplementation(() => {
    const query: Record<string, unknown> = {};

    query.from = vi.fn(() => query);
    query.where = vi.fn(() => query);
    query.orderBy = vi.fn(() => query);
    query.limit = vi.fn(async (value?: number) => {
      if (typeof value === "number") {
        mocks.limitCalls.push(value);
      }

      return mocks.selectResults.shift() ?? [];
    });

    return query;
  });

  mocks.update.mockImplementation((table: unknown) => {
    const query: Record<string, unknown> = {};
    let values: unknown;

    query.set = vi.fn((nextValues: unknown) => {
      values = nextValues;
      return query;
    });

    query.where = vi.fn(() => {
      mocks.updateCalls.push({ table, values });

      const updateQuery: Record<string, unknown> = {};

      updateQuery.returning = vi.fn(
        async () => mocks.updateResults.shift() ?? [],
      );

      updateQuery.then = (
        resolve: (value: unknown[]) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve([]).then(resolve, reject);

      return updateQuery;
    });

    return query;
  });
}

function expectUpdate(tableName: "event" | "delivery" | "job") {
  const tableByName = {
    event: "event.id",
    delivery: "delivery.id",
    job: "job.id",
  } as const;

  const tableId = tableByName[tableName];

  return mocks.updateCalls
    .filter((call) => {
      const columns = call.table as Record<string, unknown>;
      return columns.id === tableId;
    })
    .at(-1);
}

describe("WhatsApp webhook inbox processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectResults = [];
    mocks.updateResults = [];
    mocks.updateCalls = [];
    mocks.limitCalls = [];
    setupMocks();
  });

  it("returns zero counts when no events are eligible", async () => {
    mocks.selectResults = [[]];

    await expect(processPendingWhatsAppWebhookEvents()).resolves.toEqual({
      processed: 0,
      retried: 0,
      failed: 0,
    });
  });

  it("clamps batch limits", async () => {
    mocks.selectResults = [[], []];

    await processPendingWhatsAppWebhookEvents(0);
    expect(mocks.limitCalls).toContain(1);

    await processPendingWhatsAppWebhookEvents(1000);
    expect(mocks.limitCalls).toContain(500);
  });

  it.each(["delivered", "read"] as const)(
    "processes a %s receipt and marks the event processed",
    async (status) => {
      mocks.selectResults = [
        [{ id: EVENT_ID }],
        [makeEvent(status)],
        [{ id: DELIVERY_ID, jobId: JOB_ID, status: "sent" }],
        [{ status: "processed" }],
      ];

      mocks.updateResults = [[{ id: EVENT_ID, attempts: 1 }]];

      const result = await processPendingWhatsAppWebhookEvents();

      expect(result).toEqual({
        processed: 1,
        retried: 0,
        failed: 0,
      });

      expect(expectUpdate("delivery")?.values).toEqual(
        expect.objectContaining({
          status: "delivered",
          errorMessage: null,
          deliveredAt: expect.any(Date),
        }),
      );

      expect(expectUpdate("job")?.values).toEqual(
        expect.objectContaining({
          status: "sent",
          lastError: null,
        }),
      );

      expect(expectUpdate("event")?.values).toEqual(
        expect.objectContaining({
          status: "processed",
          processingStartedAt: null,
        }),
      );
    },
  );

  it("schedules an unmatched message for retry", async () => {
    mocks.selectResults = [
      [{ id: EVENT_ID }],
      [makeEvent("delivered")],
      [],
      [{ status: "pending" }],
    ];

    mocks.updateResults = [[{ id: EVENT_ID, attempts: 1 }]];

    const result = await processPendingWhatsAppWebhookEvents();

    expect(result).toEqual({
      processed: 0,
      retried: 1,
      failed: 0,
    });

    expect(expectUpdate("event")?.values).toEqual(
      expect.objectContaining({
        status: "pending",
        lastError: expect.stringContaining(MESSAGE_ID),
        nextAttemptAt: expect.any(Date),
        processingStartedAt: null,
      }),
    );
  });

  it("marks an unmatched event failed after the maximum attempt", async () => {
    mocks.selectResults = [
      [{ id: EVENT_ID }],
      [makeEvent("delivered", 8)],
      [],
      [{ status: "failed" }],
    ];

    mocks.updateResults = [[{ id: EVENT_ID, attempts: 8 }]];

    const result = await processPendingWhatsAppWebhookEvents();

    expect(result).toEqual({
      processed: 0,
      retried: 0,
      failed: 1,
    });

    expect(expectUpdate("event")?.values).toEqual(
      expect.objectContaining({
        status: "failed",
        nextAttemptAt: null,
        processingStartedAt: null,
      }),
    );
  });

  it("recovers stale events and fails exhausted ones", async () => {
    mocks.updateResults = [
      [{ id: "exhausted-event" }],
      [{ id: "recoverable-event" }],
    ];

    await expect(recoverStaleWhatsAppWebhookEvents()).resolves.toEqual({
      recovered: 1,
      exhausted: 1,
    });

    expect(mocks.updateCalls).toHaveLength(2);

    expect(mocks.updateCalls[0].values).toEqual(
      expect.objectContaining({
        status: "failed",
        processingStartedAt: null,
        nextAttemptAt: null,
      }),
    );

    expect(mocks.updateCalls[1].values).toEqual(
      expect.objectContaining({
        status: "pending",
        processingStartedAt: null,
        nextAttemptAt: expect.any(Date),
      }),
    );
  });
});
