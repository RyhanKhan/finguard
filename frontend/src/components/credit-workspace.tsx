"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCheck,
  FlaskConical,
  Layers,
  RefreshCw,
  RotateCcw,
  ScanLine,
  WalletCards,
} from "lucide-react";
import {
  creditApi,
  CreditApiError,
  type CreditInfo,
  type CreditScore,
  type CreditExplanation,
} from "@/lib/credit-api";
import {
  CREDIT_FEATURES,
  CREDIT_PAY,
  CREDIT_BILLS,
  CREDIT_PAYMENTS,
  emptyCredit,
  syntheticCredit,
  validateCredit,
  type CreditFeature,
  type CreditInput,
} from "@/lib/credit-features";
import { Card, Note, PageHeading } from "./ui";
import { CreditEvidence } from "./credit-evidence";
import { CreditScenarioCalculator } from "./credit-scenario";
const tabs = [
  ["overview", "Overview"],
  ["score", "Live scoring"],
  ["explain", "Explanation"],
  ["scenario", "Loss scenarios"],
  ["evidence", "Published evidence"],
] as const;
type Tab = (typeof tabs)[number][0];
type Connection = {
  status: "checking" | "ready" | "unavailable";
  info: CreditInfo | null;
  error: string | null;
};
export function CreditWorkspace() {
  const [tab, setTab] = useState<Tab>("overview");
  const [connection, setConnection] = useState<Connection>({
    status: "checking",
    info: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const [values, setValues] = useState(emptyCredit);
  const [errors, setErrors] = useState<Partial<Record<CreditFeature, string>>>({});
  const [score, setScore] = useState<{ result: CreditScore; input: CreditInput } | null>(null);
  const [explanation, setExplanation] = useState<CreditExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"score" | "explain" | null>(null);
  const [stale, setStale] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const work = useRef<{ controller: AbortController | null; version: number }>({
    controller: null,
    version: 0,
  });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    creditApi.connect(controller.signal).then(
      (info) => {
        if (active) setConnection({ status: "ready", info, error: null });
      },
      (e) => {
        if (active)
          setConnection({
            status: "unavailable",
            info: null,
            error: e instanceof Error ? e.message : "Credit connection failed.",
          });
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);
  useEffect(() => {
    const job = work.current;
    return () => {
      job.version++;
      job.controller?.abort();
    };
  }, []);
  function clearResults() {
    work.current.version++;
    work.current.controller?.abort();
    work.current.controller = null;
    setStale(!!score || !!explanation || !!busy);
    setScore(null);
    setExplanation(null);
    setBusy(null);
    setError(null);
    setExplainError(null);
    setErrors({});
  }
  function reconnect() {
    clearResults();
    setConnection({ status: "checking", info: null, error: null });
    setAttempt((n) => n + 1);
  }
  function switchKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next][0]);
    document.getElementById(`credit-tab-${tabs[next][0]}`)?.focus();
  }
  async function run(kind: "score" | "explain") {
    if (work.current.controller || !connection.info || connection.status !== "ready") return;
    const validation = validateCredit(values, connection.info.supported_repayment_codes);
    setErrors(validation.errors);
    if (!validation.data) {
      setError("Check the required fields below. Nothing has been submitted.");
      return;
    }
    if (kind === "explain" && !score) return;
    const input = kind === "explain" ? score!.input : validation.data;
    const controller = new AbortController();
    work.current.controller = controller;
    const version = ++work.current.version;
    setBusy(kind);
    setStale(false);
    if (kind === "score") {
      setError(null);
      setScore(null);
      setExplanation(null);
      setExplainError(null);
    } else {
      setExplainError(null);
      setExplanation(null);
    }
    try {
      if (kind === "score") {
        const result = await creditApi.score(input, connection.info, controller.signal);
        if (work.current.version === version) setScore({ result, input });
      } else {
        const result = await creditApi.explain(input, connection.info, controller.signal);
        if (work.current.version === version) {
          if (
            result.raw_default_risk_score !== score!.result.raw_default_risk_score ||
            result.relative_risk_band !== score!.result.relative_risk_band
          )
            throw new CreditApiError(
              "contract",
              "Explanation differs from the current score. No explanation was accepted.",
            );
          setExplanation(result);
        }
      }
    } catch (e) {
      if (work.current.version === version) {
        const message = e instanceof Error ? e.message : "No result was accepted.";
        if (kind === "score") {
          setError(message);
          if (e instanceof CreditApiError) {
            setErrors(e.fields);
            if (e.kind === "readiness" || e.kind === "contract")
              setConnection({ status: "unavailable", info: null, error: message });
          }
        } else setExplainError(message);
      }
    } finally {
      if (work.current.version === version) {
        work.current.controller = null;
        setBusy(null);
      }
    }
  }
  const connected = connection.status === "ready";
  const groups = [
    {
      title: "Credit limit",
      description: "Available credit limit. Financial values throughout are in NTD.",
      fields: ["LIMIT_BAL"] as readonly CreditFeature[],
    },
    {
      title: "Repayment-status history",
      description:
        "Select the original code supported for each field. Codes -2 and 0 have no invented meaning.",
      fields: CREDIT_PAY,
    },
    {
      title: "Billing history",
      description:
        "Six historical billing amounts in NTD. Negative balances, zero bills and outliers are allowed.",
      fields: CREDIT_BILLS,
    },
    {
      title: "Previous payment history",
      description: "Six historical payments in NTD. Zero is allowed; negative payments are not.",
      fields: CREDIT_PAYMENTS,
    },
  ];
  return (
    <div className="credit-workspace">
      <PageHeading
        eyebrow="CREDIT RISK · EXISTING CARDHOLDERS"
        title="Understand the risk. Keep the context."
        description="Explore next-month payment-default research, one feature vector at a time."
      >
        <span className="tag muted">
          <FlaskConical size={14} /> Research only
        </span>
      </PageHeading>
      <div className={`credit-connection ${connection.status}`} role="status">
        <span>
          <Activity size={16} />
          {connected
            ? "Credit API connected"
            : connection.status === "checking"
              ? "Checking credit API…"
              : "Credit API unavailable"}
        </span>
        <span className="credit-connection-detail">
          {connected
            ? "Verified RAW model · 19 inputs · 5 frozen bands"
            : (connection.error ?? "Checking credit readiness independently of fraud.")}
        </span>
        <button
          className="button secondary"
          onClick={reconnect}
          disabled={connection.status === "checking"}
        >
          <RefreshCw size={14} /> Reconnect credit
        </button>
      </div>
      <div className="credit-tabs" role="tablist" aria-label="Credit research areas">
        {tabs.map(([key, label], i) => (
          <button
            key={key}
            id={`credit-tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls={`credit-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(e) => switchKey(e, i)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`credit-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`credit-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" && (
          <div className="credit-stack">
            <section className="credit-hero">
              <div>
                <span className="eyebrow">A FROZEN RESEARCH WORKFLOW</span>
                <h2>
                  A score is a starting point.
                  <br />
                  <em>Context completes the picture.</em>
                </h2>
                <p>
                  A historical model for next-month payment default among existing cardholders.
                  Inspect the raw estimate, understand its mechanics, and keep assumed loss
                  scenarios separate.
                </p>
                <button className="button primary" onClick={() => setTab("score")}>
                  Explore live scoring <ArrowRight size={16} />
                </button>
              </div>
              <div className="credit-model-card">
                <Layers size={36} />
                <span>RAW LIGHTGBM</span>
                <strong>
                  19 predictors.
                  <br />
                  One transparent workflow.
                </strong>
                <div className="credit-model-stats">
                  <span>
                    6 <small>repayment fields</small>
                  </span>
                  <span>
                    5 <small>relative bands</small>
                  </span>
                </div>
                <p>
                  Inputs → frozen model → research estimate
                  <br />
                  No lending decision is generated.
                </p>
              </div>
            </section>
            <div className="credit-columns">
              <Card title="Your research path">
                <div className="credit-padding credit-stack">
                  {[
                    [
                      "01",
                      "Score an illustrative vector",
                      "Use a complete financial and repayment history, without demographics.",
                    ],
                    [
                      "02",
                      "Inspect model mechanics",
                      "See signed log-odds contributions and numerical reconstruction.",
                    ],
                    [
                      "03",
                      "State your loss assumptions",
                      "Supply hypothetical PD, LGD and EAD in a separate calculator.",
                    ],
                  ].map(([n, title, text]) => (
                    <div className="credit-step" key={n}>
                      <span>{n}</span>
                      <div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Research context, always visible">
                <div className="credit-padding credit-stack">
                  <Note tone="amber">
                    Historical default-risk estimates are not validated production PDs or
                    underwriting recommendations. Relative bands are not regulatory credit grades.
                  </Note>
                  <p className="credit-muted">
                    No ID, demographic or default outcome is requested. Inputs stay in this
                    page&apos;s memory and are sent only when you explicitly submit.
                  </p>
                  <button className="button secondary" onClick={() => setTab("evidence")}>
                    <BookOpen size={16} /> Read the published evidence
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}
        {tab === "score" && (
          <div className="credit-columns credit-scoring">
            <Card
              title="Build a complete input"
              description="Exactly 19 model inputs. All financial amounts are NTD."
            >
              <form
                className="credit-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("score");
                }}
              >
                <div className="credit-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      clearResults();
                      setValues(syntheticCredit());
                    }}
                  >
                    {" "}
                    <FlaskConical size={16} />
                    Load synthetic example
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      clearResults();
                      setValues(emptyCredit());
                    }}
                  >
                    <RotateCcw size={14} />
                    Reset inputs
                  </button>
                </div>
                <p className="credit-muted">
                  The example is illustrative, not a real customer or necessarily a realistic
                  financial profile.
                </p>
                {groups.map((group, i) => (
                  <details
                    className="credit-input-group"
                    key={group.title}
                    open={i < 2 || group.fields.some((f) => !!errors[f])}
                  >
                    <summary>
                      {String(i + 1).padStart(2, "0")} <strong>{group.title}</strong>
                      <span>
                        {group.fields.length} {group.fields.length === 1 ? "field" : "fields"}
                      </span>
                    </summary>
                    <p>{group.description}</p>
                    <div className="credit-field-grid">
                      {group.fields.map((field) => (
                        <div className="credit-field" key={field}>
                          <label htmlFor={`credit-${field}`}>{field}</label>
                          {(CREDIT_PAY as readonly string[]).includes(field) ? (
                            <select
                              id={`credit-${field}`}
                              value={values[field]}
                              disabled={!connection.info}
                              aria-invalid={!!errors[field]}
                              aria-describedby={errors[field] ? `error-${field}` : undefined}
                              onChange={(e) => {
                                clearResults();
                                setValues({ ...values, [field]: e.target.value });
                              }}
                            >
                              <option value="">Choose a code</option>
                              {connection.info?.supported_repayment_codes[
                                field as (typeof CREDIT_PAY)[number]
                              ].map((code) => (
                                <option key={code} value={code}>
                                  Code {code}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={`credit-${field}`}
                              inputMode="decimal"
                              autoComplete="off"
                              value={values[field]}
                              required
                              aria-invalid={!!errors[field]}
                              aria-describedby={errors[field] ? `error-${field}` : undefined}
                              placeholder="Amount in NTD"
                              onChange={(e) => {
                                clearResults();
                                setValues({ ...values, [field]: e.target.value });
                              }}
                            />
                          )}
                          {errors[field] && (
                            <span id={`error-${field}`} className="field-error">
                              {errors[field]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
                {error && (
                  <p role="alert" className="credit-error">
                    {error}
                  </p>
                )}
                <div className="credit-actions">
                  <button type="submit" className="button primary" disabled={!connected || !!busy}>
                    <ScanLine size={16} />
                    {busy === "score" ? "Scoring…" : "Score credit input"}
                  </button>
                  {busy && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        clearResults();
                        setError("Request cancelled. No new result was accepted.");
                      }}
                    >
                      Cancel request
                    </button>
                  )}
                </div>
              </form>
            </Card>
            <Card
              title="Your research estimate"
              description="Live output from the frozen Credit Risk API."
              className="credit-live-result"
            >
              <div className="credit-padding credit-stack" aria-live="polite">
                {score ? (
                  <>
                    <ScoreDisplay score={score.result} />
                    <button className="button secondary" onClick={() => setTab("explain")}>
                      Inspect this score <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <div className="credit-empty">
                    <WalletCards size={40} />
                    <h3>
                      {busy === "score"
                        ? "Waiting for the frozen model…"
                        : stale
                          ? "Inputs changed — results cleared"
                          : "A score needs the complete picture"}
                    </h3>
                    <p>
                      {stale
                        ? "Score the current inputs again. Previous responses are no longer shown."
                        : "Load the clearly marked synthetic example or enter all 19 inputs, then submit. No automatic scoring occurs."}
                    </p>
                  </div>
                )}
                <Note>
                  Higher scores indicate higher model-estimated likelihood of next-month payment
                  default. This is a historical research estimate, not a validated production PD or
                  underwriting recommendation.
                </Note>
              </div>
            </Card>
          </div>
        )}
        {tab === "explain" && (
          <div className="credit-stack">
            <Card
              title="Explain the current input"
              description="Uses the exact feature vector behind your latest successful score."
            >
              <div className="credit-padding credit-stack">
                {score ? (
                  <>
                    <div className="credit-explain-summary">
                      <strong>
                        {(score.result.raw_default_risk_score * 100).toFixed(2)}% RAW score
                      </strong>
                      <span>
                        Band {score.result.relative_risk_band} · {score.result.relative_risk_label}
                      </span>
                      <span>{score.result.model_version}</span>
                    </div>
                    <div className="credit-actions">
                      <button
                        className="button primary"
                        disabled={!connected || !!busy}
                        onClick={() => void run("explain")}
                      >
                        {busy === "explain" ? "Explaining…" : "Explain current score"}
                      </button>
                      {busy === "explain" && (
                        <button
                          className="button secondary"
                          onClick={() => {
                            work.current.version++;
                            work.current.controller?.abort();
                            work.current.controller = null;
                            setBusy(null);
                            setExplainError("Explanation cancelled. Your score is unchanged.");
                          }}
                        >
                          Cancel explanation
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="credit-empty">
                    <Layers size={36} />
                    <h3>
                      {stale
                        ? "Inputs changed — score and explanation cleared"
                        : "Score your input first"}
                    </h3>
                    <p>
                      The explanation must correspond to the currently displayed input, not a
                      previous vector.
                    </p>
                    <button className="button secondary" onClick={() => setTab("score")}>
                      Go to live scoring
                    </button>
                  </div>
                )}
                {explainError && (
                  <p className="credit-error" role="alert">
                    {explainError}
                  </p>
                )}
                <Note>
                  Contributions use model margin/log-odds units, not percentage-point probability
                  changes. Positive terms raise the margin relative to its baseline allocation;
                  negative terms lower it. These are not causal findings or verified adverse-action
                  reasons.
                </Note>
              </div>
            </Card>
            {explanation && (
              <>
                <div className="credit-columns">
                  <Card
                    title="Five largest positive contributions"
                    description="Raise the model margin · log-odds units"
                  >
                    <ContributionChart rows={explanation.largest_positive} positive />
                  </Card>
                  <Card
                    title="Five largest negative contributions"
                    description="Lower the model margin · log-odds units"
                  >
                    <ContributionChart rows={explanation.largest_negative} />
                  </Card>
                </div>
                <Card title="Numerical reconstruction" action={<CheckCheck size={18} />}>
                  <dl className="credit-facts">
                    <div>
                      <dt>Baseline model margin</dt>
                      <dd>{explanation.baseline_model_margin.toFixed(6)}</dd>
                    </div>
                    <div>
                      <dt>Raw model margin</dt>
                      <dd>{explanation.raw_margin_log_odds.toFixed(6)}</dd>
                    </div>
                    <div>
                      <dt>Margin reconstruction error</dt>
                      <dd>{explanation.reconstruction.margin_error.toExponential(3)}</dd>
                    </div>
                    <div>
                      <dt>Probability reconstruction error</dt>
                      <dd>{explanation.reconstruction.probability_error.toExponential(3)}</dd>
                    </div>
                    <div>
                      <dt>Reconstruction verification</dt>
                      <dd>Verified by backend</dd>
                    </div>
                  </dl>
                  <div className="credit-padding">
                    <button
                      className="button secondary"
                      aria-expanded={showAll}
                      onClick={() => setShowAll(!showAll)}
                    >
                      Inspect all 19 contributions
                    </button>
                    {showAll && (
                      <div className="table-scroll">
                        <table>
                          <caption>
                            All original fields · signed model margin/log-odds contributions
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">Field</th>
                              <th scope="col">Margin contribution</th>
                            </tr>
                          </thead>
                          <tbody>
                            {CREDIT_FEATURES.map((field) => (
                              <tr key={field}>
                                <th scope="row">{field}</th>
                                <td>
                                  {explanation.original_feature_contributions[field].toFixed(6)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
        {tab === "scenario" && <CreditScenarioCalculator />}
        {tab === "evidence" && <CreditEvidence />}
      </div>
    </div>
  );
}
function ScoreDisplay({ score }: { score: CreditScore }) {
  return (
    <>
      <span className="credit-kicker">NEXT-MONTH PAYMENT-DEFAULT RESEARCH ESTIMATE</span>
      <strong className="credit-result-number" data-testid="credit-score">
        {(score.raw_default_risk_score * 100).toFixed(2)}
        <small>%</small>
      </strong>
      <div
        className="credit-score-scale"
        role="img"
        aria-label={`RAW research risk ${(score.raw_default_risk_score * 100).toFixed(2)} percent`}
      >
        <span style={{ width: `${score.raw_default_risk_score * 100}%` }} />
      </div>
      <div className="credit-scale-labels">
        <span>0%</span>
        <span>Higher model-estimated risk →</span>
        <span>100%</span>
      </div>
      <div className="credit-band-display">
        <span>RELATIVE RESEARCH BAND {score.relative_risk_band} / 5</span>
        <h3>{score.relative_risk_label}</h3>
        <div className="credit-band-track" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n === score.relative_risk_band ? "selected" : ""}>
              {n}
            </span>
          ))}
        </div>
      </div>
      <dl className="credit-facts">
        <div>
          <dt>Model</dt>
          <dd>{score.model_version}</dd>
        </div>
        <div>
          <dt>Scoring mode</dt>
          <dd>RAW</dd>
        </div>
        <div>
          <dt>Band version</dt>
          <dd>{score.band_version}</dd>
        </div>
      </dl>
      <p className="credit-muted">{score.warnings[0]}</p>
    </>
  );
}
function ContributionChart({
  rows,
  positive = false,
}: {
  rows: CreditExplanation["largest_positive"];
  positive?: boolean;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.margin_contribution)), 0.000001);
  return (
    <figure
      className="credit-padding credit-contributions"
      aria-label={`${positive ? "Positive" : "Negative"} model margin contributions in log-odds units`}
    >
      {rows.length ? (
        rows.map((row) => (
          <div className="credit-contribution" key={row.feature}>
            <div>
              <span>{row.feature}</span>
              <strong>
                {row.margin_contribution >= 0 ? "+" : ""}
                {row.margin_contribution.toFixed(6)}
              </strong>
            </div>
            <div className={`credit-signed-track ${positive ? "positive" : "negative"}`}>
              <span style={{ width: `${(Math.abs(row.margin_contribution) / max) * 50}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p>No contributions with this sign.</p>
      )}
      <figcaption>
        Signed model mechanics in log-odds; bar scales normalized within each chart. Not probability
        changes.
      </figcaption>
    </figure>
  );
}
