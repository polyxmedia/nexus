import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

/**
 * Retrieve a setting value from the database, decrypting if encrypted.
 * Falls back to the provided default (typically an env var) if not found.
 */
export async function getSettingValue(
  key: string,
  fallback?: string
): Promise<string | undefined> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key));

  if (rows[0]?.value) {
    return decrypt(rows[0].value);
  }

  return fallback;
}
