import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import {
  processPendingWhatsAppWebhookEvents,
  recoverStaleWhatsAppWebhookEvents,
} from "@/lib/server/notifications/whatsapp-webhook-inbox";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);

  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const recovery = await recoverStaleWhatsAppWebhookEvents();
    const processing = await processPendingWhatsAppWebhookEvents(100);

    return NextResponse.json({
      success: true,
      recovery,
      processing,
    });
  } catch (error) {
    console.error("WhatsApp inbox cron failed:", error);

    return NextResponse.json(
      { error: "Failed to process WhatsApp webhook inbox" },
      { status: 500 },
    );
  }
}