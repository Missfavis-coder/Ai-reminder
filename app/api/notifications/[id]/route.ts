import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { inAppNotifications } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const updateSchema = z.object({
  read: z.boolean(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const input = updateSchema.parse(await request.json());

    const [notification] = await db
      .update(inAppNotifications)
      .set({
        readAt: input.read ? new Date() : null,
      })
      .where(
        and(
          eq(inAppNotifications.id, id),
          eq(inAppNotifications.userId, userId),
        ),
      )
      .returning();

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ notification });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid notification update." },
        { status: 400 },
      );
    }

    console.error("Failed to update notification:", error);

    return NextResponse.json(
      { error: "Could not update notification." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const [deleted] = await db
      .delete(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.id, id),
          eq(inAppNotifications.userId, userId),
        ),
      )
      .returning({ id: inAppNotifications.id });

    if (!deleted) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    console.error("Failed to delete notification:", error);

    return NextResponse.json(
      { error: "Could not delete notification." },
      { status: 500 },
    );
  }
}