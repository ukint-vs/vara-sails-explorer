import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_IDL, SAMPLE_PAYLOAD_HEX } from "../../lib/decode/sample";
import { RPC_SETTINGS_CHANGED_EVENT, SETTINGS_STORAGE_KEY } from "../../lib/live-explorer/settings";

const decodeAttemptTimeout = 7_000;

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

async function expectDecodeLabReady(page: Page) {
  await expect(page).toHaveURL(/\/decode/);
  await expect(page.getByRole("combobox", { name: "IDL source" })).toHaveValue("pasted_idl");
  await expect(page.getByLabel("IDL text")).toBeEditable();
  await expect(page.getByLabel("Raw bytes")).toBeEditable();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("IDL text")).toBeEditable();
  await expect(page.getByLabel("Raw bytes")).toBeEditable();
}

async function fillDecodeLabAndWait(page: Page, payloadHex: string, waitForResult: () => Promise<void>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expectDecodeLabReady(page);
    await page.getByLabel("IDL text").fill(SAMPLE_IDL);
    await page.getByLabel("Raw bytes").fill(payloadHex);
    await expect(page.getByLabel("IDL text")).toHaveValue(SAMPLE_IDL);
    await expect(page.getByLabel("Raw bytes")).toHaveValue(payloadHex);

    try {
      await waitForResult();
      return;
    } catch (error) {
      lastError = error;
      await page.waitForLoadState("networkidle").catch(() => undefined);
    }
  }

  throw lastError;
}

function diagnosticsCopyButton(page: Page) {
  return page.getByRole("region", { name: "Diagnostics" }).getByRole("button").first();
}

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

test("decode lab runs bundled worker flow and copies diagnostics", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/decode", { waitUntil: "networkidle" });

  await fillDecodeLabAndWait(page, SAMPLE_PAYLOAD_HEX, async () => {
    await expect(page.getByText('"value": 7')).toBeVisible({ timeout: decodeAttemptTimeout });
  });
  await expect(page.getByText("Counter")).toBeVisible();
  await expect(page.getByText("routeIdx")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy payload hex" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy IDL hash" }).first()).toBeVisible();

  await diagnosticsCopyButton(page).click();
  await expect(page.locator("[role='status']")).toContainText(/Diagnostics copied|Copy failed/);
});

test("decode lab invalidates active IDL when source text changes", async ({ page }) => {
  await page.goto("/decode", { waitUntil: "networkidle" });

  await fillDecodeLabAndWait(page, SAMPLE_PAYLOAD_HEX, async () => {
    await expect(page.getByText('"value": 7')).toBeVisible({ timeout: decodeAttemptTimeout });
  });

  await page.getByLabel("IDL text").fill("{ definitely invalid");

  await expect(page.getByRole("button", { name: "Decode now" })).toBeDisabled();
  await expect(page.getByLabel("Decode workspace").getByText('"value": 7')).toHaveCount(0);
  await expect(page.getByLabel("Decode workspace").getByText("Invalid IDL").first()).toBeVisible({
    timeout: decodeAttemptTimeout
  });
});

test("decode lab follows live endpoint setting changes", async ({ page }) => {
  await page.goto("/decode", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "IDL source" }).selectOption("program_id");

  const sourceRail = page.locator(".decode-source-rail");
  await expect(sourceRail.getByText("Vara testnet")).toBeVisible();

  await page.evaluate(
    ([storageKey, eventName]) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ selectedEndpointId: "custom", customEndpointUrl: "wss://custom.vara.example" })
      );
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [SETTINGS_STORAGE_KEY, RPC_SETTINGS_CHANGED_EVENT]
  );

  await expect(sourceRail.getByText("Custom endpoint")).toBeVisible();
});

test("decode lab shows malformed payload failures without hiding diagnostics", async ({ page }) => {
  await page.goto("/decode", { waitUntil: "networkidle" });

  await fillDecodeLabAndWait(page, "0x000102", async () => {
    await expect(page.getByLabel("Decode workspace").getByText("Sails unknown").first()).toBeVisible({ timeout: decodeAttemptTimeout });
  });
  await expect(page.getByLabel("Decode workspace").getByText(/too-short|no-magic/).first()).toBeVisible();
  await expect(diagnosticsCopyButton(page)).toBeEnabled();
});
