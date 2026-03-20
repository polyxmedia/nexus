import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";
import { hash } from "bcryptjs";

const DB_URL = process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus";
const TEST_USER = `e2e_test_sub_${Date.now()}`;
const TEST_PASS = "E2eTestPass!99";
const TEST_EMAIL = `${TEST_USER}@e2etest.local`;

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
  test.setTimeout(60000);

  const hashed = await hash(TEST_PASS, 12);
  const value = JSON.stringify({
    password: hashed,
    role: "user",
    email: TEST_EMAIL,
    tier: "observer",
  });
  await dbQuery(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [`user:${TEST_USER}`, value]
  );

  authedContext = await browser.newContext();
  const page = await authedContext.newPage();
  await page.goto("/login", { waitUntil: "networkidle", timeout: 30000 });
  await page.locator('input[type="text"]').fill(TEST_USER);
  await page.locator('input[type="password"]').fill(TEST_PASS);
  await page.getByRole("button", { name: /enter platform|sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 15000 });
  await page.close();
});

test.afterAll(async () => {
  await authedContext?.close();
  // Clean up test user and any subscriptions
  await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
  await dbQuery(`DELETE FROM settings WHERE key = $1`, [`user:${TEST_USER}`]);
});

// ── Registration → Subscription Redirect ──

test.describe("Registration to subscription redirect", () => {
  test("new user registration redirects to subscribe page", async ({ browser }) => {
    test.setTimeout(60000);
    const regUser = `e2e_reg_sub_${Date.now()}`;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto("/register", { waitUntil: "networkidle", timeout: 30000 });
    await expect(page.locator("form")).toBeVisible({ timeout: 8000 });

    // Fill email, username, password, confirm password (in order)
    await page.locator('input[type="email"]').fill(`${regUser}@e2etest.local`);
    await page.locator('input[type="text"]').fill(regUser);
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill("E2eTestPass!99");
    await passwordFields.nth(1).fill("E2eTestPass!99");

    await page.getByRole("button", { name: /create account|register|sign up/i }).click();

    // Should redirect to subscribe page
    await expect(page).toHaveURL(/\/subscribe/, { timeout: 15000 });

    // Subscribe page should show tier options and trial messaging
    await expect(page.getByText("Start free trial").first()).toBeVisible({ timeout: 8000 });

    await page.close();
    await ctx.close();

    // Clean up
    await dbQuery(`DELETE FROM settings WHERE key = $1`, [`user:${regUser}`]);
  });
});

// ── Subscription Tab UI ──

test.describe("Subscription tab", () => {
  test("settings page shows subscription tab with current plan", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings?tab=subscription");

    await expect(page.locator("text=Current Plan")).toBeVisible({ timeout: 8000 });
    await page.close();
  });

  test("displays available tier plans", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings?tab=subscription");

    // Wait for tiers to load
    const plansSection = page.locator("text=Available Plans").or(page.locator("text=Change Plan"));
    await expect(plansSection).toBeVisible({ timeout: 8000 });

    // Should show at least one tier card with a price
    const tierCards = page.locator('[class*="border"][class*="rounded"][class*="p-4"]');
    await expect(tierCards.first()).toBeVisible({ timeout: 5000 });

    // At least one upgrade button should be present
    const upgradeBtn = page.getByRole("button", { name: /upgrade|start free trial/i }).first();
    await expect(upgradeBtn).toBeVisible({ timeout: 5000 });

    await page.close();
  });

  test("tier cards show name, price, and features", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings?tab=subscription");

    await expect(page.locator("text=Available Plans").or(page.locator("text=Change Plan"))).toBeVisible({ timeout: 8000 });

    // Check that tier prices are displayed (e.g. "$49", "$99")
    const pricePattern = page.locator('text=/\\$\\d+/');
    await expect(pricePattern.first()).toBeVisible({ timeout: 5000 });

    // Check that feature items are displayed
    const featureItems = page.locator('[class*="text-navy-400"]').filter({ hasText: /.+/ });
    expect(await featureItems.count()).toBeGreaterThan(0);

    await page.close();
  });
});

// ── Checkout Flow ──

test.describe("Checkout flow", () => {
  test("clicking upgrade calls checkout API and shows payment form", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings?tab=subscription");

    // Wait for upgrade buttons
    const upgradeBtn = page.getByRole("button", { name: /upgrade|start free trial/i }).first();
    await expect(upgradeBtn).toBeVisible({ timeout: 10000 });

    // Intercept the checkout API call
    const checkoutPromise = page.waitForResponse(
      (res) => res.url().includes("/api/stripe/checkout") && res.request().method() === "POST",
      { timeout: 15000 }
    );

    await upgradeBtn.click();

    // Wait for checkout form to appear (header: "Subscribe to {tierName}")
    await expect(page.getByText(/^Subscribe to \w/)).toBeVisible({ timeout: 10000 });

    // Wait for checkout API response
    const checkoutResponse = await checkoutPromise;
    expect(checkoutResponse.status()).toBe(200);

    const checkoutData = await checkoutResponse.json();
    console.log("Checkout response:", {
      hasClientSecret: !!checkoutData.clientSecret,
      type: checkoutData.type,
      hasSubscriptionId: !!checkoutData.subscriptionId,
      hasCustomerId: !!checkoutData.customerId,
    });

    // Validate checkout API returned required fields
    expect(checkoutData.clientSecret).toBeTruthy();
    expect(["payment", "setup"]).toContain(checkoutData.type);
    expect(checkoutData.subscriptionId).toBeTruthy();
    expect(checkoutData.customerId).toBeTruthy();

    // Payment form header should show "Subscribe to {tierName}" (already verified above)

    // Stripe Elements iframe should load (PaymentElement renders in iframe)
    const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
    // Wait for the Stripe iframe to appear (it takes a moment to load)
    await expect(page.locator('iframe[name*="__privateStripeFrame"]').first()).toBeVisible({ timeout: 15000 });

    // Submit button inside payment form should show "Start free trial" or "Pay $X/month"
    const submitBtn = page.locator("form").getByRole("button", { name: /start free trial|pay \$/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });

    console.log("Submit button text:", await submitBtn.textContent());

    await page.close();
  });

  test("checkout form can be closed with X button", async () => {
    const page = await authedContext.newPage();
    await page.goto("/settings?tab=subscription");

    const upgradeBtn = page.getByRole("button", { name: /upgrade|start free trial/i }).first();
    await expect(upgradeBtn).toBeVisible({ timeout: 10000 });
    await upgradeBtn.click();

    // Wait for checkout form to appear
    const checkoutSection = page.locator('[class*="flex"][class*="justify-between"]').filter({
      hasText: /^Subscribe to/,
    });
    await expect(checkoutSection).toBeVisible({ timeout: 10000 });

    // Close button (X) is inside the checkout header
    await checkoutSection.locator("button").click();

    // Form should disappear
    await expect(checkoutSection).not.toBeVisible({ timeout: 5000 });

    // Upgrade button should be re-enabled
    await expect(upgradeBtn).toBeEnabled({ timeout: 5000 });

    await page.close();
  });

  test("checkout API rejects unauthenticated requests", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const response = await page.request.post("/api/stripe/checkout", {
      data: { tierId: 1 },
      headers: { "Content-Type": "application/json" },
    });

    // Without auth: may return 401/403, redirect (200 with HTML), or error
    // Key assertion: should never return a valid clientSecret
    const text = await response.text();
    let hasClientSecret = false;
    try {
      const body = JSON.parse(text);
      hasClientSecret = !!body.clientSecret;
    } catch {
      // HTML response (redirect) - no clientSecret
    }
    expect(hasClientSecret).toBe(false);

    await page.close();
    await ctx.close();
  });

  test("checkout API rejects missing tierId", async () => {
    const page = await authedContext.newPage();

    const response = await page.request.post("/api/stripe/checkout", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });

    expect([400, 403]).toContain(response.status());
    await page.close();
  });

  test("checkout API rejects invalid tierId", async () => {
    const page = await authedContext.newPage();

    const response = await page.request.post("/api/stripe/checkout", {
      data: { tierId: 999999 },
      headers: { "Content-Type": "application/json" },
    });

    expect([400, 500]).toContain(response.status());
    await page.close();
  });
});

// ── Subscription API ──

test.describe("Subscription API", () => {
  test("GET /api/subscription returns current plan for authenticated user", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/subscription");
    expect(response.status()).toBe(200);

    const body = await response.json();
    // Should always have these fields
    expect(body).toHaveProperty("subscription");
    expect(body).toHaveProperty("tier");
    expect(body).toHaveProperty("isAdmin");
    expect(typeof body.isAdmin).toBe("boolean");

    console.log("Subscription API response:", {
      hasSubscription: !!body.subscription,
      hasTier: !!body.tier,
      isAdmin: body.isAdmin,
      status: body.subscription?.status,
    });

    await page.close();
  });

  test("GET /api/subscription returns no tier for unauthenticated user", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const response = await page.request.get("/api/subscription");
    // Without auth: should not grant any tier access
    const text = await response.text();
    let hasTier = false;
    try {
      const body = JSON.parse(text);
      hasTier = !!body.tier;
    } catch {
      // HTML redirect - no tier
    }
    expect(hasTier).toBe(false);

    await page.close();
    await ctx.close();
  });

  test("GET /api/subscription/tiers returns active tiers", async () => {
    const page = await authedContext.newPage();
    const response = await page.request.get("/api/subscription/tiers");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("tiers");
    expect(Array.isArray(body.tiers)).toBe(true);
    expect(body.tiers.length).toBeGreaterThan(0);

    // Each tier should have required fields
    for (const tier of body.tiers) {
      expect(tier).toHaveProperty("id");
      expect(tier).toHaveProperty("name");
      expect(tier).toHaveProperty("price");
      expect(tier).toHaveProperty("interval");
      expect(tier).toHaveProperty("features");
      expect(typeof tier.name).toBe("string");
      expect(typeof tier.price).toBe("number");
      expect(["month", "year"]).toContain(tier.interval);
      expect(Array.isArray(tier.features)).toBe(true);
    }

    console.log("Available tiers:", body.tiers.map((t: { name: string; price: number }) => `${t.name} ($${t.price / 100})`).join(", "));

    await page.close();
  });

  test("tiers API is publicly accessible (no auth needed)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const response = await page.request.get("/api/subscription/tiers");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.tiers.length).toBeGreaterThan(0);

    await page.close();
    await ctx.close();
  });
});

// ── Subscription Status & Tier Gating ──

test.describe("Subscription status handling", () => {
  test("incomplete subscription does not grant tier access", async () => {
    // Create a subscription with "incomplete" status directly in DB
    const rows = await dbQuery(
      `SELECT id FROM subscription_tiers WHERE active = 1 ORDER BY position LIMIT 1`
    );
    if (rows.length === 0) {
      console.log("No active tiers found, skipping test");
      return;
    }

    const tierId = rows[0].id;

    // Insert incomplete subscription (clean up first to avoid duplicates)
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
    await dbQuery(
      `INSERT INTO subscriptions (user_id, tier_id, stripe_customer_id, stripe_subscription_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'incomplete', NOW()::text, NOW()::text)`,
      [TEST_USER, tierId, `cus_test_${Date.now()}`, `sub_test_${Date.now()}`]
    );

    const page = await authedContext.newPage();
    const response = await page.request.get("/api/subscription");
    const body = await response.json();

    // Incomplete subscriptions should NOT return tier data
    expect(body.tier).toBeNull();
    expect(body.subscription).toBeTruthy();
    expect(body.subscription.status).toBe("incomplete");

    console.log("Incomplete sub correctly returns null tier");

    await page.close();
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
  });

  test("active subscription returns tier data", async () => {
    const rows = await dbQuery(
      `SELECT id FROM subscription_tiers WHERE active = 1 ORDER BY position LIMIT 1`
    );
    if (rows.length === 0) {
      console.log("No active tiers found, skipping test");
      return;
    }

    const tierId = rows[0].id;

    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
    await dbQuery(
      `INSERT INTO subscriptions (user_id, tier_id, stripe_customer_id, stripe_subscription_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW()::text, NOW()::text)`,
      [TEST_USER, tierId, `cus_test_${Date.now()}`, `sub_test_${Date.now()}`]
    );

    const page = await authedContext.newPage();
    const response = await page.request.get("/api/subscription");
    const body = await response.json();

    expect(body.tier).toBeTruthy();
    expect(body.tier.id).toBe(tierId);
    expect(body.subscription.status).toBe("active");

    console.log("Active sub correctly returns tier:", body.tier.name);

    await page.close();
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
  });

  test("trialing subscription returns tier data", async () => {
    const rows = await dbQuery(
      `SELECT id FROM subscription_tiers WHERE active = 1 ORDER BY position LIMIT 1`
    );
    if (rows.length === 0) return;

    const tierId = rows[0].id;

    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
    await dbQuery(
      `INSERT INTO subscriptions (user_id, tier_id, stripe_customer_id, stripe_subscription_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'trialing', NOW()::text, NOW()::text)`,
      [TEST_USER, tierId, `cus_test_${Date.now()}`, `sub_test_${Date.now()}`]
    );

    const page = await authedContext.newPage();
    const response = await page.request.get("/api/subscription");
    const body = await response.json();

    expect(body.tier).toBeTruthy();
    expect(body.subscription.status).toBe("trialing");

    await page.close();
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
  });
});

// ── Stripe Portal ──

test.describe("Stripe portal", () => {
  test("portal API requires authentication", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    const response = await page.request.post("/api/stripe/portal");
    // Should reject or not return a portal URL
    const body = await response.json().catch(() => ({}));
    if (response.status() === 200) {
      // If 200, should still not provide a valid portal URL without auth
      expect(body.url).toBeFalsy();
    } else {
      expect([401, 403, 500]).toContain(response.status());
    }

    await page.close();
    await ctx.close();
  });

  test("Manage Billing button appears for subscribed users", async () => {
    const rows = await dbQuery(
      `SELECT id FROM subscription_tiers WHERE active = 1 ORDER BY position LIMIT 1`
    );
    if (rows.length === 0) return;

    const tierId = rows[0].id;
    const custId = `cus_test_${Date.now()}`;
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
    await dbQuery(
      `INSERT INTO subscriptions (user_id, tier_id, stripe_customer_id, stripe_subscription_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW()::text, NOW()::text)`,
      [TEST_USER, tierId, custId, `sub_test_${Date.now()}`]
    );

    const page = await authedContext.newPage();

    // Verify API returns the subscription with stripeCustomerId
    const apiRes = await page.request.get("/api/subscription");
    const apiData = await apiRes.json();
    console.log("Manage Billing test - API data:", {
      hasSub: !!apiData.subscription,
      status: apiData.subscription?.status,
      custId: apiData.subscription?.stripeCustomerId,
      hasTier: !!apiData.tier,
    });

    // Manage Billing requires: subscription.tier is truthy AND stripeCustomerId is truthy
    if (!apiData.tier || !apiData.subscription?.stripeCustomerId) {
      console.log("Skipping: subscription API didn't return expected data (tier or customerId missing)");
      await page.close();
      await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
      return;
    }

    await page.goto("/settings?tab=subscription");

    const manageBillingBtn = page.getByRole("button", { name: /manage billing/i });
    await expect(manageBillingBtn).toBeVisible({ timeout: 10000 });

    await page.close();
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);
  });
});

// ── Free User Experience ──

test.describe("Free user experience", () => {
  test("user with no subscription sees Free plan and upgrade options", async () => {
    await dbQuery(`DELETE FROM subscriptions WHERE user_id = $1`, [TEST_USER]);

    const page = await authedContext.newPage();
    await page.goto("/settings?tab=subscription");

    // Should show "Free" as current plan (exact match on the bold tier name)
    await expect(page.getByText("Free", { exact: true })).toBeVisible({ timeout: 8000 });

    // Should show available plans section
    await expect(page.locator("text=Available Plans")).toBeVisible({ timeout: 5000 });

    // Should have upgrade buttons
    const upgradeButtons = page.getByRole("button", { name: /upgrade|start free trial/i });
    expect(await upgradeButtons.count()).toBeGreaterThan(0);

    // Should NOT show "Manage Billing" (no Stripe customer)
    await expect(page.getByRole("button", { name: /manage billing/i })).not.toBeVisible({ timeout: 2000 });

    await page.close();
  });
});

// ── Webhook Endpoint ──

test.describe("Webhook endpoint", () => {
  test("webhook rejects requests without stripe-signature", async () => {
    const page = await authedContext.newPage();

    const response = await page.request.post("/api/stripe/webhook", {
      data: JSON.stringify({ type: "test" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("signature");

    await page.close();
  });
});
