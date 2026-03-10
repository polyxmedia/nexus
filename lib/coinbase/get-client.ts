import { CoinbaseClient } from "./client";
import { refreshAccessToken } from "./oauth";
import { getSettingValue } from "@/lib/settings/get-setting";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/encryption";

/**
 * Get a CoinbaseClient for the given user.
 * Prefers OAuth tokens, falls back to API keys.
 */
export async function getCoinbaseClient(username: string): Promise<CoinbaseClient> {
  // Try OAuth first
  const oauthClient = await getOAuthClient(username);
  if (oauthClient) return oauthClient;

  // Fall back to API key/secret (per-user first, then global)
  const apiKey =
    await getSettingValue(`coinbase_api_key:${username}`) ||
    await getSettingValue("coinbase_api_key", process.env.COINBASE_API_KEY);
  const apiSecret =
    await getSettingValue(`coinbase_api_secret:${username}`) ||
    await getSettingValue("coinbase_api_secret", process.env.COINBASE_API_SECRET);

  if (!apiKey || !apiSecret) {
    throw new Error("Coinbase not connected. Connect via OAuth or configure API keys in Settings.");
  }

  return new CoinbaseClient(apiKey, apiSecret);
}

async function getOAuthClient(username: string): Promise<CoinbaseClient | null> {
  const accessTokenEnc = await getRawSetting(`coinbase_oauth_access_token:${username}`);
  const refreshTokenEnc = await getRawSetting(`coinbase_oauth_refresh_token:${username}`);
  const expiresAtStr = await getRawSetting(`coinbase_oauth_expires_at:${username}`);

  if (!accessTokenEnc || !refreshTokenEnc) return null;

  let accessToken: string;
  try {
    accessToken = decrypt(accessTokenEnc);
  } catch (err) {
    console.error("Failed to decrypt Coinbase OAuth token:", err);
    return null;
  }
  const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

  // Refresh if expired or expiring within 5 minutes
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    try {
      const refreshToken = decrypt(refreshTokenEnc);
      const tokens = await refreshAccessToken(refreshToken);
      accessToken = tokens.access_token;
      const newExpiresAt = Date.now() + tokens.expires_in * 1000;

      // Update stored tokens
      await upsertSetting(`coinbase_oauth_access_token:${username}`, encrypt(tokens.access_token));
      await upsertSetting(`coinbase_oauth_refresh_token:${username}`, encrypt(tokens.refresh_token));
      await upsertSetting(`coinbase_oauth_expires_at:${username}`, String(newExpiresAt));
    } catch (err) {
      console.error("Coinbase OAuth refresh failed:", err);
      return null; // Fall back to API keys
    }
  }

  return CoinbaseClient.fromOAuth(accessToken);
}

async function getRawSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return rows[0]?.value || null;
}

async function upsertSetting(key: string, value: string): Promise<void> {
  await db.insert(schema.settings).values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}
