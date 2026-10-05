"""Approximate positive-MDE planning for equal-sized independent arms, not observed power."""

from math import ceil, sqrt
from statistics import NormalDist

from app.experiments.contracts import MDEResult, PlanningResponse


def sample_size_raw(baseline, absolute_mde, alpha=0.05, target_power=0.8):
    treatment = baseline + absolute_mde
    if not (
        0 < baseline < 1
        and 0 < absolute_mde
        and treatment <= 1
        and 0 < alpha < 1
        and 0.5 < target_power < 1
    ):
        raise ValueError("Invalid two-proportion planning inputs")
    pooled = (baseline + treatment) / 2
    z_alpha = NormalDist().inv_cdf(1 - alpha / 2)
    z_power = NormalDist().inv_cdf(target_power)
    numerator = z_alpha * sqrt(2 * pooled * (1 - pooled))
    numerator += z_power * sqrt(baseline * (1 - baseline) + treatment * (1 - treatment))
    return (numerator / absolute_mde) ** 2


def plan(request):
    n = ceil(
        sample_size_raw(
            request.baseline_rate, request.absolute_effect, request.alpha, request.target_power
        )
    )
    return PlanningResponse(
        baseline_rate=request.baseline_rate,
        treatment_rate=request.baseline_rate + request.absolute_effect,
        absolute_mde=request.absolute_effect,
        relative_mde=request.absolute_effect / request.baseline_rate,
        alpha=request.alpha,
        target_power=request.target_power,
        required_sample_per_variant=n,
        required_total_sample=2 * n,
    )


def minimum_detectable_effect(baseline, per_variant, alpha=0.05, target_power=0.8):
    result = MDEResult(
        baseline_rate=baseline,
        sample_size_per_variant=per_variant,
        alpha=alpha,
        target_power=target_power,
        absolute_mde=None,
        relative_mde=None,
    )
    if baseline is None or not 0 < baseline < 1 or per_variant < 1:
        result.unavailable_reason = (
            "Requires a baseline strictly between zero and one and nonempty arms"
        )
        return result
    upper = 1 - baseline
    if sample_size_raw(baseline, upper, alpha, target_power) > per_variant:
        result.unavailable_reason = (
            "No feasible positive effect reaches target power at this sample size"
        )
        return result
    lower = 0.0
    for _ in range(80):
        middle = (lower + upper) / 2
        if sample_size_raw(baseline, middle, alpha, target_power) > per_variant:
            lower = middle
        else:
            upper = middle
    result.absolute_mde = upper
    result.relative_mde = upper / baseline
    return result
