import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL!;

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
    const pool = new Pool({ connectionString: url });
    return drizzle(pool, { schema });
  }
}

export const db = createDb();
export { schema };
