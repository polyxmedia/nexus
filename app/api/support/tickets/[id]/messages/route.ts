import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { supportTickets, supportMessages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;

    // Verify ticket ownership
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.uuid, id),
          eq(supportTickets.userId, `user:${session.user.name}`)
        )
      );

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticket.id))
      .orderBy(asc(supportMessages.createdAt));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Support messages GET error:", error);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    // Verify ticket ownership
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.uuid, id),
          eq(supportTickets.userId, `user:${session.user.name}`)
        )
      );

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const [message] = await db
      .insert(supportMessages)
      .values({
        ticketId: ticket.id,
        userId: `user:${session.user.name}`,
        content: content.trim(),
        isStaff: 0,
        createdAt: now,
      })
      .returning();

    // Update ticket timestamp
    await db
      .update(supportTickets)
      .set({ updatedAt: now })
      .where(eq(supportTickets.id, ticket.id));

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Support message POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
