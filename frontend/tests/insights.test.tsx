import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InsightList } from "@/components/insights";
import { FunnelView } from "@/features/funnels";
import { RetentionView } from "@/features/retention";
import { ErrorState } from "@/components/states";
import { parseResponse } from "@/lib/api";
import { ComparisonText } from "@/components/metric";
import { funnel, segmentedFunnel, change } from "./fixtures";
import fixtures from "./advanced-fixtures.json";
import type { components } from "@/types/api";
type Insight = components["schemas"]["Insight"];
const item: Insight = {
  rule: "change.activation_rate",
  severity: "warning",
  priority: 20,
  category: "change",
  metric: "activation_rate",
  message: "Activation fell 3.0 pp versus the previous equal-length period.",
  evidence: {
    current: 0,
    previous: 0.03,
    change: -0.03,
    materiality_threshold: 0.02,
  },
  destination: "/segments",
  segment: null,
  cohort_start: null,
  caveat: "Descriptive, not causal.",
};
afterEach(() => window.history.replaceState(null, "", "/"));
describe("Decision signals", () => {
  it("preserves backend messages, evidence and deterministic priority", async () => {
    render(
      <InsightList
        items={[
          { ...item, rule: "later", priority: 80, message: "Later signal" },
          item,
        ]}
        query="start=2025-01-01&end=2025-06-30&dimension=country"
      />,
    );
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(item.message);
    await userEvent.click(screen.getAllByText("Evidence")[0]);
    expect(screen.getAllByText("0.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("−3.0 pp").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Investigate ↗" })[0],
    ).toHaveAttribute(
      "href",
      "/segments?start=2025-01-01&end=2025-06-30&dimension=country",
    );
  });
  it("does not fabricate insights when no rule fired", () => {
    render(<InsightList items={[]} />);
    expect(screen.getByText(/No material patterns/)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
  it("keeps relative undefined rather than dividing by zero", () => {
    render(
      <ComparisonText
        value={{
          ...change,
          previous: 0,
          relative_change: null,
          direction: "unavailable",
        }}
      />,
    );
    expect(screen.getByText("Comparison unavailable")).toBeInTheDocument();
  });
});
describe("Shareable selections", () => {
  it("writes funnel segment to URL and restores initial selection", async () => {
    window.history.replaceState(null, "", "/funnels?start=2025-01-01");
    const { unmount } = render(
      <FunnelView total={funnel} comparison={segmentedFunnel} />,
    );
    await userEvent.selectOptions(
      screen.getByLabelText("View segment"),
      "referral",
    );
    expect(new URLSearchParams(window.location.search).get("segment")).toBe(
      "referral",
    );
    expect(new URLSearchParams(window.location.search).get("start")).toBe(
      "2025-01-01",
    );
    unmount();
    render(
      <FunnelView
        total={funnel}
        comparison={segmentedFunnel}
        initialSegment="referral"
      />,
    );
    expect(screen.getByLabelText("View segment")).toHaveValue("referral");
  });
  it("preserves retention segment and comparison cohort", async () => {
    const total = parseResponse("retention", fixtures.total),
      comparison = parseResponse("retention", fixtures.retention);
    window.history.replaceState(
      null,
      "",
      "/retention?dimension=acquisition_channel",
    );
    render(<RetentionView total={total} comparison={comparison} />);
    await userEvent.selectOptions(
      screen.getByLabelText("Matrix segment"),
      "organic",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Comparison cohort"),
      total.cohorts.at(-1)!.cohort_start,
    );
    const url = new URLSearchParams(window.location.search);
    expect(url.get("segment")).toBe("organic");
    expect(url.get("cohort")).toBe(total.cohorts.at(-1)!.cohort_start);
  });
  it("resets errors within the current page", () => {
    render(
      <ErrorState message="Invalid filters" retry="/retention?start=bad" />,
    );
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/retention",
    );
  });
});
