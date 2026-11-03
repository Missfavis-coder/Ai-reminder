import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/lib/server/db";
import {
  activityEvents,
  workspaces,
} from "@/lib/server/db/schema";

import { WorkspaceNotFoundError } from "@/lib/server/error";

import {
  activityEventSchema,
  validateEventTimestamp,
} from "@/lib/server/activity/type";

import { processActivityEvent } from "@/lib/server/activity/event-processor";
import { getCurrentUserId } from "@/lib/server/auth/session";
import { getUserIdFromExtensionToken } from "@/lib/server/auth/extension-token";

async function authenticateRequest(
  request: NextRequest,
): Promise<string | null> {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const match = authorization.match(/^Bearer ([^\s]+)$/i);

    if (!match) return null;

    return getUserIdFromExtensionToken(match[1]);
  }

  return getCurrentUserId();
}

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

    const searchParams = request.nextUrl.searchParams;

    const workspaceId = searchParams.get("workspaceId");
    const period = searchParams.get("period");
    const requestedLimit = Number(searchParams.get("limit") ?? 100);

    const limit = Math.min(
      Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1),
      500,
    );

    const conditions = [
      eq(activityEvents.userId, userId),
      gte(activityEvents.occurredAt, getPeriodStart(period)),
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

      conditions.push(eq(activityEvents.workspaceId, workspaceId));
    }

    const events = await db
      .select()
      .from(activityEvents)
      .where(and(...conditions))
      .orderBy(desc(activityEvents.occurredAt))
      .limit(limit);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Could not retrieve activity events:", error);

    return NextResponse.json(
      { error: "Could not load activity events." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const event = activityEventSchema.parse(body);

    const timestampCheck = validateEventTimestamp(event.occurredAt);

    if (!timestampCheck.valid) {
      return NextResponse.json(
        {
          error: "Activity event timestamp is outside the allowed window.",
          reason: timestampCheck.reason,
        },
        { status: 400 },
      );
    }

    const result = await processActivityEvent({
      userId,
      event,
    });
    
    if ("ignored" in result && result.ignored) {
      return NextResponse.json(result, { status: 200 });
    }
    
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof WorkspaceNotFoundError) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid activity event.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Activity event processing failed:", error);

    return NextResponse.json(
      { error: "Could not process activity event." },
      { status: 500 },
    );
  }
}