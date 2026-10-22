
import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function getEncryptionKey(): Buffer {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY;

  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be a 32-byte hex key",
    );
  }

  return Buffer.from(value, "hex");
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv,
  );

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

export function decryptToken(encrypted: string): string {
  const [ivHex, tagHex, ciphertextHex] = encrypted.split(":");

  if (!ivHex || !tagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted token format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
