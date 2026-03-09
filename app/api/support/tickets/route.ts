import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { supportTickets, supportMessages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { sendEmail, getUserEmail } from "@/lib/email";
import { ticketOpenedEmail } from "@/lib/email/templates";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const tickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, `user:${session.user.name}`))
      .orderBy(desc(supportTickets.createdAt));

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Support tickets GET error:", error);
    return NextResponse.json({ tickets: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { title, description, category, priority } = await req.json();
    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Title and description required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        userId: `user:${session.user.name}`,
        title: title.trim(),
        description: description.trim(),
        category: category || "general",
        priority: priority || "normal",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Auto-create first message from description
    await db.insert(supportMessages).values({
      ticketId: ticket.id,
      userId: `user:${session.user.name}`,
      content: description.trim(),
      isStaff: 0,
      createdAt: now,
    });

    // Send confirmation email
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const email = await getUserEmail(`user:${session.user.name}`);
    if (email) {
      const tpl = ticketOpenedEmail(session.user.name, ticket.id, ticket.title, `${baseUrl}/support/${ticket.uuid}`);
      sendEmail({ to: email, ...tpl, type: "ticket_opened" }).catch((err) =>
        console.error("Ticket opened email failed:", err)
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Support ticket POST error:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
