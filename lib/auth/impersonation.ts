// Secure admin impersonation utilities.
// Uses HMAC-SHA256 signed cookies with time-limited validity.

import { createHmac } from "crypto";
import { cookies } from "next/headers";

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
}

export function createImpersonationToken(adminUsername: string, targetUsername: string): string {
  const data: ImpersonationData = {
    adminUsername,
    targetUsername,
    startedAt: Date.now(),
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

    // Check expiry
    const elapsed = Date.now() - data.startedAt;
    if (elapsed > MAX_AGE_SECONDS * 1000) return null;

    // Basic sanity
    if (!data.adminUsername || !data.targetUsername) return null;

    return data;
  } catch {
    return null;
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

export async function getImpersonationFromCookie(): Promise<ImpersonationData | null> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifyImpersonationToken(cookie.value);
}

export { COOKIE_NAME };
