import Link from "next/link";
import type { components } from "@/types/api";
import {
  count,
  currency,
  duration,
  label,
  percent,
  points,
} from "@/lib/format";
type Insight = components["schemas"]["Insight"];
function evidenceValue(
  key: string,
  value: string | number | null,
  insight: Insight,
) {
  if (value == null) return "—";
  if (typeof value === "string") return label(value);
  if (key.includes("rate") || key.includes("share")) return percent(value);
  if (key.includes("seconds")) return duration(value);
  if (key === "value" && insight.rule === "funnel.drop_off_rate")
    return percent(value);
  if (["change", "gap", "materiality_threshold"].includes(key))
    return insight.category === "change" &&
      ["mau", "mrr"].includes(insight.metric)
      ? `${percent(value)} relative`
      : points(value);
  if (["current", "previous"].includes(key))
    return insight.metric === "mrr"
      ? currency(value)
      : insight.metric.endsWith("rate")
        ? percent(value)
        : count(value);
  return count(value);
}
export function InsightList({
  items = [],
  title = "What to investigate",
  query = "",
  limit = 4,
  empty = "No material patterns met the documented rules for this selection.",
}: {
  items?: Insight[];
  title?: string;
  query?: string;
  limit?: number;
  empty?: string;
}) {
  const sorted = [...items].sort(
    (a, b) =>
      a.priority - b.priority ||
      a.rule.localeCompare(b.rule) ||
      (a.segment ?? "").localeCompare(b.segment ?? ""),
  );
  return (
    <section className="insight-summary" aria-label={title}>
      <div className="section-intro">
        <h2>{title}</h2>
        <Link href="/methodology#insights" className="text-link">
          Rules & thresholds ↗
        </Link>
      </div>
      {!sorted.length ? (
        <p className="muted insight-empty">{empty}</p>
      ) : (
        <ul>
          {sorted.slice(0, limit).map((item) => {
            const params = new URLSearchParams(query);
            if (
              item.segment &&
              item.segment !== "all" &&
              ["/funnels", "/retention"].includes(item.destination)
            )
              params.set("segment", item.segment);
            if (item.cohort_start) params.set("cohort", item.cohort_start);
            return (
              <li key={`${item.rule}-${item.segment}-${item.cohort_start}`}>
                <span className={`insight-severity severity-${item.severity}`}>
                  {label(item.severity)}
                </span>
                <div>
                  <p>{item.message}</p>
                  <details>
                    <summary>Evidence</summary>
                    <dl>
                      {Object.entries(item.evidence)
                        .filter(([key]) => key !== "unit")
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>{label(key)}</dt>
                            <dd>{evidenceValue(key, value, item)}</dd>
                          </div>
                        ))}
                    </dl>
                    <p className="muted">{item.caveat}</p>
                  </details>
                </div>
                <Link
                  className="text-link"
                  prefetch={false}
                  href={`${item.destination}?${params}`}
                >
                  Investigate ↗
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
