import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, isNull } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { inAppNotifications } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const updateAllSchema = z.object({
  action: z.literal("mark_all_read"),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const notifications = await db
      .select({
        id: inAppNotifications.id,
        title: inAppNotifications.title,
        description: inAppNotifications.description,
        category: inAppNotifications.category,
        icon: inAppNotifications.icon,
        actionLabel: inAppNotifications.actionLabel,
        actionHref: inAppNotifications.actionHref,
        readAt: inAppNotifications.readAt,
        createdAt: inAppNotifications.createdAt,
      })
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, userId))
      .orderBy(desc(inAppNotifications.createdAt));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to load notifications:", error);

    return NextResponse.json(
      { error: "Could not load notifications." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const input = updateAllSchema.parse(await request.json());

    if (input.action === "mark_all_read") {
      await db
        .update(inAppNotifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(inAppNotifications.userId, userId),
            isNull(inAppNotifications.readAt),
          ),
        );
    }

    return NextResponse.json({
      success: true,
      message: "Notifications marked as read.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid notification action." },
        { status: 400 },
      );
    }

    console.error("Failed to update notifications:", error);

    return NextResponse.json(
      { error: "Could not update notifications." },
      { status: 500 },
    );
  }
}