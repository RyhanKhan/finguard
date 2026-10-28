import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { PageHeading } from "@/components/ui";
import { ScoringWorkspace } from "@/components/scoring-workspace";

export const metadata: Metadata = { title: "Live scoring" };
export default function Scoring() {
  return (
    <>
      <PageHeading
        eyebrow="EXPERIMENT / LIVE SCORING"
        title="One transaction. A transparent decision."
        description="Send a new feature vector to the frozen model and inspect the actual response."
      >
        <span className="tag historical">
          <FlaskConical size={13} />
          Research inference
        </span>
      </PageHeading>
      <ScoringWorkspace />
    </>
  );
}
