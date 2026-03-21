import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { ingestMilitaryBases, getBaseCount } from "@/lib/warroom/military-bases";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

/** GET: return base count */
export async function GET() {
  try {
    const count = await getBaseCount();
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

/** POST: trigger full OSM ingest (admin only) */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name || !(await isAdmin(session.user.name))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await ingestMilitaryBases();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
