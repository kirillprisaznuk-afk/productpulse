"use client";
import { useActionState } from "react";
import { calculatePlan } from "@/app/experiments/actions";
import { count, percent, points } from "@/lib/format";
export function PlanningPanel() {
  const [state, action, pending] = useActionState(calculatePlan, {});
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Before the next experiment</p>
          <h2>Sample planning</h2>
          <p>
            Plan a positive effect with equal allocation and a fixed horizon.
          </p>
        </div>
      </div>
      <form className="filter-form planning-form" action={action}>
        <label>
          Baseline conversion (%)
          <input
            name="baseline"
            type="number"
            step="any"
            min="0.0001"
            max="99.9999"
            required
            placeholder="e.g. 40"
          />
        </label>
        <label>
          Minimum detectable effect
          <input
            name="effect"
            type="number"
            step="any"
            min="0.0001"
            max="100"
            required
            placeholder="e.g. 3"
          />
        </label>
        <label>
          Effect units
          <select name="mode">
            <option value="absolute">Absolute (percentage points)</option>
            <option value="relative">Relative (%)</option>
          </select>
        </label>
        <label>
          Alpha
          <select name="alpha" defaultValue="0.05">
            <option value="0.01">0.01</option>
            <option value="0.05">0.05</option>
            <option value="0.1">0.10</option>
          </select>
        </label>
        <label>
          Target power (%)
          <input
            name="power"
            type="number"
            step="any"
            min="50.01"
            max="99"
            defaultValue="80"
            required
          />
        </label>
        <button className="button" disabled={pending}>
          {pending ? "Calculating…" : "Calculate sample"}
        </button>
      </form>
      <div aria-live="polite" aria-busy={pending}>
        {state.error && (
          <p className="notice" role="alert">
            {state.error}
          </p>
        )}
        {state.result && (
          <>
            <dl className="stat-strip">
              <div>
                <dt>Required per variant</dt>
                <dd>{count(state.result.required_sample_per_variant)}</dd>
              </div>
              <div>
                <dt>Total sample</dt>
                <dd>{count(state.result.required_total_sample)}</dd>
              </div>
              <div>
                <dt>Absolute MDE</dt>
                <dd>{points(state.result.absolute_mde)}</dd>
              </div>
              <div>
                <dt>Relative MDE</dt>
                <dd>{percent(state.result.relative_mde)}</dd>
              </div>
            </dl>
            <p className="panel-note">
              Baseline {percent(state.result.baseline_rate)} · target power{" "}
              {percent(state.result.target_power)} · α {state.result.alpha}.{" "}
              {state.result.assumptions} Results describe the last submitted
              inputs.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
