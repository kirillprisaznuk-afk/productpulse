from app.analytics.activation import activation_groups
from app.analytics.contracts import (
    ActivationRow,
    Dimension,
    MonetizationValues,
    Period,
    SegmentRow,
    SegmentsResponse,
)
from app.analytics.insights import segment_findings
from app.analytics.monetization import monetization_groups


def segments(session, query):
    if query.dimension is None:
        query = query.model_copy(update={"dimension": Dimension.acquisition_channel})
    activations = {row.segment: row for row in activation_groups(session, query)}
    money = monetization_groups(session, query)
    groups = []
    for segment in sorted(activations.keys() | money.keys()):
        values = money.get(segment)
        if values is None:
            empty = dict.fromkeys(MonetizationValues.model_fields, 0)
            for key in ("paid_conversion_rate", "arpu", "churn_rate"):
                empty[key] = None
            values = MonetizationValues(**(empty if query.complete else dict.fromkeys(empty)))
        activation = activations.get(segment) or ActivationRow(
            segment=segment,
            completed_signups=0,
            eligible_users=0,
            censored_users=0,
            activated_users=0,
            activation_rate=None,
            median_activation_seconds=None,
        )
        groups.append(SegmentRow(segment=segment, activation=activation, monetization=values))
    return SegmentsResponse(
        period=Period.from_query(query),
        dimension=query.dimension,
        groups=groups,
        insights=segment_findings(groups),
    )
