
import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, values, onConflictDoNothing, returning } = vi.hoisted(
  () => ({
    insert: vi.fn(),
    values: vi.fn(),
    onConflictDoNothing: vi.fn(),
    returning: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/db", () => ({
  db: {
    insert,
  },
}));

vi.mock("@/lib/server/db/schema", () => ({
  whatsappWebhookEvents: {
    eventKey: "eventKey",
    id: "id",
  },
  notificationDeliveries: {},
  notificationJobs: {},
}));

import {
  createWhatsAppEventKey,
  saveWhatsAppWebhookEvent,
} from "@/lib/server/notifications/whatsapp-webhook-inbox";

describe("WhatsApp webhook inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    insert.mockReturnValue({ values });
    values.mockReturnValue({ onConflictDoNothing });
    onConflictDoNothing.mockReturnValue({ returning });
  });

  it("creates a deterministic event key", () => {
    const event = {
      id: "wamid.test123",
      status: "delivered" as const,
      timestamp: "1792730000",
    };

    expect(createWhatsAppEventKey(event)).toBe(
      createWhatsAppEventKey(event),
    );
  });

  it("creates different keys for different statuses", () => {
    const base = {
      id: "wamid.test123",
      timestamp: "1792730000",
    };

    expect(
      createWhatsAppEventKey({ ...base, status: "sent" }),
    ).not.toBe(
      createWhatsAppEventKey({ ...base, status: "delivered" }),
    );
  });

  it("persists a new event", async () => {
    returning.mockResolvedValue([{ id: "event-1" }]);

    const event = {
      id: "wamid.test123",
      status: "delivered" as const,
      timestamp: "1792730000",
    };

    await expect(saveWhatsAppWebhookEvent(event)).resolves.toEqual({
      id: "event-1",
      duplicate: false,
    });

    expect(insert).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        providerMessageId: event.id,
        providerStatus: event.status,
        status: "pending",
      }),
    );
  });

  it("recognizes a duplicate event", async () => {
    returning.mockResolvedValue([]);

    await expect(
      saveWhatsAppWebhookEvent({
        id: "wamid.test123",
        status: "delivered",
      }),
    ).resolves.toEqual({
      id: null,
      duplicate: true,
    });
  });
});
