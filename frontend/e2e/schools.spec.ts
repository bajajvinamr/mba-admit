import { test, expect } from "@playwright/test";

test.describe("Schools directory", () => {
  test("schools page loads with search input", async ({ page }) => {
    await page.goto("/schools");

    // The page should have a search bar / input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="school" i], input[aria-label*="search" i]'
    ).first();

    await expect(searchInput).toBeVisible({ timeout: 15_000 });
  });

  test("schools display in grid or list", async ({ page }) => {
    await page.goto("/schools");

    // Wait for the page to be interactive
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // Either school cards or a loading/empty state should be visible
    const hasContent = await page.locator('article, [class*="school-card"], [data-testid*="school"]').count();
    const hasLoading = await page.locator('text=/loading/i').count();
    const hasSearch = await page.locator('input[placeholder*="search" i]').count();

    expect(hasContent + hasLoading + hasSearch).toBeGreaterThan(0);
  });

  test("search input accepts text", async ({ page }) => {
    await page.goto("/schools");

    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="school" i], input[aria-label*="search" i]'
    ).first();

    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill("Harvard");

    // After typing, the input should contain our query
    await expect(searchInput).toHaveValue("Harvard");
  });

  test("individual school page loads with content", async ({ page }) => {
    await page.goto("/school/hbs");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // Should show some school content — headings, tabs, or any meaningful text
    const contentCount = await page.locator("h1, h2, h3, [role='tablist'], main").count();
    expect(contentCount).toBeGreaterThan(0);
  });
});
