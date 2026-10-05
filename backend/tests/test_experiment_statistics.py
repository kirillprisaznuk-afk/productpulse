import json
from math import ceil
from pathlib import Path

import pytest

from app.experiments.contracts import AnalysisQuery, ExperimentMetadata, PlanningRequest
from app.experiments.power import minimum_detectable_effect, plan, sample_size_raw
from app.experiments.service import analyse_aggregates
from app.experiments.statistics import (
    difference_interval,
    proportion_test,
    sample_ratio_mismatch,
    wilson,
)
from tests.analytics_fixture import at

REFERENCE = json.loads((Path(__file__).parent / "fixtures/statistical_references.json").read_text())
META = ExperimentMetadata(
    id=1,
    name="Test",
    description="Synthetic",
    status="completed",
    primary_metric="activation_within_7_days",
    started_at=at("2025-01-01"),
    ended_at=at("2025-02-01"),
)


def aggregate(cc, cn, tc, tn, query=None):
    return analyse_aggregates(
        META,
        [
            dict(variant=variant, assigned=n, mature=n, censored=0, invalid=0, conversions=x)
            for variant, x, n in [("control", cc, cn), ("treatment", tc, tn)]
        ],
        query or AnalysisQuery(),
    )


@pytest.mark.parametrize("case", REFERENCE["inference"])
def test_independent_inference_reference(case):
    counts = [
        case[k] for k in ("control_successes", "control_n", "treatment_successes", "treatment_n")
    ]
    result = proportion_test(*counts)
    assert result.confidence_interval.lower == pytest.approx(case["lower"], abs=1e-12)
    assert result.confidence_interval.upper == pytest.approx(case["upper"], abs=1e-12)
    if case["p"] is not None:
        assert result.p_value == pytest.approx(case["p"], abs=1e-12)
        assert result.test_statistic == pytest.approx(case["z"], abs=1e-12)
    else:
        assert result.p_value is result.significant is None
        assert not result.approximation_valid


@pytest.mark.parametrize("case", REFERENCE["sample_size"])
def test_independent_sample_size_reference(case):
    raw = sample_size_raw(case["baseline"], case["delta"], case["alpha"], case["target_power"])
    assert raw == pytest.approx(case["raw_n"], rel=1e-12)
    result = plan(
        PlanningRequest(
            baseline_rate=case["baseline"],
            minimum_detectable_effect=case["delta"],
            alpha=case["alpha"],
            target_power=case["target_power"],
        )
    )
    assert result.required_sample_per_variant == ceil(case["raw_n"])
    assert result.required_total_sample == 2 * result.required_sample_per_variant


@pytest.mark.parametrize("case", REFERENCE["mde"])
def test_independent_mde_root_reference(case):
    result = minimum_detectable_effect(case["baseline"], case["n"])
    assert result.absolute_mde == pytest.approx(case["absolute_mde"], abs=1e-12)
    assert sample_size_raw(case["baseline"], result.absolute_mde) == pytest.approx(
        case["n"], rel=1e-12
    )


@pytest.mark.parametrize("case", REFERENCE["srm"])
def test_independent_srm_reference(case):
    result = sample_ratio_mismatch(case["control"], case["treatment"])
    assert result.chi_square == pytest.approx(case["statistic"], abs=1e-12)
    assert result.p_value == pytest.approx(case["p"], rel=1e-11, abs=1e-300)


@pytest.mark.parametrize(
    "counts,state",
    [
        ((100, 1000, 140, 1000), "POSITIVE_SIGNIFICANT"),
        ((20, 100, 22, 100), "NO_SIGNIFICANT_DIFFERENCE"),
        ((140, 1000, 100, 1000), "NEGATIVE_SIGNIFICANT"),
        ((100, 1000, 100, 1000), "NO_SIGNIFICANT_DIFFERENCE"),
        ((0, 100, 0, 100), "INSUFFICIENT_DATA"),
        ((0, 0, 0, 0), "INSUFFICIENT_DATA"),
        ((90, 900, 14, 100), "DATA_QUALITY_WARNING"),
    ],
)
def test_decision_states(counts, state):
    result = aggregate(*counts)
    assert result.decision.state == state
    assert result.decision.rollout_recommended is False
    assert result.power.observed_power_calculated is False


def test_product_threshold_is_separate_from_significance():
    result = aggregate(100, 1000, 140, 1000, AnalysisQuery(practical_threshold=0.05))
    assert result.inference.significant
    assert not result.effect.exceeds_practical_threshold
    assert result.power.sufficient_for_configured_threshold
    # A smaller target effect is harder to detect, even though the observed uplift exceeds it.
    smaller = aggregate(100, 1000, 140, 1000, AnalysisQuery(practical_threshold=0.02))
    assert smaller.effect.exceeds_practical_threshold
    assert not smaller.power.sufficient_for_configured_threshold
    assert result.decision.state == "POSITIVE_SIGNIFICANT"


def test_undefined_and_extreme_values():
    assert difference_interval(0, 0, 1, 10) is None
    assert aggregate(0, 100, 20, 100).effect.relative_uplift is None
    assert minimum_detectable_effect(0, 100).absolute_mde is None
    assert minimum_detectable_effect(1, 100).absolute_mde is None
    assert minimum_detectable_effect(0.5, 1).absolute_mde is None
    assert sample_ratio_mismatch(1, 1).p_value is None
    with pytest.raises(ValueError):
        proportion_test(11, 10, 0, 10)
    with pytest.raises(ValueError):
        wilson(0, 0)
    with pytest.raises(ValueError):
        sample_size_raw(0.9, 0.2)


def test_relative_planning_and_monotonic_sensitivity():
    assert plan(
        PlanningRequest(baseline_rate=0.1, minimum_detectable_effect=0.2, effect_mode="relative")
    ).absolute_mde == pytest.approx(0.02)
    assert (
        minimum_detectable_effect(0.1, 2000).absolute_mde
        < minimum_detectable_effect(0.1, 1000).absolute_mde
    )
    assert sample_size_raw(0.1, 0.02, 0.01) > sample_size_raw(0.1, 0.02, 0.05)


def test_incomplete_horizon_preserves_nominal_test_but_blocks_final_decision():
    result = aggregate(100, 1000, 140, 1000, AnalysisQuery(as_of="2025-02-02"))
    assert result.inference.significant
    assert not result.inference.valid_for_decision
    assert result.decision.state == "POSITIVE_SIGNIFICANT"
    assert result.decision.next_action == "collect_mature_data"
    assert not result.decision.rollout_recommended
