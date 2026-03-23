import { NextRequest, NextResponse } from "next/server";
import { startScheduler, stopScheduler, getJobStatus } from "@/lib/scheduler";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";
import { db, schema } from "@/lib/db";
import { eq, like } from "drizzle-orm";
import { validateOrigin } from "@/lib/security/csrf";

export async function GET(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  let aiEnabled = true;
  const intervalOverrides: Record<string, number> = {};
  try {
    const aiRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "scheduler:ai_enabled"));
    if (aiRows[0]?.value) {
      const v = aiRows[0].value.toLowerCase();
      aiEnabled = v === "true" || v === "1" || v === "yes";
    }
    // Read saved interval overrides from DB so cold serverless instances show correct values
    const intRows = await db.select().from(schema.settings).where(like(schema.settings.key, "scheduler:interval:%"));
    for (const row of intRows) {
      const jobName = row.key.slice("scheduler:interval:".length);
      const minutes = Number(row.value);
      if (Number.isFinite(minutes)) {
        intervalOverrides[jobName] = minutes * 60_000;
      }
    }
  } catch { /* defaults */ }

  // Merge DB overrides into in-memory job status (handles cold start on serverless)
  const jobs = getJobStatus().map((j) => ({
    ...j,
    intervalMs: intervalOverrides[j.name] !== undefined ? intervalOverrides[j.name] : j.intervalMs,
    enabled: (intervalOverrides[j.name] !== undefined ? intervalOverrides[j.name] > 0 : j.intervalMs > 0) && !j.disabled,
  }));

  return NextResponse.json({ jobs, aiEnabled });
}

export async function POST(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const { action } = await req.json();

    if (action === "start") {
      await startScheduler();
      return NextResponse.json({ status: "started", jobs: getJobStatus() });
    }

    if (action === "stop") {
      stopScheduler();
      return NextResponse.json({ status: "stopped" });
    }

    if (action === "restart") {
      stopScheduler();
      await startScheduler();
      return NextResponse.json({ status: "restarted", jobs: getJobStatus() });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Save scheduler overrides (intervals + AI toggle)
export async function PATCH(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { aiEnabled, intervals } = body as {
      aiEnabled?: boolean;
      intervals?: Record<string, number>; // jobName -> minutes (0 = disabled)
    };

    const now = new Date().toISOString();

    // Save AI toggle
    if (aiEnabled !== undefined) {
      const key = "scheduler:ai_enabled";
      const value = String(aiEnabled);
      const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
      if (existing.length > 0) {
        await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, key));
      } else {
        await db.insert(schema.settings).values({ key, value, updatedAt: now });
      }
    }

    // Save per-job interval overrides (validate against registered jobs)
    if (intervals && typeof intervals === "object") {
      const validJobNames = new Set(getJobStatus().map((j) => j.name));
      for (const [jobName, minutes] of Object.entries(intervals)) {
        if (!validJobNames.has(jobName)) continue;
        if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) continue;
        const key = `scheduler:interval:${jobName}`;
        const value = String(minutes);
        const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
        if (existing.length > 0) {
          await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, key));
        } else {
          await db.insert(schema.settings).values({ key, value, updatedAt: now });
        }
      }
    }

    // Restart scheduler to apply changes
    stopScheduler();
    await startScheduler();

    return NextResponse.json({ ok: true, jobs: getJobStatus() });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
