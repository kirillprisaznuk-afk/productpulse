import { describe, it, expect } from "vitest";
import { count, percent, points, currency, date, duration } from "@/lib/format";
import { parseContext, apiParams } from "@/lib/context";
describe("presentation formatting", () => {
  it("formats counts, rates, points and exact currency distinctly", () => {
    expect(count(12345)).toBe("12,345");
    expect(percent(0.5428)).toBe("54.3%");
    expect(points(-0.018)).toBe("−1.8 pp");
    expect(currency(110293)).toBe("$110,293.00");
  });
  it("preserves null versus actual zero", () => {
    expect(percent(null)).toBe("—");
    expect(count(undefined)).toBe("—");
    expect(count(0)).toBe("0");
    expect(percent(0)).toBe("0.0%");
  });
  it("formats UTC dates and readable durations", () => {
    expect(date("2025-06-01")).toBe("1 Jun 2025");
    expect(duration(18 * 60)).toBe("18 min");
    expect(duration(2.4 * 86400)).toBe("2.4 days");
    expect(duration(null)).toBe("—");
  });
});
describe("URL analytics context", () => {
  it("converts the inclusive UI end to the exclusive API end", () => {
    expect(apiParams(parseContext({})).get("end_date")).toBe("2025-07-01");
  });
  it("preserves custom range and supported dimension", () => {
    expect(
      parseContext({
        start: "2025-01-01",
        end: "2025-01-07",
        dimension: "country",
      }),
    ).toEqual({ start: "2025-01-01", end: "2025-01-07", dimension: "country" });
  });
  it.each([
    { start: "2025-02-30" },
    { start: "2025-06-20", end: "2025-06-01" },
    { end: "2026-01-01" },
    { dimension: "sql" },
    { start: ["2025-01-01", "2025-01-02"] },
  ])("rejects invalid filters %j", (input) => {
    expect(() => parseContext(input)).toThrow();
  });
});
