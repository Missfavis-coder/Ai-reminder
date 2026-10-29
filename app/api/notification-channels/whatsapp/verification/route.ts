
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import {
  notificationChannels,
  whatsappVerificationChallenges,
} from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";
import {
  sendWhatsAppVerificationTemplate,
} from "@/lib/server/integrations/providers/whatsapp/client";


const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  // Require international format, e.g. +2348012345678.
  const phone = value.replace(/[\s()-]/g, "");

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return null;

  return phone.slice(1);
}

function hashCode(userId: string, phone: string, code: string) {
  const secret = process.env.WHATSAPP_VERIFICATION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "WHATSAPP_VERIFICATION_SECRET must be at least 32 characters",
    );
  }

  return createHmac("sha256", secret)
    .update(`${userId}:${phone}:${code}`)
    .digest("hex");
}

function hashesMatch(expected: string, actual: string) {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(actual, "hex");

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) return jsonError("Unauthorized", 401);

  let body: {
    action?: unknown;
    phoneNumber?: unknown;
    code?: unknown;
    consent?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const phone = normalizePhone(body.phoneNumber);

  if (!phone) {
    return jsonError(
      "Enter a valid international number, such as +2348012345678.",
      400,
    );
  }

  if (body.action === "request") {
    if (body.consent !== true) {
      return jsonError(
        "Consent is required before sending WhatsApp reminders.",
        400,
      );
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    try {
      await db
        .delete(whatsappVerificationChallenges)
        .where(
          and(
            eq(whatsappVerificationChallenges.userId, userId),
            eq(whatsappVerificationChallenges.destination, phone),
          ),
        );

      await db.insert(whatsappVerificationChallenges).values({
        userId,
        destination: phone,
        codeHash: hashCode(userId, phone, code),
        expiresAt,
        attempts: 0,
      });

      try {
        await sendWhatsAppVerificationTemplate(phone, code);
      } catch (error) {
        await db
          .delete(whatsappVerificationChallenges)
          .where(
            and(
              eq(whatsappVerificationChallenges.userId, userId),
              eq(whatsappVerificationChallenges.destination, phone),
            ),
          );

        throw error;
      }

      return NextResponse.json({
        success: true,
        message: "Verification code sent through WhatsApp.",
        expiresInSeconds: CODE_TTL_MS / 1000,
      });
    } catch (error) {
      console.error("WhatsApp verification request failed:", error);

      return jsonError(
        error instanceof Error &&
          error.message.includes("not configured")
          ? "WhatsApp Cloud API is not configured on the server."
          : "Could not send a WhatsApp verification code. Check your server configuration and Meta template.",
        502,
      );
    }
  }

  if (body.action === "verify") {
    if (
      typeof body.code !== "string" ||
      !/^\d{6}$/.test(body.code)
    ) {
      return jsonError("Enter the six-digit verification code.", 400);
    }

    const [challenge] = await db
      .select()
      .from(whatsappVerificationChallenges)
      .where(
        and(
          eq(whatsappVerificationChallenges.userId, userId),
          eq(whatsappVerificationChallenges.destination, phone),
        ),
      )
      .limit(1);

    if (!challenge) {
      return jsonError(
        "No active verification request exists. Request a new code.",
        400,
      );
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await db
        .delete(whatsappVerificationChallenges)
        .where(eq(whatsappVerificationChallenges.id, challenge.id));

      return jsonError("The code expired. Request a new one.", 400);
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      await db
        .delete(whatsappVerificationChallenges)
        .where(eq(whatsappVerificationChallenges.id, challenge.id));

      return jsonError(
        "Too many attempts. Request a new verification code.",
        429,
      );
    }

    const actualHash = hashCode(userId, phone, body.code);

    if (!hashesMatch(challenge.codeHash, actualHash)) {
      await db
        .update(whatsappVerificationChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(whatsappVerificationChallenges.id, challenge.id));

      return jsonError("Incorrect verification code.", 400);
    }

    const [existing] = await db
      .select({ id: notificationChannels.id })
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, userId),
          eq(notificationChannels.type, "whatsapp"),
        ),
      )
      .limit(1);

    const now = new Date();

    if (existing) {
      await db
        .update(notificationChannels)
        .set({
          destination: phone,
          consentGrantedAt: now,
          verifiedAt: now,
          enabled: true,
        })
        .where(eq(notificationChannels.id, existing.id));
    } else {
      await db.insert(notificationChannels).values({
        userId,
        type: "whatsapp",
        destination: phone,
        consentGrantedAt: now,
        verifiedAt: now,
        enabled: true,
      });
    }

    await db
      .delete(whatsappVerificationChallenges)
      .where(eq(whatsappVerificationChallenges.id, challenge.id));

    return NextResponse.json({
      success: true,
      message: "WhatsApp number verified and enabled.",
    });
  }

  return jsonError("Action must be request or verify.", 400);
}
