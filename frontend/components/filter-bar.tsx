import Link from "next/link";
import {
  dimensions,
  LAST_DAY,
  OBSERVATION_START,
  shiftDay,
  type AnalyticsContext,
  contextQuery,
} from "@/lib/context";
export function FilterBar({
  context,
  path,
  segmentation = false,
}: {
  context: AnalyticsContext;
  path: string;
  segmentation?: boolean;
}) {
  return (
    <section className="filters" aria-label="Analytics filters">
      <form
        key={contextQuery(context)}
        action={path}
        method="get"
        className="filter-form"
      >
        <label>
          From
          <input
            type="date"
            name="start"
            defaultValue={context.start}
            min={OBSERVATION_START}
            max={LAST_DAY}
            required
          />
        </label>
        <label>
          Through
          <input
            type="date"
            name="end"
            defaultValue={context.end}
            min={OBSERVATION_START}
            max={LAST_DAY}
            required
          />
        </label>
        {segmentation ? (
          <label>
            Compare by
            <select name="dimension" defaultValue={context.dimension}>
              {dimensions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="dimension" value={context.dimension} />
        )}
        <button type="submit" className="button">
          Apply filters <span aria-hidden="true">↗</span>
        </button>
      </form>
      <div className="presets">
        <span>Demo window</span>
        {[7, 30, 90].map((days) => (
          <Link
            key={days}
            href={`${path}?${new URLSearchParams({ start: shiftDay(LAST_DAY, 1 - days), end: LAST_DAY, dimension: context.dimension })}`}
            prefetch={false}
          >
            Last {days} days
          </Link>
        ))}
        <Link
          href={`${path}?${new URLSearchParams({ start: OBSERVATION_START, end: LAST_DAY, dimension: context.dimension })}`}
          prefetch={false}
        >
          All data
        </Link>
        <Link href={path} prefetch={false}>
          Reset filters
        </Link>
      </div>
      <p className="filter-context">
        Selected period: {context.start} – {context.end} inclusive · UTC
        {segmentation
          ? ` · ${dimensions.find((d) => d.value === context.dimension)?.label}`
          : ""}
        . Local selections reset when the period changes.
      </p>
    </section>
  );
}
