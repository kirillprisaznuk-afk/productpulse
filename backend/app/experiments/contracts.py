from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator

from app.analytics.contracts import OBSERVATION_END, OBSERVATION_START

Alpha = Annotated[
    Literal[0.01, 0.05, 0.1],
    BeforeValidator(lambda value: float(value) if isinstance(value, str) else value),
]
Variant = Literal["control", "treatment"]
DecisionState = Literal[
    "INSUFFICIENT_DATA",
    "POSITIVE_SIGNIFICANT",
    "NEGATIVE_SIGNIFICANT",
    "NO_SIGNIFICANT_DIFFERENCE",
    "DATA_QUALITY_WARNING",
]


class AnalysisQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    as_of: date = OBSERVATION_END
    alpha: Alpha = 0.05
    target_power: float = Field(default=0.8, gt=0.5, le=0.99)
    practical_threshold: float | None = Field(default=None, ge=0.000001, lt=1)

    @model_validator(mode="after")
    def observation_window(self):
        if not OBSERVATION_START <= self.as_of <= OBSERVATION_END:
            raise ValueError("as_of must be within the documented observation window")
        return self


class PlanningRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    baseline_rate: float = Field(gt=0, lt=1)
    minimum_detectable_effect: float = Field(ge=0.000001, le=1)
    effect_mode: Literal["absolute", "relative"] = "absolute"
    alpha: Alpha = 0.05
    target_power: float = Field(default=0.8, gt=0.5, le=0.99)

    @property
    def absolute_effect(self):
        return self.minimum_detectable_effect * (
            self.baseline_rate if self.effect_mode == "relative" else 1
        )

    @model_validator(mode="after")
    def feasible_effect(self):
        if self.baseline_rate + self.absolute_effect > 1 or self.absolute_effect < 1e-8:
            raise ValueError(
                "MDE must be at least 1e-8 absolute and treatment rate cannot exceed 1"
            )
        return self


class MDERequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    baseline_rate: float = Field(gt=0, lt=1)
    sample_size_per_variant: int = Field(ge=1, le=1_000_000_000, strict=True)
    alpha: Alpha = 0.05
    target_power: float = Field(default=0.8, gt=0.5, le=0.99)


class PlanningResponse(BaseModel):
    baseline_rate: float
    treatment_rate: float
    absolute_mde: float
    relative_mde: float
    alpha: float
    target_power: float
    required_sample_per_variant: int
    required_total_sample: int
    method: str = "equal_allocation_normal_approximation"
    assumptions: str = "Independent users, fixed horizon, positive effect, equal allocation."


class MDEResult(BaseModel):
    baseline_rate: float | None
    sample_size_per_variant: int
    alpha: float
    target_power: float
    absolute_mde: float | None
    relative_mde: float | None
    unavailable_reason: str | None = None
    method: str = "inverse_equal_allocation_normal_approximation"


class ExperimentMetadata(BaseModel):
    id: int
    name: str
    description: str
    status: str
    primary_metric: str
    started_at: datetime
    ended_at: datetime
    variants: list[Variant] = ["control", "treatment"]
    expected_allocation: dict[Variant, float] = {"control": 0.5, "treatment": 0.5}


class ExperimentListItem(ExperimentMetadata):
    assignment_counts: dict[Variant, int]


class ExperimentList(BaseModel):
    as_of: date
    experiments: list[ExperimentListItem]


class Population(BaseModel):
    assigned: int
    mature: int
    censored: int
    invalid: int
    valid: int
    maturity_fraction: float | None
    outcome_window_days: int = 7
    horizon_fully_observed: bool


class VariantResult(BaseModel):
    variant: Variant
    assigned: int
    mature: int
    censored: int
    invalid: int
    conversions: int
    conversion_rate: float | None


class Effect(BaseModel):
    absolute_uplift: float | None
    relative_uplift: float | None
    practical_threshold: float | None
    exceeds_practical_threshold: bool | None


class ConfidenceInterval(BaseModel):
    confidence_level: float
    lower: float
    point_estimate: float
    upper: float
    method: str = "newcombe_wilson_no_continuity_correction"


class Inference(BaseModel):
    method: str = "two_sided_pooled_two_proportion_z_test"
    null_hypothesis: str = "treatment_rate = control_rate"
    alternative_hypothesis: str = "treatment_rate != control_rate"
    alpha: float
    test_statistic: float | None
    p_value: float | None
    significant: bool | None
    confidence_interval: ConfidenceInterval | None
    approximation_valid: bool
    valid_for_decision: bool
    unavailable_reason: str | None


class SRMResult(BaseModel):
    expected_allocation: dict[Variant, float] = {"control": 0.5, "treatment": 0.5}
    observed_counts: dict[Variant, int]
    chi_square: float | None
    p_value: float | None
    threshold: float = 0.01
    warning: bool | None


class Health(BaseModel):
    status: Literal["healthy", "warning", "insufficient_data"]
    srm: SRMResult
    data_valid: bool
    measurement_window_valid: bool
    invalid_assignment_timing: int
    missing_or_mismatched_signup: int
    pre_assignment_outcomes: int
    warnings: list[str]


class Sensitivity(BaseModel):
    current_mde: MDEResult
    planning_baseline_source: str = "observed_mature_control_rate_for_sensitivity_only"
    required_sample_per_variant: int | None
    sufficient_for_configured_threshold: bool | None
    observed_power_calculated: bool = False


class Decision(BaseModel):
    state: DecisionState
    interpretation: str
    next_action: Literal[
        "review_data_quality",
        "collect_mature_data",
        "review_product_relevance",
        "review_potential_harm",
        "no_rollout_evidence",
    ]
    rollout_recommended: bool = False


class ExperimentAnalysis(BaseModel):
    as_of: date
    metadata: ExperimentMetadata
    population: Population
    variant_results: list[VariantResult]
    effect: Effect
    inference: Inference
    health: Health
    power: Sensitivity
    decision: Decision
    methodological_limitations: list[str] = [
        "Fixed-horizon snapshot inference; repeated peeking does not preserve nominal error rates.",
        "User-level independence is assumed; shared-account dependence is not adjusted.",
        "One primary metric per experiment; no joint correction across experiments.",
    ]


class ExperimentWorkspace(BaseModel):
    listing: ExperimentList
    analyses: list[ExperimentAnalysis]
