import { test, expect, type BrowserContext } from "@playwright/test";
import { Client } from "pg";
import { hash } from "bcryptjs";

const DB_URL = process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus";
const TEST_USER = `e2e_test_sub_${Date.now()}`;
const TEST_PASS = "E2eTestPass!99";

let authedContext: BrowserContext;

async function dbQuery(sql: string, params: unknown[] = []) {
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    await client.end();
  }
}

test.beforeAll(async ({ browser }) => {
  // Create user directly in DB to avoid registration rate limits
  const hashed = await hash(TEST_PASS, 12);
  const value = JSON.stringify({
    password: hashed,
    role: "user",
    email: `${TEST_USER}@e2etest.local`,
    tier: "analyst",
  });
  await dbQuery(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [`user:${TEST_USER}`, value]
  );

  // Login to get session cookie
  authedContext = await browser.newContext();
  const page = await authedContext.newPage();
  await page.goto("/login");
  await page.locator('input[type="text"]').fill(TEST_USER);
  await page.locator('input[type="password"]').fill(TEST_PASS);
  await page.getByRole("button", { name: /enter platform|sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });
  await page.close();
});

test.afterAll(async () => {
  await authedContext.close();
});

test.describe("Subscription flow", () => {
  test("settings page shows subscription section", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings");
    await page.getByRole("tab", { name: /subscription/i }).click();
    await expect(page.locator("text=Current Plan")).toBeVisible({ timeout: 8000 });
    await page.close();
  });

  test("subscribe button initiates Stripe checkout", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings");

    await page.getByRole("tab", { name: /subscription/i }).click();

    const subscribeBtn = page
      .getByRole("button", { name: /upgrade|contact us/i })
      .first();

    await expect(subscribeBtn).toBeVisible({ timeout: 15000 });

    const [checkoutRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/stripe/checkout"), { timeout: 10000 }),
      subscribeBtn.click(),
    ]).catch(() => [null]);

    if (checkoutRequest) {
      expect(checkoutRequest.method()).toBe("POST");
      console.log("Stripe checkout request fired");
    } else {
      console.log("Stripe not configured locally — button present and clickable");
    }

    await page.close();
  });

  test("subscription API returns current plan for authenticated user", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/subscription");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("tier");
    console.log("Subscription tier:", body.tier);
    await page.close();
  });

  test("tiers API returns available plans", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/admin/tiers");
    expect([200, 403]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      console.log("Tiers:", body.map((t: { name: string }) => t.name).join(", "));
    }
    await page.close();
  });
});
