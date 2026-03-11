import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin, isNextResponse } from "@/lib/auth/session";

// GET - check if Twitter is connected (admin only)
export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const tokenRows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, "twitter_oauth_access_token")
  );

  if (tokenRows.length === 0) {
    return NextResponse.json({ connected: false });
  }

  const expiryRows = await db.select().from(schema.settings).where(
    eq(schema.settings.key, "twitter_oauth_expires_at")
  );

  const expiresAt = expiryRows.length > 0 ? Number(expiryRows[0].value) : null;
  const expired = expiresAt ? Date.now() > expiresAt : false;

  return NextResponse.json({
    connected: true,
    expired,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
  });
}
