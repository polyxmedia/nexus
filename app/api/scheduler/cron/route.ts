import { NextRequest, NextResponse } from "next/server";
import { requireCronOrAdmin } from "@/lib/auth/require-cron";

/**
 * Vercel Cron endpoint for running scheduler jobs.
 * Each cron entry in vercel.json hits this with ?jobs=job1,job2,...
 * Jobs run sequentially in a single function invocation.
 *
 * Auth: CRON_SECRET (Vercel adds this automatically for cron invocations).
 */
export async function GET(req: NextRequest) {
  const denied = await requireCronOrAdmin(req);
  if (denied) return denied;

  const raw = req.nextUrl.searchParams.get("jobs");
  const jobNames = raw?.split(",").filter((n) => /^[a-z0-9-]+$/.test(n)).slice(0, 25);
  if (!jobNames || jobNames.length === 0) {
    return NextResponse.json({ error: "Missing or invalid ?jobs= parameter" }, { status: 400 });
  }

  // Import scheduler (triggers job registration at module level)
  const { runJobsByName } = await import("@/lib/scheduler");
  const results = await runJobsByName(jobNames);

  const failed = results.filter((r) => !r.ok && !r.error?.includes("skipped"));
  return NextResponse.json(
    { results },
    { status: failed.length > 0 ? 207 : 200 }
  );
}
