import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";
import * as schema from "../lib/db/schema";
import { generateSignals } from "../lib/signals/engine";
import { SCENARIOS } from "../lib/game-theory/actors";
import { analyzeScenario } from "../lib/game-theory/analysis";

const DB_PATH = path.join(process.cwd(), "data", "nexus.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Run migrations first
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

console.log("Generating 2026 signals...");
const result = generateSignals(2026);

console.log(`\nSignal Engine Stats:`);
console.log(`  Celestial events: ${result.stats.celestialCount}`);
console.log(`  Hebrew calendar events: ${result.stats.hebrewCount}`);
console.log(`  Geopolitical events: ${result.stats.geopoliticalCount}`);
console.log(`  Total convergence signals: ${result.stats.totalSignals}`);
console.log(`  By intensity:`, result.stats.byIntensity);
console.log(`  By category:`, result.stats.byCategory);
console.log(`  Shmita: ${result.shmitaInfo.significance}`);

// Clear existing data
sqlite.exec("DELETE FROM signals");
sqlite.exec("DELETE FROM game_theory_scenarios");

// Insert signals
console.log("\nSeeding signals...");
for (const signal of result.signals) {
  db.insert(schema.signals).values(signal).run();
}

// Seed game theory scenarios
console.log("Seeding game theory scenarios...");
for (const scenario of SCENARIOS) {
  const analysis = analyzeScenario(scenario);
  db.insert(schema.gameTheoryScenarios)
    .values({
      scenarioId: scenario.id,
      title: scenario.title,
      analysis: JSON.stringify(analysis),
    })
    .run();
  console.log(`  ${scenario.title}: ${analysis.nashEquilibria.length} Nash equilibria, ${analysis.schellingPoints.length} Schelling points`);
}

// Seed default settings
sqlite.exec("DELETE FROM settings");
db.insert(schema.settings)
  .values([
    { key: "trading_environment", value: "demo" },
    { key: "max_order_size", value: "1000" },
    { key: "daily_trade_limit", value: "10" },
    { key: "position_concentration_pct", value: "20" },
    { key: "require_confirmation", value: "true" },
  ])
  .run();

console.log(`\nSeeded ${result.signals.length} signals, ${SCENARIOS.length} game theory scenarios, and default settings.`);
console.log("Done!");

sqlite.close();
