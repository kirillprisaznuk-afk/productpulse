import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Navigation } from "@/components/nav";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "ProductPulse · Overview", template: "%s · ProductPulse" },
  description:
    "Product Analytics & Experimentation Platform. Synthetic B2B SaaS demo dataset.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <aside className="sidebar">
          <Link href="/" className="brand">
            <svg viewBox="0 0 28 28" aria-hidden="true">
              <path
                d="M2 15h6l4-10 5 18 4-8h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            ProductPulse
          </Link>
          <div className="workspace">
            <span className="workspace-monogram">T</span>
            <div>
              <strong>TaskHarbor</strong>
              <small>Demo workspace</small>
            </div>
            <span aria-hidden="true">⌄</span>
          </div>
          <p className="nav-label">Workspace analytics</p>
          <Suspense fallback={<p className="muted">Loading navigation…</p>}>
            <Navigation />
          </Suspense>
          <div className="sidebar-bottom">
            <span className="small-label">DATA ENVIRONMENT</span>
            <strong>
              <i className="legend-dot" />
              Synthetic B2B SaaS
            </strong>
            <p>
              1 Jan – 30 Jun 2025
              <br />
              Fixed observation window · UTC
            </p>
          </div>
        </aside>
        <div className="app-body">
          <div className="topbar">
            <span>Product Analytics & Experimentation Platform</span>
            <span className="topbar-right">
              Demo workspace{" "}
              <span className="avatar" aria-hidden="true">
                PP
              </span>
            </span>
          </div>
          <main id="main" className="main-content">
            {children}
          </main>
          <footer className="page-footer">
            <span>ProductPulse · Synthetic demo data</span>
            <Link href="/methodology">Definitions & methodology ↗</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
