"""Strict, named single-transaction request and typed public responses."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, create_model

from finguard_runtime.fraud import FEATURES

FiniteNumber = Annotated[float, Field(strict=True, allow_inf_nan=False)]
NonnegativeNumber = Annotated[float, Field(strict=True, allow_inf_nan=False, ge=0)]

# Generate named OpenAPI properties from the package's canonical feature contract.
FraudScoreRequest = create_model(
    "FraudScoreRequest",
    __config__=ConfigDict(extra="forbid"),
    **{name: (NonnegativeNumber if name == "Amount" else FiniteNumber, ...) for name in FEATURES},
)


class ThresholdMetadata(BaseModel):
    version: str
    review: float
    decline: float
    equality: str


class ExportProvenance(BaseModel):
    portable_release_id: str
    portable_manifest_sha256: str
    native_model_sha256: str


class ModelInfo(ExportProvenance):
    model_version: str
    policy_version: str
    feature_schema_version: str
    required_features: list[str]
    model_family: Literal["LightGBM"] = "LightGBM"
    model_sha256: str
    policy_sha256: str
    thresholds: ThresholdMetadata
    score_limitation: str
    service_scope: str
    dataset_scope: str
    evaluation_scope: str


class ScoreResponse(ExportProvenance):
    raw_score: Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
    action: Literal["approve", "review", "decline"]
    model_version: str
    policy_version: str
    feature_schema_version: str
    model_sha256: str
    policy_sha256: str
    thresholds: ThresholdMetadata
    score_limitation: str
    service_scope: str


class HealthResponse(BaseModel):
    status: Literal["alive", "ready"]
