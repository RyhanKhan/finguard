import { z } from "zod";
import { FEATURES, type Transaction } from "./features";

const thresholdsSchema = z
  .object({
    version: z.string().min(1),
    review: z.number().min(0).max(1),
    decline: z.number().min(0).max(1),
    equality: z.string().min(1),
  })
  .refine((t) => t.review <= t.decline, "Invalid threshold metadata");
const provenance = {
  model_version: z.string().min(1),
  policy_version: z.string().min(1),
  feature_schema_version: z.string().min(1),
  model_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  policy_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  thresholds: thresholdsSchema,
  score_limitation: z.string().min(1),
  service_scope: z.string().min(1),
};
export const modelInfoSchema = z.object({
  ...provenance,
  required_features: z
    .array(z.string())
    .refine((f) => JSON.stringify(f) === JSON.stringify(FEATURES)),
  model_family: z.literal("LightGBM"),
  dataset_scope: z.string(),
  evaluation_scope: z.string(),
});
export const scoreSchema = z.object({
  ...provenance,
  raw_score: z.number().min(0).max(1),
  action: z.enum(["approve", "review", "decline"]),
});
export type ModelInfo = z.infer<typeof modelInfoSchema>;
export type ScoreResult = z.infer<typeof scoreSchema>;
export type ApiErrorKind =
  | "network"
  | "timeout"
  | "readiness"
  | "validation"
  | "contract"
  | "server";
export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export class FraudApi {
  constructor(
    private baseUrl = API_BASE_URL,
    private fetcher: typeof fetch = (...args) => fetch(...args),
    private timeoutMs = 10000,
  ) {}

  private async request<T>(path: string, schema: z.ZodType<T>, body?: Transaction): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        method: body ? "POST" : "GET",
        signal: controller.signal,
        cache: "no-store",
        ...(body
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      });
      if (!response.ok) {
        if (response.status === 503)
          throw new ApiError(
            "readiness",
            "The backend cannot serve verified artifacts. Check FastAPI readiness and the local artifact bundle.",
          );
        if (response.status === 422)
          throw new ApiError(
            "validation",
            "FastAPI rejected the transaction. Check all 29 values; no fields were filled or clipped.",
          );
        throw new ApiError(
          "server",
          `The scoring API returned HTTP ${response.status}. Try again after checking the backend.`,
        );
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success)
        throw new ApiError(
          "contract",
          "The API response does not match the scoring contract. No result has been accepted.",
        );
      return parsed.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted)
        throw new ApiError("timeout", "The API request timed out. Check the backend, then retry.");
      if (error instanceof SyntaxError)
        throw new ApiError(
          "contract",
          "The API returned invalid JSON. No result has been accepted.",
        );
      throw new ApiError(
        "network",
        "Cannot reach FastAPI. Start the backend and check the API URL and allowed origin.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async connect(): Promise<ModelInfo> {
    await this.request("/health/ready", z.object({ status: z.literal("ready") }));
    return this.request("/v1/fraud/model-info", modelInfoSchema);
  }

  async score(values: Transaction, expected: ModelInfo): Promise<ScoreResult> {
    const result = await this.request("/v1/fraud/score", scoreSchema, values);
    for (const key of [
      "model_version",
      "policy_version",
      "feature_schema_version",
      "model_sha256",
      "policy_sha256",
    ] as const) {
      if (result[key] !== expected[key])
        throw new ApiError(
          "contract",
          "Model or policy provenance changed. Reconnect to the API before scoring again.",
        );
    }
    if (JSON.stringify(result.thresholds) !== JSON.stringify(expected.thresholds))
      throw new ApiError("contract", "Policy metadata changed. Reconnect before scoring again.");
    return result;
  }
}

export const api = new FraudApi();
