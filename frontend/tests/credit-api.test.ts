import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { CreditApi, creditExplanationSchema } from "../src/lib/credit-api";
import {
  CREDIT_FEATURES,
  syntheticCredit,
  validateCredit,
  unsupportedCreditCode,
} from "../src/lib/credit-features";
import { creditInfo, creditScore, creditExplanation, creditScenario } from "./credit-fixtures";
import { response } from "./fixtures";
const input = validateCredit(syntheticCredit(), creditInfo.supported_repayment_codes).data!;
describe("credit input and typed API", () => {
  it("uses exactly the canonical 19 fields and the backend's synthetic example", () => {
    expect(Object.keys(input)).toEqual(CREDIT_FEATURES);
    expect(input).toEqual(
      JSON.parse(readFileSync("../backend/examples/credit_request.json", "utf8")),
    );
    expect(
      validateCredit(
        { ...syntheticCredit(), BILL_AMT1: "-100", PAY_AMT1: "0", BILL_AMT2: "1e12" },
        creditInfo.supported_repayment_codes,
      ).errors,
    ).toEqual({});
    for (const [key, value] of [
      ["LIMIT_BAL", "0"],
      ["PAY_AMT1", "-1"],
      ["BILL_AMT1", "NaN"],
      ["BILL_AMT1", ""],
      ["PAY_4", "1"],
      ["PAY_0", "2.5"],
    ] as const)
      expect(
        validateCredit({ ...syntheticCredit(), [key]: value }, creditInfo.supported_repayment_codes)
          .data,
      ).toBeNull();
  });
  it("connects using credit readiness independently of fraud", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ status: "ready" }))
      .mockResolvedValueOnce(response(creditInfo));
    expect(await new CreditApi("http://localhost:8000/", fetcher).connect()).toEqual(creditInfo);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:8000/v1/credit/ready",
      "http://localhost:8000/v1/credit/model-info",
    ]);
  });
  it("posts one exact vector, accepts backend bands and matching provenance", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(creditScore));
    const result = await new CreditApi("http://localhost:8000", fetcher).score(input, creditInfo);
    expect(result).toEqual(creditScore);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(input);
    expect(fetcher.mock.calls[0][0]).toBe("http://localhost:8000/v1/credit/score");
  });
  it.each([
    [413, "size"],
    [422, "validation"],
    [503, "readiness"],
    [500, "server"],
  ])("handles HTTP %s without predictions", async (status, kind) => {
    await expect(
      new CreditApi(
        "http://localhost:8000",
        vi.fn().mockResolvedValue(response({}, status as number)),
      ).score(input, creditInfo),
    ).rejects.toMatchObject({ kind });
  });
  it("maps only known field names and never echoes server input values", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response(
        {
          detail: [
            {
              loc: ["body", "PAY_4"],
              type: "unsupported_repayment_code",
              input: "secret",
              msg: "secret",
            },
          ],
        },
        422,
      ),
    );
    await expect(new CreditApi("", fetcher).score(input, creditInfo)).rejects.toMatchObject({
      fields: { PAY_4: unsupportedCreditCode },
    });
  });
  it.each([
    { ...creditScore, raw_default_risk_score: NaN },
    { ...creditScore, raw_default_risk_score: 1.1 },
    { ...creditScore, relative_risk_band: 6 },
    { ...creditScore, model_sha256: "a".repeat(64) },
    { ...creditScore, scoring_mode: "sigmoid" },
  ])("rejects invalid responses and changed provenance", async (data) => {
    await expect(
      new CreditApi("", vi.fn().mockResolvedValue(response(data))).score(input, creditInfo),
    ).rejects.toMatchObject({ kind: "contract" });
  });
  it("requires all 19 contribution fields, explicit units and verified reconstruction", () => {
    expect(creditExplanationSchema.safeParse(creditExplanation).success).toBe(true);
    expect(
      creditExplanationSchema.safeParse({
        ...creditExplanation,
        contribution_units: "percentage_points",
      }).success,
    ).toBe(false);
    expect(
      creditExplanationSchema.safeParse({
        ...creditExplanation,
        original_feature_contributions: {},
      }).success,
    ).toBe(false);
  });
  it("returns the authoritative scenario and checks echoed assumptions", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response(creditScenario)));
    const result = await new CreditApi("", fetcher).scenario({
      pd: 0.2,
      lgd: 0.5,
      ead: 10000,
      unit: "NTD",
    });
    expect(result.hypothetical_expected_loss).toBe(1000);
    await expect(
      new CreditApi("", fetcher).scenario({ pd: 0.3, lgd: 0.5, ead: 10000, unit: "NTD" }),
    ).rejects.toMatchObject({ kind: "contract" });
  });
  it("rejects network failures and invalid JSON", async () => {
    await expect(
      new CreditApi("", vi.fn().mockRejectedValue(new TypeError("private"))).connect(),
    ).rejects.toMatchObject({ kind: "network" });
    await expect(
      new CreditApi("", vi.fn().mockResolvedValue(new Response("broken"))).connect(),
    ).rejects.toMatchObject({ kind: "contract" });
  });
  it("supports timeouts and explicit cancellation without retry", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_url, options) =>
        new Promise<Response>((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          ),
        ),
    );
    const request = new CreditApi("", fetcher, 20).connect();
    const assertion = expect(request).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(21);
    await assertion;
    const controller = new AbortController();
    const pending = new CreditApi("", fetcher).connect(controller.signal);
    const cancelled = expect(pending).rejects.toMatchObject({ kind: "cancelled" });
    controller.abort();
    await cancelled;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
