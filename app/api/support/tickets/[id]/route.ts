import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail, getUserEmail } from "@/lib/email";
import { ticketClosedEmail } from "@/lib/email/templates";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
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
    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Support ticket GET error:", error);
    return NextResponse.json({ error: "Failed to load ticket" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json();

    // Users can only close their own tickets
    const [existing] = await db
      .select()
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.uuid, id),
          eq(supportTickets.userId, `user:${session.user.name}`)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (body.status === "closed") {
      updates.status = "closed";
    }

    await db
      .update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.uuid, id));

    // Send closed confirmation email
    if (body.status === "closed") {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const email = await getUserEmail(existing.userId);
      if (email) {
        const username = existing.userId.replace("user:", "");
        const tpl = ticketClosedEmail(username, existing.id, existing.title, `${baseUrl}/support/${existing.uuid}`);
        sendEmail({ to: email, ...tpl, type: "ticket_closed" }).catch((err) =>
          console.error("Ticket closed email failed:", err)
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Support ticket PATCH error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
