"""Minimal local FastAPI service around immutable FinGuard inference artifacts."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.schemas import (
    FraudScoreRequest,
    HealthResponse,
    ModelInfo,
    ScoreResponse,
    ThresholdMetadata,
)
from backend.app.settings import Settings
from backend.app.credit import router as credit_router
from backend.app.security import HostBoundary, RequestBoundary
from finguard_runtime import credit as credit_inference
from finguard_runtime import fraud as inference
from finguard_runtime.integrity import export_metadata

logger = logging.getLogger(__name__)
UNAVAILABLE = "Verified fraud inference artifacts are unavailable."


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_environment()

    @asynccontextmanager
    async def lifespan(app):
        app.state.scorer = None
        try:
            app.state.scorer = inference.load_scorer(settings.fraud_run)
        except Exception:
            # Do not log local paths, deserialization traces or submitted features.
            logger.error("Fraud artifact startup verification failed; readiness disabled.")
        app.state.credit_scorer = None
        try:
            app.state.credit_scorer = credit_inference.load_scorer(
                settings.credit_run,
            )
        except Exception:
            logger.error("Credit artifact startup verification failed; credit readiness disabled.")
        yield
        app.state.scorer = None
        app.state.credit_scorer = None

    app = FastAPI(
        title="FinGuard Fraud and Credit Research API",
        version="1.0.0",
        description=inference.DEMONSTRATION_SCOPE
        + " Credit endpoints serve historical research estimates, not production PDs or lending decisions.",
        lifespan=lifespan,
        debug=False,
    )
    app.add_middleware(RequestBoundary, requests_per_minute=settings.requests_per_minute)
    app.include_router(credit_router)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    app.add_middleware(HostBoundary, allowed_hosts=settings.allowed_hosts)

    def scorer():
        result = getattr(app.state, "scorer", None)
        if result is None:
            raise HTTPException(503, detail=UNAVAILABLE)
        return result

    def thresholds(service):
        return ThresholdMetadata(
            version=service.policy.policy_version,
            review=service.policy.t_review,
            decline=service.policy.t_decline,
            equality="score < review: approve; review <= score < decline: review; score >= decline: decline",
        )

    def provenance(service):
        return dict(
            **export_metadata(service, "fraud"),
            model_version=inference.MODEL_VERSION,
            policy_version=service.policy.policy_version,
            feature_schema_version=inference.FEATURE_SCHEMA_VERSION,
            model_sha256=service.model_sha256,
            policy_sha256=service.policy_sha256,
            thresholds=thresholds(service),
            score_limitation=inference.SCORE_LIMITATION,
            service_scope=inference.DEMONSTRATION_SCOPE,
        )

    @app.exception_handler(RequestValidationError)
    async def invalid_input(request, exc):
        # Omit Pydantic's input/context, including non-JSON NaN/Inf or sensitive payloads.
        errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        known = (
            set(credit_inference.FEATURES)
            | set(inference.FEATURES)
            | {"body", "pd", "lgd", "ead", "unit", "ID", "SEX", "AGE", "EDUCATION", "MARRIAGE"}
        )
        for error in errors:
            error["loc"] = [
                part if isinstance(part, int) or part in known else "unexpected_field"
                for part in error["loc"]
            ]
        return JSONResponse(
            status_code=422,
            content={"detail": errors},
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request, exc):
        if request.scope["path"].startswith("/v1/credit/"):
            logger.error("Credit API request failed; no request data logged.")
            return JSONResponse(status_code=503, content={"detail": "Credit service unavailable."})
        logger.error("Fraud API request failed; no request data logged.")
        return JSONResponse(status_code=503, content={"detail": "Fraud inference unavailable."})

    @app.get("/health/live", response_model=HealthResponse)
    def live():
        return {"status": "alive"}

    @app.get("/health/ready", response_model=HealthResponse)
    def ready():
        scorer()
        return {"status": "ready"}

    @app.get("/v1/fraud/model-info", response_model=ModelInfo)
    def model_info():
        service = scorer()
        return ModelInfo(
            **provenance(service),
            required_features=inference.FEATURES,
            dataset_scope=inference.DATASET_SCOPE,
            evaluation_scope=inference.EVALUATION_SCOPE,
        )

    @app.post("/v1/fraud/score", response_model=ScoreResponse)
    def score(payload: FraudScoreRequest, request: Request):
        service = scorer()
        if request.query_params:
            raise HTTPException(422, detail="Scoring accepts no query parameters or overrides.")
        try:
            raw_score, action = service.score_one(payload.model_dump())
        except Exception:
            logger.error("Frozen fraud inference failed; no request data logged.")
            raise HTTPException(503, detail="Fraud inference unavailable.") from None
        return ScoreResponse(raw_score=raw_score, action=action, **provenance(service))

    return app


app = create_app()
