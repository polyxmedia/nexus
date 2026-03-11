// GPR Ingestion Job
// Fetches the Caldara-Iacoviello GPR daily XLS and upserts into gpr_readings table.
// Designed to run once daily via cron or manual trigger.

import * as XLSX from "xlsx";
import { db, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";

interface RawGPRRow {
  DAY?: string;
  GPRD?: number;
  GPRD_ACT?: number;
  GPRD_THREAT?: number;
  [key: string]: unknown;
}

const GPR_XLS_URL = "https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xls";

export async function ingestGPR(): Promise<{ inserted: number; skipped: number; error?: string }> {
  try {
    const res = await fetch(GPR_XLS_URL);
    if (!res.ok) throw new Error(`GPR XLS fetch failed: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("No worksheet found in GPR XLS");

    const rows = XLSX.utils.sheet_to_json<RawGPRRow>(sheet, { defval: null });
    if (rows.length === 0) throw new Error("GPR XLS returned 0 rows");

    // Find column keys
    const keys = Object.keys(rows[0]);
    const findExact = (patterns: string[]) =>
      keys.find((k) => patterns.some((p) => k.toLowerCase() === p));
    const findIncludes = (patterns: string[]) =>
      keys.find((k) => patterns.some((p) => k.toLowerCase().includes(p)));

    const dateKey = findExact(["day", "date"]) || findIncludes(["day", "date"]);
    const compositeKey = findExact(["gprd", "gpr_daily"]) || findIncludes(["gprd", "gpr_daily"]);
    const threatsKey = findIncludes(["threat"]);
    const actsKey = keys.find(
      (k) => k.toLowerCase().includes("act") && !k.toLowerCase().includes("threat")
    );

    if (!dateKey || !compositeKey) {
      throw new Error(`Missing required columns. Available: ${keys.join(", ")}`);
    }

    // Get the latest date we already have
    const latestRows = await db
      .select({ date: schema.gprReadings.date })
      .from(schema.gprReadings)
      .orderBy(desc(schema.gprReadings.date))
      .limit(1);
    const latestDate = latestRows[0]?.date || "1900-01-01";

    // Parse and filter to only new rows
    let inserted = 0;
    let skipped = 0;
    const batch: {
      date: string;
      composite: number;
      threats: number;
      acts: number;
      threatsToActsRatio: number;
    }[] = [];

    for (const row of rows) {
      const dateRaw = row[dateKey as keyof RawGPRRow];
      let dateStr: string;

      if (typeof dateRaw === "string" && /^\d{8}$/.test(dateRaw)) {
        dateStr = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;
      } else if (dateRaw instanceof Date) {
        dateStr = dateRaw.toISOString().split("T")[0];
      } else if (typeof dateRaw === "number") {
        const epoch = new Date(1899, 11, 30);
        const d = new Date(epoch.getTime() + dateRaw * 86400000);
        dateStr = d.toISOString().split("T")[0];
      } else {
        continue;
      }

      // Skip rows we already have
      if (dateStr <= latestDate) {
        skipped++;
        continue;
      }

      const composite = Number(row[compositeKey as keyof RawGPRRow]);
      if (isNaN(composite)) continue;

      const threats = threatsKey ? Number(row[threatsKey as keyof RawGPRRow]) || 0 : 0;
      const acts = actsKey ? Number(row[actsKey as keyof RawGPRRow]) || 0 : 0;
      const ratio = acts > 0 ? threats / acts : threats > 0 ? 999 : 1;

      batch.push({
        date: dateStr,
        composite: Math.round(composite * 100) / 100,
        threats: Math.round(threats * 100) / 100,
        acts: Math.round(acts * 100) / 100,
        threatsToActsRatio: Math.round(ratio * 100) / 100,
      });
    }

    // Bulk insert in chunks of 500
    for (let i = 0; i < batch.length; i += 500) {
      const chunk = batch.slice(i, i + 500);
      await db
        .insert(schema.gprReadings)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.gprReadings.date,
          set: {
            composite: sql`excluded.composite`,
            threats: sql`excluded.threats`,
            acts: sql`excluded.acts`,
            threatsToActsRatio: sql`excluded.threats_to_acts_ratio`,
          },
        });
      inserted += chunk.length;
    }

    console.log(`[GPR Ingest] Done: ${inserted} inserted, ${skipped} skipped`);
    return { inserted, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GPR Ingest] Error:", message);
    return { inserted: 0, skipped: 0, error: message };
  }
}
