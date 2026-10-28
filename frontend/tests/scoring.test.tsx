import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiProvider } from "../src/components/api-provider";
import { ScoringWorkspace } from "../src/components/scoring-workspace";
import { info, response, score } from "./fixtures";

function setup(status = 200) {
  const fetcher = vi.fn((input: string | URL | Request) => {
    const path = String(input);
    if (path.endsWith("/health/ready")) return Promise.resolve(response({ status: "ready" }));
    if (path.endsWith("/v1/fraud/model-info")) return Promise.resolve(response(info));
    return Promise.resolve(response(score, status));
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <ApiProvider>
      <ScoringWorkspace />
    </ApiProvider>,
  );
  return fetcher;
}
describe("interactive scoring workspace", () => {
  it("submits one synthetic vector to the API and shows exact provenance", async () => {
    const fetcher = setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Score transaction" })).toBeEnabled(),
    );
    expect(screen.queryByTestId("raw-score")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Start with a synthetic example/ }));
    fireEvent.click(screen.getByRole("button", { name: "Score transaction" }));
    expect(await screen.findByTestId("raw-score")).toHaveTextContent("0.6500000000");
    expect(screen.getByText("review", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("fraud-features-v1", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText(info.model_version, { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText(info.policy_version, { selector: "dd" })).toBeInTheDocument();
    expect(
      screen.getByText(/Not validated as a well-calibrated fraud probability/),
    ).toBeInTheDocument();
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith("/v1/fraud/score")),
    ).toHaveLength(1);
    fireEvent.change(screen.getByRole("textbox", { name: /Amount/ }), { target: { value: "25" } });
    expect(screen.queryByTestId("raw-score")).not.toBeInTheDocument();
  });
  it("exposes missing values, expands the editor and makes no scoring call", async () => {
    const fetcher = setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Score transaction" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Score transaction" }));
    expect(screen.getByRole("button", { name: /Advanced feature editor/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getAllByRole("textbox")).toHaveLength(29);
    expect(screen.getByRole("alert")).toHaveTextContent("29 invalid fields");
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith("/v1/fraud/score")),
    ).toHaveLength(0);
  });
  it("keeps inference disabled when artifacts are not ready", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 503)));
    render(
      <ApiProvider>
        <ScoringWorkspace />
      </ApiProvider>,
    );
    expect(await screen.findByText("Scoring service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Score transaction" })).toBeDisabled();
    expect(screen.queryByTestId("raw-score")).not.toBeInTheDocument();
  });
  it("shows a backend validation failure without fabricated output", async () => {
    setup(422);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Score transaction" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Start with a synthetic example/ }));
    fireEvent.click(screen.getByRole("button", { name: "Score transaction" }));
    expect(await screen.findByText("No scoring result returned")).toBeInTheDocument();
    expect(screen.getByText(/FastAPI rejected the transaction/)).toBeInTheDocument();
    expect(screen.queryByTestId("raw-score")).not.toBeInTheDocument();
  });
  it("invalidates stale readiness after a scoring outage and requires reconnection", async () => {
    const fetcher = setup(503);
    const submit = screen.getByRole("button", { name: "Score transaction" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /Start with a synthetic example/ }));
    fireEvent.click(submit);
    expect(await screen.findByText("Scoring service unavailable")).toBeInTheDocument();
    expect(submit).toBeDisabled();
    expect(screen.queryByTestId("raw-score")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry connection" }));
    await waitFor(() => expect(submit).toBeEnabled());
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).endsWith("/v1/fraud/score")),
    ).toHaveLength(1);
  });
});
