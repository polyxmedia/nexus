// AES-256-GCM encryption for sensitive settings values (API keys, secrets).
// Requires SETTINGS_ENCRYPTION_KEY env var (32-byte hex = 64 hex chars).
// Generate with: openssl rand -hex 32

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:"; // marks encrypted values so we can detect unencrypted legacy values

function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SETTINGS_ENCRYPTION_KEY must be set in production");
    }
    // Dev fallback — deterministic but not secure. Fine for local dev only.
    return Buffer.from("00".repeat(32), "hex");
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
  return PREFIX + iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) {
    // Legacy plaintext value — return as-is (allows gradual migration)
    return value;
  }
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted value format");
  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}
