export const unavailable = "—";
export function count(value: number | null | undefined) {
  return value == null
    ? unavailable
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
        value,
      );
}
export function percent(value: number | null | undefined) {
  return value == null
    ? unavailable
    : new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
}
export function points(value: number | null | undefined) {
  return value == null
    ? unavailable
    : `${value >= 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(1)} pp`;
}
export function currency(value: number | null | undefined) {
  return value == null
    ? unavailable
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
}
export function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));
}
export function duration(seconds: number | null | undefined) {
  if (seconds == null) return unavailable;
  if (seconds < 60) return "<1 min";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hr`;
  return `${(seconds / 86400).toFixed(1)} days`;
}
export function label(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
