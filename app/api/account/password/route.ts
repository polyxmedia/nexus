import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hashPassword, verifyPassword } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = session.user.name;

    // Rate limit: 5 password change attempts per hour
    const rl = await rateLimit(`account:password:${username}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 10) {
      return NextResponse.json({ error: "New password must be at least 10 characters" }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "New password must be different from current password" }, { status: 400 });
    }

    // Fetch user
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = JSON.parse(rows[0].value);

    // Verify current password
    const valid = await verifyPassword(currentPassword, userData.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Hash and store new password
    userData.password = await hashPassword(newPassword);
    userData.passwordChangedAt = new Date().toISOString();

    await db
      .update(schema.settings)
      .set({ value: JSON.stringify(userData), updatedAt: new Date().toISOString() })
      .where(eq(schema.settings.key, `user:${username}`));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
