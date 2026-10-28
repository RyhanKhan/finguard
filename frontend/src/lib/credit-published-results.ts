/** Static, published aggregates only. Source: docs/credit_final_evaluation.md,
 * Milestone 5F-v2 supported-population evaluation. No runtime artifact imports,
 * predictions, reserved labels, subgroup certification or new evaluation.
 */
export const creditPublished = {
  source: "docs/credit_final_evaluation.md · Milestone 5F-v2",
  reportUrl: "/reports/credit-final-evaluation.md",
  notice:
    "Static published research results. These figures do not change when you score a new example.",
  original: 6001,
  evaluated: 6000,
  unsupported: 1,
  defaults: 1274,
  auc: 0.775807,
  ap: 0.53417,
  ks: 0.425234,
  brier: 0.132728,
  logLoss: 0.424144,
  bands: [
    { label: "Very low", observedPercent: 5.224 },
    { label: "Low", observedPercent: 10.356 },
    { label: "Medium", observedPercent: 14.759 },
    { label: "High", observedPercent: 24.4 },
    { label: "Very high", observedPercent: 54.365 },
  ],
  topTen: { flagged: 600, defaultsCaptured: 406, precisionPercent: 67.667, recallPercent: 31.868 },
  limitations: [
    "Historical results apply only to the supported population; one observation was unscorable and full-population performance is unavailable.",
    "This is not chronological or borrower-independent validation. Model scores are not validated production PDs.",
    "Review flags are hypothetical account inspection, not prevented defaults or savings. No fairness or compliance certification is established.",
  ],
} as const;
