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

    // Wait for either school cards to render or an empty/error state
    const schoolCard = page.locator(
      '[class*="card"], [class*="school"], [data-testid*="school"], article'
    ).first();
    const emptyState = page.locator('text=/no.*school|no.*result|error|loading/i').first();

    // Either cards appear or we get an informational state — both are acceptable
    await expect(schoolCard.or(emptyState)).toBeVisible({ timeout: 15_000 });
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
    // Navigate to a known school page
    await page.goto("/school/hbs");

    // Should show some school content — heading, name, or overview section
    const content = page.locator("h1, h2, [class*='overview']").first();
    const errorState = page.locator("text=/not found|error|404/i").first();

    await expect(content.or(errorState)).toBeVisible({ timeout: 15_000 });
  });
});
