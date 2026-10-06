import type { components } from "@/types/api";
export type Dimension = components["schemas"]["Dimension"];
export type Search = Record<string, string | string[] | undefined>;
export const OBSERVATION_START = "2025-01-01";
export const OBSERVATION_END = "2025-07-01";
export const LAST_DAY = "2025-06-30";
export const dimensions: { value: Dimension; label: string }[] = [
  { value: "acquisition_channel", label: "Acquisition channel" },
  { value: "company_size", label: "Company size" },
  { value: "country", label: "Country" },
  { value: "device_type", label: "Device type" },
];
export type AnalyticsContext = {
  start: string;
  end: string;
  dimension: Dimension;
};
export function shiftDay(value: string, days: number) {
  const d = new Date(value + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function parseContext(search: Search): AnalyticsContext {
  const start = search.start ?? "2025-06-01";
  const end = search.end ?? LAST_DAY;
  const dimension = search.dimension ?? "acquisition_channel";
  if (
    typeof start !== "string" ||
    typeof end !== "string" ||
    !validDate(start) ||
    !validDate(end) ||
    start < OBSERVATION_START ||
    end > LAST_DAY ||
    start > end
  ) {
    throw new Error(
      "Choose a valid date range between 1 January and 30 June 2025. The start must not be after the end.",
    );
  }
  if (
    typeof dimension !== "string" ||
    !dimensions.some((item) => item.value === dimension)
  )
    throw new Error("Choose a supported segment dimension.");
  return { start, end, dimension: dimension as Dimension };
}
export function apiParams(context: AnalyticsContext, dimension?: Dimension) {
  const params = new URLSearchParams({
    start_date: context.start,
    end_date: shiftDay(context.end, 1),
    as_of: OBSERVATION_END,
  });
  if (dimension) params.set("dimension", dimension);
  return params;
}
export function contextQuery(context: AnalyticsContext) {
  return new URLSearchParams({
    start: context.start,
    end: context.end,
    dimension: context.dimension,
  }).toString();
}
