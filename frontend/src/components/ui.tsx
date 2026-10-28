import type { ReactNode } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { history, integer } from "@/lib/history";

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function HistoricalTag() {
  return (
    <span className="tag historical">
      <span className="tiny-dot" />
      Held-out historical evaluation
    </span>
  );
}
export function Card({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Note({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "amber";
}) {
  return (
    <div className={`note ${tone}`}>
      <Info size={17} />
      <div>{children}</div>
    </div>
  );
}
export function ReportSource() {
  return (
    <div className="report-source">
      <div>
        <span className="tiny-dot" />
        Published report · {history.evaluatedOn}
        <span className="source-population">
          {integer(history.rows)} observations · {history.fraud} fraud cases
        </span>
      </div>
      <a href={history.reportUrl} target="_blank" rel="noreferrer">
        Source & methodology
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
export function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = "violet",
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className={`metric-card ${accent}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}
