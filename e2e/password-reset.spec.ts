import { test, expect } from "@playwright/test";

const TEST_USER = `e2e_test_reset_${Date.now()}`;
const TEST_EMAIL = `${TEST_USER}@e2etest.local`;
const TEST_PASS = "E2eTestPassSecure99";
const NEW_PASS = "NewSecurePassChanged42";

// ── Helpers ──────────────────────────────────────────────────────────────

async function registerUserViaAPI(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post("/api/auth/register", {
    data: { username: TEST_USER, password: TEST_PASS, email: TEST_EMAIL },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Register API failed: ${res.status()} ${body}`);
  }
}

async function insertResetToken(): Promise<string> {
  const { Client } = await import("pg");
  const { randomBytes } = await import("crypto");
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus",
  });
  await client.connect();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await client.query("DELETE FROM password_resets WHERE username = $1", [TEST_USER]);
  await client.query(
    "INSERT INTO password_resets (username, token, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [TEST_USER, token, expiresAt, new Date().toISOString()]
  );

  await client.end();
  return token;
}

async function insertExpiredToken(): Promise<string> {
  const { Client } = await import("pg");
  const { randomBytes } = await import("crypto");
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://andrefigueira@localhost:5432/nexus",
  });
  await client.connect();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() - 60 * 1000).toISOString(); // expired 1 min ago

  await client.query(
    "INSERT INTO password_resets (username, token, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [TEST_USER, token, expiresAt, new Date().toISOString()]
  );

  await client.end();
  return token;
}

// ── Tests ────────────────────────────────────────────────────────────────

test.describe.serial("Password Reset", () => {
  test("setup: register test user via API", async ({ request }) => {
    await registerUserViaAPI(request);
  });

  // ── UI: Forgot Password page ──────────────────────────────────────────

  test("forgot password page renders correctly", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByText("Reset Password")).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("login page links to forgot password", async ({ page }) => {
    await page.goto("/login");
    const forgotLink = page.getByRole("link", { name: /forgot/i });
    await expect(forgotLink).toBeVisible({ timeout: 5000 });
    await forgotLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("forgot password shows success for non-existent user (no info leak)", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator('input[type="text"]').fill("nonexistent_user_nobody");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText("Check your email")).toBeVisible({ timeout: 6000 });
  });

  test("forgot password shows success for valid user", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator('input[type="text"]').fill(TEST_USER);
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText("Check your email")).toBeVisible({ timeout: 6000 });
  });

  // ── UI: Reset Password page — invalid states ──────────────────────────

  test("reset page shows expired state for invalid token", async ({ page }) => {
    await page.goto("/reset-password?token=bogus_invalid_token_abc");
    await expect(page.getByRole("heading", { name: "Link Expired" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Request New Reset Link")).toBeVisible();
  });

  test("reset page shows expired state with no token", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: "Link Expired" })).toBeVisible({ timeout: 8000 });
  });

  // ── Full E2E flow: insert token → reset via UI → login ────────────────
  // Run this BEFORE the API validation tests to avoid rate limit accumulation

  test("full flow: reset password via UI then login with new password", async ({ page, request }) => {
    const token = await insertResetToken();
    expect(token).toBeTruthy();
    expect(token.length).toBe(64);

    // Validate token via API
    const validateRes = await request.get(`/api/auth/reset-password?token=${token}`);
    const validateBody = await validateRes.json();
    expect(validateBody.valid).toBe(true);
    expect(validateBody.username).toBe(TEST_USER);

    // Visit reset page with valid token
    await page.goto(`/reset-password?token=${token}`);
    await expect(page.getByText("Set New Password")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(TEST_USER)).toBeVisible();

    // Fill in new password
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.nth(0).fill(NEW_PASS);

    // Check strength meter
    await expect(page.locator("text=Good").or(page.locator("text=Strong"))).toBeVisible();

    await pwInputs.nth(1).fill(NEW_PASS);

    // Check confirmation checkmark
    await expect(page.locator('[class*="text-accent-emerald"]')).toBeVisible();

    // Submit
    await page.getByRole("button", { name: /reset password/i }).click();
    await expect(page.getByText("You're All Set")).toBeVisible({ timeout: 8000 });

    // Sign in with new password — navigate fresh to avoid re-render race
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="text"]').fill(TEST_USER);
    await page.locator('input[type="password"]').fill(NEW_PASS);
    await page.getByRole("button", { name: /enter platform/i }).click();
    // Either lands on dashboard or shows error
    const dashboardOrError = await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 12000 }).then(() => "dashboard" as const),
      page.locator("text=Invalid credentials").waitFor({ timeout: 12000 }).then(() => "error" as const),
    ]);
    expect(dashboardOrError).toBe("dashboard");
  });

  // ── Old password no longer works ───────────────────────────────────────

  test("old password fails after reset", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="text"]').fill(TEST_USER);
    await page.locator('input[type="password"]').fill(TEST_PASS);
    await page.getByRole("button", { name: /enter platform/i }).click();
    await expect(page.locator("text=Invalid credentials")).toBeVisible({ timeout: 6000 });
  });

  // ── Token is single-use ────────────────────────────────────────────────

  test("used token cannot be reused", async ({ request }) => {
    const token = await insertResetToken();

    // Use it once
    const res1 = await request.post("/api/auth/reset-password", {
      data: { token, password: "AnotherPassChanged999" },
    });
    expect(res1.ok()).toBeTruthy();

    // Try again — should fail
    const res2 = await request.post("/api/auth/reset-password", {
      data: { token, password: "YetAnotherChanged999" },
    });
    expect(res2.status()).toBe(400);
    const body = await res2.json();
    expect(body.error).toMatch(/invalid|expired/i);
  });

  // ── API validation tests ───────────────────────────────────────────────

  test("validate endpoint returns false for bad token", async ({ request }) => {
    const res = await request.get("/api/auth/reset-password?token=fake_token_123");
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  test("validate endpoint returns false with no token", async ({ request }) => {
    const res = await request.get("/api/auth/reset-password");
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  test("reset POST rejects missing password", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "abc" },
    });
    expect(res.status()).toBe(400);
  });

  test("reset POST rejects short password", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "abc", password: "short" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least 10/i);
  });

  test("reset POST rejects invalid token", async ({ request }) => {
    const res = await request.post("/api/auth/reset-password", {
      data: { token: "nonexistent_token_xyz", password: "LongEnoughPassChanged42" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid|expired/i);
  });

  test("reset POST rejects expired token", async ({ request }) => {
    const token = await insertExpiredToken();
    const res = await request.post("/api/auth/reset-password", {
      data: { token, password: "ExpiredTokenPass42" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  test("forgot-password API returns ok for non-existent user", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: { identifier: "ghost_user_never_exists_12345" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
