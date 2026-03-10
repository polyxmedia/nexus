import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";
import {
  createImpersonationToken,
  setImpersonationCookie,
  clearImpersonationCookie,
  getImpersonationFromCookie,
  getValidatedImpersonation,
  revokeImpersonationNonce,
} from "@/lib/auth/impersonation";
import { rateLimit } from "@/lib/rate-limit";

async function getAdminUser(): Promise<{ username: string; role: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return null;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  if (!rows[0]) return null;
  try {
    const data = JSON.parse(rows[0].value);
    if (data.role !== "admin") return null;
    return { username: session.user.name, role: data.role };
  } catch {
    return null;
  }
}

// POST: Start impersonation
export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = rateLimit(`admin:impersonate:${admin.username}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string" || username.length > 100) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    // Can't impersonate yourself
    if (username === admin.username) {
      return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
    }

    // Verify target user exists and is not an admin
    const targetRows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));
    if (!targetRows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetData = JSON.parse(targetRows[0].value);

    if (targetData.role === "admin") {
      return NextResponse.json({ error: "Cannot impersonate admin users" }, { status: 403 });
    }

    if (targetData.blocked) {
      return NextResponse.json({ error: "Cannot impersonate blocked users" }, { status: 403 });
    }

    // Create signed token and set cookie
    const token = createImpersonationToken(admin.username, username);
    await setImpersonationCookie(token);

    // Audit log
    console.log(`[IMPERSONATE] Admin "${admin.username}" started impersonating "${username}" at ${new Date().toISOString()}`);

    // Store audit record in settings
    const auditKey = `audit:impersonate:${Date.now()}`;
    await db.insert(schema.settings).values({
      key: auditKey,
      value: JSON.stringify({
        admin: admin.username,
        target: username,
        action: "start",
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ ok: true, target: username });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Stop impersonation
// Deliberately permissive auth: any authenticated user with a valid impersonation cookie
// can exit impersonation. This ensures the admin can always exit even though their
// session currently shows the impersonated user.
export async function DELETE(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read impersonation data before clearing for audit
  // Use getImpersonationFromCookie (not validated) so the admin can always exit
  // even if their role was revoked mid-session
  const impData = await getImpersonationFromCookie();

  await clearImpersonationCookie();

  if (impData) {
    // Revoke the nonce server-side so the token cannot be replayed
    await revokeImpersonationNonce(impData.nonce, impData.adminUsername);

    console.log(`[IMPERSONATE] Admin "${impData.adminUsername}" stopped impersonating "${impData.targetUsername}" at ${new Date().toISOString()}`);

    await db.insert(schema.settings).values({
      key: `audit:impersonate:${Date.now()}`,
      value: JSON.stringify({
        admin: impData.adminUsername,
        target: impData.targetUsername,
        action: "stop",
        nonce: impData.nonce,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  return NextResponse.json({ ok: true });
}

// GET: Check current impersonation status
// This uses the cookie directly (not getAdminUser) because during impersonation
// the session shows the target user, not the admin.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ active: false });

  // Use full validation (admin role re-check + revocation check)
  const impData = await getValidatedImpersonation();
  if (!impData) {
    return NextResponse.json({ active: false });
  }

  // The session user should match either the admin or the impersonated target
  const sessionUser = session.user.name;
  if (sessionUser !== impData.adminUsername && sessionUser !== impData.targetUsername) {
    return NextResponse.json({ active: false });
  }

  const elapsed = Date.now() - impData.startedAt;
  const remainingSeconds = Math.max(0, 3600 - Math.floor(elapsed / 1000));

  return NextResponse.json({
    active: true,
    target: impData.targetUsername,
    remainingSeconds,
  });
}
