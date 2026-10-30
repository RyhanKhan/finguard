import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Overview from "../src/app/page";
import { history } from "../src/lib/history";
import { FraudAttribution } from "../src/components/fraud-research";
import { Economics } from "../src/components/economics";
import { fireEvent } from "@testing-library/react";

describe("published aggregate evidence", () => {
  it("preserves values and reconciles full test routing", () => {
    expect(history.rows).toBe(73766);
    expect(history.fraud).toBe(98);
    expect(history.ap).toBe(0.641268);
    expect(history.auc).toBe(0.963003);
    expect(history.actions.reduce((n, a) => n + a.total, 0)).toBe(history.rows);
    expect(history.actions.reduce((n, a) => n + a.fraud, 0)).toBe(history.fraud);
    expect(history.actions[1].fraud + history.actions[2].fraud).toBe(75);
    expect(history.budgets.map((b) => [b.selected, b.captured])).toEqual([
      [74, 51],
      [369, 79],
      [738, 80],
    ]);
    for (const b of history.budgets) {
      expect(b.precision).toBeCloseTo(b.captured / b.selected, 6);
      expect(b.recall).toBeCloseTo(b.captured / history.fraud, 6);
    }
  });
  it("ships only the published text report and traces static values to it", () => {
    const source = readFileSync("../docs/fraud_final_evaluation.md", "utf8");
    const published = readFileSync("./public/reports/fraud-final-evaluation.md", "utf8");
    expect(source).toBe(published);
    for (const value of [
      "73,766",
      "0.641268",
      "0.963003",
      "0.365674%",
      "0.132853%",
      "3,842.5750",
      history.protocolSha256,
    ])
      expect(source).toContain(value);
  });
  it("labels overview results as historical and does not claim prevention", () => {
    render(<Overview />);
    expect(screen.getByText("Held-out historical evaluation")).toBeInTheDocument();
    expect(screen.getByText("73,766")).toBeInTheDocument();
    expect(screen.getAllByText("0.641268")).toHaveLength(2);
    expect(screen.getByText("Routing is not measured prevention.")).toBeInTheDocument();
    expect(screen.getByText(/score is not a calibrated probability/)).toBeInTheDocument();
    expect(
      screen.queryByText(/fraud prevented|blocked today|system active/i),
    ).not.toBeInTheDocument();
  });
  it("switches published scenarios without changing policy boundaries", () => {
    render(<Economics />);
    expect(screen.getByRole("radio", { name: "Default assumptions" })).toBeChecked();
    expect(screen.getAllByText("3,842.58").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("radio", { name: "Weaker intervention" }));
    expect(screen.getAllByText("6,503.77").length).toBeGreaterThan(0);
    expect(screen.getByText(/0.9986654773731469/)).toBeInTheDocument();
    expect(screen.getAllByText(/0.480177454887009/, { selector: "code" })).toHaveLength(2);
  });
});

describe("Fraud publication notices", () => {
  it("links the original dataset and both licenses without asserting clearance", () => {
    render(<FraudAttribution />);
    expect(screen.getByRole("link", { name: "Credit Card Fraud Detection" })).toHaveAttribute(
      "href",
      "https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud",
    );
    expect(screen.getByRole("link", { name: "ODbL 1.0" })).toHaveAttribute(
      "href",
      "https://opendatacommons.org/licenses/odbl/1-0/",
    );
    expect(screen.getByRole("link", { name: "DbCL 1.0" })).toHaveAttribute(
      "href",
      "https://opendatacommons.org/licenses/dbcl/1-0/",
    );
    expect(screen.getByText(/attribution alone does not establish clearance/)).toBeInTheDocument();
    const methods = readFileSync("../docs/fraud_methods.md", "utf8");
    expect(readFileSync("./public/reports/fraud-methods.md", "utf8")).toBe(methods);
    expect(methods).toContain("not a declaration of licensing clearance");
    expect(methods).toContain("historical/static outputs are not a blanket exemption");
  });
});
