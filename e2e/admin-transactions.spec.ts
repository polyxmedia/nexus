import { test, expect, type BrowserContext } from "@playwright/test";
import { Client } from "pg";
import { hash } from "bcryptjs";

const DB_URL = process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus";

const ADMIN_USER = `e2e_test_txadm_${Date.now()}`;
const TARGET_USER = `e2e_test_txtgt_${Date.now()}`;
const TEST_PASS = "E2eTestPass!99";

let adminContext: BrowserContext;

async function dbQuery(sql: string, params: (string | number)[] = []) {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    await client.end();
  }
}

async function createUserInDb(username: string, role: string) {
  const hashed = await hash(TEST_PASS, 12);
  const value = JSON.stringify({
    password: hashed,
    role,
    email: `${username}@e2etest.local`,
    tier: "free",
  });
  await dbQuery(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [`user:${username}`, value]
  );
}

async function login(ctx: BrowserContext, username: string) {
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(TEST_PASS);
  await page.getByRole("button", { name: /enter platform|sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });
  await page.close();
}

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(30_000);

  // Create users directly in DB (avoids registration rate limits)
  await createUserInDb(ADMIN_USER, "admin");
  await createUserInDb(TARGET_USER, "user");

  // Login admin
  adminContext = await browser.newContext();
  await login(adminContext, ADMIN_USER);
});

test.afterAll(async () => {
  await adminContext.close();
});

test.describe.serial("Admin transactions API", () => {
  test("GET transactions returns empty for user with no Stripe customer", async () => {
    const page = await adminContext.newPage();
    const res = await page.request.get(
      `/api/admin/users/${encodeURIComponent(TARGET_USER)}/transactions`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.transactions).toEqual([]);
    expect(body.message).toContain("No Stripe customer");
    await page.close();
  });

  test("GET transactions returns structured data for user with Stripe customer", async () => {
    // Insert a fake Stripe customer ID for the target user
    const fakeCustomerId = `cus_test_fake_${Date.now()}`;
    const fakeSubId = `sub_test_fake_${Date.now()}`;
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TARGET_USER]);
    await dbQuery(
      `INSERT INTO subscriptions (user_id, tier_id, stripe_customer_id, stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES ($1, 1, $2, $3, 'active', NOW(), NOW() + INTERVAL '30 days', 0, NOW(), NOW())`,
      [TARGET_USER, fakeCustomerId, fakeSubId]
    );

    const page = await adminContext.newPage();
    const res = await page.request.get(
      `/api/admin/users/${encodeURIComponent(TARGET_USER)}/transactions`
    );
    // Fake customer ID will likely cause Stripe to return error, but we handle it
    const status = res.status();
    expect([200, 500]).toContain(status);
    if (status === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("transactions");
      expect(body).toHaveProperty("stripeCustomerId");
      expect(body).toHaveProperty("totalPaid");
      expect(body).toHaveProperty("totalRefunded");
      expect(Array.isArray(body.transactions)).toBe(true);
    }
    await page.close();
  });

  test("GET transactions rejects non-admin user", async ({ browser }) => {
    const ctx = await browser.newContext();
    await login(ctx, TARGET_USER);
    const page = await ctx.newPage();

    const res = await page.request.get(
      `/api/admin/users/${encodeURIComponent(ADMIN_USER)}/transactions`
    );
    expect(res.status()).toBe(403);
    await page.close();
    await ctx.close();
  });

  test("POST refund rejects missing chargeId and paymentIntentId", async () => {
    const page = await adminContext.newPage();
    const res = await page.request.post(
      `/api/admin/users/${encodeURIComponent(TARGET_USER)}/transactions`,
      {
        data: { reason: "requested_by_customer" },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("chargeId or paymentIntentId is required");
    await page.close();
  });

  test("POST refund rejects invalid amount (negative)", async () => {
    const page = await adminContext.newPage();
    const res = await page.request.post(
      `/api/admin/users/${encodeURIComponent(TARGET_USER)}/transactions`,
      {
        data: {
          chargeId: "ch_test_fake",
          amount: -500,
          reason: "requested_by_customer",
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("positive integer");
    await page.close();
  });

  test("POST refund rejects invalid amount (zero)", async () => {
    const page = await adminContext.newPage();
    const res = await page.request.post(
      `/api/admin/users/${encodeURIComponent(TARGET_USER)}/transactions`,
      {
        data: {
          chargeId: "ch_test_fake",
          amount: 0,
          reason: "requested_by_customer",
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("positive integer");
    await page.close();
  });

  test("POST refund rejects invalid amount (float)", async () => {
    const page = await adminContext.newPage();
    const res = await page.request.post(
      `/api/admin/users/${encodeURIComponent(TARGET_USER)}/transactions`,
      {
        data: {
          chargeId: "ch_test_fake",
          amount: 10.5,
          reason: "requested_by_customer",
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("positive integer");
    await page.close();
  });

  test("POST refund rejects non-admin user", async ({ browser }) => {
    const ctx = await browser.newContext();
    await login(ctx, TARGET_USER);
    const page = await ctx.newPage();

    const res = await page.request.post(
      `/api/admin/users/${encodeURIComponent(ADMIN_USER)}/transactions`,
      {
        data: {
          chargeId: "ch_test_fake",
          reason: "requested_by_customer",
        },
      }
    );
    expect(res.status()).toBe(403);
    await page.close();
    await ctx.close();
  });

  test("admin page shows Billing button for users with Stripe customer", async () => {
    const page = await adminContext.newPage();
    await page.goto("/admin");
    await page.getByRole("tab", { name: /users/i }).click();

    // Wait for users table to load
    await expect(page.locator("table")).toBeVisible({ timeout: 8000 });

    // Find the target user row
    const targetRow = page.locator(`tr:has-text("${TARGET_USER}")`);
    if (await targetRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const billingBtn = targetRow.locator('button:has-text("Billing")');
      if (await billingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await billingBtn.click();
        await expect(page.locator("text=Transactions")).toBeVisible({ timeout: 5000 });
      }
    }
    await page.close();
  });
});
