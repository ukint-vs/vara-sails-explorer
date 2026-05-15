import { expect, test } from "@playwright/test";

const routes = [
  "/?source=fixture",
  "/blocks?source=fixture",
  "/block-detail?source=fixture&block=18427057",
  "/messages",
  "/programs",
  "/codes",
  "/message-detail",
  "/program-detail",
  "/decode",
  "/settings?source=fixture",
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

test("settings rejects non-WebSocket custom endpoints", async ({ page }) => {
  await page.goto("/settings?source=fixture");

  await page.getByRole("textbox", { name: "Custom endpoint" }).fill("https://rpc.vara.network");
  await page.getByRole("button", { name: "Save endpoint" }).click();

  await expect(page.getByRole("alert")).toContainText("Use a ws:// or wss:// endpoint.");
});

test("block detail renders fixture events and extrinsics", async ({ page }) => {
  await page.goto("/block-detail?source=fixture&block=18427057");

  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Extrinsics", exact: true })).toBeVisible();
  await expect(page.getByText("gear.MessageQueued", { exact: true })).toBeVisible();
});

test("block detail rejects invalid block query", async ({ page }) => {
  await page.goto("/block-detail?source=fixture&block=not-a-block");

  await expect(page.getByRole("alert")).toContainText("Use a block number or 0x hash");
});
