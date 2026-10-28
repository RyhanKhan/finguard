/** Curated aggregates transcribed from docs/fraud_final_evaluation.md.
 * Published report data only: no raw observations, prediction archives or scoring.
 */
export type HistoricalAction = {
  action: "approve" | "review" | "decline";
  total: number;
  fraud: number;
  legitimate: number;
  fraudAmount: number;
};
export type EconomicScenario = {
  id: "default" | "higher_customer_cost" | "weaker_intervention";
  label: string;
  description: string;
  approveAll: number;
  reference: number;
  selected: number;
};

export const history = {
  source: "docs/fraud_final_evaluation.md",
  reportUrl: "/reports/fraud-final-evaluation.md",
  evaluatedOn: "22 Oct 2026",
  protocolSha256: "081a626c7e5a86c05ef77ea5297bad95ec8883c782246ac35af515a6f7c156ac",
  modelVersion: "fraud-lightgbm-v1",
  policyVersion: "fraud-economic-policy-v1",
  rows: 73766,
  fraud: 98,
  routedFraud: 75,
  ap: 0.641268,
  auc: 0.963003,
  brier: 0.001030958,
  logLoss: 0.007075619,
  meanScorePercent: 0.365674,
  prevalencePercent: 0.132853,
  reviewThreshold: 0.480177454887009,
  declineThreshold: 0.9986654773731469,
  reviewLimit: 368,
  declineLimit: 147,
  development: [
    { label: "Forward fold 1", ap: 0.80358, auc: 0.970873, fraud: 71 },
    { label: "Forward fold 2", ap: 0.785016, auc: 0.924559, fraud: 64 },
  ],
  developmentMeanAp: 0.794298,
  policyAp: 0.579781,
  budgets: [
    { budget: "0.1%", selected: 74, captured: 51, precision: 0.689189, recall: 0.520408 },
    { budget: "0.5%", selected: 369, captured: 79, precision: 0.214092, recall: 0.806122 },
    { budget: "1%", selected: 738, captured: 80, precision: 0.108401, recall: 0.816327 },
  ],
  actions: [
    { action: "approve", total: 73638, fraud: 23, legitimate: 73615, fraudAmount: 2760.79 },
    { action: "review", total: 76, fraud: 32, legitimate: 44, fraudAmount: 3012.89 },
    { action: "decline", total: 52, fraud: 43, legitimate: 9, fraudAmount: 5824.14 },
  ] satisfies HistoricalAction[],
  scenarios: [
    {
      id: "default",
      label: "Default assumptions",
      description: "80% review and 95% decline effectiveness; illustrative customer costs.",
      approveAll: 11597.82,
      reference: 4073.1795,
      selected: 3842.575,
    },
    {
      id: "higher_customer_cost",
      label: "Higher customer costs",
      description: "Review operations 2 AMU, friction 2 AMU and false decline 25 AMU.",
      approveAll: 11597.82,
      reference: 4717.6795,
      selected: 4119.575,
    },
    {
      id: "weaker_intervention",
      label: "Weaker intervention",
      description: "Review effectiveness 40%; decline effectiveness 70%. Thresholds remain frozen.",
      approveAll: 11597.82,
      reference: 6721.475,
      selected: 6503.766,
    },
  ] satisfies EconomicScenario[],
} as const;

export const integer = (value: number) => new Intl.NumberFormat("en-US").format(value);
export const percent = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;
export const amu = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  );
