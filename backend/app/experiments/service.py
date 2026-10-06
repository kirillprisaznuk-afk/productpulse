from datetime import timedelta
from math import ceil

from app.experiments import power, queries, statistics
from app.experiments.contracts import (
    Decision,
    Effect,
    ExperimentAnalysis,
    ExperimentList,
    ExperimentListItem,
    ExperimentMetadata,
    ExperimentWorkspace,
    Health,
    Population,
    Sensitivity,
    VariantResult,
)


def experiment_list(session, query):
    return ExperimentList(
        as_of=query.as_of,
        experiments=[
            ExperimentListItem(
                **row, assignment_counts={"control": row["control"], "treatment": row["treatment"]}
            )
            for row in queries.list_rows(session, query)
        ],
    )


def workspace(session, query):
    """Two aggregate queries for the register and all evidence, not one request per row."""
    register = experiment_list(session, query)
    grouped = {}
    for row in queries.population(session, query, None):
        grouped.setdefault(row["experiment_id"], []).append(row)
    return ExperimentWorkspace(
        listing=register,
        analyses=[
            analyse_aggregates(
                ExperimentMetadata(**item.model_dump()), grouped.get(item.id, []), query
            )
            for item in register.experiments
            if item.primary_metric == "activation_within_7_days"
        ],
    )


def decision(inference, effect, data_warning, horizon_complete):
    if data_warning:
        state, action = "DATA_QUALITY_WARNING", "review_data_quality"
    elif not inference.approximation_valid:
        state, action = "INSUFFICIENT_DATA", "collect_mature_data"
    elif inference.significant:
        if effect.absolute_uplift > 0:
            state, action = "POSITIVE_SIGNIFICANT", "review_product_relevance"
        else:
            state, action = "NEGATIVE_SIGNIFICANT", "review_potential_harm"
    else:
        state, action = "NO_SIGNIFICANT_DIFFERENCE", "no_rollout_evidence"
    if not horizon_complete and state in ("POSITIVE_SIGNIFICANT", "NO_SIGNIFICANT_DIFFERENCE"):
        action = "collect_mature_data"
    if effect.absolute_uplift is None:
        description = "A mature conversion difference is unavailable because an arm is empty."
    else:
        description = (
            f"Observed treatment minus control activation is {effect.absolute_uplift * 100:.4f} "
            "percentage points."
        )
    if data_warning:
        description += " Data-quality warnings prevent using this snapshot for a product decision."
    elif inference.p_value is None:
        description += " Mature counts do not support the normal-approximation test."
    else:
        label = "significant" if inference.significant else "not significant"
        description += f" The two-sided test is {label} at alpha {inference.alpha}."
        ci = inference.confidence_interval
        description += " The effect interval " + (
            "includes zero." if ci.lower <= 0 <= ci.upper else "excludes zero."
        )
    if effect.practical_threshold is None:
        description += " No business-relevance threshold was configured."
    else:
        description += (
            " The observed effect "
            + ("meets" if effect.exceeds_practical_threshold else "does not meet")
            + " the configured relevance threshold; this is not proof of practical benefit."
        )
    if not horizon_complete:
        description += " Enrollment plus seven-day follow-up is not fully observed."
    return Decision(state=state, interpretation=description, next_action=action)


def analyse_aggregates(metadata, aggregates, query):
    """Only two population aggregates enter statistical computation; never raw user rows."""
    variants = []
    for variant in ("control", "treatment"):
        row = next((row for row in aggregates if row["variant"] == variant), {})
        counts = {
            name: row.get(name, 0)
            for name in ("assigned", "mature", "censored", "invalid", "conversions")
        }
        variants.append(
            VariantResult(
                variant=variant,
                **counts,
                conversion_rate=counts["conversions"] / counts["mature"]
                if counts["mature"]
                else None,
            )
        )
    control, treatment = variants
    totals = {
        name: sum(getattr(v, name) for v in variants)
        for name in ("assigned", "mature", "censored", "invalid")
    }
    valid = totals["mature"] + totals["censored"]
    cutoff = queries.params(query)["cutoff"]
    horizon_complete = metadata.ended_at + timedelta(days=7) <= cutoff
    population = Population(
        **totals,
        valid=valid,
        horizon_fully_observed=horizon_complete,
        maturity_fraction=totals["mature"] / valid if valid else None,
    )
    difference = (
        treatment.conversion_rate - control.conversion_rate
        if control.conversion_rate is not None and treatment.conversion_rate is not None
        else None
    )
    effect = Effect(
        absolute_uplift=difference,
        relative_uplift=difference / control.conversion_rate
        if difference is not None and control.conversion_rate
        else None,
        practical_threshold=query.practical_threshold,
        exceeds_practical_threshold=difference >= query.practical_threshold
        if difference is not None and query.practical_threshold is not None
        else None,
    )
    inference = statistics.proportion_test(
        control.conversions, control.mature, treatment.conversions, treatment.mature, query.alpha
    )
    srm = statistics.sample_ratio_mismatch(control.assigned, treatment.assigned)
    diagnostics = {
        key: sum(row.get(key, 0) for row in aggregates)
        for key in (
            "invalid_assignment_timing",
            "missing_or_mismatched_signup",
            "pre_assignment_outcomes",
        )
    }
    data_warning = bool(totals["invalid"] or srm.warning)
    warnings = []
    if totals["invalid"]:
        warnings.append(
            "Invalid records are excluded descriptively; primary inference is withheld."
        )
        inference = inference.model_copy(
            update={
                "test_statistic": None,
                "p_value": None,
                "significant": None,
                "confidence_interval": None,
                "valid_for_decision": False,
                "unavailable_reason": "Invalid experiment data",
            }
        )
    if srm.warning:
        warnings.append("Assignment allocation differs from 50/50 at SRM alpha 0.01; investigate.")
        inference.valid_for_decision = False
    if srm.p_value is None:
        warnings.append("Too few assignments for the chi-square allocation check.")
    if totals["censored"]:
        warnings.append("Immature users are excluded regardless of observed success.")
    if not horizon_complete:
        warnings.append("Snapshot precedes the end of enrollment plus seven-day follow-up.")
        inference.valid_for_decision = False
    if not inference.approximation_valid:
        warnings.append(
            "Insufficient expected successes/failures for normal-approximation inference."
        )
    health = Health(
        status="warning"
        if data_warning
        else "insufficient_data"
        if not inference.approximation_valid
        else "warning"
        if warnings
        else "healthy",
        srm=srm,
        data_valid=not totals["invalid"],
        measurement_window_valid=not totals["invalid"],
        warnings=warnings,
        **diagnostics,
    )
    per_arm = min(control.mature, treatment.mature)
    current_mde = power.minimum_detectable_effect(
        control.conversion_rate, per_arm, query.alpha, query.target_power
    )
    required = None
    if query.practical_threshold is not None and control.conversion_rate is not None:
        baseline = control.conversion_rate
        if 0 < baseline < 1 and baseline + query.practical_threshold <= 1:
            required = ceil(
                power.sample_size_raw(
                    baseline, query.practical_threshold, query.alpha, query.target_power
                )
            )
    sensitivity = Sensitivity(
        current_mde=current_mde,
        required_sample_per_variant=required,
        sufficient_for_configured_threshold=per_arm >= required if required is not None else None,
    )
    return ExperimentAnalysis(
        as_of=query.as_of,
        metadata=metadata,
        population=population,
        variant_results=variants,
        effect=effect,
        inference=inference,
        health=health,
        power=sensitivity,
        decision=decision(inference, effect, data_warning, horizon_complete),
    )


def analysis(session, experiment_id, query):
    row = queries.metadata(session, experiment_id)
    if row is None:
        raise LookupError("Experiment not found")
    if row["primary_metric"] != "activation_within_7_days":
        raise ValueError("Only the declared activation_within_7_days primary metric is supported")
    return analyse_aggregates(
        ExperimentMetadata(**row), queries.population(session, query, experiment_id), query
    )
