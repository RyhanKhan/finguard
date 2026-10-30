import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const shots = process.env.FINGUARD_SCREENSHOT_DIR ?? "../docs/screenshots";
test.beforeAll(async () => {
  await mkdir(shots, { recursive: true });
});

test("credit navigation and real API scoring, explanation and scenario on desktop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Credit risk", exact: true })
    .click();
  await expect(page).toHaveURL(/\/credit$/);
  await expect(page.getByText("Credit API connected", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Understand the risk. Keep the context." }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${shots}/finguard-credit-overview-desktop.png`, fullPage: true });
  await page.getByRole("tab", { name: "Live scoring", exact: true }).click();
  await page.getByRole("button", { name: "Load synthetic example" }).click();
  await expect(
    page.getByLabel("PAY_4").getByRole("option", { name: "Code 1", exact: true }),
  ).toHaveCount(0);
  const next = page.waitForResponse((r) => r.url().endsWith("/v1/credit/score"));
  await page.getByRole("button", { name: "Score credit input", exact: true }).click();
  const response = await next;
  expect(response.status()).toBe(200);
  const scored = await response.json();
  expect(Object.keys(response.request().postDataJSON())).toHaveLength(19);
  expect(scored.model_version).toBe("credit-lightgbm-v2");
  expect(scored.scoring_mode).toBe("raw");
  expect(scored.raw_default_risk_score).toBe(0.24888492804155674);
  expect(scored.relative_risk_band).toBe(4);
  expect(scored.model_sha256).toBe(
    "0f59dd17123ca85864bc018b6800e588d8e0c8eca09901082473d3445c537412",
  );
  expect(scored).not.toHaveProperty("action");
  expect(scored).not.toHaveProperty("decision");
  await expect(page.getByTestId("credit-score")).toHaveText(
    `${(scored.raw_default_risk_score * 100).toFixed(2)}%`,
  );
  await expect(
    page.getByRole("heading", { name: scored.relative_risk_label, exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${shots}/finguard-credit-score-desktop.png`, fullPage: true });
  await page.getByRole("button", { name: "Inspect this score" }).click();
  const explanation = page.waitForResponse((r) => r.url().endsWith("/v1/credit/explain"));
  await page.getByRole("button", { name: "Explain current score" }).click();
  const explained = await (await explanation).json();
  expect(explained.raw_default_risk_score).toBe(scored.raw_default_risk_score);
  expect(explained.reconstruction.verified).toBe(true);
  expect(explained.reconstruction.margin_error).toBeLessThanOrEqual(1e-10);
  expect(explained.reconstruction.probability_error).toBeLessThanOrEqual(1e-12);
  await expect(page.getByText("Verified by backend", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inspect all 19 contributions" }).click();
  await expect(page.getByRole("row")).toHaveCount(20);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${shots}/finguard-credit-explanation-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Loss scenarios" }).click();
  await page.getByLabel("Assumed PD (%)").fill("20");
  await page.getByLabel("Assumed LGD (%)").fill("50");
  await page.getByLabel("Assumed EAD (NTD)").fill("10000");
  await page.getByRole("checkbox").check();
  const scenario = page.waitForResponse((r) => r.url().endsWith("/v1/credit/scenario"));
  await page.getByRole("button", { name: "Calculate hypothetical loss" }).click();
  const scenarioResponse = await scenario;
  expect(scenarioResponse.request().postDataJSON()).toEqual({
    pd: 0.2,
    lgd: 0.5,
    ead: 10000,
    unit: "NTD",
  });
  expect((await scenarioResponse.json()).hypothetical_expected_loss).toBe(1000);
  await expect(page.getByTestId("credit-scenario-result")).toHaveText("NTD 1,000.00");
  await page.screenshot({ path: `${shots}/finguard-credit-scenario-desktop.png`, fullPage: true });
  await page.getByRole("tab", { name: "Published evidence" }).click();
  await expect(page.getByText("0.775807", { exact: true })).toBeVisible();
  await expect(page.getByText("6,000 / 6,001", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Source & methodology" })).toHaveAttribute(
    "href",
    "/reports/credit-final-evaluation.md",
  );
  await page.screenshot({ path: `${shots}/finguard-credit-evidence-desktop.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("credit mobile layout, keyboard tabs and stale results", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/credit");
  await expect(page.getByText("Credit API connected", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Fraud scoring", exact: true }),
  ).toBeVisible();
  const overview = page.getByRole("tab", { name: "Overview", exact: true });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Live scoring", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Load synthetic example" }).click();
  await page.getByRole("button", { name: "Score credit input", exact: true }).click();
  await expect(page.getByTestId("credit-score")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByTestId("credit-score").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/finguard-credit-score-mobile.png` });
  await page.getByLabel("LIMIT_BAL").fill("200000");
  await expect(page.getByTestId("credit-score")).toHaveCount(0);
  await expect(page.getByText("Inputs changed — results cleared")).toBeVisible();
  await page.getByRole("tab", { name: "Loss scenarios" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("unavailable credit does not disable Fraud historical research", async ({ page }) => {
  await page.route("**/v1/credit/ready", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/credit");
  await expect(page.getByText("Credit API unavailable", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Live scoring", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Score credit input", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Fraud scoring", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Verified historical evidence" })).toBeVisible();
  await expect(page.getByTestId("raw-score")).toHaveCount(0);
});
