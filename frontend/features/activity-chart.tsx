"use client";
import { useState } from "react";
import type { components } from "@/types/api";
import { count, date } from "@/lib/format";
type Series = "dau" | "wau" | "mau";
export function ActivityChart({
  data,
}: {
  data: components["schemas"]["ActivityResponse"];
}) {
  const [series, setSeries] = useState<Series>("dau");
  const available = data.series.filter((point) => point[series] != null);
  const max = Math.max(1, ...available.map((point) => point[series]!));
  const ceiling = Math.ceil(max / 4) * 4;
  const x = (index: number) =>
    55 + (index / Math.max(1, data.series.length - 1)) * 935;
  const y = (value: number) => 218 - (value / ceiling) * 185;
  const path = data.series
    .map((point, index) => {
      if (point[series] == null) {
        return "";
      }
      return `${data.series[index - 1]?.[series] != null ? "L" : "M"}${x(index)},${y(point[series]!)}`;
    })
    .join(" ");
  return (
    <section className="panel activity-panel" aria-labelledby="activity-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Usage</p>
          <h2 id="activity-title">Active users</h2>
          <p>Distinct users performing a core action.</p>
        </div>
        <div className="segmented" aria-label="Activity series">
          {(["dau", "wau", "mau"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={series === key}
              onClick={() => setSeries(key)}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {available.length ? (
        <svg
          className="activity-chart"
          viewBox="0 0 1020 265"
          role="img"
          aria-label={`${series.toUpperCase()} from ${date(data.period.start_date)}, ${available.length} observed days. Exact values in the data table below.`}
        >
          {[0, 1, 2, 3, 4].map((tick) => (
            <g key={tick}>
              <line
                x1="55"
                x2="990"
                y1={y((ceiling * tick) / 4)}
                y2={y((ceiling * tick) / 4)}
                stroke="#e5e9ed"
                strokeDasharray="3 4"
              />
              <text x="42" y={y((ceiling * tick) / 4) + 4} textAnchor="end">
                {count((ceiling * tick) / 4)}
              </text>
            </g>
          ))}
          <path
            d={path}
            fill="none"
            stroke="#256b61"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {data.series.map((point, index) => (
            <g key={point.date}>
              {point[series] != null && (
                <circle
                  cx={x(index)}
                  cy={y(point[series]!)}
                  r={data.series.length === 1 ? 4 : 2.5}
                  fill="#256b61"
                >
                  <title>{`${date(point.date)}: ${count(point[series])} users`}</title>
                </circle>
              )}
              {(index === 0 ||
                index === data.series.length - 1 ||
                (index % Math.max(1, Math.floor(data.series.length / 4)) ===
                  0 &&
                  index < data.series.length - 3)) && (
                <text
                  x={x(index)}
                  y="248"
                  textAnchor={
                    index === 0
                      ? "start"
                      : index === data.series.length - 1
                        ? "end"
                        : "middle"
                  }
                >
                  {date(point.date).replace(" 2025", "")}
                </text>
              )}
            </g>
          ))}
        </svg>
      ) : (
        <div className="empty-state">
          <h3>Activity window unavailable</h3>
          <p>
            This rolling window is not fully observed. Choose a later period or
            another series.
          </p>
        </div>
      )}
      <div className="chart-footer">
        <span>
          <i className="legend-dot" />
          {series.toUpperCase()} ·{" "}
          {series === "dau"
            ? "daily"
            : series === "wau"
              ? "rolling 7 days"
              : "rolling 30 days"}
        </span>
        <span>Gaps indicate unavailable observation windows.</span>
      </div>
      <details className="data-details">
        <summary>View activity data table</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Daily active user counts and rolling windows
            </caption>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">DAU</th>
                <th scope="col">WAU</th>
                <th scope="col">MAU</th>
              </tr>
            </thead>
            <tbody>
              {data.series.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{date(point.date)}</th>
                  <td>{count(point.dau)}</td>
                  <td>{count(point.wau)}</td>
                  <td>{count(point.mau)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
