import type { Metadata } from "next";
import { ArrowDownRight, ChartNoAxesCombined, Crosshair, Gauge, ScanLine } from "lucide-react";
import { ActionsTable, ApChart, BudgetChart } from "@/components/charts";
import { Card, HistoricalTag, MetricCard, Note, PageHeading, ReportSource } from "@/components/ui";
import { history } from "@/lib/history";

export const metadata: Metadata = { title: "Model evaluation" };
export default function Evaluation() {
  return (
    <>
      <PageHeading
        eyebrow="EVIDENCE / MODEL EVALUATION"
        title="Performance, with perspective."
        description="Published historical results from the single frozen final-test evaluation."
      >
        <HistoricalTag />
      </PageHeading>
      <ReportSource />
      <div className="metric-grid">
        <MetricCard
          label="Average precision"
          value="0.641268"
          detail="Final test · 98 fraud cases"
          icon={<ChartNoAxesCombined size={18} />}
        />
        <MetricCard
          label="ROC-AUC"
          value="0.963003"
          detail="Discrimination across all scores"
          icon={<Crosshair size={18} />}
          accent="mint"
        />
        <MetricCard
          label="Brier score"
          value="0.001031"
          detail="9 d.p.: 0.001030958 · lower is better"
          icon={<Gauge size={18} />}
          accent="amber"
        />
        <MetricCard
          label="Log loss"
          value="0.007076"
          detail="9 d.p.: 0.007075619 · lower is better"
          icon={<ScanLine size={18} />}
        />
      </div>
      <div className="two-columns">
        <Card
          title="How ranking transferred"
          description="Average precision across different temporal populations"
        >
          <ApChart includePolicy />
          <div className="insight-line">
            <ArrowDownRight size={18} />
            <span>
              Development mean <strong>0.794298</strong> → final test <strong>0.641268</strong>
            </span>
          </div>
          <p className="panel-note">
            Selection optimism, changing prevalence and case mix limit comparisons. These results do
            not select a new model.
          </p>
        </Card>
        <Card
          title="Precision & recall at review budgets"
          description="A deterministic full-window ranking diagnostic"
        >
          <BudgetChart />
          <div className="capture-summary">
            Fraud captured
            <span>
              <strong>51</strong> / 98 at 0.1%
            </span>
            <span>
              <strong>79</strong> / 98 at 0.5%
            </span>
            <span>
              <strong>80</strong> / 98 at 1%
            </span>
          </div>
        </Card>
      </div>
      <Card
        title="The frozen policy in action"
        description="Every original test observation, without exclusions"
      >
        <ActionsTable />
        <div className="routing-summary">
          <span>
            <strong>75 / 98</strong> fraud routed to review or decline
          </span>
          <span>
            <strong>44</strong> legitimate reviews
          </span>
          <span>
            <strong>9</strong> legitimate declines
          </span>
        </div>
      </Card>
      <div className="two-columns">
        <Card
          title="Ranking is only part of the picture"
          description="Mean score versus observed prevalence"
        >
          <div className="probability-comparison">
            <div>
              <span>Mean predicted score</span>
              <strong className="violet-text">
                0.365674<span>%</span>
              </strong>
              <div className="comparison-track">
                <span className="violet-bg" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <span>Observed fraud prevalence</span>
              <strong className="mint-text">
                0.132853<span>%</span>
              </strong>
              <div className="comparison-track">
                <span
                  className="mint-bg"
                  style={{
                    width: `${(history.prevalencePercent / history.meanScorePercent) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <Note tone="amber">
            <strong>Approximately 2.75× prevalence.</strong> Raw scores overstate average risk. High
            ROC-AUC does not establish calibration.
          </Note>
        </Card>
        <Card
          title="What this evaluation cannot tell us"
          description="Keep these limits beside the headline metrics"
        >
          <ul className="limitations-list">
            <li>
              <span>01</span>
              <div>
                <strong>Small event support</strong>
                <p>Only 98 fraud cases; temporal blocks contain 5–20 events.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Related transactions & drift</strong>
                <p>Unknown entity dependence and changing distributions limit transfer.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Upstream and label uncertainty</strong>
                <p>PCA fitting history, label delay and completeness are unknown.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Historical evidence, not deployment validation</strong>
                <p>No significance or real prevention effect is established.</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
      <div className="provenance-strip">
        <span>
          Published model <strong>{history.modelVersion}</strong>
        </span>
        <span>
          Frozen policy <strong>{history.policyVersion}</strong>
        </span>
      </div>
    </>
  );
}
