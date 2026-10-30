import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { extensionTokens, users } from "@/lib/server/db/schema";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getUserIdFromExtensionToken(
  token: string,
): Promise<string | null> {
  if (!token || token.length > 200) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const [record] = await db
    .select({
      userId: extensionTokens.userId,
    })
    .from(extensionTokens)
    .innerJoin(users, eq(extensionTokens.userId, users.id))
    .where(
      and(
        eq(extensionTokens.tokenHash, tokenHash),
        gt(extensionTokens.expiresAt, now),
        isNull(extensionTokens.revokedAt),
      ),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  await db
    .update(extensionTokens)
    .set({ lastUsedAt: now })
    .where(eq(extensionTokens.tokenHash, tokenHash));

  return record.userId;
}