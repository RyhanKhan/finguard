"""Single-observation credit HTTP contracts; no demographics, identifiers or outcomes."""

from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, create_model, field_validator

from backend.app.schemas import FiniteNumber, NonnegativeNumber
from finguard_runtime import credit

Probability = Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)]
PositiveNumber = Annotated[float, Field(strict=True, gt=0, allow_inf_nan=False)]
Band = Annotated[int, Field(ge=1, le=5)]


class CreditRequestBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator(*credit.PAY_COLUMNS, check_fields=False)
    @classmethod
    def integer_status(cls, value):
        if value % 1 != 0:
            raise ValueError("Repayment status must use integer category codes")
        return value


CreditScoreRequest = create_model(
    "CreditScoreRequest",
    __base__=CreditRequestBase,
    **{
        name: (
            (
                PositiveNumber
                if name == "LIMIT_BAL"
                else NonnegativeNumber if name.startswith("PAY_AMT") else FiniteNumber
            ),
            ...,
        )
        for name in credit.FEATURES
    },
)


class CreditProvenance(BaseModel):
    portable_release_id: str
    portable_manifest_sha256: str
    native_model_sha256: str
    api_schema_version: Literal["credit-api-v1"] = "credit-api-v1"
    model_version: Literal["credit-lightgbm-v2"] = "credit-lightgbm-v2"
    model_sha256: str
    scoring_mode: Literal["raw"] = "raw"
    feature_schema_version: str = credit.SCHEMA_VERSION
    band_version: Literal["credit-risk-segmentation-v1"] = "credit-risk-segmentation-v1"
    warnings: list[str]


class CreditScoreResponse(CreditProvenance):
    raw_default_risk_score: Probability
    relative_risk_band: Band
    relative_risk_label: str


class MarginContribution(BaseModel):
    feature: str
    margin_contribution: FiniteNumber


class Reconstruction(BaseModel):
    baseline_plus_contributions: FiniteNumber
    margin_error: Annotated[float, Field(ge=0, le=1e-10, allow_inf_nan=False)]
    probability_from_margin: Probability
    probability_error: Annotated[float, Field(ge=0, le=1e-12, allow_inf_nan=False)]
    verified: Literal[True] = True


class CreditExplanationResponse(CreditScoreResponse):
    baseline_model_margin: FiniteNumber
    raw_margin_log_odds: FiniteNumber
    contribution_units: Literal["model_margin_log_odds"] = "model_margin_log_odds"
    original_feature_contributions: dict[str, FiniteNumber]
    largest_positive: list[MarginContribution] = Field(max_length=5)
    largest_negative: list[MarginContribution] = Field(max_length=5)
    reconstruction: Reconstruction


class CreditModelInfo(CreditProvenance):
    model_family: Literal["LightGBM"] = "LightGBM"
    required_features: list[str]
    supported_repayment_codes: dict[str, list[int]]
    frozen_band_cutoffs: list[Probability]
    band_equality: str
    bundle_manifest_sha256: dict[str, str]
    service_scope: str


class ScenarioRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pd: Probability
    lgd: Probability
    ead: NonnegativeNumber
    unit: Literal["NTD"]


class ScenarioResponse(BaseModel):
    api_schema_version: Literal["credit-api-v1"] = "credit-api-v1"
    hypothetical: Literal[True] = True
    assumed_pd: Probability
    assumed_lgd: Probability
    assumed_ead: NonnegativeNumber
    unit: Literal["NTD"]
    hypothetical_expected_loss: NonnegativeNumber
    formula: Literal["assumed PD × assumed LGD × assumed EAD"] = (
        "assumed PD × assumed LGD × assumed EAD"
    )
    warnings: list[str]
