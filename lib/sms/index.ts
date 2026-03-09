// ── SMS Dispatch via Twilio ──
// Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER env vars.

import { db, schema } from "@/lib/db";
import { like } from "drizzle-orm";

const TWILIO_SID = () => process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_TOKEN = () => process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = () => process.env.TWILIO_FROM_NUMBER || "";

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = TWILIO_SID();
  const token = TWILIO_TOKEN();
  const from = TWILIO_FROM();

  if (!sid || !token || !from) {
    console.error("Twilio not configured (missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER)");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Twilio send failed: ${res.status} ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("SMS send error:", err);
    return false;
  }
}

/**
 * Get the SMS phone number for a given user.
 * Stored as {username}:sms_phone in settings.
 */
export async function getUserPhone(username: string): Promise<string | null> {
  const rows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, `${username}:sms_phone`));
  return rows.length > 0 && rows[0].value ? rows[0].value : null;
}
