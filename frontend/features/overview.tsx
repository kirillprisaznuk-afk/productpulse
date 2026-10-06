import Link from "next/link";
import type { components } from "@/types/api";
import { Metric } from "@/components/metric";
import { EmptyState } from "@/components/states";
import { count, currency, percent, duration, label, date } from "@/lib/format";
import { shiftDay } from "@/lib/context";
import { ActivityChart } from "./activity-chart";
type Schemas = components["schemas"];
export type OverviewData = {
  overview: Schemas["OverviewResponse"];
  activity: Schemas["ActivityResponse"];
  activation: Schemas["ActivationResponse"];
  segments: Schemas["SegmentsResponse"];
  monetization: Schemas["MonetizationResponse"];
};
export function Overview({ data }: { data: OverviewData }) {
  const metrics = data.overview.metrics;
  const activation = data.activation.groups[0];
  const money = data.monetization.current;
  const kpis = [
    {
      key: "dau",
      name: "Daily active users",
      note: "At period end",
      kind: "count",
    },
    {
      key: "wau",
      name: "Weekly active users",
      note: "Rolling 7-day window",
      kind: "count",
    },
    {
      key: "mau",
      name: "Monthly active users",
      note: "Rolling 30-day window",
      kind: "count",
    },
    {
      key: "dau_mau",
      name: "DAU / MAU",
      note: "Daily engagement · stickiness",
      kind: "rate",
    },
    {
      key: "activation_rate",
      name: "Activation rate",
      note: "Mature 7-day signup cohorts",
      kind: "rate",
    },
    {
      key: "paid_conversion_rate",
      name: "Paid conversion",
      note:
        money.eligible_accounts === 0
          ? "No accounts with 30-day follow-up"
          : "Mature accounts · within 30 days",
      kind: "rate",
    },
    {
      key: "mrr",
      name: "Monthly recurring revenue",
      note: "Active contracts · USD",
      kind: "currency",
    },
    {
      key: "churn_rate",
      name: "Subscription churn",
      note: "Share of opening subscriptions",
      kind: "rate",
    },
  ] as const;
  return (
    <>
      <div className="section-intro">
        <h2>Product health</h2>
        <p>
          Compared with {date(data.overview.previous_period.start_date)} –{" "}
          {date(shiftDay(data.overview.previous_period.end_date, -1))}
        </p>
      </div>
      {!data.overview.period.fully_observed && (
        <p className="notice">
          This period is not fully observed. Unavailable values are shown as a
          dash.
        </p>
      )}
      <section className="kpi-grid" aria-label="Key performance indicators">
        {kpis.map((item) => (
          <Metric
            key={item.key}
            name={item.name}
            kind={item.kind}
            note={item.note}
            value={metrics[item.key]}
          />
        ))}
      </section>
      <ActivityChart data={data.activity} />
      <section className="panel" aria-labelledby="activation-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Activation</p>
            <h2 id="activation-title">From signup to first value</h2>
            <p>First core action within seven days of completed signup.</p>
          </div>
          <Link href="/methodology#activation" className="text-link">
            Metric definition ↗
          </Link>
        </div>
        {!activation || activation.completed_signups === 0 ? (
          <EmptyState>
            No completed signups in this period. Try a wider date range.
          </EmptyState>
        ) : (
          <>
            <dl className="stat-strip">
              <div>
                <dt>Activation rate</dt>
                <dd>{percent(activation.activation_rate)}</dd>
              </div>
              <div>
                <dt>Eligible users</dt>
                <dd>{count(activation.eligible_users)}</dd>
              </div>
              <div>
                <dt>Activated users</dt>
                <dd>{count(activation.activated_users)}</dd>
              </div>
              <div>
                <dt>Median time to activation</dt>
                <dd>{duration(activation.median_activation_seconds)}</dd>
              </div>
            </dl>
            <p className="panel-note">
              {count(activation.censored_users)} recent signups excluded until
              their full seven-day window is observable. Medians describe
              activated users only.
            </p>
          </>
        )}
      </section>
      <section className="panel" aria-labelledby="acquisition-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Acquisition quality</p>
            <h2 id="acquisition-title">Which channels bring engaged users?</h2>
            <p>Signup volume and mature conversion, by acquisition channel.</p>
          </div>
          <span className="small-label">User → account outcomes</span>
        </div>
        {!data.segments.groups.length ? (
          <EmptyState>No channel data for this period.</EmptyState>
        ) : (
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                Acquisition channel performance
              </caption>
              <thead>
                <tr>
                  <th scope="col">Channel</th>
                  <th scope="col">Completed signups</th>
                  <th scope="col">Eligible users</th>
                  <th scope="col">Activation rate</th>
                  <th scope="col">Paid conversion</th>
                </tr>
              </thead>
              <tbody>
                {[...data.segments.groups]
                  .sort(
                    (a, b) =>
                      b.activation.completed_signups -
                      a.activation.completed_signups,
                  )
                  .map((row) => (
                    <tr key={row.segment}>
                      <th scope="row">
                        <span className="channel-mark" aria-hidden="true" />
                        {label(row.segment)}
                      </th>
                      <td>{count(row.activation.completed_signups)}</td>
                      <td>{count(row.activation.eligible_users)}</td>
                      <td>
                        <div className="rate-cell">
                          <span className="mini-track" aria-hidden="true">
                            <span
                              style={{
                                width: `${(row.activation.activation_rate ?? 0) * 100}%`,
                              }}
                            />
                          </span>
                          {percent(row.activation.activation_rate)}
                        </div>
                      </td>
                      <td>{percent(row.monetization.paid_conversion_rate)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="panel-note">
          Paid conversion is account-level, attributed to the earliest member’s
          channel. A dash means unavailable, including incomplete 30-day
          follow-up.
        </p>
      </section>
      <section className="panel" aria-labelledby="monetization-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Monetization</p>
            <h2 id="monetization-title">Revenue at a glance</h2>
            <p>Account contracts at period end. All amounts in USD.</p>
          </div>
        </div>
        <dl className="stat-strip money-strip">
          <div>
            <dt>MRR</dt>
            <dd>{currency(money.mrr)}</dd>
          </div>
          <div>
            <dt>ARPU · per account</dt>
            <dd>{currency(money.arpu)}</dd>
          </div>
          <div>
            <dt>Active subscriptions</dt>
            <dd>{count(money.active_subscriptions)}</dd>
          </div>
          <div>
            <dt>New MRR</dt>
            <dd>{currency(money.new_mrr)}</dd>
          </div>
          <div>
            <dt>Churned MRR</dt>
            <dd>{currency(money.churned_mrr)}</dd>
          </div>
        </dl>
        <p className="panel-note">
          New and churned MRR are flows within the selected period; ARPU
          includes free accounts.
        </p>
      </section>
    </>
  );
}
