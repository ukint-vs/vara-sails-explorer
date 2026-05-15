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

test("settings route opens the topbar dropdown", async ({ page }) => {
  await page.goto("/settings?source=fixture");

  await expect(page).toHaveURL(/settings=open/);
  await expect(page.getByRole("dialog", { name: "Explorer settings" })).toBeVisible();
});

test("topbar settings validates custom endpoints", async ({ page }) => {
  await page.goto("/?source=fixture");

  await page.getByRole("button", { name: /Explorer settings/ }).click();
  await expect(page.getByRole("dialog", { name: "Explorer settings" })).toBeVisible();
  await page.getByRole("textbox", { name: "Custom endpoint" }).fill("https://rpc.vara.network");
  await page.getByRole("button", { name: "Apply endpoint" }).click();

  await expect(page.getByRole("alert")).toContainText("Use a ws:// or wss:// endpoint.");
});

test("topbar settings opens endpoint dropdown from the shell", async ({ page }) => {
  await page.goto("/?source=fixture");

  await page.getByRole("button", { name: /Explorer settings/ }).click();
  await expect(page.getByRole("dialog", { name: "Explorer settings" })).toBeVisible();
});

test("block detail renders fixture events and extrinsics", async ({ page }) => {
  await page.goto("/block-detail?source=fixture&block=18427057");

  await expect(page.getByRole("heading", { name: "Observed in this block", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Extrinsics", exact: true })).toBeVisible();
  await expect(page.getByText("Program 0xabcdef...7890")).toBeVisible();
  await expect(page.locator(".detail-table").getByText("gear.MessageQueued", { exact: true }).first()).toBeVisible();
});

test("block detail rejects invalid block query", async ({ page }) => {
  await page.goto("/block-detail?source=fixture&block=not-a-block");

  await expect(page.getByRole("alert")).toContainText("Use a block number or 0x hash");
});

test("live M1 block surfaces use real-first labels", async ({ page }) => {
  await page.goto("/blocks?source=fixture");

  await expect(page.getByText("Gear events").first()).toBeVisible();
  await expect(page.getByText("Failed ext.").first()).toBeVisible();
  await expect(page.getByText("Sails decoded")).toHaveCount(0);
  await expect(page.getByText("Decode coverage")).toHaveCount(0);
});
