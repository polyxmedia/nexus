import { Client } from "pg";

export default async function teardown() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus",
  });

  try {
    await client.connect();
    // Only delete settings rows that start with our test user prefix — nothing else is touched
    // Matches e2e_test_auth_*, e2e_test_sub_*, and any other e2e_test_* variants
    await client.query(`DELETE FROM settings WHERE key LIKE 'user:e2e_test_%'`);
    console.log("\n[teardown] Cleaned up e2e test users from settings table");
  } catch (err) {
    console.error("[teardown] Cleanup error:", err);
  } finally {
    await client.end();
  }
}
