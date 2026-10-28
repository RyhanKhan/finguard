import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCheck,
  CircleDot,
  Database,
  GitBranch,
  Layers,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ApChart, FraudRouting } from "@/components/charts";
import { Card, HistoricalTag, MetricCard, Note, PageHeading, ReportSource } from "@/components/ui";
import { history } from "@/lib/history";

export default function Overview() {
  return (
    <>
      <PageHeading
        eyebrow="THE FRAUD RESEARCH WORKSPACE"
        title="Intelligence you can inspect."
        description="Explore the evidence. Score a transaction. Understand the decision."
      >
        <HistoricalTag />
      </PageHeading>
      <section className="overview-hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <ShieldCheck size={15} />
            FROZEN MODEL. TRANSPARENT DECISIONS.
          </span>
          <h2>
            From a model score
            <br />
            to an informed action.
          </h2>
          <p>
            A complete view of one fraud research workflow—from forward validation to a single
            held-out evaluation.
          </p>
          <Link className="button primary" href="/scoring">
            Score a transaction
            <ArrowRight size={16} />
          </Link>
          <Link className="hero-secondary" href="/evaluation">
            Explore the evaluation
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="hero-model">
          <div className="model-node">
            <span className="model-orbit">
              <Layers size={32} strokeWidth={1.4} />
            </span>
            <div>
              <span className="tag muted">RAW LIGHTGBM</span>
              <strong>One frozen pipeline.</strong>
              <small>29 predictors · 3 possible actions</small>
            </div>
          </div>
          <div className="hero-action-flow">
            <span className="action-badge approve">
              <i />
              Approve
            </span>
            <span className="action-badge review">
              <i />
              Review
            </span>
            <span className="action-badge decline">
              <i />
              Decline
            </span>
          </div>
          <div className="hero-footnote">
            <LockKeyhole size={13} />
            Fixed policy · independent transaction scoring
          </div>
        </div>
      </section>
      <ReportSource />
      <div className="metric-grid">
        <MetricCard
          label="Evaluated transactions"
          value="73,766"
          detail="Original held-out test population"
          icon={<Database size={18} />}
        />
        <MetricCard
          label="Observed fraud cases"
          value="98"
          detail="0.132853% observed prevalence"
          icon={<CircleDot size={18} />}
          accent="amber"
        />
        <MetricCard
          label="Average precision"
          value="0.641268"
          detail="Final-test ranking performance"
          icon={<BarChart3 size={18} />}
          accent="mint"
        />
        <MetricCard
          label="Fraud routed for action"
          value={
            <>
              75 <span className="metric-denominator">/ 98</span>
            </>
          }
          detail="Review or decline; not prevention"
          icon={<ShieldCheck size={18} />}
        />
      </div>
      <div className="overview-charts">
        <Card
          title="Ranking, beyond development"
          description="Average precision across the original forward folds and final test"
          action={
            <Link className="text-link" href="/evaluation">
              Full evaluation
              <ArrowUpRight size={14} />
            </Link>
          }
        >
          <ApChart />
          <div className="chart-stat-foot">
            <span>Final-test ROC-AUC</span>
            <strong>0.963003</strong>
            <small>Ranking ≠ probability accuracy</small>
          </div>
        </Card>
        <Card
          title="Where fraud was routed"
          description="98 labelled fraud observations in the historical test"
        >
          <FraudRouting />
          <div className="action-mini-grid">
            <div>
              <span className="amber-text">Review actions</span>
              <strong>76</strong>
              <small>32 fraud · 44 legitimate</small>
            </div>
            <div>
              <span className="rose-text">Decline actions</span>
              <strong>52</strong>
              <small>43 fraud · 9 legitimate</small>
            </div>
          </div>
        </Card>
      </div>
      <Note tone="amber">
        <strong>A score is not a calibrated probability.</strong> Mean predicted score was
        0.365674%, versus 0.132853% observed fraud prevalence. The raw model overpredicted risk in
        the held-out period.
      </Note>
      <Card
        title="The evidence behind the interface"
        description="A staged workflow with separate fitting, auditing, policy selection and evaluation."
        action={
          <span className="tag muted">
            <GitBranch size={13} />
            REPRODUCIBLE WORKFLOW
          </span>
        }
      >
        <ol className="pipeline">
          <li>
            <span className="step-icon">
              <Layers size={19} />
            </span>
            <small>01 / DEVELOPMENT</small>
            <h3>Build & compare</h3>
            <p>Logistic and LightGBM models, using forward validation.</p>
          </li>
          <li>
            <span className="step-icon">
              <ScanLine size={19} />
            </span>
            <small>02 / PROBABILITY AUDIT</small>
            <h3>Inspect the scores</h3>
            <p>Independent calibration and transfer checks. Raw model retained.</p>
          </li>
          <li>
            <span className="step-icon">
              <LockKeyhole size={19} />
            </span>
            <small>03 / FROZEN POLICY</small>
            <h3>Define the action</h3>
            <p>Fixed thresholds under explicit illustrative cost assumptions.</p>
          </li>
          <li>
            <span className="step-icon">
              <CheckCheck size={19} />
            </span>
            <small>04 / HELD-OUT TEST</small>
            <h3>Evaluate once</h3>
            <p>73,766 observations. Preserved results. No retuning.</p>
          </li>
        </ol>
      </Card>
      <div className="bottom-callout">
        <Sparkles size={18} />
        <span>Curious how the frozen pipeline responds?</span>
        <Link href="/scoring">
          Try the synthetic example
          <ArrowRight size={15} />
        </Link>
      </div>
      <div className="sr-only">
        Model {history.modelVersion}. Policy {history.policyVersion}.
      </div>
    </>
  );
}
