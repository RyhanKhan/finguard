"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  WalletCards,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  LayoutDashboard,
  RefreshCw,
  Scale,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useApi } from "./api-provider";
import { history } from "@/lib/history";
import { creditPublished } from "@/lib/credit-published-results";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/scoring", label: "Live scoring", icon: ScanLine },
  { href: "/evaluation", label: "Model evaluation", icon: ChartNoAxesCombined },
  { href: "/economics", label: "Decision economics", icon: Scale },
  { href: "/credit", label: "Credit risk", icon: WalletCards },
];
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const connection = useApi();
  const current = navigation.find((n) => n.href === pathname)?.label ?? "Workspace";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link href="/" className="brand" aria-label="FinGuard home">
          <span className="brand-mark">
            <ShieldCheck size={24} strokeWidth={1.6} />
          </span>
          <span>
            FinGuard<span className="brand-sub">RISK INTELLIGENCE</span>
          </span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {pathname === href && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="research-card">
            <FlaskConical size={19} />
            <strong>Built for research.</strong>
            <p>Fraud detection and credit risk, with evidence you can inspect.</p>
            <span className="tag muted">Portfolio demonstration</span>
          </div>
          <a
            className="resource-link"
            href={pathname.startsWith("/credit") ? creditPublished.reportUrl : history.reportUrl}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={16} />
            {pathname.startsWith("/credit") ? "Credit evaluation report" : "Evaluation report"}
            <ArrowUpRight size={14} />
          </a>
          <div className="workspace-id">
            <span className="avatar">FG</span>
            <span>
              Research workspace<small>Frozen release · v1</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              <FlaskConical size={13} />
              RESEARCH DEMO
            </span>
            {pathname.startsWith("/credit") ? (
              <span className="tag muted">Credit workspace</span>
            ) : (
              <>
                <div className={`api-status ${connection.status}`} role="status">
                  <Activity size={14} />
                  <span>
                    {connection.status === "ready"
                      ? "API connected"
                      : connection.status === "checking"
                        ? "Checking API"
                        : "API unavailable"}
                  </span>
                </div>
                <button
                  className="icon-button"
                  aria-label="Reconnect to scoring API"
                  title="Reconnect to scoring API"
                  onClick={connection.reconnect}
                  disabled={connection.status === "checking"}
                >
                  <RefreshCw
                    size={15}
                    className={connection.status === "checking" ? "animate-spin" : ""}
                  />
                </button>
              </>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>
            <ShieldCheck size={14} />
            Portfolio research. Not production decisioning.
          </span>
          <span>
            <CircleHelp size={14} />
            Historical results ≠ live monitoring
          </span>
          <a href="/reports/attribution.md" target="_blank" rel="noreferrer">
            Data &amp; research attribution
          </a>
        </footer>
      </div>
    </div>
  );
}
