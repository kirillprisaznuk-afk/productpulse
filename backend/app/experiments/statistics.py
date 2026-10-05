"""Two independent binomial samples; numerical primitives from Python's standard library."""

from math import erfc, sqrt
from statistics import NormalDist

from app.experiments.contracts import ConfidenceInterval, Inference, SRMResult


def validate_counts(conversions, users):
    if (
        not isinstance(users, int)
        or not isinstance(conversions, int)
        or not 0 <= conversions <= users
    ):
        raise ValueError("Require integer counts with 0 <= conversions <= users")


def wilson(successes, total, alpha=0.05):
    validate_counts(successes, total)
    if total == 0:
        raise ValueError("Wilson interval requires a nonempty sample")
    p = successes / total
    z = NormalDist().inv_cdf(1 - alpha / 2)
    scale = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / scale
    radius = z * sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / scale
    return max(0.0, centre - radius), min(1.0, centre + radius)


def difference_interval(control_successes, control_n, treatment_successes, treatment_n, alpha=0.05):
    if not control_n or not treatment_n:
        return None
    c, t = control_successes / control_n, treatment_successes / treatment_n
    cl, cu = wilson(control_successes, control_n, alpha)
    tl, tu = wilson(treatment_successes, treatment_n, alpha)
    return ConfidenceInterval(
        confidence_level=1 - alpha,
        point_estimate=t - c,
        lower=(t - c) - sqrt((t - tl) ** 2 + (cu - c) ** 2),
        upper=(t - c) + sqrt((tu - t) ** 2 + (c - cl) ** 2),
    )


def proportion_test(control_successes, control_n, treatment_successes, treatment_n, alpha=0.05):
    validate_counts(control_successes, control_n)
    validate_counts(treatment_successes, treatment_n)
    ci = difference_interval(control_successes, control_n, treatment_successes, treatment_n, alpha)
    result = Inference(
        alpha=alpha,
        test_statistic=None,
        p_value=None,
        significant=None,
        confidence_interval=ci,
        approximation_valid=False,
        valid_for_decision=False,
        unavailable_reason="Both variants need mature users",
    )
    if not control_n or not treatment_n:
        return result
    pooled = (control_successes + treatment_successes) / (control_n + treatment_n)
    # Explicit conservative normal-approximation gate, not a business-power claim.
    if (
        min(
            control_n * pooled,
            treatment_n * pooled,
            control_n * (1 - pooled),
            treatment_n * (1 - pooled),
        )
        < 10
    ):
        result.unavailable_reason = (
            "Normal approximation needs 10 expected successes and failures per arm"
        )
        return result
    difference = treatment_successes / treatment_n - control_successes / control_n
    z = difference / sqrt(pooled * (1 - pooled) * (1 / control_n + 1 / treatment_n))
    p = erfc(abs(z) / sqrt(2))
    return Inference(
        alpha=alpha,
        test_statistic=z,
        p_value=p,
        significant=p < alpha,
        confidence_interval=ci,
        approximation_valid=True,
        valid_for_decision=True,
        unavailable_reason=None,
    )


def sample_ratio_mismatch(control, treatment):
    validate_counts(0, control)
    validate_counts(0, treatment)
    total = control + treatment
    result = SRMResult(
        observed_counts={"control": control, "treatment": treatment},
        chi_square=None,
        p_value=None,
        warning=None,
    )
    if total < 10:  # expected count >= 5 in each cell
        return result
    expected = total / 2
    chi_square = ((control - expected) ** 2 + (treatment - expected) ** 2) / expected
    # Chi-square(1) survival is exactly the two-sided standard-normal tail at sqrt(chi-square).
    p = erfc(sqrt(chi_square / 2))
    return SRMResult(
        observed_counts=result.observed_counts,
        chi_square=chi_square,
        p_value=p,
        warning=p < result.threshold,
    )
