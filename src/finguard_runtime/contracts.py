"""Inference-only numeric contracts and original model identity."""

import numpy as np
import pandas as pd

FRAUD_FEATURES = [*[f"V{i}" for i in range(1, 29)], "Amount"]
PAY_COLUMNS = ["PAY_0", "PAY_2", "PAY_3", "PAY_4", "PAY_5", "PAY_6"]
FINANCIAL = [
    "LIMIT_BAL",
    *[f"BILL_AMT{i}" for i in range(1, 7)],
    *[f"PAY_AMT{i}" for i in range(1, 7)],
]
CREDIT_FEATURES = ["LIMIT_BAL", *PAY_COLUMNS, *FINANCIAL[1:]]
VOCABULARY = {
    name: (
        [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8]
        if name in PAY_COLUMNS[:3]
        else [-2, -1, 0, 2, 3, 4, 5, 6, 7, 8]
    )
    for name in PAY_COLUMNS
}
CUTOFFS = [0.08854621846692612, 0.1229505392820923, 0.18302253339810232, 0.3416524669549628]
LABELS = [
    "Very low relative risk",
    "Low relative risk",
    "Medium relative risk",
    "High relative risk",
    "Very high relative risk",
]
REVIEW = 0.480177454887009
DECLINE = 0.9986654773731469


class DataValidationError(ValueError):
    """Sanitized domain contract violation."""


class UnsupportedCreditInput(DataValidationError):
    def __init__(self, fields):
        self.fields = tuple(fields)
        super().__init__("Unsupported repayment-status input")


def frame(values, *, credit=False):
    names = CREDIT_FEATURES if credit else FRAUD_FEATURES
    if set(values) != set(names):
        raise DataValidationError("Expected exactly the canonical predictor fields")
    if any(
        isinstance(v, (bool, np.bool_)) or not isinstance(v, (int, float, np.number))
        for v in values.values()
    ):
        raise DataValidationError("Finite numeric predictors are required")
    result = pd.DataFrame([values], columns=names, dtype=np.float64)
    if not np.isfinite(result.to_numpy()).all():
        raise DataValidationError("Finite numeric predictors are required")
    if credit:
        if (
            result.LIMIT_BAL.iloc[0] <= 0
            or (result[[f"PAY_AMT{i}" for i in range(1, 7)]] < 0).any().any()
        ):
            raise DataValidationError("Limit must be positive; payments nonnegative")
        if (result[PAY_COLUMNS].to_numpy() % 1 != 0).any():
            raise DataValidationError("Integer repayment codes required")
        unsupported = [name for name in PAY_COLUMNS if result[name].iloc[0] not in VOCABULARY[name]]
        if unsupported:
            raise UnsupportedCreditInput(unsupported)
    elif result.Amount.iloc[0] < 0:
        raise DataValidationError("Amount must be nonnegative")
    return result


# Serialized export metadata is typed and rejects undeclared fields.
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

Hash = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class PayloadMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    sha256: Hash
    size: Annotated[int, Field(ge=0, le=8 * 1024 * 1024)]


class ArtifactManifest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    schema_version: Literal[1]
    release_id: Literal["fraud-inference-v1", "credit-inference-v1"]
    module: Literal["fraud", "credit"]
    source_model_sha256: Hash
    source_application_commit: Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
    source_manifests: dict[str, Hash]
    source_versions: dict[str, str]
    runtime_versions: dict[str, str]
    exporter_sha256: Hash
    trees: Annotated[int, Field(gt=0)]
    transformed_features: list[str]
    positive_class: Literal[1]
    mode: Literal["raw"]
    payloads: dict[str, PayloadMetadata]
    distribution: Literal["PRIVATE; public redistribution not authorized"]
