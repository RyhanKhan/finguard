import Link from "next/link";
import { Card, Note } from "./ui";

export function FraudAvailability() {
  return (
    <section aria-label="Module availability">
      <Note>
        <strong>Fraud: historical research.</strong> Interactive Fraud scoring is not currently
        enabled while ODbL/DbCL compliance is clarified. Evaluation, architecture and simulated
        economics remain available. <Link href="/credit">Credit Risk is live →</Link>
      </Note>
    </section>
  );
}

export function FraudAttribution() {
  return (
    <section aria-label="Fraud dataset attribution" className="research-attribution">
      <Note>
        <strong>Dataset &amp; methods.</strong> Historical Fraud results contain information derived
        from{" "}
        <a href="https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud">
          Credit Card Fraud Detection
        </a>
        , published by MLG–ULB from its research collaboration with Worldline. Database:{" "}
        <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>; contents:{" "}
        <a href="https://opendatacommons.org/licenses/dbcl/1-0/">DbCL 1.0</a>. FinGuard created
        research partitions, fitted models and added score/action fields. No publisher endorsement
        is implied.{" "}
        <a href="/reports/fraud-methods.md">Methods, limitations &amp; licensing status</a> explain
        the remaining disclosure question; attribution alone does not establish clearance.
      </Note>
    </section>
  );
}

export function FraudResearchWorkspace() {
  return (
    <>
      <div className="overview-charts research-detail">
        <Card
          title="Verified historical evidence"
          description="Frozen results, not a live prediction"
        >
          <div className="research-content">
            <p>
              The original held-out evaluation covers 73,766 transactions, including 98 fraud cases.
            </p>
            <ul>
              <li>Average precision: 0.641268; ROC-AUC: 0.963003.</li>
              <li>75 of 98 fraud cases were routed to review or decline.</li>
              <li>Routing is not measured prevention; RAW scores overpredicted observed risk.</li>
            </ul>
            <div className="portfolio-links">
              <Link className="button secondary" href="/evaluation">
                Inspect the evaluation
              </Link>
              <Link className="button secondary" href="/">
                Explore the research architecture
              </Link>
            </div>
          </div>
        </Card>
        <Card
          title="Frozen decision framework"
          description="Historical replay under invented cost assumptions"
        >
          <div className="research-content">
            <p>
              The research model uses V1–V28 and Amount. Its frozen policy routes a score to
              approve, review or decline:
            </p>
            <ul>
              <li>
                Review threshold: <code>0.480177454887009</code>.
              </li>
              <li>
                Decline threshold: <code>0.9986654773731469</code>.
              </li>
              <li>Equality enters the higher-risk action.</li>
            </ul>
            <p>No input is submitted and no probability or action is generated on this page.</p>
            <div className="portfolio-links">
              <Link className="button secondary" href="/economics">
                Explore simulated economics
              </Link>
            </div>
          </div>
        </Card>
      </div>
      <Note>
        <strong>Try the live module.</strong> <Link href="/credit">Credit Risk</Link> supports
        invented-input scoring, relative-risk bands, native feature explanations and hypothetical
        NTD loss scenarios. Neither module makes real financial decisions.
      </Note>
    </>
  );
}
