"use client";
import { useState } from "react";
import type { components } from "@/types/api";
import { count, currency, label, percent } from "@/lib/format";
import { EmptyState } from "@/components/states";
import { InsightList } from "@/components/insights";
type Row = components["schemas"]["SegmentRow"];
const columns = [
  "Users",
  "Activation",
  "Paid conversion",
  "MRR",
  "ARPU",
] as const;
type Metric = (typeof columns)[number];
function value(row: Row, key: Metric) {
  return key === "Users"
    ? row.activation.completed_signups
    : key === "Activation"
      ? row.activation.activation_rate
      : key === "Paid conversion"
        ? row.monetization.paid_conversion_rate
        : key === "MRR"
          ? row.monetization.mrr
          : row.monetization.arpu;
}
export function SegmentsView({
  data,
  query = "",
}: {
  data: components["schemas"]["SegmentsResponse"];
  query?: string;
}) {
  const [sort, setSort] = useState<Metric>("Users");
  const [descending, setDescending] = useState(true);
  const rows = [...data.groups].sort((a, b) => {
    const av = value(a, sort),
      bv = value(b, sort);
    if (av == null) return bv == null ? 0 : 1;
    if (bv == null) return -1;
    return (av - bv) * (descending ? -1 : 1);
  });
  if (!rows.length)
    return (
      <EmptyState title="No segment data">
        Choose another date range or dimension.
      </EmptyState>
    );
  const max = Math.max(1, ...rows.map((r) => r.activation.completed_signups));
  return (
    <>
      <InsightList
        items={data.insights}
        query={query}
        title="Segment signals"
      />
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Volume and quality</p>
            <h2>{label(data.dimension)}</h2>
            <p>Signup volume and mature activation use separate scales.</p>
          </div>
        </div>
        <div className="segment-bars">
          {rows.map((r) => (
            <div className="segment-bar-row" key={r.segment}>
              <strong>{label(r.segment)}</strong>
              <div>
                <span>{count(r.activation.completed_signups)} signups</span>
                <div className="comparison-track">
                  <i
                    style={{
                      width: `${(r.activation.completed_signups / max) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <span>{percent(r.activation.activation_rate)} activation</span>
                <div className="comparison-track quality">
                  <i
                    style={{
                      width: `${(r.activation.activation_rate ?? 0) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Segment comparison</h2>
            <p>Select a column to sort. Unavailable values stay last.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Segment metrics</caption>
            <thead>
              <tr>
                <th scope="col">Segment</th>
                {columns.map((k) => (
                  <th
                    scope="col"
                    key={k}
                    aria-sort={
                      sort === k
                        ? descending
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    <button
                      className="sort-button"
                      onClick={() => {
                        setSort(k);
                        setDescending(sort === k ? !descending : true);
                      }}
                    >
                      {k}
                      {sort === k ? (descending ? " ↓" : " ↑") : " ↕"}
                    </button>
                  </th>
                ))}
                <th scope="col">Mature / censored users</th>
                <th scope="col">Eligible / censored accounts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.segment}>
                  <th scope="row">{label(r.segment)}</th>
                  <td>{count(r.activation.completed_signups)}</td>
                  <td>{percent(r.activation.activation_rate)}</td>
                  <td>{percent(r.monetization.paid_conversion_rate)}</td>
                  <td>{currency(r.monetization.mrr)}</td>
                  <td>{currency(r.monetization.arpu)}</td>
                  <td>
                    {count(r.activation.eligible_users)} /{" "}
                    {count(r.activation.censored_users)}
                  </td>
                  <td>
                    {count(r.monetization.eligible_accounts)} /{" "}
                    {count(r.monetization.censored_accounts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">
          Activation: eligible users with seven-day follow-up. Paid conversion:
          eligible accounts with 30-day follow-up. Revenue and ARPU describe
          account stock at period end, attributed by the account’s earliest
          member. These populations are not interchangeable. Retention is
          compared separately on the Retention page.
        </p>
      </section>
    </>
  );
}
