import { history, integer, percent } from "@/lib/history";

export function ApChart({ includePolicy = false }: { includePolicy?: boolean }) {
  const rows = [
    ...history.development.map((d) => ({ label: d.label, value: d.ap, kind: "development" })),
    ...(includePolicy ? [{ label: "Policy period", value: history.policyAp, kind: "policy" }] : []),
    { label: "Final test", value: history.ap, kind: "final" },
  ];
  return (
    <figure className="bar-chart" aria-label="Average precision by evaluation period">
      <div className="chart-scale">
        <span>Average precision</span>
        <span>0 → 1</span>
      </div>
      {rows.map((d) => (
        <div className="bar-row" key={d.label}>
          <div className="bar-label">
            <span>{d.label}</span>
            <strong>{d.value.toFixed(6)}</strong>
          </div>
          <div className="bar-track">
            <div className={`bar-fill ${d.kind}`} style={{ width: `${d.value * 100}%` }} />
          </div>
        </div>
      ))}
      <figcaption>
        Final-test AP is below development. Populations and prevalence differ.
      </figcaption>
    </figure>
  );
}
export function FraudRouting() {
  const portion = history.routedFraud / history.fraud;
  return (
    <div className="routing-visual">
      <div
        className="donut"
        style={{
          background: `conic-gradient(var(--violet) 0deg ${portion * 360}deg, #273148 ${portion * 360}deg 360deg)`,
        }}
        role="img"
        aria-label="75 of 98 fraud observations routed to review or decline"
      >
        <div>
          <strong>
            75<span>/98</span>
          </strong>
          <small>fraud routed</small>
        </div>
      </div>
      <div className="routing-legend">
        <div>
          <span className="legend-dot violet" />
          <span>Review or decline</span>
          <strong>75</strong>
        </div>
        <div>
          <span className="legend-dot slate" />
          <span>Approved fraud</span>
          <strong>23</strong>
        </div>
        <p>Routing is not measured prevention.</p>
      </div>
    </div>
  );
}
export function BudgetChart() {
  return (
    <figure
      className="budget-chart"
      aria-label="Precision and recall at fixed full-window review budgets"
    >
      <div className="legend">
        <span>
          <i className="legend-dot violet" />
          Precision
        </span>
        <span>
          <i className="legend-dot mint" />
          Recall
        </span>
      </div>
      {history.budgets.map((b) => (
        <div className="budget-row" key={b.budget}>
          <div>
            <strong>Top {b.budget}</strong>
            <small>{b.selected} transactions</small>
          </div>
          <div className="paired-bars">
            <div className="paired-bar">
              <span style={{ width: percent(b.precision) }} className="violet-bg" />
              <strong>{percent(b.precision)}</strong>
            </div>
            <div className="paired-bar">
              <span style={{ width: percent(b.recall) }} className="mint-bg" />
              <strong>{percent(b.recall)}</strong>
            </div>
          </div>
        </div>
      ))}
      <figcaption>Global ranking diagnostics. Not a real-time queue or policy.</figcaption>
    </figure>
  );
}
export function ActionsTable() {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Final-test routing by the frozen selected policy</caption>
        <thead>
          <tr>
            <th scope="col">Frozen action</th>
            <th scope="col">Transactions</th>
            <th scope="col">Fraud</th>
            <th scope="col">Legitimate</th>
          </tr>
        </thead>
        <tbody>
          {history.actions.map((a) => (
            <tr key={a.action}>
              <th scope="row">
                <span className={`action-badge ${a.action}`}>
                  <i />
                  {a.action}
                </span>
              </th>
              <td>{integer(a.total)}</td>
              <td>{a.fraud}</td>
              <td>{integer(a.legitimate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
