
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { ZodError, z } from "zod";

import { db } from "@/lib/server/db";
import { workspaces } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const createWorkspaceSchema = z.object({
  provider: z.enum(["browser", "vscode"]),
  name: z.string().trim().min(1).max(200),
  deviceId: z.string().trim().min(1).max(200).optional(),
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

    const items = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, userId))
      .orderBy(desc(workspaces.createdAt));

    return NextResponse.json({ workspaces: items });
  } catch {
    console.error("Failed to list workspaces.");

    return NextResponse.json(
      { error: "Could not load workspaces." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const input = createWorkspaceSchema.parse(body);

    if (input.deviceId) {
      const [existing] = await db
        .select()
        .from(workspaces)
        .where(
          and(
            eq(workspaces.userId, userId),
            eq(workspaces.provider, input.provider),
            eq(workspaces.deviceId, input.deviceId),
          ),
        )
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(workspaces)
          .set({
            name: input.name,
            status: "connected",
            lastSeenAt: new Date(),
          })
          .where(
            and(
              eq(workspaces.id, existing.id),
              eq(workspaces.userId, userId),
            ),
          )
          .returning();

        return NextResponse.json(
          { workspace: updated ?? existing },
          { status: 200 },
        );
      }
    }

    const [workspace] = await db
      .insert(workspaces)
      .values({
        userId,
        provider: input.provider,
        name: input.name,
        deviceId: input.deviceId ?? null,
        status: "connected",
        lastSeenAt: new Date(),
      })
      .returning();

    if (!workspace) {
      return NextResponse.json(
        { error: "Could not create workspace." },
        { status: 500 },
      );
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid workspace.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Failed to create workspace.");

    return NextResponse.json(
      { error: "Could not create workspace." },
      { status: 500 },
    );
  }
}
