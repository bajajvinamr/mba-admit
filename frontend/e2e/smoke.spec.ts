import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("homepage loads and shows heading text", async ({ page }) => {
    await page.goto("/");
    // The page should have at least one heading visible
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
    await expect(heading).not.toBeEmpty();
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/");
    // Check for key nav links — look in header/nav or body
    const schoolsLink = page.locator('a[href*="/schools"]').first();
    const pricingLink = page.locator('a[href*="/pricing"]').first();
    const toolsLink = page.locator('a[href*="/tools"]').first();

    await expect(schoolsLink).toBeAttached();
    await expect(pricingLink).toBeAttached();
    await expect(toolsLink).toBeAttached();
  });

  test("schools page is reachable", async ({ page }) => {
    await page.goto("/schools");
    await expect(page).not.toHaveURL(/\/404/);
    // Should render some content or at least a heading
    const content = page.locator("h1, h2, [data-testid]").first();
    await expect(content).toBeVisible({ timeout: 15_000 });
  });

  test("pricing page is reachable", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).not.toHaveURL(/\/404/);
    const content = page.locator("h1, h2").first();
    await expect(content).toBeVisible({ timeout: 15_000 });
  });

  test("tools page is reachable", async ({ page }) => {
    await page.goto("/tools");
    await expect(page).not.toHaveURL(/\/404/);
    const content = page.locator("h1, h2").first();
    await expect(content).toBeVisible({ timeout: 15_000 });
  });

  test("footer is visible", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("mobile menu opens on small viewport", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    await page.goto("/");

    // Look for a mobile menu toggle button (hamburger)
    const menuButton = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="nav" i], [data-testid="mobile-menu"], button:has(svg)'
    ).first();

    // If a mobile menu trigger exists, click it and expect a navigation panel
    if (await menuButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await menuButton.click();
      // After clicking, some navigation links should appear
      const navLink = page.locator("nav a, [role='menu'] a, [role='dialog'] a").first();
      await expect(navLink).toBeVisible({ timeout: 5_000 });
    }

    await context.close();
  });
});
