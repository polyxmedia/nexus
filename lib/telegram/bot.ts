// ── Telegram Bot API Client ──
// Uses TELEGRAM_BOT_TOKEN env var. Create a bot via @BotFather on Telegram.

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || "";

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${BOT_TOKEN()}/${method}`;
}

export interface TelegramMessage {
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  disableWebPagePreview?: boolean;
}

export async function sendMessage(msg: TelegramMessage): Promise<boolean> {
  const token = BOT_TOKEN();
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const res = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: msg.chatId,
        text: msg.text,
        parse_mode: msg.parseMode || "HTML",
        disable_web_page_preview: msg.disableWebPagePreview ?? true,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Telegram send failed: ${res.status} ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Telegram send error:", err);
    return false;
  }
}

export async function sendMessageToMany(
  chatIds: (string | number)[],
  text: string,
  parseMode?: "HTML" | "MarkdownV2"
): Promise<void> {
  // Telegram rate limit: ~30 messages/second
  // Send with small delay between each
  for (const chatId of chatIds) {
    await sendMessage({ chatId, text, parseMode });
    if (chatIds.length > 5) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getMe(): Promise<{ ok: boolean; username?: string }> {
  try {
    const res = await fetch(apiUrl("getMe"), { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, username: data.result?.username };
  } catch {
    return { ok: false };
  }
}
