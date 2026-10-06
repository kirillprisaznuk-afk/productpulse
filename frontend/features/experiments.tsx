import Link from "next/link";
import type { components } from "@/types/api";
import { count, date, label, percent, points } from "@/lib/format";
import { EmptyState } from "@/components/states";
type Analysis = components["schemas"]["ExperimentAnalysis"];
type State = Analysis["decision"]["state"];
const states: Record<State, string> = {
  INSUFFICIENT_DATA: "Insufficient mature data",
  POSITIVE_SIGNIFICANT: "Positive evidence",
  NEGATIVE_SIGNIFICANT: "Negative evidence",
  NO_SIGNIFICANT_DIFFERENCE: "No significant difference",
  DATA_QUALITY_WARNING: "Data quality warning",
};
export function pvalue(value: number | null) {
  return value == null
    ? "—"
    : value === 0
      ? "< 1e-300"
      : value < 0.0001
        ? value.toExponential(2)
        : value.toFixed(4);
}
export function DecisionBadge({ state }: { state: State }) {
  return (
    <span className={`decision-badge decision-${state.toLowerCase()}`}>
      {states[state]}
    </span>
  );
}
export function ExperimentList({
  items,
  selected,
  decisions,
}: {
  items: components["schemas"]["ExperimentListItem"][];
  selected: number | undefined;
  decisions: Record<number, Analysis | undefined>;
}) {
  if (!items.length)
    return (
      <EmptyState title="No experiments">
        No experiments are available in this observation window.
      </EmptyState>
    );
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Experiment register</p>
          <h2>Experiments</h2>
          <p>Select an experiment to inspect its evidence.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Experiment list</caption>
          <thead>
            <tr>
              <th scope="col">Experiment / primary metric</th>
              <th scope="col">Status</th>
              <th scope="col">UTC window</th>
              <th scope="col">Assigned control / treatment</th>
              <th scope="col">Decision</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={item.id === selected ? "highlight-row" : undefined}
              >
                <th scope="row">
                  <Link
                    className="text-link"
                    prefetch={false}
                    href={`/experiments?experiment=${item.id}`}
                    aria-current={item.id === selected ? "true" : undefined}
                  >
                    {item.name}
                  </Link>
                  <small className="table-subtext">
                    {label(item.primary_metric)}
                  </small>
                </th>
                <td>{label(item.status)}</td>
                <td>
                  {date(item.started_at.slice(0, 10))} –{" "}
                  {date(item.ended_at.slice(0, 10))}
                </td>
                <td>
                  {count(item.assignment_counts.control)} /{" "}
                  {count(item.assignment_counts.treatment)}
                </td>
                <td>
                  {decisions[item.id] ? (
                    <DecisionBadge state={decisions[item.id]!.decision.state} />
                  ) : (
                    "Analysis unavailable"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function ConfidencePlot({
  interval,
}: {
  interval: components["schemas"]["ConfidenceInterval"] | null;
}) {
  if (!interval)
    return (
      <EmptyState title="Confidence interval unavailable">
        There is insufficient valid evidence to estimate an interval.
      </EmptyState>
    );
  const lo = Math.min(0, interval.lower),
    hi = Math.max(0, interval.upper),
    span = hi - lo || 0.01;
  const x = (v: number) => 65 + ((v - lo) / span) * 670;
  return (
    <div className="effect-chart">
      <svg
        viewBox="0 0 800 140"
        role="img"
        aria-label={`${percent(interval.confidence_level)} confidence interval: ${points(interval.lower)} to ${points(interval.upper)}; estimate ${points(interval.point_estimate)}. ${interval.lower <= 0 && interval.upper >= 0 ? "Includes zero" : "Excludes zero"}.`}
      >
        <line
          x1={x(0)}
          x2={x(0)}
          y1="12"
          y2="98"
          stroke="#78858c"
          strokeDasharray="4 4"
        />
        <text x={x(0)} y="120" textAnchor="middle">
          Zero effect
        </text>
        <line
          x1={x(interval.lower)}
          x2={x(interval.upper)}
          y1="52"
          y2="52"
          stroke="#256b61"
          strokeWidth="5"
        />
        <circle cx={x(interval.point_estimate)} cy="52" r="7" fill="#256b61" />
        <text x={x(interval.lower)} y="85" textAnchor="middle">
          {points(interval.lower)}
        </text>
        <text x={x(interval.upper)} y="85" textAnchor="middle">
          {points(interval.upper)}
        </text>
        <text x={x(interval.point_estimate)} y="25" textAnchor="middle">
          {points(interval.point_estimate)}
        </text>
      </svg>
      <p>
        {percent(interval.confidence_level)} confidence interval:{" "}
        {points(interval.lower)} to {points(interval.upper)}.{" "}
        {interval.lower <= 0 && interval.upper >= 0
          ? "Includes zero."
          : "Excludes zero."}
      </p>
    </div>
  );
}
export function ExperimentDetail({ data }: { data: Analysis }) {
  const { metadata, population, effect, inference, health, power, decision } =
    data;
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Selected experiment · {label(metadata.status)}
            </p>
            <h2>{metadata.name}</h2>
            <p>{metadata.description}</p>
          </div>
          <DecisionBadge state={decision.state} />
        </div>
        <p className="interpretation">{decision.interpretation}</p>
        {!inference.valid_for_decision && (
          <p className="notice">
            Decision limited: {label(decision.next_action)}.{" "}
            {inference.unavailable_reason ??
              (!population.horizon_fully_observed
                ? "Enrollment plus follow-up is not fully observed."
                : "Review the health diagnostics below.")}
          </p>
        )}
        <dl className="stat-strip">
          <div>
            <dt>Assigned users</dt>
            <dd>{count(population.assigned)}</dd>
          </div>
          <div>
            <dt>Mature users</dt>
            <dd>{count(population.mature)}</dd>
          </div>
          <div>
            <dt>Censored users</dt>
            <dd>{count(population.censored)}</dd>
          </div>
          <div>
            <dt>Invalid users</dt>
            <dd>{count(population.invalid)}</dd>
          </div>
        </dl>
        <p className="panel-note">
          Primary metric: {label(metadata.primary_metric)}.{" "}
          {population.outcome_window_days}-day outcome window. Snapshot cutoff{" "}
          {date(data.as_of)} (exclusive, UTC). Next action:{" "}
          {label(decision.next_action)}. Statistical evidence does not
          automatically recommend rollout.
        </p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mature primary outcome</p>
            <h2>Control vs treatment</h2>
            <p>
              Conversion rates use mature users; assigned and censored users
              remain visible.
            </p>
          </div>
        </div>
        <div className="variant-grid">
          {data.variant_results.map((v) => (
            <section
              className="variant-card"
              key={v.variant}
              aria-label={`${label(v.variant)} result`}
            >
              <h3>{label(v.variant)}</h3>
              <p className="metric-value">{percent(v.conversion_rate)}</p>
              <dl>
                <div>
                  <dt>Assigned</dt>
                  <dd>{count(v.assigned)}</dd>
                </div>
                <div>
                  <dt>Mature sample</dt>
                  <dd>{count(v.mature)}</dd>
                </div>
                <div>
                  <dt>Conversions</dt>
                  <dd>{count(v.conversions)}</dd>
                </div>
                <div>
                  <dt>Immature / censored</dt>
                  <dd>{count(v.censored)}</dd>
                </div>
                <div>
                  <dt>Invalid</dt>
                  <dd>{count(v.invalid)}</dd>
                </div>
              </dl>
            </section>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Treatment minus control</p>
            <h2>Effect and uncertainty</h2>
            <p>
              A confidence interval describes uncertainty around the absolute
              difference.
            </p>
          </div>
          <Link href="/methodology#inference" className="text-link">
            Statistical definitions ↗
          </Link>
        </div>
        <dl className="stat-strip">
          <div>
            <dt>Absolute uplift</dt>
            <dd>{points(effect.absolute_uplift)}</dd>
          </div>
          <div>
            <dt>Relative uplift</dt>
            <dd>
              {effect.relative_uplift == null
                ? "—"
                : `${effect.relative_uplift >= 0 ? "+" : ""}${percent(effect.relative_uplift)}`}
            </dd>
          </div>
          <div>
            <dt>p-value</dt>
            <dd>{pvalue(inference.p_value)}</dd>
          </div>
          <div>
            <dt>Alpha</dt>
            <dd>{inference.alpha}</dd>
          </div>
        </dl>
        <ConfidencePlot interval={inference.confidence_interval} />
        <p className="panel-note">
          {inference.significant == null
            ? "Significance unavailable"
            : inference.significant
              ? `Statistically significant at α = ${inference.alpha}`
              : "Not statistically significant"}
          .{" "}
          {inference.valid_for_decision
            ? "Inference valid for this snapshot."
            : "Inference is not valid for a decision."}{" "}
          {inference.unavailable_reason} The p-value measures incompatibility
          with equal rates under the test assumptions, not the probability the
          treatment works.
        </p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Transparent diagnostics</p>
            <h2>Experiment health</h2>
            <p>Health status: {label(health.status)}</p>
          </div>
        </div>
        {health.srm.warning && (
          <p className="notice" role="status">
            Observed traffic allocation differs materially from the expected
            split. This is a diagnostic warning, not proof of a pipeline defect.
          </p>
        )}
        <dl className="health-grid">
          <div>
            <dt>Expected allocation · control / treatment</dt>
            <dd>
              {percent(health.srm.expected_allocation.control)} /{" "}
              {percent(health.srm.expected_allocation.treatment)}
            </dd>
          </div>
          <div>
            <dt>Observed assignment counts · control / treatment</dt>
            <dd>
              {count(health.srm.observed_counts.control)} /{" "}
              {count(health.srm.observed_counts.treatment)}
            </dd>
          </div>
          <div>
            <dt>SRM p-value / threshold</dt>
            <dd>
              {pvalue(health.srm.p_value)} / {health.srm.threshold}
            </dd>
          </div>
          <div>
            <dt>Assignment balance</dt>
            <dd>
              {health.srm.warning == null
                ? "Unavailable"
                : health.srm.warning
                  ? "Allocation warning"
                  : "No SRM warning"}
            </dd>
          </div>
          <div>
            <dt>Mature share</dt>
            <dd>{percent(population.maturity_fraction)}</dd>
          </div>
          <div>
            <dt>Full horizon observed</dt>
            <dd>{population.horizon_fully_observed ? "Yes" : "Not yet"}</dd>
          </div>
          <div>
            <dt>Measurement window / data validity</dt>
            <dd>
              {health.measurement_window_valid ? "Valid" : "Invalid"} /{" "}
              {health.data_valid ? "Valid" : "Invalid"}
            </dd>
          </div>
          <div>
            <dt>Normal approximation</dt>
            <dd>{inference.approximation_valid ? "Valid" : "Not valid"}</dd>
          </div>
          <div>
            <dt>Invalid assignment timing</dt>
            <dd>{count(health.invalid_assignment_timing)}</dd>
          </div>
          <div>
            <dt>Missing / mismatched signup</dt>
            <dd>{count(health.missing_or_mismatched_signup)}</dd>
          </div>
          <div>
            <dt>Pre-assignment outcomes</dt>
            <dd>{count(health.pre_assignment_outcomes)}</dd>
          </div>
        </dl>
        {health.warnings.length > 0 && (
          <ul className="diagnostic-list">
            {health.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <p className="panel-note">
          SRM checks whether allocation differs materially from the expected
          split. Review measurement and maturity before interpreting
          significance.
        </p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sample sensitivity</p>
            <h2>Minimum detectable effect</h2>
            <p>
              The approximate positive effect detectable with the current sample
              at the stated target power.
            </p>
          </div>
        </div>
        <dl className="stat-strip">
          <div>
            <dt>Absolute MDE</dt>
            <dd>{points(power.current_mde.absolute_mde)}</dd>
          </div>
          <div>
            <dt>Relative MDE</dt>
            <dd>{percent(power.current_mde.relative_mde)}</dd>
          </div>
          <div>
            <dt>Target power</dt>
            <dd>{percent(power.current_mde.target_power)}</dd>
          </div>
          <div>
            <dt>Sample per variant used</dt>
            <dd>{count(power.current_mde.sample_size_per_variant)}</dd>
          </div>
        </dl>
        <p className="panel-note">
          {power.current_mde.unavailable_reason} Baseline:{" "}
          {percent(power.current_mde.baseline_rate)} (
          {label(power.planning_baseline_source)}). Required per variant for the
          configured threshold: {count(power.required_sample_per_variant)}.
          Sample sufficiency:{" "}
          {power.sufficient_for_configured_threshold == null
            ? "not configured or unavailable"
            : power.sufficient_for_configured_threshold
              ? "sufficient"
              : "insufficient"}
          . Sensitivity is not observed power or a rollout recommendation.
        </p>
      </section>
      <details className="panel data-details">
        <summary>Analysis limitations</summary>
        <ul className="diagnostic-list">
          {data.methodological_limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </>
  );
}
