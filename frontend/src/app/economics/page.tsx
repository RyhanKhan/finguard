import type { Metadata } from "next";
import { Card, HistoricalTag, Note, PageHeading, ReportSource } from "@/components/ui";
import { Economics } from "@/components/economics";

export const metadata: Metadata = { title: "Decision economics" };
export default function EconomicsPage() {
  return (
    <>
      <PageHeading
        eyebrow="EVIDENCE / DECISION ECONOMICS"
        title="Decisions have trade-offs."
        description="A frozen policy. Three explicit scenarios. An illustrative view of cost."
      >
        <HistoricalTag />
      </PageHeading>
      <ReportSource />
      <Note tone="amber">
        <strong>Retrospective simulation under assumed costs and prevention effects.</strong> AMU is
        an illustrative assumed Amount unit, not a verified currency. These results are not realized
        fraud savings.
      </Note>
      <Economics />
      <Card
        title="Interpret the economics carefully"
        description="What changes across scenarios—and what does not."
      >
        <div className="economics-principles">
          <div>
            <span className="tag muted">FROZEN</span>
            <h3>One policy in every scenario</h3>
            <p>
              The original actions and thresholds remain fixed. No scenario reoptimizes decisions.
            </p>
          </div>
          <div>
            <span className="tag muted">ASSUMED</span>
            <h3>Effects are not measured</h3>
            <p>
              Review effectiveness, decline effectiveness and customer costs are invented portfolio
              assumptions.
            </p>
          </div>
          <div>
            <span className="tag muted">LIMITED</span>
            <h3>Capacity can change</h3>
            <p>
              Historical compliance does not guarantee future volume, peak demand or operational
              feasibility.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
