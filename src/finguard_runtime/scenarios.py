"""Arithmetic only; no measured PD, recoveries, model readiness or lending action."""

import math
from .contracts import DataValidationError


def expected_loss(probability, lgd, ead, *, unit="NTD"):
    values = (probability, lgd, ead)
    if (
        unit != "NTD"
        or any(
            isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
            for v in values
        )
        or not 0 <= probability <= 1
        or not 0 <= lgd <= 1
        or ead < 0
    ):
        raise DataValidationError("Invalid explicit hypothetical assumptions")
    amount = probability * lgd * ead
    if not math.isfinite(amount):
        raise DataValidationError("Nonfinite hypothetical loss")
    return dict(amount=amount, unit=unit)
