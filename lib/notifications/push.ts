import "server-only";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * Register a device token for push notifications.
 */
export async function registerDevice(
  userId: string,
  deviceToken: string,
  platform: "ios" | "android" | "web",
  deviceName?: string
): Promise<void> {
  const existing = await db
    .select()
    .from(schema.pushDevices)
    .where(
      and(
        eq(schema.pushDevices.userId, userId),
        eq(schema.pushDevices.deviceToken, deviceToken)
      )
    );

  if (existing.length > 0) {
    await db
      .update(schema.pushDevices)
      .set({
        active: 1,
        platform,
        deviceName,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.pushDevices.id, existing[0].id));
  } else {
    await db.insert(schema.pushDevices).values({
      userId,
      deviceToken,
      platform,
      deviceName,
    });
  }
}

/**
 * Unregister a device token.
 */
export async function unregisterDevice(
  userId: string,
  deviceToken: string
): Promise<void> {
  await db
    .update(schema.pushDevices)
    .set({ active: 0, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(schema.pushDevices.userId, userId),
        eq(schema.pushDevices.deviceToken, deviceToken)
      )
    );
}

/**
 * Get all active device tokens for a user.
 */
export async function getActiveDevices(userId: string) {
  return db
    .select()
    .from(schema.pushDevices)
    .where(
      and(
        eq(schema.pushDevices.userId, userId),
        eq(schema.pushDevices.active, 1)
      )
    );
}

/**
 * Get all active device tokens (for broadcast notifications).
 */
export async function getAllActiveDevices() {
  return db
    .select()
    .from(schema.pushDevices)
    .where(eq(schema.pushDevices.active, 1));
}

/**
 * Send a push notification via APNs.
 * Requires APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH env vars.
 * Returns the tokens that were successfully sent to.
 */
export async function sendPushNotification(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<{ sent: number; failed: number }> {
  // APNs integration placeholder - production would use @parse/node-apn or HTTP/2 direct
  // For now, log and return success count
  const apnsKeyId = process.env.APNS_KEY_ID;
  if (!apnsKeyId) {
    console.warn("[Push] APNs not configured, skipping push delivery");
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const token of tokens) {
    try {
      // TODO: Implement APNs HTTP/2 push when credentials are configured
      console.log(`[Push] Would send to ${token.slice(0, 8)}...: ${payload.title}`);
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send a notification to a specific user across all their devices.
 */
export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<{ sent: number; failed: number }> {
  const devices = await getActiveDevices(userId);
  if (devices.length === 0) return { sent: 0, failed: 0 };

  return sendPushNotification(
    devices.map((d) => d.deviceToken),
    payload
  );
}
