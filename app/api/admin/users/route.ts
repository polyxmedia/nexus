import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));

  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(like(schema.settings.key, "user:%"));

    const users = userSettings.map((s: { key: string; value: string; updatedAt: string | null }) => {
      const username = s.key.replace("user:", "");
      const data = JSON.parse(s.value);
      return {
        username,
        role: data.role || "user",
        tier: data.tier || "free",
        createdAt: s.updatedAt,
      };
    });

    // Get subscription data for each user
    const subs = await db.select().from(schema.subscriptions);
    const subMap = new Map(subs.map((s: { userId: string; [key: string]: unknown }) => [s.userId, s]));

    const enriched = users.map((u: { username: string; role: string; tier: string; createdAt: string | null }) => ({
      ...u,
      subscription: subMap.get(u.username) || null,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

// POST - update user role
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name || !(await isAdmin(session.user.name))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { username, role } = await request.json();

    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (userSettings.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = JSON.parse(userSettings[0].value);
    userData.role = role;

    await db
      .update(schema.settings)
      .set({ value: JSON.stringify(userData) })
      .where(eq(schema.settings.key, `user:${username}`));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
