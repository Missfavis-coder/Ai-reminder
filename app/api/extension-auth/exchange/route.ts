
import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/server/db";
import {
  extensionAuthRequests,
  extensionTokens,
} from "@/lib/server/db/schema";
import { hashExtensionSecret } from "@/lib/server/auth/extension-auth";

const exchangeSchema = z.object({
  requestId: z.string().uuid(),
  pollToken: z.string().min(20).max(200),
  codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  deviceId: z.string().trim().min(1).max(200),
});

const TOKEN_DURATION_MS = 90 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const input = exchangeSchema.parse(await request.json());

    const expectedChallenge = createHash("sha256")
      .update(input.codeVerifier)
      .digest("base64url");

    const result = await db.transaction(async (tx) => {
      const [authRequest] = await tx
        .select()
        .from(extensionAuthRequests)
        .where(
          and(
            eq(extensionAuthRequests.id, input.requestId),
            eq(extensionAuthRequests.status, "approved"),
            gt(extensionAuthRequests.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (
        !authRequest ||
        !authRequest.userId ||
hashExtensionSecret(input.pollToken) !== authRequest.pollTokenHash ||
        expectedChallenge !== authRequest.codeChallenge
      ) {
        return null;
      }

      // Consume the request atomically. Only one exchange can succeed.
      const [consumed] = await tx
        .update(extensionAuthRequests)
        .set({
          status: "exchanged",
          exchangedAt: new Date(),
        })
        .where(
          and(
            eq(extensionAuthRequests.id, input.requestId),
            eq(extensionAuthRequests.status, "approved"),
            gt(extensionAuthRequests.expiresAt, new Date()),
          ),
        )
        .returning({
          userId: extensionAuthRequests.userId,
          deviceName: extensionAuthRequests.deviceName,
        });

      if (!consumed?.userId) {
        return null;
      }

      const token = randomBytes(32).toString("base64url");

      const [createdToken] = await tx
        .insert(extensionTokens)
        .values({
          userId: consumed.userId,
          name: consumed.deviceName,
          deviceId: input.deviceId,
          tokenHash: hashExtensionSecret(token),
          expiresAt: new Date(Date.now() + TOKEN_DURATION_MS),
        })
        .returning({
          id: extensionTokens.id,
          expiresAt: extensionTokens.expiresAt,
        });

      return createdToken
        ? { token, ...createdToken }
        : null;
    });

    if (!result) {
      return NextResponse.json(
        { error: "Authorization failed or has already been used." },
        { status: 401 },
      );
    }

    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid exchange request.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Extension token exchange failed:", error);

    return NextResponse.json(
      { error: "Could not complete VS Code authorization." },
      { status: 500 },
    );
  }
}
