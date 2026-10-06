"use client";
import { useUrlSelection } from "@/lib/selection";
import { InsightList } from "@/components/insights";
import type { components } from "@/types/api";
import { count, percent, duration, label } from "@/lib/format";
import { EmptyState } from "@/components/states";
type Funnel = components["schemas"]["FunnelResponse"];
const stageNames: Record<string, string> = {
  landing_view: "Landing view",
  signup_completed: "Signup completed",
  onboarding_started: "Onboarding started",
  onboarding_completed: "Onboarding completed",
  core_action: "Core action",
  subscription_started: "Subscription started",
};
const stageName = (value: string) => stageNames[value] ?? label(value);
export function FunnelView({
  total,
  comparison,
  initialSegment = "all",
  query = "",
}: {
  total: Funnel;
  comparison: Funnel;
  initialSegment?: string;
  query?: string;
}) {
  const [selected, setSelected] = useUrlSelection("segment", initialSegment);
  const group =
    selected === "all"
      ? total.groups[0]
      : comparison.groups.find((item) => item.segment === selected);
  if (!total.period.fully_observed)
    return (
      <EmptyState title="Entry period unavailable">
        Choose a fully observed entry period. Partial funnels are not presented
        as complete results.
      </EmptyState>
    );
  const stages = group?.stages ?? [];
  const largestCount = [...stages]
    .filter((s) => s.drop_off_count != null)
    .sort((a, b) => b.drop_off_count! - a.drop_off_count!)[0];
  const largestRate = [...stages]
    .filter((s) => s.drop_off_rate != null)
    .sort((a, b) => b.drop_off_rate! - a.drop_off_rate!)[0];
  return (
    <>
      <section className="panel" aria-labelledby="funnel-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Conversion journey</p>
            <h2 id="funnel-title">The path to a paid workspace</h2>
            <p>
              Entrants in the selected period, followed through 30 June 2025.
            </p>
          </div>
          <label className="segment-picker">
            View segment
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="all">All users</option>
              {comparison.groups.map((item) => (
                <option key={item.segment} value={item.segment}>
                  {label(item.segment)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!stages.length || stages[0].users === 0 ? (
          <EmptyState>
            No funnel entrants for this selection. Try another segment or date
            range.
          </EmptyState>
        ) : (
          <>
            <div className="table-scroll">
              <table className="funnel-table">
                <caption className="sr-only">
                  Ordered funnel for{" "}
                  {selected === "all" ? "all users" : label(selected)}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Funnel stage</th>
                    <th scope="col">Users</th>
                    <th scope="col">Step conversion</th>
                    <th scope="col">Cumulative</th>
                    <th scope="col">Drop-off</th>
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage, index) => (
                    <tr
                      key={stage.event_name}
                      className={stage === largestCount ? "highlight-row" : ""}
                    >
                      <th scope="row">
                        <div className="stage-label">
                          <span className="stage-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {stageName(stage.event_name)}
                        </div>
                        <div className="funnel-track" aria-hidden="true">
                          <span
                            style={{
                              width: `${(stage.cumulative_conversion ?? 0) * 100}%`,
                            }}
                          />
                        </div>
                      </th>
                      <td className="funnel-count">{count(stage.users)}</td>
                      <td>{percent(stage.conversion_from_previous)}</td>
                      <td>{percent(stage.cumulative_conversion)}</td>
                      <td>
                        {count(stage.drop_off_count)}
                        <small>{percent(stage.drop_off_rate)}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dropoff-grid">
              <div>
                <span className="eyebrow">Largest absolute drop-off</span>
                <p>
                  {largestCount
                    ? stageName(largestCount.event_name)
                    : "Unavailable"}
                </p>
                <strong>{count(largestCount?.drop_off_count)} users</strong>
                <span className="muted"> did not reach this stage</span>
              </div>
              <div>
                <span className="eyebrow">Largest proportional drop-off</span>
                <p>
                  {largestRate
                    ? stageName(largestRate.event_name)
                    : "Unavailable"}
                </p>
                <strong>{percent(largestRate?.drop_off_rate)}</strong>
                <span className="muted"> of the preceding stage</span>
              </div>
            </div>
          </>
        )}
        <p className="panel-note">
          Steps require strict chronological order. Recent entrants have less
          follow-up; these are observed funnel rates, not mature conversion
          probabilities.
        </p>
      </section>
      {group && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Time to progress</p>
              <h2>Median journey durations</h2>
              <p>Among users reaching both stages.</p>
            </div>
          </div>
          <dl className="stat-strip">
            <div>
              <dt>Signup → onboarding complete</dt>
              <dd>{duration(group.median_signup_to_onboarding_seconds)}</dd>
            </div>
            <div>
              <dt>Signup → core action</dt>
              <dd>{duration(group.median_signup_to_core_action_seconds)}</dd>
            </div>
            <div>
              <dt>Core action → paid</dt>
              <dd>{duration(group.median_core_action_to_paid_seconds)}</dd>
            </div>
          </dl>
          <InsightList
            title="Journey signals"
            query={query}
            items={group.insights?.filter((i) => i.rule === "funnel.slowest")}
            limit={1}
            empty="No stage transition met the minimum sample and duration thresholds."
          />
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Segment comparison</p>
            <h2>{label(comparison.dimension ?? "acquisition_channel")}</h2>
            <p>One consistent ordered journey, compared across segments.</p>
          </div>
        </div>
        <InsightList
          title="Segment differences"
          query={query}
          items={comparison.insights}
          limit={1}
        />
        {!comparison.groups.length ? (
          <EmptyState>No segment entrants in this period.</EmptyState>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Funnel segment comparison</caption>
              <thead>
                <tr>
                  <th scope="col">Segment</th>
                  <th scope="col">Entrants</th>
                  <th scope="col">Reached core action</th>
                  <th scope="col">Reached paid</th>
                  <th scope="col">End-to-end conversion</th>
                </tr>
              </thead>
              <tbody>
                {comparison.groups.map((item) => (
                  <tr key={item.segment}>
                    <th scope="row">{label(item.segment)}</th>
                    <td>{count(item.stages[0]?.users)}</td>
                    <td>
                      {count(
                        item.stages.find((s) => s.event_name === "core_action")
                          ?.users,
                      )}
                    </td>
                    <td>
                      {count(
                        item.stages.find(
                          (s) => s.event_name === "subscription_started",
                        )?.users,
                      )}
                    </td>
                    <td>
                      {percent(item.stages.at(-1)?.cumulative_conversion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
