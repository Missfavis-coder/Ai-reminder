import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { ZodError, z } from "zod";

import { db } from "@/lib/server/db";
import { extensionTokens } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

const createTokenSchema = z.object({
  name: z.string().trim().min(1).max(200).default("VS Code Extension"),
});

const TOKEN_DURATION_MS = 90 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
    const input = createTokenSchema.parse(body);

    // Generate a high-entropy token. Return the raw token only once.
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_DURATION_MS);

    const [created] = await db
      .insert(extensionTokens)
      .values({
        userId,
        name: input.name,
        tokenHash,
        expiresAt,
      })
      .returning({
        id: extensionTokens.id,
        name: extensionTokens.name,
        expiresAt: extensionTokens.expiresAt,
      });

    if (!created) {
      return NextResponse.json(
        { error: "Could not create extension token." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        token,
        id: created.id,
        name: created.name,
        expiresAt: created.expiresAt,
        warning: "Copy this token now. It cannot be retrieved again.",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Extension token creation failed.");

    return NextResponse.json(
      { error: "Could not create extension token." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();

    const input = z
      .object({ id: z.string().uuid() })
      .parse(body);

    const [revoked] = await db
      .update(extensionTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(extensionTokens.id, input.id),
          eq(extensionTokens.userId, userId),
          isNull(extensionTokens.revokedAt),
        ),
      )
      .returning({ id: extensionTokens.id });

    if (!revoked) {
      return NextResponse.json(
        { error: "Active extension token not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ revoked: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Extension token revocation failed.");

    return NextResponse.json(
      { error: "Could not revoke extension token." },
      { status: 500 },
    );
  }
}