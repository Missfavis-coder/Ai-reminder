
import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { notificationChannels } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

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
      .where(
        and(
          eq(notificationChannels.userId, userId),
          eq(notificationChannels.enabled, true),
          isNotNull(notificationChannels.verifiedAt),
          isNotNull(notificationChannels.consentGrantedAt),
        ),
      );

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Failed to load notification channels:", error);

    return NextResponse.json(
      { error: "Could not load notification channels." },
      { status: 500 },
    );
  }
}
