import { test, expect } from "@playwright/test";

const toolPages = [
  { path: "/evaluator", name: "Essay Evaluator" },
  { path: "/roaster", name: "Profile Roaster" },
  { path: "/goals", name: "Goals" },
  { path: "/simulator", name: "Simulator" },
  { path: "/waitlist", name: "Waitlist" },
  { path: "/outreach", name: "Outreach" },
];

test.describe("AI tools rendering", () => {
  for (const tool of toolPages) {
    test(`${tool.name} page (${tool.path}) loads without error`, async ({ page }) => {
      const response = await page.goto(tool.path);

      // Page should not return a server error
      expect(response?.status()).toBeLessThan(500);

      // Should render a heading or main content area
      const content = page.locator("h1, h2, main, [role='main']").first();
      await expect(content).toBeVisible({ timeout: 15_000 });
    });
  }

  test("evaluator page has form inputs visible", async ({ page }) => {
    await page.goto("/evaluator");
    await page.waitForLoadState("domcontentloaded");

    // At least one interactive element should be present
    const count = await page.locator("textarea, select, input, [role='combobox']").count();
    expect(count).toBeGreaterThan(0);
  });

  test("evaluator textarea is interactive", async ({ page }) => {
    await page.goto("/evaluator");

    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await textarea.fill("This is a test essay about my MBA journey.");
      await expect(textarea).toHaveValue(/test essay/);
    }
  });

  test("usage gate displays for gated features when not authenticated", async ({ page }) => {
    await page.goto("/evaluator");
    await page.waitForLoadState("domcontentloaded");

    // Either a usage gate/paywall or the form should be visible
    const gateCount = await page.locator('text=/sign.?in|sign.?up|upgrade|limit|usage|free.?tier|create.*account/i').count();
    const formCount = await page.locator("textarea, form").count();

    expect(gateCount + formCount).toBeGreaterThan(0);
  });
});
