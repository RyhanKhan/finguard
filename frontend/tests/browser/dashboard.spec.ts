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
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
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
    page.getByRole("navigation").getByRole("link", { name: "Live scoring" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.reload();
  await expect(page.getByText("API connected", { exact: true })).toBeVisible();
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

test("one genuine synthetic transaction is scored by the actual FastAPI backend", async ({
  page,
}) => {
  // No route mocks: requires the genuine frozen-artifact API on port 8000.
  await page.goto("/scoring");
  const submit = page.getByRole("button", { name: "Score transaction", exact: true });
  await expect(submit).toBeEnabled();
  await expect(page.getByTestId("raw-score")).toHaveCount(0);
  await page.getByRole("button", { name: /Start with a synthetic example/ }).click();
  const responsePromise = page.waitForResponse(
    (r) => r.url().endsWith("/v1/fraud/score") && r.request().method() === "POST",
  );
  await submit.click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.raw_score).toBe(0.0006554509184609327);
  expect(result.action).toBe("approve");
  expect(result.thresholds).toMatchObject({
    review: 0.480177454887009,
    decline: 0.9986654773731469,
  });
  expect(result.model_version).toBe("fraud-lightgbm-v1");
  expect(result.policy_version).toBe("fraud-economic-policy-v1");
  expect(result.model_sha256).toBe(
    "a630186bef8b8cbd4e45b5c19277e4da54fbe984164051b75e0f887e8c162d0d",
  );
  expect(result.policy_sha256).toBe(
    "1da15167250fa5ee880b403b789a1e4fbff5d9a9d5c4e7f83ccd1644e11f0cc4",
  );
  await expect(page.getByTestId("raw-score")).toHaveText(Number(result.raw_score).toPrecision(10));
  await expect(page.locator(".returned-action strong")).toHaveText(result.action);
  await expect(
    page
      .getByText("Not validated as a well-calibrated fraud probability.", { exact: false })
      .first(),
  ).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/finguard-scoring-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.locator(".result-panel").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshotDir}/finguard-scoring-mobile.png` });
  console.log("Genuine backend result:", JSON.stringify(result));
  await page.getByRole("textbox", { name: /Amount/ }).fill("-1");
  await expect(page.getByTestId("raw-score")).toHaveCount(0);
  let unexpectedScoreCalls = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/v1/fraud/score")) unexpectedScoreCalls++;
  });
  await submit.click();
  await expect(page.locator(".form-error")).toContainText("Nothing has been submitted");
  expect(unexpectedScoreCalls).toBe(0);
});

test("unready artifacts disable inference without inventing a result", async ({ page }) => {
  await page.route("**/health/ready", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"detail":"Unavailable"}',
    }),
  );
  await page.goto("/scoring");
  await expect(page.getByText("Scoring service unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Score transaction", exact: true })).toBeDisabled();
  await expect(page.getByTestId("raw-score")).toHaveCount(0);
  await page.screenshot({ path: `${screenshotDir}/finguard-api-unavailable.png`, fullPage: true });
});
