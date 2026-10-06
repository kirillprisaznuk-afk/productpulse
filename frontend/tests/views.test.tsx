import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Overview } from "@/features/overview";
import { FunnelView } from "@/features/funnels";
import { ComparisonText } from "@/components/metric";
import { ErrorState } from "@/components/states";
import { FilterBar } from "@/components/filter-bar";
import { parseContext } from "@/lib/context";
import { overviewData, funnel, segmentedFunnel, change } from "./fixtures";
describe("Overview", () => {
  it("renders supplied metrics and explains censored conversion", () => {
    render(<Overview data={overviewData} />);
    expect(
      screen.getByRole("heading", { name: "Product health" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Monthly active users: 120"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Paid conversion: Unavailable"),
    ).toHaveTextContent("—");
    expect(
      screen.getByText("No accounts with 30-day follow-up"),
    ).toBeInTheDocument();
    expect(screen.getByText(/20 recent signups excluded/)).toBeInTheDocument();
  });
  it("separates relative and percentage-point comparisons", () => {
    const { rerender } = render(<ComparisonText value={change} />);
    expect(screen.getByText("+20.0%")).toBeInTheDocument();
    rerender(
      <ComparisonText
        value={{ ...change, absolute_change: -0.018, direction: "down" }}
        rate
      />,
    );
    expect(screen.getByText("−1.8 pp")).toBeInTheDocument();
  });
  it("switches activity series with an accessible data alternative", async () => {
    render(<Overview data={overviewData} />);
    await userEvent.click(screen.getByRole("button", { name: "WAU" }));
    expect(screen.getByRole("button", { name: "WAU" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/WAU/);
    expect(screen.getByText("View activity data table")).toBeInTheDocument();
  });
  it("shows an honest empty activation state", () => {
    render(
      <Overview
        data={{
          ...overviewData,
          activation: { ...overviewData.activation, groups: [] },
        }}
      />,
    );
    expect(screen.getByText(/No completed signups/)).toBeInTheDocument();
  });
});
describe("Funnels", () => {
  it("resets edited date fields when a preset changes URL context", async () => {
    const { rerender } = render(
      <FilterBar context={parseContext({})} path="/funnels" segmentation />,
    );
    const input = screen.getByLabelText("From");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { value: "2025-05-01" } });
    rerender(
      <FilterBar
        context={parseContext({ start: "2025-01-01" })}
        path="/funnels"
        segmentation
      />,
    );
    expect(screen.getByLabelText("From")).toHaveValue("2025-01-01");
  });
  it("renders returned stage data and separate drop-off highlights", () => {
    render(<FunnelView total={funnel} comparison={segmentedFunnel} />);
    const table = screen.getByRole("table", {
      name: "Ordered funnel for all users",
    });
    const signup = within(table).getByRole("row", { name: /Signup completed/ });
    expect(within(signup).getAllByText("100.0%")).toHaveLength(2);
    expect(within(signup).getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("Largest absolute drop-off")).toBeInTheDocument();
    expect(
      screen.getByText("Largest proportional drop-off"),
    ).toBeInTheDocument();
    expect(screen.getByText("2.0 days")).toBeInTheDocument();
  });
  it("selects one segment without rendering multiple funnels", async () => {
    render(<FunnelView total={funnel} comparison={segmentedFunnel} />);
    await userEvent.selectOptions(
      screen.getByLabelText("View segment"),
      "referral",
    );
    expect(
      screen.getByRole("table", { name: "Ordered funnel for Referral" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Ordered funnel for all users" }),
    ).not.toBeInTheDocument();
  });
  it("provides the four supported dimension options", () => {
    render(
      <FilterBar context={parseContext({})} path="/funnels" segmentation />,
    );
    const select = screen.getByLabelText("Compare by");
    expect(within(select).getAllByRole("option")).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: /Apply filters/ }),
    ).toHaveAttribute("type", "submit");
  });
  it("handles empty and unavailable funnels", () => {
    const { rerender } = render(
      <FunnelView
        total={{ ...funnel, groups: [] }}
        comparison={{ ...segmentedFunnel, groups: [] }}
      />,
    );
    expect(screen.getByText(/No funnel entrants/)).toBeInTheDocument();
    rerender(
      <FunnelView
        total={{
          ...funnel,
          period: { ...funnel.period, fully_observed: false },
        }}
        comparison={segmentedFunnel}
      />,
    );
    expect(screen.getByText("Entry period unavailable")).toBeInTheDocument();
  });
});
it("shows a useful error with retry and reset", () => {
  render(
    <ErrorState
      message="Check that the ProductPulse API is running."
      retry="/funnels?start=2025-01-01"
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Check that the ProductPulse API is running.",
  );
  expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/funnels?start=2025-01-01",
  );
});
