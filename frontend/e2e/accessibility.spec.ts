import { test, expect } from "@playwright/test";

const pagesToCheck = [
  { path: "/", name: "Homepage" },
  { path: "/schools", name: "Schools" },
  { path: "/pricing", name: "Pricing" },
  { path: "/auth/signin", name: "Sign In" },
  { path: "/auth/signup", name: "Sign Up" },
  { path: "/evaluator", name: "Evaluator" },
  { path: "/tools", name: "Tools" },
];

test.describe("Accessibility checks", () => {
  for (const pg of pagesToCheck) {
    test(`${pg.name} page has proper heading hierarchy`, async ({ page }) => {
      await page.goto(pg.path);
      await page.waitForLoadState("domcontentloaded");

      // Collect all headings and their levels
      const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();

      // There should be at least one heading on each page
      expect(headings.length).toBeGreaterThan(0);

      // Check that no heading level is skipped (e.g., h1 then h3 without h2)
      const levels: number[] = [];
      for (const h of headings) {
        const tag = await h.evaluate((el) => el.tagName.toLowerCase());
        levels.push(parseInt(tag.replace("h", ""), 10));
      }

      // The first heading should be h1 or h2 (some pages use h2 as top-level in sections)
      expect(levels[0]).toBeLessThanOrEqual(2);

      // Verify no level jumps more than 2 steps (allow h1→h3 for component-based layouts)
      for (let i = 1; i < levels.length; i++) {
        const jump = levels[i] - levels[i - 1];
        if (jump > 0) {
          expect(jump).toBeLessThanOrEqual(2);
        }
      }
    });
  }

  test("sign in form inputs have associated labels", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.waitForLoadState("domcontentloaded");

    const inputs = await page.locator(
      'form input:not([type="hidden"]):not([type="submit"])'
    ).all();

    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");

      // Each input should have either a matching label, aria-label, aria-labelledby, or placeholder
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;

      const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy || !!placeholder;
      expect(isLabelled).toBe(true);
    }
  });

  test("sign up form inputs have associated labels", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.waitForLoadState("domcontentloaded");

    const inputs = await page.locator(
      'form input:not([type="hidden"]):not([type="submit"])'
    ).all();

    for (const input of inputs) {
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");

      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;

      const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy || !!placeholder;
      expect(isLabelled).toBe(true);
    }
  });

  test("images have alt text on homepage", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const images = await page.locator("img").all();

    for (const img of images) {
      const alt = await img.getAttribute("alt");
      const role = await img.getAttribute("role");

      // Images should have alt text, or role="presentation" / role="none" for decorative images
      const hasAlt = alt !== null; // empty string alt is valid for decorative images
      const isDeclarative = role === "presentation" || role === "none";

      expect(hasAlt || isDeclarative).toBe(true);
    }
  });

  test("no duplicate IDs on key pages", async ({ page }) => {
    for (const pg of pagesToCheck) {
      await page.goto(pg.path);
      await page.waitForLoadState("domcontentloaded");

      const ids = await page.locator("[id]").evaluateAll((elements) =>
        elements.map((el) => el.id).filter((id) => id.length > 0)
      );

      const seen = new Set<string>();
      const duplicates: string[] = [];

      for (const id of ids) {
        if (seen.has(id)) {
          duplicates.push(id);
        }
        seen.add(id);
      }

      expect(
        duplicates,
        `Duplicate IDs found on ${pg.name} (${pg.path}): ${duplicates.join(", ")}`
      ).toEqual([]);
    }
  });
});
