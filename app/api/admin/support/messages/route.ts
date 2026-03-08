import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { supportMessages, settings } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(settings)
    .where(eq(settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name || !(await isAdmin(session.user.name))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const ticketId = req.nextUrl.searchParams.get("ticketId");
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, parseInt(ticketId)))
      .orderBy(asc(supportMessages.createdAt));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Admin support messages error:", error);
    return NextResponse.json({ messages: [] });
  }
}
