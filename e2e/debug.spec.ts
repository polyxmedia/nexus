import { test, expect } from "@playwright/test";

test("diagnose register page", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => errors.push(err.message));

  await page.goto("/register");
  await page.waitForLoadState("networkidle");

  console.log("URL after load:", page.url());
  console.log("Console errors:", errors);

  const emailInput = page.locator('input[type="email"]');
  const isVisible = await emailInput.isVisible().catch(() => false);
  console.log("Email input visible:", isVisible);

  const allInputs = await page.locator("input").all();
  console.log("Total inputs found:", allInputs.length);

  for (const input of allInputs) {
    const type = await input.getAttribute("type");
    const visible = await input.isVisible();
    console.log(`  input type="${type}" visible=${visible}`);
  }

  // Take a screenshot
  await page.screenshot({ path: "e2e/debug-register.png", fullPage: true });
});
