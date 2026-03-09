// API key generation, hashing, and validation.
// Keys follow format: sk-nxs-{32 hex chars} (40 chars total).
// Only the SHA-256 hash is stored; the plaintext is shown once at creation.

import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "sk-nxs-";
const KEY_RAND_BYTES = 16; // 16 bytes = 32 hex chars

/** Generate a new API key. Returns { raw, hash, prefix }. */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const rand = randomBytes(KEY_RAND_BYTES).toString("hex");
  const raw = `${KEY_PREFIX}${rand}`;
  const hash = hashApiKey(raw);
  const prefix = `${KEY_PREFIX}${rand.slice(0, 8)}...`;
  return { raw, hash, prefix };
}

/** SHA-256 hash of a raw API key. Used for storage and lookup. */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Validate that a string looks like a Nexus API key. */
export function isValidKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length === KEY_PREFIX.length + KEY_RAND_BYTES * 2;
}

/** Max API keys per user. */
export const MAX_KEYS_PER_USER = 5;
