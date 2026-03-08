import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function requireAuth(): Promise<{ username: string } | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { username: session.user.name };
}

export async function requireAdmin(): Promise<{ username: string } | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { db, schema } = await import("@/lib/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, `user:${session.user.name}`));
  if (!rows[0]) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userData = JSON.parse(rows[0].value);
  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }
  return { username: session.user.name };
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}
