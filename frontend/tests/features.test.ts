import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emptyFeatures, exampleFeatures, FEATURES, validateFeatures } from "../src/lib/features";

describe("canonical single-transaction input", () => {
  it("contains exactly V1-V28 and Amount, matching the backend example", () => {
    const original = JSON.parse(readFileSync("../backend/examples/fraud_request.json", "utf8"));
    expect(FEATURES).toHaveLength(29);
    expect(FEATURES).toEqual([...Array.from({ length: 28 }, (_, i) => `V${i + 1}`), "Amount"]);
    expect(validateFeatures(exampleFeatures()).data).toEqual(original);
  });
  it("does not replace empty fields with zero", () => {
    const result = validateFeatures(emptyFeatures());
    expect(result.data).toBeNull();
    expect(Object.keys(result.errors)).toHaveLength(29);
  });
  it.each([
    "NaN",
    "Infinity",
    "-Infinity",
    "1e999",
    "text",
    "true",
    "0x10",
    "",
    " ",
    "1,000",
    "null",
  ])("rejects malformed or missing numeric input %s", (raw) => {
    const result = validateFeatures({ ...exampleFeatures(), V10: raw });
    expect(result.data).toBeNull();
    expect(result.errors.V10).toBeTruthy();
  });
  it.each(["Class", "Time", "model_path", "policy_path", "t_review"])("forbids %s", (feature) => {
    expect(validateFeatures({ ...exampleFeatures(), [feature]: "0" }).data).toBeNull();
  });
  it("rejects negative Amount; accepts finite signed predictors and scientific notation", () => {
    expect(validateFeatures({ ...exampleFeatures(), Amount: "-0.1" }).errors.Amount).toBeTruthy();
    expect(validateFeatures({ ...exampleFeatures(), V1: "-1.2e-3", V2: "+.4" }).data?.V1).toBe(
      -0.0012,
    );
  });
});
