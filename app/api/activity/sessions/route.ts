import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "@/lib/server/db";

import {
  workspaceSessions,
  workspaces,
} from "@/lib/server/db/schema";

import { getCurrentUserId } from "@/lib/server/auth/session";

function getPeriodStart(period: string | null) {
  const now = new Date();

  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now;
  }

  if (period === "30d") {
    now.setDate(now.getDate() - 30);
    return now;
  }

  now.setDate(now.getDate() - 7);
  return now;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const params = request.nextUrl.searchParams;

    const workspaceId = params.get("workspaceId");
    const period = params.get("period");

    const requestedLimit = Number(params.get("limit") ?? 100);

    const limit = Math.min(
      Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1),
      500,
    );

    const conditions = [
      eq(workspaceSessions.userId, userId),
      gte(workspaceSessions.startedAt, getPeriodStart(period)),
    ];

    if (workspaceId) {
      const [ownedWorkspace] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(
          and(
            eq(workspaces.id, workspaceId),
            eq(workspaces.userId, userId),
          ),
        )
        .limit(1);

      if (!ownedWorkspace) {
        return NextResponse.json(
          { error: "Workspace not found." },
          { status: 404 },
        );
      }

      conditions.push(
        eq(workspaceSessions.workspaceId, workspaceId),
      );
    }

    const sessions = await db
      .select()
      .from(workspaceSessions)
      .where(and(...conditions))
      .orderBy(desc(workspaceSessions.startedAt))
      .limit(limit);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Could not retrieve workspace sessions:", error);

    return NextResponse.json(
      { error: "Could not load workspace sessions." },
      { status: 500 },
    );
  }
}