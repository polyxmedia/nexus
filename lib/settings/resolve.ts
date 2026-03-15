import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

/**
 * Layered settings resolver — inspired by CCL's monoidal composition.
 *
 * Resolution order (right-biased merge, last wins):
 *   1. env var fallback (lowest priority)
 *   2. global DB setting
 *   3. user-scoped DB setting (highest priority)
 *
 * Composing any two valid layers produces a valid layer (associativity).
 * An empty layer is identity (monoid). So resolution is correct by construction
 * regardless of how many layers exist or which ones are missing.
 */

// ── Env var mapping ──
// Maps setting keys to their corresponding env var names.
// Only needed where the env var name differs from the setting key convention.
const ENV_MAP: Record<string, string> = {
  anthropic_api_key: "ANTHROPIC_API_KEY",
  t212_api_key: "TRADING212_API_KEY",
  t212_api_secret: "TRADING212_SECRET",
  t212_environment: "TRADING212_ENVIRONMENT",
  alpha_vantage_api_key: "ALPHA_VANTAGE_API_KEY",
  fred_api_key: "FRED_API_KEY",
  voyage_api_key: "VOYAGE_API_KEY",
  coinbase_api_key: "COINBASE_API_KEY",
  coinbase_api_secret: "COINBASE_API_SECRET",
  acled_api_key: "ACLED_API_KEY",
  kalshi_api_key_id: "KALSHI_API_KEY_ID",
  kalshi_private_key: "KALSHI_PRIVATE_KEY",
};

/** Look up the env var for a setting key. Tries the explicit map first, then UPPER_SNAKE convention. */
function envFallback(key: string): string | undefined {
  const envName = ENV_MAP[key] ?? key.toUpperCase();
  return process.env[envName];
}

/** Single DB lookup with decryption. Returns undefined if not found. */
async function dbLookup(key: string): Promise<string | undefined> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, key));

  if (rows[0]?.value) {
    return decrypt(rows[0].value).trim();
  }
  return undefined;
}

// ── Single key resolution ──

interface ResolveOptions {
  /** Username for user-scoped override lookup */
  username?: string;
  /** Explicit env var fallback (overrides ENV_MAP lookup) */
  env?: string;
}

/**
 * Resolve a single setting through the full layer stack.
 *
 * Layers (last wins):
 *   1. env var (from ENV_MAP or explicit `opts.env`)
 *   2. global DB value for `key`
 *   3. user-scoped DB value for `username:key` (if username provided)
 *
 * This is the monoidal merge: three maps composed right-to-left.
 */
export async function resolveSetting(
  key: string,
  opts?: ResolveOptions,
): Promise<string | undefined> {
  // Layer 1: env var (lowest priority)
  let value = opts?.env ?? envFallback(key);

  // Layer 2: global DB setting
  const global = await dbLookup(key);
  if (global !== undefined) value = global;

  // Layer 3: user-scoped override (highest priority)
  if (opts?.username) {
    const scoped = await dbLookup(`${opts.username}:${key}`);
    if (scoped !== undefined) value = scoped;
  }

  return value;
}

/**
 * Require a setting or throw. For keys that must exist for the system to function.
 */
export async function requireSetting(
  key: string,
  opts?: ResolveOptions,
): Promise<string> {
  const value = await resolveSetting(key, opts);
  if (!value) {
    const label = key.replace(/_/g, " ");
    throw new Error(`Required setting "${label}" is not configured`);
  }
  return value;
}

// ── Bulk resolution ──

type SettingsMap = Record<string, string>;

/**
 * Resolve a full settings map for a user by merging all layers.
 *
 * Returns a flat Record<string, string> with the final resolved value for each key.
 * This is the CCL fixed-point: all layers smooshed into one map.
 */
export async function resolveAll(username?: string): Promise<SettingsMap> {
  const result: SettingsMap = {};

  // Layer 1: seed from env vars we know about
  for (const [key, envName] of Object.entries(ENV_MAP)) {
    const val = process.env[envName];
    if (val) result[key] = val.trim();
  }

  // Layer 2: all global DB settings (keys without colon = not user-scoped)
  const allSettings = await db.select().from(schema.settings);
  for (const row of allSettings) {
    if (row.key.includes(":")) continue; // skip user-scoped
    try {
      result[row.key] = decrypt(row.value).trim();
    } catch {
      console.warn("[resolve] decrypt failed for key:", row.key);
      result[row.key] = row.value.trim();
    }
  }

  // Layer 3: user-scoped overrides (highest priority)
  if (username) {
    const prefix = `${username}:`;
    const userSettings = await db
      .select()
      .from(schema.settings)
      .where(like(schema.settings.key, `${prefix}%`));

    for (const row of userSettings) {
      const bareKey = row.key.slice(prefix.length);
      try {
        result[bareKey] = decrypt(row.value).trim();
      } catch {
        console.warn("[resolve] decrypt failed for user key:", row.key);
        result[bareKey] = row.value.trim();
      }
    }
  }

  return result;
}
