"""Credit routes share the application's lifecycle and sanitized error handling."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError

from backend.app.credit_schemas import (
    CreditScoreRequest,
    CreditScoreResponse,
    CreditExplanationResponse,
    CreditModelInfo,
    ScenarioRequest,
    ScenarioResponse,
)
from backend.app.schemas import HealthResponse
from finguard_runtime import credit as inference
from finguard_runtime.scenarios import expected_loss
from finguard_runtime.integrity import export_metadata

logger = logging.getLogger(__name__)
UNAVAILABLE = "Verified credit inference artifacts are unavailable."


def no_overrides(request: Request):
    if request.query_params:
        raise HTTPException(422, detail="Credit endpoints accept no query parameters or overrides.")


router = APIRouter(prefix="/v1/credit", tags=["credit"], dependencies=[Depends(no_overrides)])


def scorer(request):
    result = getattr(request.app.state, "credit_scorer", None)
    if result is None:
        raise HTTPException(503, detail=UNAVAILABLE)
    return result


def provenance(service):
    return dict(
        **export_metadata(service, "credit"),
        model_sha256=inference.MODEL_SHA256,
        warnings=inference.WARNINGS,
    )


def unsupported(exc):
    raise RequestValidationError(
        [
            dict(
                type="unsupported_repayment_code",
                loc=("body", name),
                msg="Repayment-status code is unsupported by the frozen model; input is unscorable",
            )
            for name in exc.fields
        ]
    ) from None


@router.get("/ready", response_model=HealthResponse)
def ready(request: Request):
    scorer(request)
    return {"status": "ready"}


@router.get("/model-info", response_model=CreditModelInfo)
def model_info(request: Request):
    service = scorer(request)
    return CreditModelInfo(
        **provenance(service),
        required_features=inference.FEATURES,
        supported_repayment_codes=service.vocabulary,
        frozen_band_cutoffs=list(inference.CUTOFFS),
        band_equality="score equal to a cutoff belongs to the lower band; searchsorted(side=left)+1",
        bundle_manifest_sha256={
            kind: entry["manifest_sha256"] for kind, entry in inference.CATALOG.items()
        },
        service_scope="Local retrospective credit research only; no lending decisions or validated production PDs.",
    )


@router.post("/score", response_model=CreditScoreResponse)
def score(payload: CreditScoreRequest, request: Request):
    service = scorer(request)
    try:
        return CreditScoreResponse(**provenance(service), **service.score_one(payload.model_dump()))
    except inference.UnsupportedCreditInput as exc:
        unsupported(exc)
    except Exception:
        logger.error("Frozen credit inference failed; no request data logged.")
        raise HTTPException(503, detail="Credit inference unavailable.") from None


@router.post("/explain", response_model=CreditExplanationResponse)
def explain(payload: CreditScoreRequest, request: Request):
    service = scorer(request)
    try:
        result = service.explain_one(payload.model_dump())
        result.pop("model_identifier")
        result["warnings"] = [
            *inference.WARNINGS,
            *inference.EXPLANATION_WARNINGS,
            *result["warnings"],
        ]
        return CreditExplanationResponse(
            **export_metadata(service, "credit"), model_sha256=inference.MODEL_SHA256, **result
        )
    except inference.UnsupportedCreditInput as exc:
        unsupported(exc)
    except Exception:
        logger.error("Frozen credit explanation failed; no request data logged.")
        raise HTTPException(503, detail="Credit explanation unavailable.") from None


@router.post("/scenario", response_model=ScenarioResponse)
def scenario(payload: ScenarioRequest):
    # Pure explicit assumptions; independent of model availability and user scores.
    try:
        result = expected_loss(payload.pd, payload.lgd, payload.ead, unit=payload.unit)
        return ScenarioResponse(
            assumed_pd=payload.pd,
            assumed_lgd=payload.lgd,
            assumed_ead=payload.ead,
            unit=result["unit"],
            hypothetical_expected_loss=result["amount"],
            warnings=inference.SCENARIO_WARNINGS,
        )
    except Exception:
        logger.error("Credit scenario calculation failed; no request data logged.")
        raise HTTPException(503, detail="Credit scenario calculation unavailable.") from None
