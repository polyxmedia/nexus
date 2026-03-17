import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { supportTickets, supportMessages } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ count: 0 });
  }

  try {
    // Get user's open/in_progress tickets
    const tickets = await db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(
        and(
          eq(supportTickets.userId, `user:${session.user.name}`),
          inArray(supportTickets.status, ["open", "in_progress"])
        )
      );

    if (tickets.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // For each ticket, check if the latest message is from staff
    let unread = 0;
    for (const ticket of tickets) {
      const [latest] = await db
        .select({ isStaff: supportMessages.isStaff })
        .from(supportMessages)
        .where(eq(supportMessages.ticketId, ticket.id))
        .orderBy(desc(supportMessages.createdAt))
        .limit(1);

      if (latest && latest.isStaff === 1) {
        unread++;
      }
    }

    return NextResponse.json({ count: unread });
  } catch (error) {
    console.error("Support unread count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
