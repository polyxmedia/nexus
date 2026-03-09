import { test, expect } from "@playwright/test";

test.describe("Trial period copy", () => {
  test("landing page shows 2-day trial", async ({ page }) => {
    await page.goto("/landing");
    const content = await page.textContent("body");
    expect(content).toContain("2-day free trial");
    expect(content).not.toContain("14-day free trial");
    expect(content).not.toContain("14 days free");
    expect(content).not.toContain("No credit card");
  });

  test("home page shows 2-day trial", async ({ page }) => {
    await page.goto("/");
    const content = await page.textContent("body");
    expect(content).toContain("2-day free trial");
    expect(content).not.toContain("14-day free trial");
    expect(content).not.toContain("No credit card");
  });

  test("register page shows 2-day trial", async ({ page }) => {
    await page.goto("/register");
    const content = await page.textContent("body");
    expect(content).toContain("2-day free trial");
    expect(content).not.toContain("14-day free trial");
    expect(content).toContain("2-Day Free Trial");
  });

  test("about page shows 2 days free", async ({ page }) => {
    await page.goto("/about");
    const content = await page.textContent("body");
    expect(content).toContain("2 days free");
    expect(content).not.toContain("14 days free");
    expect(content).not.toContain("No credit card");
  });
});

test.describe("Email references", () => {
  test("contact page uses hello@nexushq.xyz", async ({ page }) => {
    await page.goto("/contact");
    const content = await page.textContent("body");
    // Should reference hello@nexushq.xyz, not old emails
    if (content?.includes("@nexushq.xyz")) {
      expect(content).toContain("hello@nexushq.xyz");
      expect(content).not.toContain("contact@nexushq.xyz");
      expect(content).not.toContain("enterprise@nexushq.xyz");
    }
  });

  test("privacy page uses hello@nexushq.xyz", async ({ page }) => {
    await page.goto("/privacy");
    const content = await page.textContent("body");
    if (content?.includes("@nexushq.xyz")) {
      expect(content).toContain("hello@nexushq.xyz");
      expect(content).not.toContain("privacy@nexushq.xyz");
    }
  });

  test("security page uses hello@nexushq.xyz", async ({ page }) => {
    await page.goto("/security");
    const content = await page.textContent("body");
    if (content?.includes("@nexushq.xyz")) {
      expect(content).toContain("hello@nexushq.xyz");
      expect(content).not.toContain("security@nexushq.xyz");
    }
  });
});
