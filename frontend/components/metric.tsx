import type { components } from "@/types/api";
import { count, currency, percent, points } from "@/lib/format";
type Comparison = components["schemas"]["Comparison"];
export function ComparisonText({
  value,
  rate = false,
}: {
  value?: Comparison;
  rate?: boolean;
}) {
  if (
    !value ||
    value.direction === "unavailable" ||
    (rate ? value.absolute_change : value.relative_change) == null
  )
    return <p className="comparison muted">Comparison unavailable</p>;
  const amount = rate
    ? points(value.absolute_change)
    : `${(value.relative_change ?? 0) >= 0 ? "+" : "−"}${percent(Math.abs(value.relative_change ?? 0))}`;
  return (
    <p
      className="comparison"
      title={`Previous: ${rate ? percent(value.previous) : count(value.previous)} → Current: ${rate ? percent(value.current) : count(value.current)}`}
    >
      <span aria-hidden="true">
        {value.direction === "up"
          ? "↗"
          : value.direction === "down"
            ? "↘"
            : "→"}
      </span>{" "}
      <strong>{amount}</strong>{" "}
      <span className="muted">vs previous period</span>
    </p>
  );
}
export function Metric({
  name,
  value,
  kind = "count",
  note,
}: {
  name: string;
  value?: Comparison;
  kind?: "count" | "rate" | "currency";
  note: string;
}) {
  const formatter =
    kind === "rate" ? percent : kind === "currency" ? currency : count;
  return (
    <article className="metric">
      <h3>{name}</h3>
      <p
        className="metric-value"
        aria-label={`${name}: ${value?.current == null ? "Unavailable" : formatter(value.current)}`}
      >
        {formatter(value?.current)}
      </p>
      <ComparisonText value={value} rate={kind === "rate"} />
      <p className="metric-note">{note}</p>
    </article>
  );
}
