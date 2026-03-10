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

  // 5. Test Anthropic connection
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
      diag.anthropicTest = "success";
      diag.anthropicModel = res.model;
    } else {
      diag.anthropicTest = "no_key";
    }
  } catch (err) {
    diag.anthropicTest = "failed";
    diag.anthropicError = err instanceof Error ? err.message : String(err);
    diag.anthropicErrorType = err?.constructor?.name;
  }

  return NextResponse.json(diag);
}
