
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { workspaces } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";
import { getUserIdFromExtensionToken } from "@/lib/server/auth/extension-token";

async function authenticateRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const match = authorization.match(/^Bearer ([^\s]+)$/i);
    if (!match) return null;

    return getUserIdFromExtensionToken(match[1]);
  }

  return getCurrentUserId();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const userId = await authenticateRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;

    const [workspace] = await db
      .update(workspaces)
      .set({ status: "disconnected" })
      .where(
        and(
          eq(workspaces.id, workspaceId),
          eq(workspaces.userId, userId),
        ),
      )
      .returning();

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Workspace disconnect failed:", error);

    return NextResponse.json(
      { error: "Could not disconnect workspace." },
      { status: 500 },
    );
  }
}
