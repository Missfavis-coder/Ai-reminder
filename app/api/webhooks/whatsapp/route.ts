
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  saveWhatsAppWebhookEvent,
  processPendingWhatsAppWebhookEvents,
  type WhatsAppStatusEvent,
} from "@/lib/server/notifications/whatsapp-webhook-inbox";


type WhatsAppWebhookBody = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        statuses?: WhatsAppStatusEvent[];
      };
    }>;
  }>;
};

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;

  if (!secret || !signature) return false;

  const expected =
    "sha256=" +
    createHmac("sha256", secret).update(rawBody).digest("hex");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;

  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (
    params.get("hub.mode") !== "subscribe" ||
    !process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    token !== process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    challenge === null
  ) {
    return NextResponse.json(
      { error: "Webhook verification failed." },
      { status: 403 },
    );
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (
    !verifySignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
    )
  ) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let body: WhatsAppWebhookBody;

  try {
    body = JSON.parse(rawBody) as WhatsAppWebhookBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  let saved = 0;
  let duplicates = 0;

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        for (const event of change.value?.statuses ?? []) {
          if (
            !event.id ||
            !["sent", "delivered", "read", "failed"].includes(
              event.status,
            )
          ) {
            continue;
          }

          const result = await saveWhatsAppWebhookEvent(event);

          if (result.duplicate) duplicates++;
          else saved++;
        }
      }
    }

    // Events are already persisted. If processing fails, Meta can
    // safely retry; the unique event key prevents duplicate records.
    try {
      await processPendingWhatsAppWebhookEvents(100);
    } catch (error) {
      console.error("WhatsApp inbox processing failed.", {
        error:
          error instanceof Error ? error.message : "Unknown error",
      });
    }

    return NextResponse.json({
      success: true,
      saved,
      duplicates,
    });
  } catch (error) {
    console.error("WhatsApp webhook persistence failed.", {
      error:
        error instanceof Error ? error.message : "Unknown error",
    });

    // A 500 tells Meta that persistence failed and the callback
    // should be retried.
    return NextResponse.json(
      { error: "Could not persist webhook events." },
      { status: 500 },
    );
  }
}
