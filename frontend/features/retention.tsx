"use client";
import { useState } from "react";
import { useUrlSelection } from "@/lib/selection";
import { InsightList } from "@/components/insights";
import type { components } from "@/types/api";
import { count, date, label, percent } from "@/lib/format";
import { EmptyState } from "@/components/states";
type Retention = components["schemas"]["RetentionResponse"];
const colors = ["#256b61", "#566a91", "#946a37", "#785b85", "#536772"];
export function RetentionView({
  total,
  comparison,
  initialSegment = "all",
  initialCohort,
  query = "",
}: {
  total: Retention;
  comparison: Retention;
  initialSegment?: string;
  initialCohort?: string;
  query?: string;
}) {
  const segments = [...new Set(comparison.cohorts.map((c) => c.segment))];
  const dates = [...new Set(total.cohorts.map((c) => c.cohort_start))];
  const [segment, setSegment] = useUrlSelection("segment", initialSegment);
  const [cohort, setCohort] = useUrlSelection(
    "cohort",
    initialCohort ??
      total.cohorts.find((c) => c.complete_cohort)?.cohort_start ??
      dates[0] ??
      "",
  );
  const [selected, setSelected] = useState(segments.slice(0, 2));
  const rows =
    segment === "all"
      ? total.cohorts
      : comparison.cohorts.filter((c) => c.segment === segment);
  const weeks = [
    ...new Set(total.cohorts.flatMap((c) => c.periods.map((p) => p.week))),
  ].sort((a, b) => a - b);
  const curves = comparison.cohorts.filter(
    (c) => c.cohort_start === cohort && selected.includes(c.segment),
  );
  if (!total.cohorts.length)
    return (
      <EmptyState title="No signup cohorts">
        Choose a different signup period.
      </EmptyState>
    );
  return (
    <>
      <InsightList
        title="Mature cohort signals"
        query={query}
        items={(segment === "all"
          ? total.insights
          : comparison.insights
        )?.filter((i) => i.segment === segment && !i.cohort_start)}
        limit={2}
        empty="No mature Week 4 pattern meets the sample and materiality thresholds in this selection."
      />
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mature observations</p>
            <h2>Latest observable cohorts</h2>
            <p>
              Individual all-user cohorts, not an average across different
              follow-up windows.
            </p>
          </div>
        </div>
        <dl className="stat-strip">
          {[1, 4].map((week) => {
            const latest = [...total.cohorts]
              .reverse()
              .find((c) =>
                c.periods.some((p) => p.week === week && p.observable),
              );
            const cell = latest?.periods.find((p) => p.week === week);
            return (
              <div key={week}>
                <dt>
                  Week {week} retention
                  {latest ? ` · ${date(latest.cohort_start)}` : ""}
                </dt>
                <dd>{percent(cell?.retention_rate)}</dd>
              </div>
            );
          })}
        </dl>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Weekly signup cohorts</p>
            <h2>Retention matrix</h2>
            <p>Core-action users as a share of the original cohort.</p>
          </div>
          <label>
            Matrix segment
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            >
              <option value="all">All users</option>
              {segments.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable retention matrix"
        >
          <table className="retention-table">
            <caption className="sr-only">
              Weekly retention for{" "}
              {segment === "all" ? "all users" : label(segment)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Cohort starting</th>
                <th scope="col">Users</th>
                {weeks.map((w) => (
                  <th scope="col" key={w}>
                    Week {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={`${c.segment}-${c.cohort_start}`}>
                  <th scope="row">
                    {date(c.cohort_start)}
                    {!c.complete_cohort && (
                      <small className="muted"> · partial</small>
                    )}
                  </th>
                  <td>{count(c.cohort_size)}</td>
                  {weeks.map((w) => {
                    const cell = c.periods.find((p) => p.week === w);
                    const rate = cell?.observable ? cell.retention_rate : null;
                    return (
                      <td
                        key={w}
                        style={
                          rate == null
                            ? undefined
                            : {
                                backgroundColor: `rgba(37,107,97,${0.04 + rate * 0.27})`,
                              }
                        }
                        title={
                          rate == null
                            ? "Not yet observable or signup cohort partially observed"
                            : `${count(cell?.active_users)} of ${count(c.cohort_size)} users`
                        }
                        aria-label={
                          rate == null
                            ? `Week ${w}: Not observable`
                            : `Week ${w}: ${percent(rate)}`
                        }
                      >
                        {percent(rate)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel-note">
          — Not observable: the signup cohort or follow-up week is incomplete.
          Partial boundary cohorts are excluded even when some activity is
          visible. Dates select signup cohorts; follow-up ends at the
          observation cutoff.
        </p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Like-for-like comparison</p>
            <h2>Segment retention curves</h2>
            <p>
              Compare segments within one signup cohort. No pooled or censored
              averages.
            </p>
          </div>
          <label>
            Comparison cohort
            <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {date(d)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="series-controls"
          role="group"
          aria-label="Retention segments"
        >
          {segments.map((s, i) => (
            <button
              key={s}
              className="series-toggle"
              aria-pressed={selected.includes(s)}
              onClick={() =>
                setSelected(
                  selected.includes(s)
                    ? selected.filter((v) => v !== s)
                    : [...selected, s],
                )
              }
            >
              <span
                aria-hidden="true"
                style={{ background: colors[i % colors.length] }}
              />
              {label(s)}
            </button>
          ))}
        </div>
        {!curves.some((c) => c.periods.some((p) => p.observable)) ? (
          <EmptyState title="No observable comparison">
            Select a segment and a complete, earlier signup cohort.
          </EmptyState>
        ) : (
          <svg
            className="retention-chart"
            viewBox="0 0 900 250"
            role="img"
            aria-label={`Segment retention for cohort ${date(cohort)}; exact values in the table below`}
          >
            {[0, 0.5, 1].map((v) => (
              <g key={v}>
                <line
                  x1="52"
                  x2="870"
                  y1={210 - v * 175}
                  y2={210 - v * 175}
                  stroke="#e1e6e9"
                />
                <text x="4" y={214 - v * 175}>
                  {percent(v)}
                </text>
              </g>
            ))}
            {weeks.map(
              (w, i) =>
                i % 2 === 0 && (
                  <text
                    key={w}
                    x={52 + (i * 818) / Math.max(1, weeks.length - 1)}
                    y="237"
                    textAnchor="middle"
                  >
                    W{w}
                  </text>
                ),
            )}
            {curves.map((c) => (
              <g key={c.segment}>
                {c.periods.map((p, i) => {
                  if (!p.observable || p.retention_rate == null) return null;
                  const x =
                      52 +
                      (weeks.indexOf(p.week) * 818) /
                        Math.max(1, weeks.length - 1),
                    y = 210 - p.retention_rate * 175;
                  const prev = c.periods[i - 1],
                    color = colors[segments.indexOf(c.segment) % colors.length];
                  return (
                    <g key={p.week}>
                      {prev?.observable && prev.retention_rate != null && (
                        <line
                          x1={
                            52 +
                            (weeks.indexOf(prev.week) * 818) /
                              Math.max(1, weeks.length - 1)
                          }
                          y1={210 - prev.retention_rate * 175}
                          x2={x}
                          y2={y}
                          stroke={color}
                          strokeWidth="2"
                          strokeDasharray={
                            segments.indexOf(c.segment) % 2 ? "6 3" : undefined
                          }
                        />
                      )}
                      <circle cx={x} cy={y} r="3" fill={color}>
                        <title>{`${label(c.segment)} · Week ${p.week}: ${percent(p.retention_rate)}`}</title>
                      </circle>
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        )}
        <InsightList
          title="Same-cohort differences"
          query={query}
          items={comparison.insights?.filter((i) => i.cohort_start === cohort)}
          limit={1}
          empty="No Week 4 segment gap meets the sample and materiality thresholds for this cohort."
        />
        <details className="data-details">
          <summary>View comparison values</summary>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                Segment retention comparison
              </caption>
              <thead>
                <tr>
                  <th scope="col">Segment</th>
                  {weeks.map((w) => (
                    <th key={w} scope="col">
                      Week {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {curves.map((c) => (
                  <tr key={c.segment}>
                    <th scope="row">{label(c.segment)}</th>
                    {weeks.map((w) => (
                      <td key={w}>
                        {percent(
                          c.periods.find((p) => p.week === w && p.observable)
                            ?.retention_rate,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </>
  );
}
