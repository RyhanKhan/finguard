"use client";
import { useEffect, useRef, useState } from "react";
import { Calculator, Info } from "lucide-react";
import { creditApi, type CreditScenario } from "@/lib/credit-api";
import { finiteInput } from "@/lib/credit-features";
import { Card, Note } from "./ui";
export function CreditScenarioCalculator() {
  const [values, setValues] = useState({ pd: "", lgd: "", ead: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<CreditScenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const work = useRef<{ controller: AbortController | null; version: number }>({
    controller: null,
    version: 0,
  });
  useEffect(() => {
    const job = work.current;
    return () => {
      job.version++;
      job.controller?.abort();
    };
  }, []);
  function clear() {
    work.current.version++;
    work.current.controller?.abort();
    work.current.controller = null;
    setBusy(false);
    setStale(!!result || busy);
    setResult(null);
    setError(null);
  }
  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    if (work.current.controller) return;
    const pd = finiteInput(values.pd),
      lgd = finiteInput(values.lgd),
      ead = finiteInput(values.ead);
    if (
      pd === null ||
      lgd === null ||
      ead === null ||
      pd < 0 ||
      pd > 100 ||
      lgd < 0 ||
      lgd > 100 ||
      ead < 0 ||
      !confirmed
    ) {
      setError(
        "Provide PD and LGD from 0–100%, nonnegative EAD, and confirm the hypothetical assumptions.",
      );
      return;
    }
    const controller = new AbortController();
    work.current.controller = controller;
    const version = ++work.current.version;
    setBusy(true);
    setResult(null);
    setError(null);
    setStale(false);
    try {
      const next = await creditApi.scenario(
        { pd: pd / 100, lgd: lgd / 100, ead, unit: "NTD" },
        controller.signal,
      );
      if (work.current.version === version) setResult(next);
    } catch (e) {
      if (work.current.version === version)
        setError(e instanceof Error ? e.message : "No scenario result was accepted.");
    } finally {
      if (work.current.version === version) {
        work.current.controller = null;
        setBusy(false);
      }
    }
  }
  return (
    <div className="credit-columns">
      <Card
        title="Make the assumptions explicit"
        description="Educational arithmetic, separate from credit model inference."
      >
        <form className="credit-padding credit-stack" onSubmit={calculate} noValidate>
          <div className="credit-assumptions">
            <Info size={18} />
            <p>
              <strong>PD</strong> is assumed chance of default. <strong>LGD</strong> is the assumed
              share of exposure lost if default occurs. <strong>EAD</strong> is the amount assumed
              exposed at default.
            </p>
          </div>
          {(
            [
              ["pd", "Assumed PD (%)"],
              ["lgd", "Assumed LGD (%)"],
              ["ead", "Assumed EAD (NTD)"],
            ] as const
          ).map(([field, label]) => (
            <div className="credit-field" key={field}>
              <label htmlFor={`scenario-${field}`}>{label}</label>
              <input
                id={`scenario-${field}`}
                inputMode="decimal"
                autoComplete="off"
                value={values[field]}
                onChange={(e) => {
                  clear();
                  setValues({ ...values, [field]: e.target.value });
                  setConfirmed(false);
                }}
                placeholder={field === "ead" ? "Amount in NTD" : "0–100"}
                required
              />
            </div>
          ))}
          <label className="credit-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                clear();
                setConfirmed(e.target.checked);
              }}
            />{" "}
            I confirm these are hypothetical assumptions, not measured PD, LGD or EAD.
          </label>
          <div className="credit-actions">
            <button className="button primary" disabled={busy} type="submit">
              <Calculator size={16} />
              {busy ? "Calculating…" : "Calculate hypothetical loss"}
            </button>
            {busy && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  clear();
                  setError("Request cancelled. No new result was accepted.");
                }}
              >
                Cancel calculation
              </button>
            )}
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                clear();
                setValues({ pd: "", lgd: "", ead: "" });
                setConfirmed(false);
              }}
            >
              Reset assumptions
            </button>
          </div>
          {error && (
            <p className="credit-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </Card>
      <Card
        title="Hypothetical expected loss"
        description="Backend-calculated PD × LGD × EAD in NTD."
      >
        <div className="credit-padding credit-stack" aria-live="polite">
          {result ? (
            <>
              <span className="credit-result-number" data-testid="credit-scenario-result">
                NTD{" "}
                {result.hypothetical_expected_loss.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <dl className="credit-facts">
                <div>
                  <dt>Assumed PD</dt>
                  <dd>{(result.assumed_pd * 100).toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>Assumed LGD</dt>
                  <dd>{(result.assumed_lgd * 100).toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>Assumed EAD</dt>
                  <dd>NTD {result.assumed_ead.toLocaleString()}</dd>
                </div>
              </dl>
              <p className="credit-muted">{result.warnings.join(" ")}</p>
            </>
          ) : (
            <div className="credit-empty">
              <Calculator size={36} />
              <h3>
                {busy
                  ? "Waiting for the scenario API…"
                  : stale
                    ? "Assumptions changed"
                    : "Start with your assumptions"}
              </h3>
              <p>
                No amount is shown until the backend returns a result for the confirmed assumptions.
              </p>
            </div>
          )}
          <Note>
            No credit limit is silently used as EAD. This is not actual bank loss, charge-off,
            savings, capital or realized recovery. Model readiness is not required for this
            independent arithmetic endpoint.
          </Note>
        </div>
      </Card>
    </div>
  );
}
