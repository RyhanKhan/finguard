import { z } from "zod";
import { API_BASE_URL } from "./api";
import {
  CREDIT_FEATURES,
  CREDIT_PAY,
  type CreditInput,
  unsupportedCreditCode,
} from "./credit-features";
const finite = z.number().finite();
const probability = finite.min(0).max(1);
const provenance = {
  api_schema_version: z.literal("credit-api-v1"),
  model_version: z.literal("credit-lightgbm-v2"),
  model_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  scoring_mode: z.literal("raw"),
  feature_schema_version: z.literal("credit-behavioural-financial-v1"),
  band_version: z.literal("credit-risk-segmentation-v1"),
  warnings: z.array(z.string().min(1)).min(1),
};
const scoreFields = {
  ...provenance,
  raw_default_risk_score: probability,
  relative_risk_band: z.number().int().min(1).max(5),
  relative_risk_label: z.string().min(1),
};
export const creditScoreSchema = z.object(scoreFields);
export const creditInfoSchema = z.object({
  ...provenance,
  model_family: z.literal("LightGBM"),
  required_features: z
    .array(z.string())
    .refine((f) => JSON.stringify(f) === JSON.stringify(CREDIT_FEATURES)),
  supported_repayment_codes: z.record(z.enum(CREDIT_PAY), z.array(finite.int()).min(1)),
  frozen_band_cutoffs: z.array(probability).length(4),
  band_equality: z.string(),
  bundle_manifest_sha256: z.record(z.string(), z.string()),
  service_scope: z.string(),
});
const contribution = z.object({ feature: z.enum(CREDIT_FEATURES), margin_contribution: finite });
export const creditExplanationSchema = z.object({
  ...scoreFields,
  baseline_model_margin: finite,
  raw_margin_log_odds: finite,
  contribution_units: z.literal("model_margin_log_odds"),
  original_feature_contributions: z.record(z.enum(CREDIT_FEATURES), finite),
  largest_positive: z.array(contribution).max(5),
  largest_negative: z.array(contribution).max(5),
  reconstruction: z.object({
    baseline_plus_contributions: finite,
    margin_error: finite.min(0).max(1e-10),
    probability_from_margin: probability,
    probability_error: finite.min(0).max(1e-12),
    verified: z.literal(true),
  }),
});
export const creditScenarioSchema = z.object({
  api_schema_version: z.literal("credit-api-v1"),
  hypothetical: z.literal(true),
  assumed_pd: probability,
  assumed_lgd: probability,
  assumed_ead: finite.min(0),
  unit: z.literal("NTD"),
  hypothetical_expected_loss: finite.min(0),
  formula: z.literal("assumed PD × assumed LGD × assumed EAD"),
  warnings: z.array(z.string()).min(1),
});
export type CreditInfo = z.infer<typeof creditInfoSchema>;
export type CreditScore = z.infer<typeof creditScoreSchema>;
export type CreditExplanation = z.infer<typeof creditExplanationSchema>;
export type CreditScenario = z.infer<typeof creditScenarioSchema>;
export type ScenarioInput = { pd: number; lgd: number; ead: number; unit: "NTD" };
export class CreditApiError extends Error {
  constructor(
    public kind:
      | "network"
      | "timeout"
      | "cancelled"
      | "readiness"
      | "validation"
      | "size"
      | "contract"
      | "server",
    message: string,
    public fields: Partial<Record<(typeof CREDIT_FEATURES)[number], string>> = {},
  ) {
    super(message);
  }
}
export class CreditApi {
  constructor(
    private baseUrl = API_BASE_URL,
    private fetcher: typeof fetch = (...args) => fetch(...args),
    private timeoutMs = 10000,
  ) {}
  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    body?: CreditInput | ScenarioInput,
    signal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) controller.abort();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    try {
      if (controller.signal.aborted)
        throw new CreditApiError("cancelled", "Request cancelled. No new result was accepted.");
      const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        method: body ? "POST" : "GET",
        cache: "no-store",
        signal: controller.signal,
        ...(body
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      });
      if (!response.ok) {
        if (response.status === 503)
          throw new CreditApiError(
            "readiness",
            "Credit artifacts or inference are unavailable. Check the local credit service and retry.",
          );
        if (response.status === 413)
          throw new CreditApiError(
            "size",
            "The request exceeds the API size limit. No result was produced.",
          );
        if (response.status === 422) {
          const fields: CreditApiError["fields"] = {};
          const parsed = await response.json().catch(() => ({}));
          if (Array.isArray(parsed.detail))
            for (const error of parsed.detail) {
              const field = error.loc?.[1];
              if ((CREDIT_FEATURES as readonly string[]).includes(field))
                fields[field as keyof typeof fields] =
                  error.type === "unsupported_repayment_code"
                    ? unsupportedCreditCode
                    : "This field was rejected. Check its required numeric value and allowed range.";
            }
          throw new CreditApiError(
            "validation",
            "The API rejected the inputs. No result was produced. Check the highlighted fields and explicit assumptions.",
            fields,
          );
        }
        throw new CreditApiError(
          "server",
          `Credit API returned HTTP ${response.status}. No result was accepted.`,
        );
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success)
        throw new CreditApiError(
          "contract",
          "Unexpected credit API response. No result was accepted; reconnect before retrying.",
        );
      if (controller.signal.aborted)
        throw new CreditApiError(
          timedOut ? "timeout" : "cancelled",
          timedOut
            ? "Credit request timed out. Retry when the local service is available."
            : "Request cancelled. No new result was accepted.",
        );
      return parsed.data;
    } catch (error) {
      if (error instanceof CreditApiError) throw error;
      if (controller.signal.aborted)
        throw new CreditApiError(
          timedOut ? "timeout" : "cancelled",
          timedOut
            ? "Credit request timed out. Check the local service, then retry."
            : "Request cancelled. No new result was accepted.",
        );
      if (error instanceof SyntaxError)
        throw new CreditApiError(
          "contract",
          "The API returned invalid JSON. No result was accepted.",
        );
      throw new CreditApiError(
        "network",
        "Cannot reach the credit API. Check FastAPI, the base URL and allowed local origin.",
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
    }
  }
  async connect(signal?: AbortSignal): Promise<CreditInfo> {
    await this.request(
      "/v1/credit/ready",
      z.object({ status: z.literal("ready") }),
      undefined,
      signal,
    );
    return this.request("/v1/credit/model-info", creditInfoSchema, undefined, signal);
  }
  private verify<T extends CreditScore>(result: T, expected: CreditInfo): T {
    for (const key of [
      "model_version",
      "model_sha256",
      "scoring_mode",
      "feature_schema_version",
      "band_version",
      "api_schema_version",
    ] as const)
      if (result[key] !== expected[key])
        throw new CreditApiError(
          "contract",
          "Credit provenance changed. Reconnect before retrying.",
        );
    return result;
  }
  async score(input: CreditInput, expected: CreditInfo, signal?: AbortSignal) {
    return this.verify(
      await this.request("/v1/credit/score", creditScoreSchema, input, signal),
      expected,
    );
  }
  async explain(input: CreditInput, expected: CreditInfo, signal?: AbortSignal) {
    return this.verify(
      await this.request("/v1/credit/explain", creditExplanationSchema, input, signal),
      expected,
    );
  }
  async scenario(input: ScenarioInput, signal?: AbortSignal) {
    const result = await this.request("/v1/credit/scenario", creditScenarioSchema, input, signal);
    if (
      result.assumed_pd !== input.pd ||
      result.assumed_lgd !== input.lgd ||
      result.assumed_ead !== input.ead
    )
      throw new CreditApiError(
        "contract",
        "Scenario assumptions differ from the request. No result was accepted.",
      );
    return result;
  }
}
export const creditApi = new CreditApi();
