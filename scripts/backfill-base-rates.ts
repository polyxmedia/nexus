/**
 * One-time backfill: populate base_rate_at_creation for existing predictions.
 * Run: npx tsx scripts/backfill-base-rates.ts
 */

import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import { getBaseRate } from "../lib/predictions/base-rates";

async function main() {
  const rows = await db.execute(sql`
    SELECT id, category, claim FROM predictions
    WHERE base_rate_at_creation IS NULL
  `);

  const predictions = (rows.rows || []) as Array<{ id: number; category: string; claim: string }>;
  console.log(`Found ${predictions.length} predictions to backfill`);

  let updated = 0;
  for (const p of predictions) {
    const { rate } = await getBaseRate(p.category, p.claim);
    await db.execute(sql`
      UPDATE predictions SET base_rate_at_creation = ${rate} WHERE id = ${p.id}
    `);
    updated++;
    if (updated % 20 === 0) {
      console.log(`  ${updated}/${predictions.length} done`);
    }
  }

  console.log(`Backfill complete: ${updated} predictions updated`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
