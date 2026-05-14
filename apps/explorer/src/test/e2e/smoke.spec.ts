import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/blocks",
  "/messages",
  "/message-detail",
  "/program-detail",
  "/decode",
  "/settings",
  "/compare",
  "/variants/terminal",
  "/variants/operator",
  "/variants/documentarian",
  "/variants/search-first"
];

for (const route of routes) {
  test(`renders ${route}`, async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("link", { name: "Vara Sails Explorer home" })).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();

    const screenshot = await page.screenshot();
    expect(screenshot.length).toBeGreaterThan(5_000);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(2);
  });
}
