"""Portable fraud model and unchanged frozen routing."""

from dataclasses import dataclass, field
from threading import Lock
from types import SimpleNamespace
import numpy as np
from threadpoolctl import threadpool_limits
from .contracts import FRAUD_FEATURES as FEATURES, REVIEW, DECLINE, frame, DataValidationError
from .fraud_constants import *
from .integrity import load_bundle


@dataclass
class FraudScorer:
    model: object
    manifest: dict
    policy: object
    model_sha256: str = MODEL_SHA256
    policy_sha256: str = POLICY_SHA256
    _lock: Lock = field(default_factory=Lock, repr=False)

    def score_one(self, values):
        X = frame(values)
        with self._lock, threadpool_limits(limits=1):
            p = float(
                self.model.predict(
                    X, raw_score=False, num_iteration=-1, validate_features=True, num_threads=1
                )[0]
            )
        if not np.isfinite(p) or not 0 <= p <= 1:
            raise DataValidationError("Invalid frozen fraud output")
        return p, decide(p)


def decide(p):
    return "approve" if p < REVIEW else "review" if p < DECLINE else "decline"


def load_scorer(directory):
    model, data, manifest = load_bundle(directory, "fraud")
    expected = {
        "features": FEATURES,
        "dtype": "float64",
        "transform": "identity",
        "positive_class": 1,
        "finite": True,
        "amount_min": 0,
    }
    policy = data["policy.json"]
    if (
        data["contract.json"] != expected
        or manifest["source_model_sha256"] != MODEL_SHA256
        or manifest["transformed_features"] != FEATURES
        or policy
        != {
            "policy_version": POLICY_VERSION,
            "source_policy_sha256": POLICY_SHA256,
            "t_review": REVIEW,
            "t_decline": DECLINE,
            "equality": "p < t_review approve; t_review <= p < t_decline review; p >= t_decline decline",
        }
    ):
        raise DataValidationError("Frozen fraud semantic contract mismatch")
    return FraudScorer(
        model,
        manifest,
        SimpleNamespace(policy_version=POLICY_VERSION, t_review=REVIEW, t_decline=DECLINE),
    )
