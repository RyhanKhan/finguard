import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const api = "http://127.0.0.1:8000";
const fixture = async () =>
  JSON.parse(await readFile("../backend/examples/credit_request.json", "utf8"));

test("credit stays available when fraud readiness fails", async ({ page }) => {
  // Deliberate readiness fault only; all credit predictions use the real backend.
  await page.route("**/health/ready", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/credit");
  await expect(page.getByText("Credit API connected", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Live scoring", exact: true }).click();
  await page.getByRole("button", { name: "Load synthetic example" }).click();
  await page.getByRole("button", { name: "Score credit input", exact: true }).click();
  await expect(page.getByTestId("credit-score")).toHaveText("24.89%");
});

test("real HTTP validation rejects unsupported and incomplete inputs, accepts negative bills", async ({
  page,
}) => {
  const input = await fixture();
  for (const invalid of [
    { ...input, PAY_4: 1 },
    Object.fromEntries(Object.entries(input).filter(([name]) => name !== "LIMIT_BAL")),
    { ...input, LIMIT_BAL: 0 },
    { ...input, PAY_AMT1: -1 },
  ]) {
    const response = await page.request.post(`${api}/v1/credit/score`, { data: invalid });
    expect(response.status()).toBe(422);
    const rejected = await response.json();
    expect(rejected.detail).toBeInstanceOf(Array);
    expect(rejected).not.toHaveProperty("raw_default_risk_score");
  }
  const response = await page.request.post(`${api}/v1/credit/score`, {
    data: { ...input, BILL_AMT1: -100, PAY_AMT1: 0 },
  });
  expect(response.status()).toBe(200);
  const accepted = await response.json();
  expect(accepted.scoring_mode).toBe("raw");
  expect(accepted.raw_default_risk_score).toBeGreaterThanOrEqual(0);
});

test("real unsupported-code rejection is visible without a UI prediction", async ({ page }) => {
  await page.goto("/credit");
  await expect(page.getByText("Credit API connected", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Live scoring", exact: true }).click();
  await page.getByRole("button", { name: "Load synthetic example" }).click();
  // The UI excludes code 1 for PAY_4. Inject it into the request to exercise the
  // actual backend rejection and the client's error path, without mocking a score.
  await page.route("**/v1/credit/score", (route) =>
    route.continue({ postData: JSON.stringify({ ...route.request().postDataJSON(), PAY_4: 1 }) }),
  );
  const rejected = page.waitForResponse((r) => r.url().endsWith("/v1/credit/score"));
  await page.getByRole("button", { name: "Score credit input", exact: true }).click();
  expect((await rejected).status()).toBe(422);
  await expect(page.getByRole("alert").filter({ hasText: "The API rejected" })).toContainText(
    "No result was produced",
  );
  await expect(
    page.getByText(/isn't supported by the frozen research model/i).first(),
  ).toBeVisible();
  await expect(page.getByTestId("credit-score")).toHaveCount(0);
});

test("duplicate submits, stale explanations, reset and scenario confirmation", async ({ page }) => {
  await page.goto("/credit");
  await expect(page.getByText("Credit API connected", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Live scoring", exact: true }).click();
  await page.getByRole("button", { name: "Load synthetic example" }).click();
  let calls = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/v1/credit/score", async (route) => {
    calls++;
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  const submit = page.getByRole("button", { name: "Score credit input", exact: true });
  await submit.evaluate((button) => {
    const form = (button as HTMLButtonElement).form!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(page.getByRole("button", { name: /Scoring/ })).toBeDisabled();
  release();
  await expect(page.getByTestId("credit-score")).toHaveText("24.89%");
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Inspect this score" }).click();
  await page.getByRole("button", { name: "Explain current score" }).click();
  await expect(page.getByText("Verified by backend", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Live scoring", exact: true }).click();
  await page.getByLabel("LIMIT_BAL").fill("200000");
  await expect(page.getByTestId("credit-score")).toHaveCount(0);
  await page.getByRole("tab", { name: "Explanation", exact: true }).click();
  await expect(page.getByText("Verified by backend", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Explain current score" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Live scoring", exact: true }).click();
  await page.getByRole("button", { name: "Reset inputs", exact: true }).click();
  await expect(page.getByLabel("LIMIT_BAL")).toHaveValue("");
  await page.getByRole("tab", { name: "Loss scenarios" }).click();
  await page.getByLabel("Assumed PD (%)").fill("20");
  await page.getByLabel("Assumed LGD (%)").fill("50");
  await page.getByLabel("Assumed EAD (NTD)").fill("10000");
  let scenarioCalls = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/v1/credit/scenario")) scenarioCalls++;
  });
  await page.getByRole("button", { name: "Calculate hypothetical loss" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Provide PD and LGD" })).toContainText(
    "confirm the hypothetical assumptions",
  );
  expect(scenarioCalls).toBe(0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Calculate hypothetical loss" }).click();
  await expect(page.getByTestId("credit-scenario-result")).toHaveText("NTD 1,000.00");
  await page.getByLabel("Assumed PD (%)").fill("25");
  await expect(page.getByTestId("credit-scenario-result")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});
