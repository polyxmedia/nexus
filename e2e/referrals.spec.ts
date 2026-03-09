import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// ── Test data ──────────────────────────────────────────────────────────────

const REFERRER_USER = `e2e_test_ref_${Date.now()}`;
const REFERRER_EMAIL = `${REFERRER_USER}@e2etest.local`;
const REFERRER_PASS = "E2eRefPass!99";

const REFERRED_USER = `e2e_test_rfd_${Date.now()}`;
const REFERRED_EMAIL = `${REFERRED_USER}@e2etest.local`;
const REFERRED_PASS = "E2eRfdPass!99";

// ── Helpers ────────────────────────────────────────────────────────────────

async function register(page: Page, email: string, username: string, password: string, refCode?: string) {
  const url = refCode ? `/register?ref=${refCode}` : "/register";
  await page.goto(url);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="text"]').fill(username);
  const pwInputs = page.locator('input[type="password"]');
  await pwInputs.nth(0).fill(password);
  await pwInputs.nth(1).fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  // Registration may redirect to dashboard or settings (subscription prompt)
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });
}

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /enter platform|sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/settings/, { timeout: 12000 });
}

// ── Tests ──────────────────────────────────────────────────────────────────

let referrerContext: BrowserContext;
let referralCode: string;

test.describe.serial("Referral System", () => {
  // ── 1. Referrer registration & code generation ──

  test("referrer registers and gets a referral code", async ({ browser }) => {
    referrerContext = await browser.newContext();
    const page = await referrerContext.newPage();

    await register(page, REFERRER_EMAIL, REFERRER_USER, REFERRER_PASS);

    // Navigate to referrals page
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    // Should see the referral link section
    await expect(page.getByText("Your Referral Link", { exact: true })).toBeVisible({ timeout: 10000 });

    // Code should be a UUID (not containing the username)
    // The referral API auto-creates the code - fetch it directly
    const apiRes = await page.request.get("/api/referrals");
    const apiData = await apiRes.json();
    const codeText = apiData.code?.code;
    expect(codeText).toBeTruthy();
    // UUID format: 8-4-4-4-12
    expect(codeText).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // Must NOT contain the username
    expect(codeText!.toLowerCase()).not.toContain(REFERRER_USER.toLowerCase());

    referralCode = codeText!;
    await page.close();
  });

  // ── 2. Referral code does not expose identity ──

  test("referral code is a UUID and does not leak username", async () => {
    expect(referralCode).toBeTruthy();
    expect(referralCode).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(referralCode.toLowerCase()).not.toContain(REFERRER_USER.toLowerCase());
    expect(referralCode.toLowerCase()).not.toContain(REFERRER_EMAIL.split("@")[0].toLowerCase());
  });

  // ── 3. Click tracking redirects to register with ref param ──

  test("click tracking endpoint redirects to register with ref code", async () => {
    // Use authenticated context since the API route may be behind middleware
    const page = await referrerContext.newPage();
    const response = await page.request.get(`/api/referrals/click?code=${referralCode}`, {
      maxRedirects: 0,
    });

    // Should be a redirect (302/307/308)
    expect([301, 302, 307, 308]).toContain(response.status());
    const location = response.headers()["location"];
    expect(location).toContain("/register");
    expect(location).toContain(`ref=${referralCode}`);
    await page.close();
  });

  // ── 4. Referred user registers via referral link ──

  test("referred user signs up via referral link", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await register(page, REFERRED_EMAIL, REFERRED_USER, REFERRED_PASS, referralCode);

    await page.close();
    await context.close();
  });

  // ── 5. Referrer sees the signup in their dashboard ──

  test("referrer dashboard shows the referred signup", async () => {
    const page = await referrerContext.newPage();

    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    // Stats should show 1 signup
    await expect(page.locator("text=Signups")).toBeVisible({ timeout: 10000 });

    // Check the referred user appears in the list
    await expect(page.locator(`text=${REFERRED_USER}`)).toBeVisible({ timeout: 5000 });

    // Status should be "Signed Up" (not subscribed yet - no payment)
    await expect(page.locator("text=Signed Up")).toBeVisible();

    await page.close();
  });

  // ── 6. Referrer API returns correct stats ──

  test("referral API returns correct data structure", async () => {
    const page = await referrerContext.newPage();
    const response = await page.request.get("/api/referrals");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Code structure
    expect(data.code).toBeDefined();
    expect(data.code.code).toBe(referralCode);
    expect(data.code.commissionRate).toBe(0.2);
    expect(data.code.clicks).toBeGreaterThanOrEqual(1);

    // Stats
    expect(data.stats.totalSignups).toBeGreaterThanOrEqual(1);
    expect(data.stats.totalClicks).toBeGreaterThanOrEqual(1);

    // No subscriptions yet (no payment made) = no commissions
    expect(data.stats.totalSubscribed).toBe(0);
    expect(data.stats.totalEarned).toBe(0);
    expect(data.stats.pendingEarnings).toBe(0);

    // Referral record
    expect(data.referrals.length).toBeGreaterThanOrEqual(1);
    const referred = data.referrals.find((r: { referredUser: string }) => r.referredUser === REFERRED_USER);
    expect(referred).toBeDefined();
    expect(referred.status).toBe("signed_up");

    // No commissions for unpaid signups
    expect(data.commissions.length).toBe(0);

    await page.close();
  });

  // ── 7. No payout button when no earnings ──

  test("payout section is hidden when no pending earnings", async () => {
    const page = await referrerContext.newPage();
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    // Commission plan should be visible
    await expect(page.locator("text=Commission Plan")).toBeVisible({ timeout: 10000 });

    // But payout request should NOT be visible (no earnings)
    await expect(page.locator("text=Request Payout")).not.toBeVisible();
    await expect(page.locator("text=Available for Payout")).not.toBeVisible();

    await page.close();
  });

  // ── 8. Code regeneration produces new UUID ──

  test("regenerating code produces a new UUID", async () => {
    const page = await referrerContext.newPage();

    const response = await page.request.post("/api/referrals", {
      data: { action: "regenerate" },
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.code).toBeTruthy();
    // New code is different from old one
    expect(body.code).not.toBe(referralCode);
    // Still a UUID
    expect(body.code).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // Still doesn't contain username
    expect(body.code.toLowerCase()).not.toContain(REFERRER_USER.toLowerCase());

    await page.close();
  });

  // ── 9. Copy link button works ──

  test("copy link button is functional", async ({ browser }) => {
    // Grant clipboard permissions for headless browser
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
      storageState: await referrerContext.storageState(),
    });
    const page = await context.newPage();
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    const copyBtn = page.getByRole("button", { name: /copy/i });
    await expect(copyBtn).toBeVisible({ timeout: 10000 });
    await copyBtn.click();

    // Button text should change to "Copied"
    await expect(page.getByText("Copied", { exact: true })).toBeVisible({ timeout: 3000 });

    await page.close();
    await context.close();
  });

  // ── 10. Payout request fails with no pending commissions ──

  test("payout request returns error when no pending commissions", async () => {
    const page = await referrerContext.newPage();

    const response = await page.request.post("/api/referrals", {
      data: {
        action: "request_payout",
        paymentMethod: "paypal",
        paymentDetails: "paypal: test@test.com",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No pending commissions");

    await page.close();
  });

  // ── 11. Unauthenticated access blocked ──

  test("referral page shows error when unauthenticated", async ({ browser }) => {
    const freshContext = await browser.newContext();
    const page = await freshContext.newPage();

    await page.goto("/referrals");
    // Should either redirect to login or show sign-in prompt
    const isRedirected = page.url().includes("/login") || page.url().includes("/register");
    if (!isRedirected) {
      // Page loads but shows error/sign-in message
      await expect(page.locator("text=Failed to load referral data")).toBeVisible({ timeout: 8000 });
    }

    await page.close();
    await freshContext.close();
  });

  // ── 12. Click tracking without code redirects to register ──

  test("click endpoint without code still redirects to register", async () => {
    const page = await referrerContext.newPage();
    const response = await page.request.get("/api/referrals/click", {
      maxRedirects: 0,
    });

    expect([301, 302, 307, 308]).toContain(response.status());
    const location = response.headers()["location"];
    expect(location).toContain("/register");
    // No ref param when no code
    expect(location).not.toContain("ref=");
    await page.close();
  });

  // ── 13. Commission plan shows 20% rate ──

  test("commission plan displays correct rate on page", async () => {
    const page = await referrerContext.newPage();
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=20% recurring")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Step 1")).toBeVisible();
    await expect(page.locator("text=Step 2")).toBeVisible();
    await expect(page.locator("text=Step 3")).toBeVisible();

    await page.close();
  });

  // ── 14. Referrals page shows empty states gracefully ──

  test("new user with no referrals sees empty states", async ({ browser }) => {
    const freshUser = `e2e_test_ref_empty_${Date.now()}`;
    const context = await browser.newContext();
    const page = await context.newPage();

    await register(page, `${freshUser}@e2etest.local`, freshUser, "E2eFreshPass!99");
    await page.goto("/referrals");
    await page.waitForLoadState("networkidle");

    // Should see empty referrals message
    await expect(page.locator("text=No referrals yet")).toBeVisible({ timeout: 10000 });
    // Should see empty commissions message
    await expect(page.locator("text=No commissions yet")).toBeVisible();

    await page.close();
    await context.close();
  });

  // ── Cleanup ──

  test.afterAll(async () => {
    await referrerContext?.close();
  });
});
