import { Client } from "pg";

export default async function teardown() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus",
  });

  try {
    await client.connect();
    // Only delete settings rows that start with our test user prefixes
    // Matches e2e_test_auth_*, e2e_test_sub_*, e2e_test_ref_*, e2e_test_admin_*, e2e_test_ig_*, e2e_cr_*, etc
    await client.query(`DELETE FROM settings WHERE key LIKE 'user:e2e_test_%' OR key LIKE 'user:e2e_cr_%'`);
    // Clean up user-scoped settings (e.g. telegram, ig keys stored as username:key)
    await client.query(`DELETE FROM settings WHERE key LIKE 'e2e_test_%:%' OR key LIKE 'e2e_cr_%:%'`);

    // Clean up subscriptions for test users
    await client.query(`DELETE FROM subscriptions WHERE user_id LIKE 'e2e_test_%' OR user_id LIKE 'e2e_cr_%'`);

    // Clean up credit data for test users
    await client.query(`DELETE FROM credit_balances WHERE user_id LIKE 'e2e_test_%' OR user_id LIKE 'e2e_cr_%'`);
    await client.query(`DELETE FROM credit_ledger WHERE user_id LIKE 'e2e_test_%' OR user_id LIKE 'e2e_cr_%'`);

    // Clean up referral data for test users
    await client.query(`DELETE FROM commissions WHERE referrer_id LIKE 'user:e2e_test_%' OR referrer_id LIKE 'user:e2e_cr_%'`);
    await client.query(`DELETE FROM referrals WHERE referrer_id LIKE 'user:e2e_test_%' OR referred_user_id LIKE 'user:e2e_test_%' OR referrer_id LIKE 'user:e2e_cr_%' OR referred_user_id LIKE 'user:e2e_cr_%'`);
    await client.query(`DELETE FROM referral_codes WHERE user_id LIKE 'user:e2e_test_%' OR user_id LIKE 'user:e2e_cr_%'`);

    // Clean up password reset tokens for test users
    await client.query(`DELETE FROM password_resets WHERE username LIKE 'e2e_test_%' OR username LIKE 'e2e_cr_%'`);

    // Clean up support tickets and messages for test users
    await client.query(`DELETE FROM support_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id LIKE 'user:e2e_test_%' OR user_id LIKE 'user:e2e_cr_%')`);
    await client.query(`DELETE FROM support_tickets WHERE user_id LIKE 'user:e2e_test_%' OR user_id LIKE 'user:e2e_cr_%'`);

    console.log("\n[teardown] Cleaned up e2e test users, referral data, and support tickets");
  } catch (err) {
    console.error("[teardown] Cleanup error:", err);
  } finally {
    await client.end();
  }
}
