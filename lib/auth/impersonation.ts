// Secure admin impersonation utilities.
// Uses HMAC-SHA256 signed cookies with time-limited validity.
// Each token includes a unique nonce for server-side revocation.
// Admin role is re-validated on every session check via getValidatedImpersonation().

import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "nexus_impersonate";
const MAX_AGE_SECONDS = 60 * 60; // 1 hour

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET required for impersonation");
    }
    return "nexus-dev-secret-change-before-prod";
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret() + ":impersonate")
    .update(payload)
    .digest("hex");
}

export interface ImpersonationData {
  adminUsername: string;
  targetUsername: string;
  startedAt: number; // epoch ms
  nonce: string; // unique token ID for revocation
}

export function createImpersonationToken(adminUsername: string, targetUsername: string): string {
  const data: ImpersonationData = {
    adminUsername,
    targetUsername,
    startedAt: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  };
  const payload = JSON.stringify(data);
  const sig = sign(payload);
  // base64 the payload, append signature
  return Buffer.from(payload).toString("base64") + "." + sig;
}

export function verifyImpersonationToken(token: string): ImpersonationData | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;

    const payload = Buffer.from(b64, "base64").toString("utf8");
    const expectedSig = sign(payload);

    // Constant-time comparison
    if (sig.length !== expectedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (diff !== 0) return null;

    const data: ImpersonationData = JSON.parse(payload);

    // Check expiry - enforce 1 hour maximum duration
    const elapsed = Date.now() - data.startedAt;
    if (elapsed > MAX_AGE_SECONDS * 1000) return null;
    // Reject tokens with startedAt in the future (clock skew protection)
    if (data.startedAt > Date.now() + 60_000) return null;

    // Basic sanity
    if (!data.adminUsername || !data.targetUsername) return null;
    if (!data.nonce || typeof data.nonce !== "string") return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Re-validate that the admin user still holds the admin role in the database.
 * This catches cases where an admin's role was revoked while an impersonation
 * session was still active.
 */
async function verifyAdminRole(adminUsername: string): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${adminUsername}`));
    if (!rows[0]) return false;
    const data = JSON.parse(rows[0].value);
    return data.role === "admin" && !data.blocked;
  } catch {
    return false;
  }
}

/**
 * Check if a specific impersonation nonce has been revoked.
 */
async function isNonceRevoked(nonce: string): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `impersonate:revoked:${nonce}`));
    return rows.length > 0;
  } catch {
    // On DB error, fail closed (treat as revoked)
    return true;
  }
}

/**
 * Revoke a specific impersonation session by its nonce.
 * The revocation record auto-expires: it only needs to last as long as MAX_AGE_SECONDS
 * since the token itself expires after that. Cleanup can be done periodically.
 */
export async function revokeImpersonationNonce(nonce: string, adminUsername: string): Promise<void> {
  await db.insert(schema.settings).values({
    key: `impersonate:revoked:${nonce}`,
    value: JSON.stringify({
      revokedAt: new Date().toISOString(),
      revokedBy: adminUsername,
      expiresAt: new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString(),
    }),
  });
}

/**
 * Revoke all active impersonation sessions for a specific admin user.
 * Useful when an admin's role is being revoked.
 */
export async function revokeAllImpersonationsForAdmin(adminUsername: string): Promise<void> {
  // Store a marker that invalidates all tokens for this admin issued before now
  await db
    .insert(schema.settings)
    .values({
      key: `impersonate:revoke-all:${adminUsername}`,
      value: JSON.stringify({ revokedAt: Date.now() }),
    })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: JSON.stringify({ revokedAt: Date.now() }), updatedAt: new Date().toISOString() },
    });
}

/**
 * Check if all tokens for an admin were bulk-revoked after this token was issued.
 */
async function isAdminBulkRevoked(adminUsername: string, tokenIssuedAt: number): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `impersonate:revoke-all:${adminUsername}`));
    if (rows.length === 0) return false;
    const data = JSON.parse(rows[0].value);
    return data.revokedAt > tokenIssuedAt;
  } catch {
    return true; // fail closed
  }
}

export async function setImpersonationCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearImpersonationCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Read and cryptographically verify the impersonation cookie.
 * Does NOT re-validate admin role or check revocation -- use
 * getValidatedImpersonation() for full security checks.
 */
export async function getImpersonationFromCookie(): Promise<ImpersonationData | null> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifyImpersonationToken(cookie.value);
}

/**
 * Full validation of impersonation session:
 * 1. Cryptographic token verification + expiry check
 * 2. Re-validate admin still has admin role in the database
 * 3. Check the token nonce has not been revoked
 * 4. Check the admin has not had all tokens bulk-revoked
 *
 * If validation fails, the impersonation cookie is automatically cleared.
 * Use this instead of getImpersonationFromCookie() in session callbacks
 * and anywhere impersonation affects authorization decisions.
 */
export async function getValidatedImpersonation(): Promise<ImpersonationData | null> {
  const data = await getImpersonationFromCookie();
  if (!data) return null;

  // Re-validate admin role in DB
  const stillAdmin = await verifyAdminRole(data.adminUsername);
  if (!stillAdmin) {
    await clearImpersonationCookie();
    console.warn(
      `[IMPERSONATE] Session invalidated: admin "${data.adminUsername}" no longer has admin role`
    );
    return null;
  }

  // Check nonce revocation
  if (await isNonceRevoked(data.nonce)) {
    await clearImpersonationCookie();
    console.warn(
      `[IMPERSONATE] Session invalidated: nonce "${data.nonce}" was revoked`
    );
    return null;
  }

  // Check bulk revocation
  if (await isAdminBulkRevoked(data.adminUsername, data.startedAt)) {
    await clearImpersonationCookie();
    console.warn(
      `[IMPERSONATE] Session invalidated: all tokens for admin "${data.adminUsername}" were revoked`
    );
    return null;
  }

  return data;
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
