
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq, and, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { authSessions, users } from "@/lib/server/db/schema";

const SESSION_COOKIE = "ai_reminder_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(authSessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const [session] = await db
    .select({ userId: authSessions.userId })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        gt(authSessions.expiresAt, now),
        isNull(authSessions.revokedAt),
      ),
    )
    .limit(1);

  return session?.userId ?? null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.tokenHash, hashToken(token)),
          isNull(authSessions.revokedAt),
        ),
      );
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
