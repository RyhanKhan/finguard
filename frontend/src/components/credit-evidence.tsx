import { BarChart3, Database, Fingerprint, ScanLine } from "lucide-react";
import { Card, MetricCard, Note } from "./ui";
import { creditPublished as data } from "@/lib/credit-published-results";
export function CreditEvidence() {
  return (
    <div className="credit-stack">
      <div className="credit-source">
        <span className="tag historical">Published historical evidence · 5F-v2</span>
        <a href={data.reportUrl} target="_blank" rel="noreferrer">
          Source & methodology ↗
        </a>
      </div>
      <p className="credit-muted">{data.notice}</p>
      <div className="credit-metrics">
        <MetricCard
          label="Supported observations"
          value="6,000 / 6,001"
          detail="One original observation unscorable"
          icon={<Database size={18} />}
        />
        <MetricCard
          label="ROC-AUC"
          value={data.auc.toFixed(6)}
          detail="Historical ranking discrimination"
          icon={<BarChart3 size={18} />}
        />
        <MetricCard
          label="Average precision"
          value={data.ap.toFixed(6)}
          detail="1,274 defaults in evaluated population"
          icon={<ScanLine size={18} />}
        />
      </div>
      <div className="credit-columns">
        <Card
          title="Five frozen research segments"
          description="Published observed default rates; these are not a new user's predicted scores."
        >
          <figure
            className="credit-padding"
            aria-label="Historical observed default rate by frozen credit band"
          >
            {data.bands.map((b, i) => (
              <div className="credit-history-row" key={b.label}>
                <div>
                  <span>
                    {i + 1} · {b.label}
                  </span>
                  <strong>{b.observedPercent.toFixed(3)}%</strong>
                </div>
                <div className="credit-track">
                  <span style={{ width: `${b.observedPercent}%` }} />
                </div>
              </div>
            ))}
            <figcaption>Relative research segments, not validated regulatory grades.</figcaption>
          </figure>
        </Card>
        <Card
          title="Fixed top-10% review scenario"
          description="A historical account-review scenario, not a lending decision."
        >
          <dl className="credit-facts">
            <div>
              <dt>Accounts flagged</dt>
              <dd>{data.topTen.flagged}</dd>
            </div>
            <div>
              <dt>Historical defaults captured</dt>
              <dd>{data.topTen.defaultsCaptured}</dd>
            </div>
            <div>
              <dt>Precision</dt>
              <dd>{data.topTen.precisionPercent.toFixed(3)}%</dd>
            </div>
            <div>
              <dt>Recall</dt>
              <dd>{data.topTen.recallPercent.toFixed(3)}%</dd>
            </div>
          </dl>
          <p className="credit-padding credit-muted">
            Review flags are not prevented defaults or savings.
          </p>
        </Card>
      </div>
      <Card title="Probability quality and limitations" action={<Fingerprint size={18} />}>
        <dl className="credit-facts">
          <div>
            <dt>KS</dt>
            <dd>{data.ks.toFixed(6)}</dd>
          </div>
          <div>
            <dt>Brier score</dt>
            <dd>{data.brier.toFixed(6)}</dd>
          </div>
          <div>
            <dt>Log loss</dt>
            <dd>{data.logLoss.toFixed(6)}</dd>
          </div>
        </dl>
        <div className="credit-padding">
          <Note tone="amber">
            <ul>
              {data.limitations.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </Note>
        </div>
        <p className="credit-padding credit-muted">
          Citation: {data.source}. No reserved observations or prediction archives are loaded by
          this interface.
        </p>
      </Card>
    </div>
  );
}
