import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSettingValue } from "@/lib/settings/get-setting";

// Temporary diagnostic endpoint - REMOVE after debugging
export async function GET() {
  const diag: Record<string, unknown> = {};

  // 1. Check if there's a DB-stored anthropic_api_key
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "anthropic_api_key"));
    diag.dbKeyExists = rows.length > 0;
    if (rows[0]?.value) {
      diag.dbKeyPrefix = rows[0].value.slice(0, 10) + "...";
      diag.dbKeyLength = rows[0].value.length;
      diag.isEncrypted = rows[0].value.startsWith("enc:v1:");
    }
  } catch (err) {
    diag.dbKeyError = err instanceof Error ? err.message : String(err);
  }

  // 2. Check env var
  diag.envKeyExists = !!process.env.ANTHROPIC_API_KEY;
  if (process.env.ANTHROPIC_API_KEY) {
    diag.envKeyPrefix = process.env.ANTHROPIC_API_KEY.slice(0, 10) + "...";
    diag.envKeyLength = process.env.ANTHROPIC_API_KEY.length;
  }

  // 3. Check what getSettingValue returns
  try {
    const resolved = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
    diag.resolvedKeyExists = !!resolved;
    if (resolved) {
      diag.resolvedKeyPrefix = resolved.slice(0, 10) + "...";
      diag.resolvedKeyLength = resolved.length;
    }
  } catch (err) {
    diag.resolvedKeyError = err instanceof Error ? err.message : String(err);
  }

  // 4. Check SETTINGS_ENCRYPTION_KEY
  diag.encryptionKeySet = !!process.env.SETTINGS_ENCRYPTION_KEY;

  // 5. Test Anthropic connection via SDK
  try {
    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
    if (apiKey) {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }],
      });
      diag.sdkTest = "success";
      diag.sdkModel = res.model;
    } else {
      diag.sdkTest = "no_key";
    }
  } catch (err: unknown) {
    diag.sdkTest = "failed";
    diag.sdkError = err instanceof Error ? err.message : String(err);
    diag.sdkErrorType = err?.constructor?.name;
    // Get the cause chain
    const cause = (err as { cause?: Error })?.cause;
    if (cause) {
      diag.sdkCause = cause.message || String(cause);
      diag.sdkCauseType = cause.constructor?.name;
      const innerCause = (cause as { cause?: Error })?.cause;
      if (innerCause) {
        diag.sdkInnerCause = innerCause.message || String(innerCause);
      }
    }
    // Check status if it's an API error
    const status = (err as { status?: number })?.status;
    if (status) diag.sdkStatus = status;
  }

  // 6. Raw fetch test to Anthropic API (bypass SDK)
  try {
    const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
    if (apiKey) {
      const rawRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 10,
          messages: [{ role: "user", content: "Say hi" }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      diag.rawFetchStatus = rawRes.status;
      diag.rawFetchOk = rawRes.ok;
      if (!rawRes.ok) {
        const errText = await rawRes.text().catch(() => "could not read body");
        diag.rawFetchError = errText.slice(0, 500);
      } else {
        const data = await rawRes.json();
        diag.rawFetchModel = data.model;
        diag.rawFetchContent = data.content?.[0]?.text;
      }
    }
  } catch (err) {
    diag.rawFetchError = err instanceof Error ? err.message : String(err);
    diag.rawFetchErrorType = err?.constructor?.name;
  }

  return NextResponse.json(diag);
}
