import * as schema from "./schema";

let _db: ReturnType<typeof initDb> | null = null;

function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Use Neon serverless driver for Neon/Vercel (wss:// or neon.tech URLs)
  // Use standard pg for local development
  if (url.includes("neon.tech") || url.includes("vercel-storage")) {
    const { neon } = require("@neondatabase/serverless");
    const { drizzle } = require("drizzle-orm/neon-http");
    const sql = neon(url);
    return drizzle(sql, { schema });
  } else {
    const { Pool } = require("pg");
    const { drizzle } = require("drizzle-orm/node-postgres");
    const pool = new Pool({
      connectionString: url,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on("error", (err: Error) => {
      console.error("[DB] Unexpected pool error:", err.message);
    });

    return drizzle(pool, { schema });
  }
}

export const db = new Proxy({} as ReturnType<typeof initDb>, {
  get(_target, prop) {
    if (!_db) _db = initDb();
    return (_db as Record<string | symbol, unknown>)[prop];
  },
});
export { schema };
