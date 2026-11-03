import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import { workspaces } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";
import { getUserIdFromExtensionToken } from "@/lib/server/auth/extension-token";

const updateWorkspaceSchema = z.object({
  monitoringEnabled: z.boolean().optional(),
  status: z.enum(["connected", "disconnected"]).optional(),
}).refine(
  (data) =>
    data.monitoringEnabled !== undefined ||
    data.status !== undefined,
);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await authenticateRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const body: unknown = await request.json();
    const input = updateWorkspaceSchema.parse(body);

    const updateData: {
      monitoringEnabled?: boolean;
      status?: "connected" | "disconnected";
    } = {};

    if (input.monitoringEnabled !== undefined) {
      updateData.monitoringEnabled = input.monitoringEnabled;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Disconnecting a workspace must also stop monitoring.
    if (input.status === "disconnected") {
      updateData.monitoringEnabled = false;
    }

    const [workspace] = await db
      .update(workspaces)
      .set(updateData)
      .where(
        and(
          eq(workspaces.id, id),
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid workspace update.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Workspace update failed:", error);

    return NextResponse.json(
      { error: "Could not update workspace." },
      { status: 500 },
    );
  }
}