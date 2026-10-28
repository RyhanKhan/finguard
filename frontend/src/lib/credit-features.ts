export const CREDIT_PAY = ["PAY_0", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6"] as const;
export const CREDIT_BILLS = [
  "BILL_AMT1",
  "BILL_AMT2",
  "BILL_AMT3",
  "BILL_AMT4",
  "BILL_AMT5",
  "BILL_AMT6",
] as const;
export const CREDIT_PAYMENTS = [
  "PAY_AMT1",
  "PAY_AMT2",
  "PAY_AMT3",
  "PAY_AMT4",
  "PAY_AMT5",
  "PAY_AMT6",
] as const;
export const CREDIT_FEATURES = [
  "LIMIT_BAL",
  ...CREDIT_PAY,
  ...CREDIT_BILLS,
  ...CREDIT_PAYMENTS,
] as const;
export type CreditFeature = (typeof CREDIT_FEATURES)[number];
export type CreditInput = Record<CreditFeature, number>;
export type CreditFields = Record<CreditFeature, string>;
export type CreditVocabulary = Record<(typeof CREDIT_PAY)[number], number[]>;
export const emptyCredit = (): CreditFields =>
  Object.fromEntries(CREDIT_FEATURES.map((f) => [f, ""])) as CreditFields;
/** Invented values, verified against backend/examples/credit_request.json by tests. */
export const syntheticCredit = (): CreditFields =>
  Object.fromEntries(
    CREDIT_FEATURES.map((f) => [
      f,
      f === "LIMIT_BAL" ? "100000" : f.startsWith("BILL_") ? "1000" : "0",
    ]),
  ) as CreditFields;
export const unsupportedCreditCode =
  "This repayment-status code isn't supported by the frozen research model. No score was produced.";
export function finiteInput(raw: string): number | null {
  const text = raw.trim();
  if (!text || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
export function validateCredit(values: CreditFields, vocabulary: CreditVocabulary) {
  const errors: Partial<Record<CreditFeature, string>> = {};
  const data = {} as CreditInput;
  for (const field of CREDIT_FEATURES) {
    const value = finiteInput(values[field] ?? "");
    if (value === null) errors[field] = "Enter a required finite number.";
    else if (field === "LIMIT_BAL" && value <= 0) errors[field] = "Credit limit must be positive.";
    else if (field.startsWith("PAY_AMT") && value < 0)
      errors[field] = "Previous payments must be nonnegative.";
    else if (
      (CREDIT_PAY as readonly string[]).includes(field) &&
      !vocabulary[field as (typeof CREDIT_PAY)[number]].includes(value)
    )
      errors[field] = unsupportedCreditCode;
    else data[field] = value;
  }
  return { data: Object.keys(errors).length ? null : data, errors };
}
