export const FEATURES = [...Array.from({ length: 28 }, (_, i) => `V${i + 1}`), "Amount"] as const;
export type FeatureValues = Record<string, string>;
export type Transaction = Record<string, number>;
export const emptyFeatures = (): FeatureValues => Object.fromEntries(FEATURES.map((f) => [f, ""]));
/** Invented schema example matching backend/examples/fraud_request.json. */
export const exampleFeatures = (): FeatureValues =>
  Object.fromEntries(FEATURES.map((f) => [f, f === "Amount" ? "100" : "0"]));

export function validateFeatures(values: FeatureValues): {
  data: Transaction | null;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const data: Transaction = {};
  for (const extra of Object.keys(values).filter((f) => !FEATURES.includes(f)))
    errors[extra] = "Unexpected predictor.";
  for (const feature of FEATURES) {
    const raw = values[feature]?.trim() ?? "";
    const value = Number(raw);
    if (!raw) errors[feature] = "Enter a value.";
    else if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) || !Number.isFinite(value))
      errors[feature] = "Enter a finite number.";
    else if (feature === "Amount" && value < 0) errors[feature] = "Amount must be nonnegative.";
    else data[feature] = value;
  }
  return { data: Object.keys(errors).length ? null : data, errors };
}
