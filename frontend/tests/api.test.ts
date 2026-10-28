import { describe, expect, it, vi } from "vitest";
import { FraudApi } from "../src/lib/api";
import { exampleFeatures, validateFeatures } from "../src/lib/features";
import { info, response, score } from "./fixtures";

const transaction = validateFeatures(exampleFeatures()).data!;
describe("typed FastAPI client", () => {
  it("checks readiness and model metadata before accepting a connection", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ status: "ready" }))
      .mockResolvedValueOnce(response(info));
    expect(await new FraudApi("http://localhost:8000/", fetcher).connect()).toEqual(info);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/health/ready",
      "http://localhost:8000/v1/fraud/model-info",
    ]);
  });
  it("sends one exact numeric vector and returns the backend score/action", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(score));
    expect(await new FraudApi("http://localhost:8000", fetcher).score(transaction, info)).toEqual(
      expect.objectContaining({ raw_score: 0.65, action: "review" }),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("http://localhost:8000/v1/fraud/score");
    expect(JSON.parse(options.body)).toEqual(transaction);
    expect(options.method).toBe("POST");
  });
  it.each([
    [503, "readiness"],
    [422, "validation"],
    [500, "server"],
  ])("handles HTTP %s without a fallback", async (status, kind) => {
    const client = new FraudApi(
      "http://localhost:8000",
      vi.fn().mockResolvedValue(response({}, status as number)),
    );
    await expect(client.score(transaction, info)).rejects.toMatchObject({ kind });
  });
  it("reports network errors", async () => {
    await expect(
      new FraudApi(
        "http://localhost:8000",
        vi.fn().mockRejectedValue(new TypeError("network")),
      ).connect(),
    ).rejects.toMatchObject({ kind: "network" });
  });
  it("times out without retrying or fabricating a score", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_url, options) =>
        new Promise<Response>((_resolve, reject) =>
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        ),
    );
    const promise = new FraudApi("http://localhost:8000", fetcher, 50).connect();
    const assertion = expect(promise).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(51);
    await assertion;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...score, raw_score: "0.5" },
    { ...score, raw_score: 1.1 },
    { ...score, action: "blocked" },
    { ...score, model_version: "different" },
    { ...score, policy_sha256: "c".repeat(64) },
    { ...score, thresholds: { ...score.thresholds, review: 0.1 } },
  ])("rejects malformed or mismatched scoring responses", async (value) => {
    await expect(
      new FraudApi("http://localhost:8000", vi.fn().mockResolvedValue(response(value))).score(
        transaction,
        info,
      ),
    ).rejects.toMatchObject({ kind: "contract" });
  });
  it("rejects a missing predictor in the connected model schema", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ status: "ready" }))
      .mockResolvedValueOnce(
        response({ ...info, required_features: info.required_features.slice(1) }),
      );
    await expect(new FraudApi("http://localhost:8000", fetcher).connect()).rejects.toMatchObject({
      kind: "contract",
    });
  });
  it("rejects malformed JSON", async () => {
    await expect(
      new FraudApi(
        "http://localhost:8000",
        vi.fn().mockResolvedValue(new Response("<html>not JSON</html>")),
      ).connect(),
    ).rejects.toMatchObject({ kind: "contract" });
  });
});
