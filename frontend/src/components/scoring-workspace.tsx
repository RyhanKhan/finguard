"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clock3,
  Code2,
  CopyCheck,
  Crosshair,
  FlaskConical,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useApi } from "./api-provider";
import { Card, Note } from "./ui";
import { api, ApiError, type ScoreResult } from "@/lib/api";
import { emptyFeatures, exampleFeatures, FEATURES, validateFeatures } from "@/lib/features";

export function ScoringWorkspace() {
  const connection = useApi();
  const [values, setValues] = useState(emptyFeatures);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [exampleLoaded, setExampleLoaded] = useState(false);

  function loadExample() {
    setValues(exampleFeatures());
    setResult(null);
    setErrors({});
    setRequestError(null);
    setExampleLoaded(true);
  }
  function clear() {
    setValues(emptyFeatures());
    setResult(null);
    setErrors({});
    setRequestError(null);
    setExampleLoaded(false);
  }
  function change(feature: string, value: string) {
    setValues((v) => ({ ...v, [feature]: value }));
    setResult(null);
    setExampleLoaded(false);
    setErrors((e) => {
      const next = { ...e };
      delete next[feature];
      return next;
    });
    setRequestError(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validated = validateFeatures(values);
    setErrors(validated.errors);
    setResult(null);
    setRequestError(null);
    if (!validated.data) {
      setAdvanced(true);
      requestAnimationFrame(() =>
        document.getElementById(`feature-${Object.keys(validated.errors)[0]}`)?.focus(),
      );
      return;
    }
    if (!connection.info || connection.status !== "ready") return;
    setPending(true);
    try {
      setResult(await api.score(validated.data, connection.info));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scoring failed. No result was returned.";
      setRequestError(message);
      if (!(error instanceof ApiError) || error.kind !== "validation")
        connection.invalidate(message);
    } finally {
      setPending(false);
    }
  }
  function field(feature: string) {
    return (
      <div className="feature-field" key={feature}>
        <label htmlFor={`feature-${feature}`}>
          {feature}
          {feature === "Amount" && <span>Original unspecified unit</span>}
        </label>
        <input
          id={`feature-${feature}`}
          name={feature}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          required
          value={values[feature]}
          placeholder={feature === "Amount" ? "e.g. 100.00" : "0.0"}
          onChange={(e) => change(feature, e.target.value)}
          aria-invalid={!!errors[feature]}
          aria-describedby={errors[feature] ? `error-${feature}` : undefined}
        />
        {errors[feature] && (
          <span id={`error-${feature}`} className="field-error">
            {errors[feature]}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <Note>
        <strong>Single-transaction inference, not live monitoring.</strong> The raw LightGBM score
        is not validated as a well-calibrated fraud probability. No merchants, identities or
        geographic explanations are inferred.
      </Note>
      {connection.status === "unavailable" && (
        <div className="api-error-panel" role="alert">
          <CircleX size={21} />
          <div>
            <strong>Scoring service unavailable</strong>
            <p>{connection.error}</p>
            <small>
              Historical evaluation pages remain available. No fallback predictions are used.
            </small>
          </div>
          <button className="button secondary" onClick={connection.reconnect}>
            <RefreshCw size={15} />
            Retry connection
          </button>
        </div>
      )}
      {connection.status === "checking" && (
        <div className="connection-loading" role="status">
          <LoaderCircle size={16} className="animate-spin" />
          Verifying API readiness and model metadata…
        </div>
      )}
      <div className="scoring-grid">
        <Card
          title="Transaction input"
          description="Exactly 29 numeric predictors. No missing values."
          action={
            <span className="tag muted">
              <Code2 size={12} />
              FEATURE SCHEMA v1
            </span>
          }
        >
          <form onSubmit={submit} noValidate>
            <fieldset disabled={pending} className="transaction-fields">
              <legend className="sr-only">Transaction predictors</legend>
              <button
                type="button"
                className={`example-loader ${exampleLoaded ? "loaded" : ""}`}
                onClick={loadExample}
              >
                <span className="example-icon">
                  {exampleLoaded ? <CopyCheck size={21} /> : <FlaskConical size={21} />}
                </span>
                <span>
                  <strong>
                    {exampleLoaded ? "Synthetic example loaded" : "Start with a synthetic example"}
                  </strong>
                  <small>V1–V28 = 0.0 · Amount = 100.0 · invented input</small>
                </span>
                {exampleLoaded ? <Check size={17} /> : <ArrowRight size={17} />}
              </button>
              <div className="amount-field">{field("Amount")}</div>
              <button
                type="button"
                className="advanced-toggle"
                aria-expanded={advanced}
                aria-controls="advanced-fields"
                onClick={() => setAdvanced(!advanced)}
              >
                <span>
                  <Code2 size={16} />
                  <strong>Advanced feature editor</strong>
                  <small>V1–V28</small>
                </span>
                <ChevronDown size={18} className={advanced ? "rotate-180" : ""} />
              </button>
              <div id="advanced-fields" hidden={!advanced}>
                <p className="feature-explanation">
                  These are supplied transformed predictors. Their original feature meanings are not
                  disclosed. Use finite numbers; no explanation labels are inferred.
                </p>
                <div className="feature-grid">
                  {FEATURES.filter((f) => f !== "Amount").map(field)}
                </div>
              </div>
              {!advanced && (
                <p className="collapsed-editor-note">
                  {Object.values(values).every((v) => v.trim())
                    ? "All 29 values are present. Expand to inspect or edit the transformed predictors."
                    : "Load the example, or expand the editor to enter all 28 transformed predictors."}
                </p>
              )}
              {Object.keys(errors).length > 0 && (
                <div className="form-error" role="alert">
                  Check {Object.keys(errors).length} invalid{" "}
                  {Object.keys(errors).length === 1 ? "field" : "fields"}. Nothing has been
                  submitted.
                </div>
              )}
              <div className="form-actions">
                <button
                  type="submit"
                  className="button primary"
                  disabled={connection.status !== "ready" || pending}
                >
                  {pending ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Scoring transaction…
                    </>
                  ) : (
                    <>
                      Score transaction
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                <button type="button" className="clear-button" onClick={clear}>
                  <Trash2 size={14} />
                  Clear
                </button>
              </div>
            </fieldset>
          </form>
          <div className="input-footnote">
            <ShieldCheck size={14} />
            <span>
              Backend validation remains authoritative. Inputs are not stored by this dashboard.
            </span>
          </div>
        </Card>
        <Card
          title="Scoring result"
          description="Returned by the verified FastAPI service"
          className="result-panel"
          action={
            <span className="tag muted">
              <ScanLine size={12} />
              SINGLE INFERENCE
            </span>
          }
        >
          <div aria-live="polite" aria-atomic="true">
            {pending ? (
              <div className="result-empty" role="status">
                <div className="empty-result-icon">
                  <LoaderCircle size={32} className="animate-spin" />
                </div>
                <h3>One transaction. One inference.</h3>
                <p>Waiting for the frozen model and policy response.</p>
                <div className="skeleton-bars">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ) : requestError ? (
              <div className="result-empty error" role="alert">
                <div className="empty-result-icon">
                  <CircleX size={32} />
                </div>
                <h3>No scoring result returned</h3>
                <p>{requestError}</p>
                <small>No score or action has been substituted.</small>
              </div>
            ) : result ? (
              <ScoredResult result={result} />
            ) : (
              <div className="result-empty">
                <div className="empty-result-icon">
                  <Crosshair size={33} strokeWidth={1.3} />
                </div>
                <span className="eyebrow">NO SCORING RESULT YET</span>
                <h3>A decision starts with evidence.</h3>
                <p>
                  Load the synthetic example or enter your own feature vector, then submit it to the
                  actual scoring API.
                </p>
                <div className="empty-result-steps">
                  <span>01 Input</span>
                  <ArrowRight size={13} />
                  <span>02 Score</span>
                  <ArrowRight size={13} />
                  <span>03 Action</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      {connection.info && (
        <div className="provenance-strip">
          <span>
            Connected model <strong>{connection.info.model_version}</strong>
          </span>
          <span>
            Policy <strong>{connection.info.policy_version}</strong>
          </span>
          <span>
            Family <strong>{connection.info.model_family}</strong>
          </span>
        </div>
      )}
      <div className="bottom-callout">
        <Sparkles size={17} />
        <span>Explore historical performance separately from this new inference.</span>
        <a href="/evaluation">
          Model evaluation
          <ArrowRight size={14} />
        </a>
      </div>
    </>
  );
}

export function ScoredResult({ result }: { result: ScoreResult }) {
  const Icon =
    result.action === "approve" ? CircleCheck : result.action === "review" ? Clock3 : CircleX;
  return (
    <div className="scored-result">
      <div className="result-success-label">
        <Check size={13} />
        RESPONSE RECEIVED FROM FASTAPI
      </div>
      <div className="score-label">RAW LIGHTGBM SCORE</div>
      <div className="raw-score" data-testid="raw-score">
        {result.raw_score.toPrecision(10)}
      </div>
      <div className="score-range">
        <span>0</span>
        <span>Raw score scale</span>
        <span>1</span>
      </div>
      <div
        className="raw-score-meter"
        role="meter"
        aria-label="Raw model score, not calibrated probability"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={result.raw_score}
      >
        <span style={{ width: `${result.raw_score * 100}%` }} />
      </div>
      <div className={`returned-action ${result.action}`}>
        <Icon size={24} />
        <div>
          <small>FROZEN POLICY ACTION</small>
          <strong>{result.action}</strong>
        </div>
        <span>Backend decision</span>
      </div>
      <Note tone="amber">
        Not validated as a well-calibrated fraud probability. An action is a policy output, not
        proof of fraud or safety.
      </Note>
      <dl className="result-provenance">
        <div>
          <dt>Model</dt>
          <dd>{result.model_version}</dd>
        </div>
        <div>
          <dt>Policy</dt>
          <dd>{result.policy_version}</dd>
        </div>
        <div>
          <dt>Feature schema</dt>
          <dd>{result.feature_schema_version}</dd>
        </div>
        <div>
          <dt>Review threshold</dt>
          <dd>{result.thresholds.review}</dd>
        </div>
        <div>
          <dt>Decline threshold</dt>
          <dd>{result.thresholds.decline}</dd>
        </div>
      </dl>
      <details className="response-details">
        <summary>Inspect response provenance</summary>
        <p>{result.thresholds.equality}</p>
        <p>{result.score_limitation}</p>
        <p>{result.service_scope}</p>
        <span>Model SHA-256</span>
        <code>{result.model_sha256}</code>
        <span>Policy SHA-256</span>
        <code>{result.policy_sha256}</code>
      </details>
      <div className="result-research-note">
        <FlaskConical size={14} />
        Portfolio research demonstration. Not production decisioning.
      </div>
    </div>
  );
}
