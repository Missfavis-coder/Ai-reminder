
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { extensionAuthRequests } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const approvalSchema = z.object({
  requestId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to Taskier." },
        { status: 401 },
      );
    }

    const input = approvalSchema.parse(await request.json());

    const [approved] = await db
      .update(extensionAuthRequests)
      .set({
        userId,
        status: "approved",
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(extensionAuthRequests.id, input.requestId),
          eq(extensionAuthRequests.status, "pending"),
          gt(extensionAuthRequests.expiresAt, new Date()),
        ),
      )
      .returning({
        id: extensionAuthRequests.id,
      });

    if (!approved) {
      return NextResponse.json(
        { error: "This authorization request has expired or was already handled." },
        { status: 409 },
      );
    }

    return NextResponse.json({ approved: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Extension authorization approval failed:", error);

    return NextResponse.json(
      { error: "Could not approve VS Code connection." },
      { status: 500 },
    );
  }
}
