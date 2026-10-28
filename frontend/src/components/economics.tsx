"use client";

import { useState } from "react";
import { ArrowDownRight, Check, LockKeyhole } from "lucide-react";
import { Card } from "./ui";
import { amu, history, percent } from "@/lib/history";

export function Economics() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const scenario = history.scenarios[scenarioIndex];
  const policies = [
    { label: "Approve all", cost: scenario.approveAll, className: "baseline" },
    { label: "Reference · 0.5 / 0.9", cost: scenario.reference, className: "reference" },
    { label: "Frozen selected", cost: scenario.selected, className: "selected" },
  ];
  return (
    <>
      <Card
        title="A score becomes an action"
        description="Original raw-score boundaries. No overrides or new threshold selection."
        action={
          <span className="tag muted">
            <LockKeyhole size={12} />
            FROZEN POLICY
          </span>
        }
      >
        <div className="policy-rules">
          <div>
            <span className="action-badge approve">
              <i />
              Approve
            </span>
            <strong>score &lt; review threshold</strong>
            <code>&lt; {history.reviewThreshold}</code>
            <small>Strictly below the review boundary.</small>
          </div>
          <div>
            <span className="action-badge review">
              <i />
              Review
            </span>
            <strong>review ≤ score &lt; decline</strong>
            <code>≥ {history.reviewThreshold}</code>
            <small>Includes review; excludes decline.</small>
          </div>
          <div>
            <span className="action-badge decline">
              <i />
              Decline
            </span>
            <strong>score ≥ decline threshold</strong>
            <code>≥ {history.declineThreshold}</code>
            <small>Includes the decline boundary.</small>
          </div>
        </div>
        <div className="panel-bottom-note">
          Policy version <strong>{history.policyVersion}</strong> · fixed for all historical
          scenarios
        </div>
      </Card>
      <Card
        title="The cost of each decision policy"
        description="Published final-test totals, in assumed Amount units"
      >
        <fieldset className="scenario-controls">
          <legend className="sr-only">Economic sensitivity scenario</legend>
          {history.scenarios.map((s, index) => (
            <label key={s.id} className={scenarioIndex === index ? "selected" : ""}>
              <input
                type="radio"
                name="scenario"
                value={s.id}
                checked={scenarioIndex === index}
                onChange={() => setScenarioIndex(index)}
              />
              {s.label}
            </label>
          ))}
        </fieldset>
        <div className="scenario-description" aria-live="polite">
          {scenario.description}
        </div>
        <div className="economics-content" aria-live="polite">
          <figure className="cost-chart" aria-label={`${scenario.label} simulated cost by policy`}>
            {policies.map((p) => (
              <div className="bar-row" key={p.label}>
                <div className="bar-label">
                  <span>{p.label}</span>
                  <strong>
                    {amu(p.cost)} <small>AMU</small>
                  </strong>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${p.className}`}
                    style={{ width: `${(p.cost / scenario.approveAll) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <figcaption>Identical transactions and fixed actions in every scenario.</figcaption>
          </figure>
          <div className="cost-comparison-card">
            <span>FROZEN SELECTED TOTAL</span>
            <strong>
              {amu(scenario.selected)}
              <small>AMU</small>
            </strong>
            <div>
              <ArrowDownRight size={16} />
              <span>
                {amu(scenario.approveAll - scenario.selected)} lower simulated cost
                <br />
                <small>versus approve-all</small>
              </span>
            </div>
            <div>
              <ArrowDownRight size={16} />
              <span>
                {amu(scenario.reference - scenario.selected)} lower simulated cost
                <br />
                <small>versus fixed reference</small>
              </span>
            </div>
            <p>Assumption-dependent differences. Not realized savings.</p>
          </div>
        </div>
      </Card>
      <div className="two-columns">
        <Capacity
          title="Review capacity"
          used={76}
          limit={history.reviewLimit}
          cap="0.5%"
          color="amber"
        />
        <Capacity
          title="Decline capacity"
          used={52}
          limit={history.declineLimit}
          cap="0.2%"
          color="rose"
        />
      </div>
    </>
  );
}
function Capacity({
  title,
  used,
  limit,
  cap,
  color,
}: {
  title: string;
  used: number;
  limit: number;
  cap: string;
  color: string;
}) {
  return (
    <Card
      title={title}
      description="Historical full-test population"
      action={
        <span className="tag compliant">
          <Check size={12} />
          Within capacity
        </span>
      }
    >
      <div className="capacity-values">
        <strong>
          {used}
          <span> / {limit}</span>
        </strong>
        <span>{percent(used / limit)} utilized</span>
      </div>
      <div
        className="capacity-track"
        role="meter"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div className={`${color}-bg`} style={{ width: percent(used / limit) }} />
      </div>
      <p className="panel-note">
        {cap} population cap, rounded down to whole transactions. No overflow repair was applied.
      </p>
    </Card>
  );
}
