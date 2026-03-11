import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { sendUserAlert } from "@/lib/telegram/alerts";
import { validateOrigin } from "@/lib/security/csrf";

// POST /api/telegram/test - Send a test alert to verify the connection
export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = session.user.name;

  const sent = await sendUserAlert(
    username,
    "signal_convergence",
    [
      `<b>TEST ALERT</b>`,
      ``,
      `This is a test notification from NEXUS Intelligence.`,
      `If you're seeing this, your Telegram alerts are working.`,
      ``,
      `<a href="https://nexushq.xyz/settings">Back to Settings</a>`,
    ].join("\n")
  );

  if (sent) {
    return NextResponse.json({ success: true, message: "Test alert sent" });
  } else {
    return NextResponse.json(
      { error: "Failed to send. Make sure you've linked Telegram via /start in the bot." },
      { status: 400 }
    );
  }
}
