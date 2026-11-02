
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { extensionAuthRequests } from "@/lib/server/db/schema";
import { safeHashCompare } from "@/lib/server/auth/extension-auth";

export async function GET(request: NextRequest) {
  try {
    const requestId = request.nextUrl.searchParams.get("requestId");
    const authorization = request.headers.get("authorization");

    if (!requestId || !authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Invalid authorization request." },
        { status: 400 },
      );
    }

    const pollToken = authorization.slice(7);

    const [authRequest] = await db
      .select()
      .from(extensionAuthRequests)
      .where(eq(extensionAuthRequests.id, requestId))
      .limit(1);

    if (
      !authRequest ||
      !safeHashCompare(pollToken, authRequest.pollTokenHash)
    ) {
      return NextResponse.json(
        { error: "Authorization request not found." },
        { status: 404 },
      );
    }

    if (authRequest.expiresAt <= new Date()) {
      return NextResponse.json({ status: "expired" });
    }

    return NextResponse.json(
      { status: authRequest.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Extension authorization status failed:", error);

    return NextResponse.json(
      { error: "Could not check authorization status." },
      { status: 500 },
    );
  }
}
