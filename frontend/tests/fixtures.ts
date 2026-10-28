import { FEATURES } from "../src/lib/features";
import type { ModelInfo, ScoreResult } from "../src/lib/api";

/** Invented protocol fixtures, never historical row-level predictions. */
export const info: ModelInfo = {
  model_version: "fraud-lightgbm-v1",
  policy_version: "fraud-economic-policy-v1",
  feature_schema_version: "fraud-features-v1",
  model_sha256: "a".repeat(64),
  policy_sha256: "b".repeat(64),
  thresholds: {
    version: "fraud-economic-policy-v1",
    review: 0.480177454887009,
    decline: 0.9986654773731469,
    equality:
      "score < review: approve; review <= score < decline: review; score >= decline: decline",
  },
  score_limitation: "Raw score; not validated as a well-calibrated fraud probability.",
  service_scope: "Portfolio research demonstration; not production.",
  required_features: [...FEATURES],
  model_family: "LightGBM",
  dataset_scope: "Research dataset",
  evaluation_scope: "Historical held-out evaluation",
};
export const score: ScoreResult = { ...info, raw_score: 0.65, action: "review" };
export const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
