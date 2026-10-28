import Link from "next/link";
import { Card, PageHeading } from "@/components/ui";
export default function NotFound() {
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE / 404"
        title="This page is outside the workspace."
        description="Return to the published evidence or score a new transaction."
      />
      <Card>
        <Link href="/" className="button primary">
          Back to overview
        </Link>
      </Card>
    </>
  );
}
