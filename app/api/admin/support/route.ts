import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { supportTickets, supportMessages, settings } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { sendEmail, getUserEmail } from "@/lib/email";
import { ticketReplyEmail, ticketClosedEmail } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/security/csrf";

async function isAdmin(username: string): Promise<boolean> {
  const users = await db
    .select()
    .from(settings)
    .where(eq(settings.key, `user:${username}`));
  if (users.length === 0) return false;
  const userData = JSON.parse(users[0].value);
  return userData.role === "admin";
}

// GET all tickets (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name || !(await isAdmin(session.user.name))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await rateLimit(`admin:support:get:${session.user.name}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const tickets = await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.updatedAt));

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Admin support GET error:", error);
    return NextResponse.json({ tickets: [] });
  }
}

// PATCH - update ticket (status, priority, assignment)
export async function PATCH(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name || !(await isAdmin(session.user.name))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await rateLimit(`admin:support:patch:${session.user.name}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { ticketId, status, priority, assignedTo } = await req.json();
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }

    const updates: Record<string, string | null> = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
    if (status === "resolved") updates.resolvedAt = new Date().toISOString();

    await db
      .update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, ticketId));

    // Send closed email if status changed to resolved or closed
    if (status === "resolved" || status === "closed") {
      const [ticket] = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId));
      if (ticket) {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const email = await getUserEmail(ticket.userId);
        if (email) {
          const username = ticket.userId.replace("user:", "");
          const tpl = ticketClosedEmail(username, ticket.id, ticket.title, `${baseUrl}/support/${ticket.uuid}`);
          sendEmail({ to: email, ...tpl, type: "ticket_closed" }).catch((err) =>
            console.error("Ticket closed email failed:", err)
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin support PATCH error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

// POST - admin reply to ticket
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name || !(await isAdmin(session.user.name))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await rateLimit(`admin:support:post:${session.user.name}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { ticketId, content } = await req.json();
    if (!ticketId || !content?.trim()) {
      return NextResponse.json({ error: "ticketId and content required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const [message] = await db
      .insert(supportMessages)
      .values({
        ticketId,
        userId: `user:${session.user.name}`,
        content: content.trim(),
        isStaff: 1,
        createdAt: now,
      })
      .returning();

    // Update ticket to in_progress if it was open
    await db
      .update(supportTickets)
      .set({
        updatedAt: now,
        status: "in_progress",
        assignedTo: session.user.name,
      })
      .where(eq(supportTickets.id, ticketId));

    // Send email notification to ticket owner
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    if (ticket) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const email = await getUserEmail(ticket.userId);
      if (email) {
        const username = ticket.userId.replace("user:", "");
        const tpl = ticketReplyEmail(username, ticket.id, ticket.title, content.trim(), `${baseUrl}/support/${ticket.uuid}`);
        sendEmail({ to: email, ...tpl, type: "ticket_reply" }).catch((err) =>
          console.error("Ticket reply email failed:", err)
        );
      }
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Admin support POST error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
