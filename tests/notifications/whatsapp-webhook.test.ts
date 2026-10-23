
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  saveWhatsAppWebhookEvent: vi.fn(),
  processPendingWhatsAppWebhookEvents: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}));

vi.mock("@/lib/server/db/schema", () => ({
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
    processingStartedAt: "job.processingStartedAt",
    lastError: "job.lastError",
    updatedAt: "job.updatedAt",
  },
  whatsappWebhookEvents: {
    id: "event.id",
    eventKey: "event.eventKey",
    providerMessageId: "event.providerMessageId",
    providerStatus: "event.providerStatus",
    payload: "event.payload",
    status: "event.status",
    attempts: "event.attempts",
    lastError: "event.lastError",
    receivedAt: "event.receivedAt",
    processedAt: "event.processedAt",
  },
}));

vi.mock("@/lib/server/notifications/whatsapp-webhook-inbox", () => ({
  saveWhatsAppWebhookEvent: mocks.saveWhatsAppWebhookEvent,
  processPendingWhatsAppWebhookEvents:
    mocks.processPendingWhatsAppWebhookEvents,
}));

import {
  GET,
  POST,
} from "@/app/api/webhooks/whatsapp/route";

function signedRequest(body: string, secret: string) {
  const signature =
    "sha256=" +
    createHmac("sha256", secret).update(body).digest("hex");

  return new NextRequest(
    "http://localhost/api/webhooks/whatsapp",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body,
    },
  );
}

function webhookBody(status: string) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              statuses: [
                {
                  id: "wamid.test-123",
                  status,
                  timestamp: "1790000000",
                  errors:
                    status === "failed"
                      ? [
                          {
                            code: 131026,
                            title: "Message undeliverable",
                          },
                        ]
                      : undefined,
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

describe("WhatsApp webhook", () => {
  const secret = "test-meta-app-secret";

  beforeEach(() => {
    vi.resetAllMocks();

    process.env.WHATSAPP_APP_SECRET = secret;
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN =
      "test-verify-token";

    mocks.saveWhatsAppWebhookEvent.mockResolvedValue({
      id: "event-1",
      duplicate: false,
    });

    mocks.processPendingWhatsAppWebhookEvents.mockResolvedValue({
      found: 1,
      processed: 1,
      unmatched: 0,
      ignored: 0,
    });
  });

  it("verifies Meta's webhook challenge", async () => {
    const request = new NextRequest(
      "http://localhost/api/webhooks/whatsapp" +
        "?hub.mode=subscribe" +
        "&hub.verify_token=test-verify-token" +
        "&hub.challenge=challenge-123",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("challenge-123");
  });

  it("rejects an invalid verification token", async () => {
    const request = new NextRequest(
      "http://localhost/api/webhooks/whatsapp" +
        "?hub.mode=subscribe" +
        "&hub.verify_token=wrong-token" +
        "&hub.challenge=challenge-123",
    );

    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it("rejects POST requests with an invalid signature", async () => {
    const request = new NextRequest(
      "http://localhost/api/webhooks/whatsapp",
      {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=invalid",
        },
        body: webhookBody("delivered"),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mocks.saveWhatsAppWebhookEvent).not.toHaveBeenCalled();
    expect(
      mocks.processPendingWhatsAppWebhookEvents,
    ).not.toHaveBeenCalled();
  });

  it("persists delivered events and starts inbox processing", async () => {
    const response = await POST(
      signedRequest(webhookBody("delivered"), secret),
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      saved: 1,
      duplicates: 0,
    });

    expect(mocks.saveWhatsAppWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "wamid.test-123",
        status: "delivered",
        timestamp: "1790000000",
      }),
    );

    expect(
      mocks.processPendingWhatsAppWebhookEvents,
    ).toHaveBeenCalledWith(100);
  });

  it("persists failed events including provider error details", async () => {
    const response = await POST(
      signedRequest(webhookBody("failed"), secret),
    );

    expect(response.status).toBe(200);

    expect(mocks.saveWhatsAppWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "wamid.test-123",
        status: "failed",
        errors: [
          expect.objectContaining({
            code: 131026,
            title: "Message undeliverable",
          }),
        ],
      }),
    );
  });

  it("persists delayed sent events for ordered inbox processing", async () => {
    const response = await POST(
      signedRequest(webhookBody("sent"), secret),
    );

    expect(response.status).toBe(200);

    expect(mocks.saveWhatsAppWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "wamid.test-123",
        status: "sent",
      }),
    );

    expect(
      mocks.processPendingWhatsAppWebhookEvents,
    ).toHaveBeenCalledWith(100);
  });

  it("reports duplicate events without creating another event", async () => {
    mocks.saveWhatsAppWebhookEvent.mockResolvedValue({
      id: null,
      duplicate: true,
    });

    const response = await POST(
      signedRequest(webhookBody("delivered"), secret),
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      saved: 0,
      duplicates: 1,
    });

    expect(mocks.saveWhatsAppWebhookEvent).toHaveBeenCalledTimes(1);
  });

  it("acknowledges unmatched events that are retained in the inbox", async () => {
    mocks.processPendingWhatsAppWebhookEvents.mockResolvedValue({
      found: 1,
      processed: 0,
      unmatched: 1,
      ignored: 0,
    });

    const response = await POST(
      signedRequest(webhookBody("delivered"), secret),
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      saved: 1,
      duplicates: 0,
    });

    expect(
      mocks.processPendingWhatsAppWebhookEvents,
    ).toHaveBeenCalledWith(100);
  });

  it("still acknowledges persisted events when immediate processing fails", async () => {
    mocks.processPendingWhatsAppWebhookEvents.mockRejectedValue(
      new Error("Temporary processing failure"),
    );

    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await POST(
        signedRequest(webhookBody("delivered"), secret),
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        success: true,
        saved: 1,
      });

      expect(mocks.saveWhatsAppWebhookEvent).toHaveBeenCalledTimes(1);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
