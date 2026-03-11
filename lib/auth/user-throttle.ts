import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface UserThrottle {
  chatMessagesPerDay: number | null;
  predictionsPerHour: number | null;
  apiCallsPerMinute: number | null;
}

// In-memory cache with 60s TTL
const cache = new Map<string, { throttle: UserThrottle | null; expiresAt: number }>();

export async function getUserThrottle(username: string): Promise<UserThrottle | null> {
  const cached = cache.get(username);
  if (cached && cached.expiresAt > Date.now()) return cached.throttle;

  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, `user:${username}`));

    if (rows.length === 0) {
      cache.set(username, { throttle: null, expiresAt: Date.now() + 60_000 });
      return null;
    }

    const data = JSON.parse(rows[0].value);
    const throttle: UserThrottle | null = data.throttle || null;
    cache.set(username, { throttle, expiresAt: Date.now() + 60_000 });
    return throttle;
  } catch {
    return null;
  }
}

export function invalidateThrottleCache(username: string) {
  cache.delete(username);
}
