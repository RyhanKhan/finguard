import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const screenshotDir = process.env.FINGUARD_SCREENSHOT_DIR ?? "../docs/screenshots";
test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test("overview renders verified historical evidence on desktop and mobile", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Intelligence you can inspect." })).toBeVisible();
  await expect(page.getByText("Fraud research", { exact: true })).toBeVisible();
  await expect(page.getByText("73,766", { exact: true })).toBeVisible();
  await expect(page.getByText("Held-out historical evaluation")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshotDir}/finguard-overview-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Fraud scoring" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.reload();
  await expect(page.getByText("Fraud research", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/finguard-overview-mobile.png` });
  await page.getByRole("heading", { name: "Where fraud was routed" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshotDir}/finguard-overview-mobile-scrolled.png` });
  expect(errors).toEqual([]);
});

test("evaluation and scenario controls preserve the published evidence", async ({ page }) => {
  await page.goto("/evaluation");
  await expect(page.getByRole("heading", { name: "Performance, with perspective." })).toBeVisible();
  await expect(page.getByRole("cell", { name: "73,638", exact: true })).toBeVisible();
  await expect(page.getByText("0.365674", { exact: false }).first()).toBeVisible();
  await page.screenshot({
    path: `${screenshotDir}/finguard-evaluation-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("navigation").getByRole("link", { name: "Decision economics" }).click();
  await page.getByRole("radio", { name: "Weaker intervention" }).check();
  await expect(page.getByText("6,503.77", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/0.9986654773731469/)).toBeVisible();
  await page.screenshot({
    path: `${screenshotDir}/finguard-economics-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("Fraud research works without making live Fraud requests on desktop and mobile", async ({
  page,
}) => {
  const fraudRequests: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/health/ready" || path.startsWith("/v1/fraud/")) fraudRequests.push(path);
  });
  for (const width of [1512, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
    await page.goto("/scoring");
    await expect(page.getByRole("heading", { name: "Verified historical evidence" })).toBeVisible();
    await expect(
      page.getByText("Interactive Fraud scoring is not currently", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Score transaction" })).toHaveCount(0);
    await expect(page.getByTestId("raw-score")).toHaveCount(0);
    await expect(page.getByText("API unavailable", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Fraud dataset attribution" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `${screenshotDir}/finguard-fraud-research-${width}.png`,
      fullPage: true,
    });
  }
  expect(fraudRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("published attribution and method notes are accessible and preserve licensing limits", async ({
  page,
}) => {
  await page.goto("/evaluation");
  const attribution = page.getByRole("region", { name: "Fraud dataset attribution" });
  await expect(attribution.getByRole("link", { name: "ODbL 1.0" })).toHaveAttribute(
    "href",
    "https://opendatacommons.org/licenses/odbl/1-0/",
  );
  await expect(attribution.getByRole("link", { name: "DbCL 1.0" })).toHaveAttribute(
    "href",
    "https://opendatacommons.org/licenses/dbcl/1-0/",
  );
  const method = await page.request.get("/reports/fraud-methods.md");
  expect(method.status()).toBe(200);
  expect(await method.text()).toContain("not a declaration of licensing clearance");
  const source = await page.request.get("/reports/attribution.md");
  expect(source.status()).toBe(200);
  expect(await source.text()).toContain("Worldline");
});
