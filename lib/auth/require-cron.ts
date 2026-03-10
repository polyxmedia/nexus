import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

/**
 * Gate for internal/admin-only routes (scheduler, migrations, cron jobs).
 * Allows access if:
 *   1. Request has a valid CRON_SECRET bearer token, OR
 *   2. Request is from an authenticated admin user
 *
 * Returns null if authorized, or an error NextResponse if not.
 */
export async function requireCronOrAdmin(
  request: Request
): Promise<NextResponse | null> {
  // Check CRON_SECRET bearer token
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null; // authorized via cron secret
  }

  // Check for admin session
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userSettings = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));

  if (userSettings.length > 0) {
    try {
      const data = JSON.parse(userSettings[0].value);
      if (data.role === "admin") {
        return null; // authorized via admin role
      }
    } catch {
      // bad JSON
    }
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
