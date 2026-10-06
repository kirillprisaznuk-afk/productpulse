"use server";
import { planExperiment } from "@/lib/api";
import type { components } from "@/types/api";
export type PlanningState = {
  result?: components["schemas"]["PlanningResponse"];
  error?: string;
};
export async function calculatePlan(
  _previous: PlanningState,
  form: FormData,
): Promise<PlanningState> {
  const baseline = Number(form.get("baseline")),
    effect = Number(form.get("effect")),
    alpha = Number(form.get("alpha")),
    power = Number(form.get("power")),
    mode = form.get("mode");
  if (
    ![baseline, effect, alpha, power].every(Number.isFinite) ||
    baseline <= 0 ||
    baseline >= 100 ||
    effect <= 0 ||
    effect > 100 ||
    ![0.01, 0.05, 0.1].includes(alpha) ||
    power <= 50 ||
    power > 99 ||
    (mode !== "absolute" && mode !== "relative")
  )
    return {
      error:
        "Enter a baseline between 0 and 100%, a positive effect, and power between 50 and 99%.",
    };
  try {
    return {
      result: await planExperiment({
        baseline_rate: baseline / 100,
        minimum_detectable_effect: effect / 100,
        effect_mode: mode,
        alpha: alpha as 0.01 | 0.05 | 0.1,
        target_power: power / 100,
      }),
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
