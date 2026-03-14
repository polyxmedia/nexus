import "server-only";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function getKillSwitchStatus(userId: string): Promise<{ active: boolean; reason: string | null; activatedAt: string | null }> {
  const rows = await db.select().from(schema.killSwitch).where(eq(schema.killSwitch.userId, userId));
  if (rows.length === 0) return { active: false, reason: null, activatedAt: null };
  return {
    active: rows[0].active === 1,
    reason: rows[0].reason,
    activatedAt: rows[0].activatedAt,
  };
}

export async function activateKillSwitch(userId: string, reason: string, activatedBy: string): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.select().from(schema.killSwitch).where(eq(schema.killSwitch.userId, userId));

  if (existing.length > 0) {
    await db.update(schema.killSwitch)
      .set({ active: 1, reason, activatedAt: now, activatedBy })
      .where(eq(schema.killSwitch.userId, userId));
  } else {
    await db.insert(schema.killSwitch).values({ userId, active: 1, reason, activatedAt: now, activatedBy });
  }

  // Disable all execution rules for this user
  await db.update(schema.executionRules)
    .set({ enabled: 0, updatedAt: now })
    .where(eq(schema.executionRules.userId, userId));
}

export async function deactivateKillSwitch(userId: string): Promise<void> {
  await db.update(schema.killSwitch)
    .set({ active: 0, reason: null, activatedAt: null, activatedBy: null })
    .where(eq(schema.killSwitch.userId, userId));
}
