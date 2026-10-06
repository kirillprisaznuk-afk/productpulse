import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RetentionView } from "@/features/retention";
import { SegmentsView } from "@/features/segments";
import {
  ExperimentDetail,
  ExperimentList,
  ConfidencePlot,
  DecisionBadge,
} from "@/features/experiments";
import { PlanningPanel } from "@/features/planning";
import { calculatePlan } from "@/app/experiments/actions";
import { parseResponse } from "@/lib/api";
import { percent, count, points } from "@/lib/format";
import { FilterBar } from "@/components/filter-bar";
import { parseContext } from "@/lib/context";
import fixtures from "./advanced-fixtures.json";
const total = parseResponse("retention", fixtures.total);
const comparison = parseResponse("retention", fixtures.retention);
const segments = parseResponse("segments", fixtures.segments);
const first = parseResponse("analysis", fixtures.analysis1);
const second = parseResponse("analysis", fixtures.analysis2);
const list = parseResponse("experiments", fixtures.experiments);
afterEach(() => vi.unstubAllGlobals());
describe("Retention", () => {
  it("renders actual cohort cells and preserves censoring", () => {
    render(<RetentionView total={total} comparison={comparison} />);
    const table = screen.getByRole("table", {
      name: "Weekly retention for all users",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(
      total.cohorts.length + 1,
    );
    expect(
      within(table).getAllByLabelText(/Not observable/).length,
    ).toBeGreaterThan(0);
    const cell = total.cohorts[0].periods[0];
    expect(
      within(table).getByLabelText(`Week 0: ${percent(cell.retention_rate)}`),
    ).toBeInTheDocument();
  });
  it("selects one segment without fabricating new aggregates", async () => {
    render(<RetentionView total={total} comparison={comparison} />);
    const segment = comparison.cohorts[0].segment;
    await userEvent.selectOptions(
      screen.getByLabelText("Matrix segment"),
      segment,
    );
    expect(
      screen.getByRole("table", { name: /Weekly retention for Organic/ }),
    ).toBeInTheDocument();
  });
  it("compares same-cohort curves, toggles segments and handles unobservable cohorts", async () => {
    render(<RetentionView total={total} comparison={comparison} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /Segment retention for cohort/,
    );
    const toggle = screen.getByRole("button", { name: "Organic" });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.selectOptions(
      screen.getByLabelText("Comparison cohort"),
      total.cohorts.at(-1)!.cohort_start,
    );
    expect(screen.getByText("No observable comparison")).toBeInTheDocument();
  });
  it("shows a real empty matrix state", () => {
    render(
      <RetentionView
        total={{ ...total, cohorts: [] }}
        comparison={{ ...comparison, cohorts: [] }}
      />,
    );
    expect(screen.getByText("No signup cohorts")).toBeInTheDocument();
  });
});
describe("Segments", () => {
  it("sorts returned metrics and leaves unavailable values last", async () => {
    render(<SegmentsView data={segments} />);
    const table = screen.getByRole("table", { name: "Segment metrics" });
    await userEvent.click(screen.getByRole("button", { name: /Activation/ }));
    const sorted = [...segments.groups].sort(
      (a, b) =>
        (b.activation.activation_rate ?? -1) -
        (a.activation.activation_rate ?? -1),
    );
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
      percent(sorted[0].activation.activation_rate),
    );
    expect(
      screen.getByRole("columnheader", { name: /Activation/ }),
    ).toHaveAttribute("aria-sort", "descending");
    await userEvent.click(screen.getByRole("button", { name: /Activation/ }));
    expect(
      screen.getByRole("columnheader", { name: /Activation/ }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(within(table).getAllByText("—").length).toBeGreaterThan(0);
  });
  it("provides only controlled dimensions submitted to the server", async () => {
    render(
      <FilterBar context={parseContext({})} path="/segments" segmentation />,
    );
    const select = screen.getByRole("combobox", { name: "Compare by" });
    await userEvent.selectOptions(select, "company_size");
    expect(select).toHaveValue("company_size");
    expect(select.closest("form")).toHaveAttribute("action", "/segments");
    expect(within(select).getAllByRole("option")).toHaveLength(4);
  });
  it("handles empty segment output", () => {
    render(<SegmentsView data={{ ...segments, groups: [] }} />);
    expect(screen.getByText("No segment data")).toBeInTheDocument();
  });
});
describe("Experiments", () => {
  it("renders list with URL selection and backend decisions", () => {
    render(
      <ExperimentList
        items={list.experiments}
        selected={second.metadata.id}
        decisions={{ 1: first, 2: second }}
      />,
    );
    expect(
      screen.getByRole("link", { name: second.metadata.name }),
    ).toHaveAttribute("href", `/experiments?experiment=${second.metadata.id}`);
    expect(
      screen.getByRole("link", { name: second.metadata.name }),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByText("Positive evidence")).toHaveLength(2);
  });
  it.each([first, second])(
    "renders actual variants, effects and interpretation for $metadata.id",
    (data) => {
      render(<ExperimentDetail data={data} />);
      for (const v of data.variant_results) {
        const card = screen.getByRole("region", {
          name: `${v.variant === "control" ? "Control" : "Treatment"} result`,
        });
        expect(card).toHaveTextContent(percent(v.conversion_rate));
        expect(card).toHaveTextContent(count(v.conversions));
      }
      expect(
        screen.getByText(data.decision.interpretation),
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`Statistically significant at`)),
      ).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAccessibleName(/Excludes zero/);
      expect(
        screen.getByText(points(data.power.current_mde.absolute_mde), {
          selector: "dd",
        }),
      ).toBeInTheDocument();
    },
  );
  it("shows SRM warning without inventing a cause", () => {
    render(
      <ExperimentDetail
        data={{
          ...first,
          health: {
            ...first.health,
            status: "warning",
            srm: { ...first.health.srm, warning: true },
          },
          decision: { ...first.decision, state: "DATA_QUALITY_WARNING" },
        }}
      />,
    );
    expect(screen.getByText("Data quality warning")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "not proof of a pipeline defect",
    );
  });
  it("preserves insufficient-data and null inference states", () => {
    render(
      <ExperimentDetail
        data={{
          ...first,
          decision: { ...first.decision, state: "INSUFFICIENT_DATA" },
          inference: {
            ...first.inference,
            significant: null,
            confidence_interval: null,
            p_value: null,
            valid_for_decision: false,
          },
        }}
      />,
    );
    expect(screen.getByText("Insufficient mature data")).toBeInTheDocument();
    expect(
      screen.getByText("Confidence interval unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Significance unavailable/)).toBeInTheDocument();
  });
  it("shows a zero-crossing interval and remaining deterministic states", () => {
    render(
      <>
        <ConfidencePlot
          interval={{
            lower: -0.02,
            upper: 0.04,
            point_estimate: 0.01,
            confidence_level: 0.95,
            method: "test",
          }}
        />
        <DecisionBadge state="NO_SIGNIFICANT_DIFFERENCE" />
        <DecisionBadge state="NEGATIVE_SIGNIFICANT" />
      </>,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/Includes zero/);
    expect(screen.getByText("No significant difference")).toBeInTheDocument();
    expect(screen.getByText("Negative evidence")).toBeInTheDocument();
  });
});
describe("Sample planning", () => {
  const result = {
    baseline_rate: 0.4,
    treatment_rate: 0.43,
    absolute_mde: 0.03,
    relative_mde: 0.075,
    alpha: 0.05,
    target_power: 0.8,
    required_sample_per_variant: 4230,
    required_total_sample: 8460,
    method: "equal_allocation_normal_approximation",
    assumptions:
      "Independent users, fixed horizon, positive effect, equal allocation.",
  };
  it("submits inputs to the backend and renders returned sample sizes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(result)));
    vi.stubGlobal("fetch", fetcher);
    render(<PlanningPanel />);
    await userEvent.type(
      screen.getByLabelText("Baseline conversion (%)"),
      "40",
    );
    await userEvent.type(
      screen.getByLabelText("Minimum detectable effect"),
      "3",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Calculate sample" }),
    );
    expect(await screen.findByText("4,230")).toBeInTheDocument();
    expect(screen.getByText("8,460")).toBeInTheDocument();
    expect(fetcher.mock.calls[0][1].body).toContain(
      '"minimum_detectable_effect":0.03',
    );
  });
  it("passes relative mode and sanitizes backend validation failure", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response("private error", { status: 422 }));
    vi.stubGlobal("fetch", fetcher);
    const form = new FormData();
    Object.entries({
      baseline: "40",
      effect: "10",
      mode: "relative",
      alpha: "0.05",
      power: "80",
    }).forEach(([k, v]) => form.set(k, v));
    const state = await calculatePlan({}, form);
    expect(state.error).toMatch(/could not accept these inputs/);
    expect(fetcher.mock.calls[0][1].body).toContain('"effect_mode":"relative"');
  });
  it("rejects invalid input without calling the backend", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await calculatePlan({}, new FormData())).error).toBeDefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
