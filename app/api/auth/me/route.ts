
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { getCurrentUserId } from
  "@/lib/server/auth/session";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        timezone: users.timezone,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.json({ user });
  } catch {
    console.error("Current-user lookup failed.");

    return NextResponse.json(
      { error: "Unable to retrieve your account." },
      { status: 500 },
    );
  }
}
