import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { notificationChannels } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const createChannelSchema = z.object({
  type: z.enum(["whatsapp", "instagram", "web_push", "desktop", "email"]),
  destination: z.string().trim().min(1).max(320),
  consent: z.literal(true),
});

const updateChannelSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
});

const whatsappDestinationSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid international phone number.");

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return all saved channels so the UI can show disabled/unverified ones too.
    const channels = await db
      .select({
        id: notificationChannels.id,
        type: notificationChannels.type,
        destination: notificationChannels.destination,
        enabled: notificationChannels.enabled,
        verifiedAt: notificationChannels.verifiedAt,
        consentGrantedAt: notificationChannels.consentGrantedAt,
      })
      .from(notificationChannels)
      .where(eq(notificationChannels.userId, userId));

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Failed to load notification channels:", error);

    return NextResponse.json(
      { error: "Could not load notification channels." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = createChannelSchema.parse(body);

    if (input.type === "whatsapp") {
      const result = whatsappDestinationSchema.safeParse(input.destination);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0]?.message ?? "Invalid phone number." },
          { status: 400 },
        );
      }
    }

    const [existing] = await db
      .select()
      .from(notificationChannels)
      .where(
        and(
          eq(notificationChannels.userId, userId),
          eq(notificationChannels.type, input.type),
        ),
      )
      .limit(1);

    const now = new Date();

    const values = {
      destination: input.destination,
      enabled: true,
      consentGrantedAt: now,
      // Saving a destination does not mean the provider verified it.
      verifiedAt:
        existing?.destination === input.destination
          ? existing.verifiedAt
          : null,
    };

    const [channel] = existing
      ? await db
          .update(notificationChannels)
          .set(values)
          .where(
            and(
              eq(notificationChannels.id, existing.id),
              eq(notificationChannels.userId, userId),
            ),
          )
          .returning({
            id: notificationChannels.id,
            type: notificationChannels.type,
            destination: notificationChannels.destination,
            enabled: notificationChannels.enabled,
            verifiedAt: notificationChannels.verifiedAt,
            consentGrantedAt: notificationChannels.consentGrantedAt,
          })
      : await db
          .insert(notificationChannels)
          .values({
            userId,
            type: input.type,
            ...values,
          })
          .returning({
            id: notificationChannels.id,
            type: notificationChannels.type,
            destination: notificationChannels.destination,
            enabled: notificationChannels.enabled,
            verifiedAt: notificationChannels.verifiedAt,
            consentGrantedAt: notificationChannels.consentGrantedAt,
          });

    return NextResponse.json(
      {
        channel,
        message: "Notification channel saved.",
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid channel details." },
        { status: 400 },
      );
    }

    console.error("Failed to save notification channel:", error);

    return NextResponse.json(
      { error: "Could not save notification channel." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = updateChannelSchema.parse(body);

    const [channel] = await db
      .update(notificationChannels)
      .set({ enabled: input.enabled })
      .where(
        and(
          eq(notificationChannels.id, input.id),
          eq(notificationChannels.userId, userId),
        ),
      )
      .returning({
        id: notificationChannels.id,
        type: notificationChannels.type,
        destination: notificationChannels.destination,
        enabled: notificationChannels.enabled,
        verifiedAt: notificationChannels.verifiedAt,
        consentGrantedAt: notificationChannels.consentGrantedAt,
      });

    if (!channel) {
      return NextResponse.json(
        { error: "Notification channel not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ channel });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid channel update." },
        { status: 400 },
      );
    }

    console.error("Failed to update notification channel:", error);

    return NextResponse.json(
      { error: "Could not update notification channel." },
      { status: 500 },
    );
  }
}