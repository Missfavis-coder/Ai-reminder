
import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashExtensionSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createRandomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeHashCompare(
  value: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashExtensionSecret(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}
