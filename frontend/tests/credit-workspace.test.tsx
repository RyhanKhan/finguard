import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CreditWorkspace } from "../src/components/credit-workspace";
import { CREDIT_FEATURES, syntheticCredit, validateCredit } from "../src/lib/credit-features";
import { creditPublished } from "../src/lib/credit-published-results";
import { creditInfo, creditScore, creditExplanation, creditScenario } from "./credit-fixtures";
import { response } from "./fixtures";
function setup(overrides: Record<string, () => Promise<Response>> = {}) {
  const fetcher = vi.fn((input: string | URL | Request) => {
    const path = String(input);
    for (const [suffix, fn] of Object.entries(overrides)) if (path.endsWith(suffix)) return fn();
    const data = path.endsWith("/ready")
      ? { status: "ready" }
      : path.endsWith("/model-info")
        ? creditInfo
        : path.endsWith("/score")
          ? creditScore
          : path.endsWith("/explain")
            ? creditExplanation
            : creditScenario;
    return Promise.resolve(response(data));
  });
  vi.stubGlobal("fetch", fetcher);
  render(<CreditWorkspace />);
  return fetcher;
}
async function scoring() {
  await waitFor(() => expect(screen.getByText("Credit API connected")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("tab", { name: "Live scoring" }));
  fireEvent.click(screen.getByRole("button", { name: "Load synthetic example" }));
}
function scoreCalls(fetcher: ReturnType<typeof setup>) {
  return fetcher.mock.calls.filter(([url]) => String(url).endsWith("/v1/credit/score"));
}
describe("credit research workspace", () => {
  it("starts empty, loads all 19 inputs, uses per-field vocabulary and submits only on request", async () => {
    const fetcher = setup();
    await scoring();
    expect(CREDIT_FEATURES.every((f) => !!screen.getByLabelText(f))).toBe(true);
    expect(
      within(screen.getByLabelText("PAY_0")).getByRole("option", { name: "Code 1" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("PAY_4")).queryByRole("option", { name: "Code 1" }),
    ).not.toBeInTheDocument();
    expect(scoreCalls(fetcher)).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("BILL_AMT1"), { target: { value: "-100" } });
    fireEvent.click(screen.getByRole("button", { name: "Score credit input" }));
    expect(await screen.findByTestId("credit-score")).toHaveTextContent("24.89%");
    expect(
      screen.getByRole("heading", { name: creditScore.relative_risk_label }),
    ).toBeInTheDocument();
    expect(scoreCalls(fetcher)).toHaveLength(1);
    const sent = JSON.parse(
      (
        fetcher.mock.calls.find(([url]) => String(url).endsWith("/score")) as unknown as [
          string,
          RequestInit,
        ]
      )[1].body as string,
    );
    expect(Object.keys(sent)).toEqual(CREDIT_FEATURES);
    expect(sent.BILL_AMT1).toBe(-100);
    expect(sent.PAY_AMT1).toBe(0);
    expect(
      screen.queryByText(/^(Approved|Rejected|Loan eligible|Creditworthy|Decline)$/i),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("LIMIT_BAL"), { target: { value: "200000" } });
    expect(screen.queryByTestId("credit-score")).not.toBeInTheDocument();
    expect(screen.getByText("Inputs changed — results cleared")).toBeInTheDocument();
  });
  it("validates missing fields and clears inputs on reset", async () => {
    const fetcher = setup();
    await scoring();
    fireEvent.click(screen.getByRole("button", { name: "Reset inputs" }));
    fireEvent.click(screen.getByRole("button", { name: "Score credit input" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing has been submitted");
    expect(scoreCalls(fetcher)).toHaveLength(0);
    expect(screen.getByLabelText("LIMIT_BAL")).toHaveValue("");
  });
  it.each([413, 422, 503])("shows API %s as an error, never zero risk", async (status) => {
    setup({
      "/score": () =>
        Promise.resolve(
          response(
            { detail: [{ loc: ["body", "PAY_4"], type: "unsupported_repayment_code" }] },
            status,
          ),
        ),
    });
    await scoring();
    fireEvent.click(screen.getByRole("button", { name: "Score credit input" }));
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.queryByTestId("credit-score")).not.toBeInTheDocument();
    if (status === 422)
      expect(screen.getByText(/This repayment-status code isn't supported/)).toBeInTheDocument();
    if (status === 503) expect(screen.getByText("Credit API unavailable")).toBeInTheDocument();
  });
  it("keeps published evidence and calculator available when credit readiness fails", async () => {
    const fetcher = setup({ "/ready": () => Promise.resolve(response({}, 503)) });
    await screen.findByText("Credit API unavailable");
    fireEvent.click(screen.getByRole("tab", { name: "Live scoring" }));
    expect(screen.getByRole("button", { name: "Score credit input" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Published evidence" }));
    expect(screen.getByText("6,000 / 6,001")).toBeInTheDocument();
    expect(screen.getByText("0.775807")).toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/health/ready"))).toBe(false);
  });
  it("rejects network failure without echoing its content", async () => {
    setup({ "/score": () => Promise.reject(new Error("private financial data")) });
    await scoring();
    fireEvent.click(screen.getByRole("button", { name: "Score credit input" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the credit API");
    expect(screen.queryByText(/private financial/)).not.toBeInTheDocument();
  });
  it("renders signed explanation units, all fields and independently handles explanation failure", async () => {
    setup();
    await scoring();
    fireEvent.click(screen.getByRole("button", { name: "Score credit input" }));
    await screen.findByTestId("credit-score");
    fireEvent.click(screen.getByRole("button", { name: "Inspect this score" }));
    fireEvent.click(screen.getByRole("button", { name: "Explain current score" }));
    expect(await screen.findByText("Verified by backend")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Positive model margin contributions in log-odds units"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inspect all 19 contributions" }));
    expect(screen.getAllByRole("row")).toHaveLength(20);
    fireEvent.click(screen.getByRole("tab", { name: "Live scoring" }));
    fireEvent.change(screen.getByLabelText("LIMIT_BAL"), { target: { value: "999" } });
    fireEvent.click(screen.getByRole("tab", { name: "Explanation" }));
    expect(screen.queryByText("Verified by backend")).not.toBeInTheDocument();
  });
  it("preserves a valid score if explanation alone fails", async () => {
    setup({ "/explain": () => Promise.resolve(response({}, 503)) });
    await scoring();
    fireEvent.click(screen.getByRole("button", { name: "Score credit input" }));
    await screen.findByTestId("credit-score");
    fireEvent.click(screen.getByRole("button", { name: "Inspect this score" }));
    fireEvent.click(screen.getByRole("button", { name: "Explain current score" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Credit API connected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Live scoring" }));
    expect(screen.getByTestId("credit-score")).toBeInTheDocument();
  });
  it("guards duplicate clicks and ignores a response after pending-input changes", async () => {
    let resolve!: (value: Response) => void;
    const fetcher = setup({
      "/score": () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    });
    await scoring();
    const button = screen.getByRole("button", { name: "Score credit input" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(scoreCalls(fetcher)).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("LIMIT_BAL"), { target: { value: "999" } });
    resolve(response(creditScore));
    await waitFor(() => expect(screen.queryByTestId("credit-score")).not.toBeInTheDocument());
  });
  it("requires confirmed assumptions and accurately sends percentage fractions", async () => {
    const fetcher = setup();
    fireEvent.click(screen.getByRole("tab", { name: "Loss scenarios" }));
    fireEvent.click(screen.getByRole("button", { name: "Calculate hypothetical loss" }));
    expect(screen.getByRole("alert")).toHaveTextContent("confirm");
    fireEvent.change(screen.getByLabelText("Assumed PD (%)"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Assumed LGD (%)"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Assumed EAD (NTD)"), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Calculate hypothetical loss" }));
    expect(await screen.findByTestId("credit-scenario-result")).toHaveTextContent("NTD 1,000.00");
    expect(
      JSON.parse(
        (
          fetcher.mock.calls.find(([url]) => String(url).endsWith("/scenario")) as unknown as [
            string,
            RequestInit,
          ]
        )[1].body as string,
      ),
    ).toEqual({ pd: 0.2, lgd: 0.5, ead: 10000, unit: "NTD" });
    fireEvent.change(screen.getByLabelText("Assumed PD (%)"), { target: { value: "30" } });
    expect(screen.queryByTestId("credit-scenario-result")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it("keeps published numbers correct, static and linked only to report text", () => {
    expect(creditPublished).toMatchObject({
      original: 6001,
      evaluated: 6000,
      unsupported: 1,
      defaults: 1274,
      auc: 0.775807,
      ap: 0.53417,
      ks: 0.425234,
      brier: 0.132728,
      logLoss: 0.424144,
    });
    expect(creditPublished.bands.map((b) => b.observedPercent)).toEqual([
      5.224, 10.356, 14.759, 24.4, 54.365,
    ]);
    const report = readFileSync("../docs/credit_final_evaluation.md", "utf8");
    for (const n of ["0.775807", "0.534170", "0.425234", "0.132728", "0.424144"])
      expect(report).toContain(n);
    for (const file of ["credit-api.ts", "credit-features.ts", "credit-published-results.ts"]) {
      const source = readFileSync(`src/lib/${file}`, "utf8");
      expect(source).not.toMatch(/artifacts\/|\.npz|localStorage|telemetry/);
    }
    expect(
      validateCredit(syntheticCredit(), creditInfo.supported_repayment_codes).data,
    ).not.toBeNull();
  });
});
