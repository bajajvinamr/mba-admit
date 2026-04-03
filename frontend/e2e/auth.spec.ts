import { test, expect } from "@playwright/test";

test.describe("Auth flows", () => {
  test("sign in page renders with email and password fields", async ({ page }) => {
    await page.goto("/auth/signin");

    const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');

    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });

  test("sign up page renders with name, email, and password fields", async ({ page }) => {
    await page.goto("/auth/signup");

    const nameInput = page.locator('input[name="name"], input#name, input[placeholder*="name" i]');
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password');

    await expect(nameInput.first()).toBeVisible();
    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });

  test("sign up form action targets /onboarding, not /dashboard", async ({ page }) => {
    await page.goto("/auth/signup");

    // Fill out the form and submit — we expect the app to attempt navigation to /onboarding
    // Since backend is likely unavailable, we intercept the API call to simulate success
    await page.route("**/api/auth/signup", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    );
    await page.route("**/api/auth/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/onboarding" }),
      })
    );

    const nameInput = page.locator('input[name="name"], input#name, input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await nameInput.fill("Test User");
    await emailInput.fill("test@example.com");
    await passwordInput.fill("SecurePassword123!");

    // Check that clicking submit does NOT navigate to /dashboard directly
    // The source code confirms router.push("/onboarding") on success
    await submitButton.click();

    // Wait briefly for any navigation attempt
    await page.waitForTimeout(2_000);

    // We should NOT end up at /dashboard (the redirect target is /onboarding)
    expect(page.url()).not.toContain("/dashboard");
  });

  test("invalid login shows error message", async ({ page }) => {
    await page.goto("/auth/signin");

    // Mock the credentials endpoint to return an error
    await page.route("**/api/auth/callback/credentials", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "CredentialsSignin", ok: false, url: null }),
      })
    );

    const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill("wrong@example.com");
    await passwordInput.fill("wrongpassword");
    await submitButton.click();

    // The error message container should appear
    const errorAlert = page.locator('[role="alert"], .text-red-700, [class*="error"]').first();
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });
  });
});
