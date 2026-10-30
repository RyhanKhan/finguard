import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { PageHeading } from "@/components/ui";
import { ScoringWorkspace } from "@/components/scoring-workspace";

export const metadata: Metadata = { title: "Fraud research" };
export default function Scoring() {
  return (
    <>
      <PageHeading
        eyebrow="FRAUD / HISTORICAL RESEARCH"
        title="The research behind the decision."
        description="Inspect the frozen model, evaluation and decision framework. Interactive Fraud scoring is not enabled in this public portfolio."
      >
        <span className="tag historical">
          <FlaskConical size={13} />
          Historical case study
        </span>
      </PageHeading>
      <ScoringWorkspace />
    </>
  );
}
