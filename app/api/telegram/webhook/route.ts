import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { sendMessage } from "@/lib/telegram/bot";
import Anthropic from "@anthropic-ai/sdk";

// Telegram sends webhook updates as POST requests.
// Users link their account by sending /start <username> to the bot.
// This endpoint is public (no auth) since Telegram calls it directly.

export async function POST(request: NextRequest) {
  // Verify the request has a valid secret token (optional, set via setWebhook secret_token)
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secretToken) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secretToken) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  try {
    const update = await request.json();
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const firstName = message.from?.first_name || "there";

    // ── /start <username> - Link Telegram to NEXUS account ──
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const username = parts[1];

      if (!username) {
        await sendMessage({
          chatId,
          text: [
            `Hey ${firstName}, welcome to <b>NEXUS Intelligence</b>.`,
            ``,
            `To link your account, go to Settings > Notifications in NEXUS and click "Link Telegram". You'll get a personalized link.`,
            ``,
            `Or send: <code>/start your_username</code>`,
          ].join("\n"),
        });
        return NextResponse.json({ ok: true });
      }

      // Verify the user exists
      const userRows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, `user:${username}`));

      if (userRows.length === 0) {
        await sendMessage({
          chatId,
          text: `User <b>${username}</b> not found in NEXUS. Check your username and try again.`,
        });
        return NextResponse.json({ ok: true });
      }

      // Store the chat ID
      const key = `${username}:telegram_chat_id`;
      const existingRows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, key));

      if (existingRows.length > 0) {
        await db
          .update(schema.settings)
          .set({ value: chatId, updatedAt: new Date().toISOString() })
          .where(eq(schema.settings.key, key));
      } else {
        await db.insert(schema.settings).values({
          key,
          value: chatId,
          updatedAt: new Date().toISOString(),
        });
      }

      // Set default alert preferences
      const alertKey = `${username}:telegram_alerts`;
      const alertRows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, alertKey));

      if (alertRows.length === 0) {
        const defaults = JSON.stringify([
          "signal_convergence",
          "prediction_resolved",
          "warroom_escalation",
          "daily_briefing",
        ]);
        await db.insert(schema.settings).values({
          key: alertKey,
          value: defaults,
          updatedAt: new Date().toISOString(),
        });
      }

      await sendMessage({
        chatId,
        text: [
          `Linked to <b>${username}</b> on NEXUS.`,
          ``,
          `You'll receive alerts for:`,
          `- Signal convergences (intensity 4+)`,
          `- Prediction outcomes`,
          `- War room escalations`,
          `- Daily briefings`,
          ``,
          `Configure alerts in NEXUS Settings > Notifications.`,
        ].join("\n"),
      });

      return NextResponse.json({ ok: true });
    }

    // ── /status - Check link status ──
    if (text === "/status") {
      await sendMessage({
        chatId,
        text: [
          `<b>NEXUS Bot Status</b>`,
          `Chat ID: <code>${chatId}</code>`,
          ``,
          `Send /start username to link your NEXUS account.`,
        ].join("\n"),
      });
      return NextResponse.json({ ok: true });
    }

    // ── /stop - Unlink account ──
    if (text === "/stop") {
      // Find and remove any settings with this chat ID
      const allChatIds = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.value, chatId));

      for (const row of allChatIds) {
        if (row.key.endsWith(":telegram_chat_id")) {
          await db.delete(schema.settings).where(eq(schema.settings.key, row.key));
          const username = row.key.split(":")[0];
          await db.delete(schema.settings).where(eq(schema.settings.key, `${username}:telegram_alerts`));
        }
      }

      await sendMessage({
        chatId,
        text: "Unlinked from NEXUS. You won't receive any more alerts.",
      });
      return NextResponse.json({ ok: true });
    }

    // ── AI response for general messages ──
    // Find if this chat is linked to a NEXUS user
    let linkedUsername: string | null = null;
    try {
      const chatRows = await db
        .select()
        .from(schema.settings)
        .where(like(schema.settings.key, "%:telegram_chat_id"));
      const match = chatRows.find((r) => r.value === chatId);
      if (match) linkedUsername = match.key.split(":")[0];
    } catch { /* continue without username */ }

    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: [
          "You are the NEXUS Intelligence bot on Telegram. NEXUS is a geopolitical-market convergence intelligence platform.",
          "You provide brief, sharp intelligence analysis. Keep responses concise (2-4 sentences max) since this is Telegram.",
          "You can discuss geopolitics, markets, signals, predictions, and intelligence methodology.",
          "If asked about account features, mention they can configure alerts and view full analysis on nexushq.xyz.",
          "Do not use emojis. Write in a direct, professional tone.",
          linkedUsername ? `The user is linked as "${linkedUsername}" on NEXUS.` : "The user has not linked their NEXUS account yet. They can do so with /start username.",
        ].join(" "),
        messages: [{ role: "user", content: text }],
      });

      const aiText = response.content[0]?.type === "text" ? response.content[0].text : null;
      if (aiText) {
        await sendMessage({ chatId, text: aiText, parseMode: "HTML" });
      }
    } catch (err) {
      console.error("Telegram AI response error:", err);
      await sendMessage({
        chatId,
        text: [
          `<b>NEXUS Intelligence Bot</b>`,
          ``,
          `Commands:`,
          `/start username - Link your NEXUS account`,
          `/status - Check connection status`,
          `/stop - Unlink and stop alerts`,
        ].join("\n"),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
