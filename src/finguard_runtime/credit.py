"""Full one-hot credit inference and native margin contributions, without sklearn."""

from dataclasses import dataclass, field
from threading import Lock
import numpy as np
import pandas as pd
from scipy.special import expit
from threadpoolctl import threadpool_limits
from . import contracts as credit
from .contracts import (
    CREDIT_FEATURES as FEATURES,
    FINANCIAL,
    PAY_COLUMNS,
    VOCABULARY,
    CUTOFFS,
    LABELS,
    DataValidationError,
    UnsupportedCreditInput,
    frame,
)
from .credit_constants import *
from .integrity import load_bundle
from .catalog import CATALOG

SCHEMA_VERSION = "credit-behavioural-financial-v1"
BUNDLE_MANIFEST_SHA256 = {}  # Replaced with this release's reviewed catalog on model-info.


def mapping():
    return [
        {"transformed_feature": f"financial__{name}", "raw_feature": name} for name in FINANCIAL
    ] + [
        {"transformed_feature": f"status__{name}_{code}", "raw_feature": name}
        for name in PAY_COLUMNS
        for code in VOCABULARY[name]
    ]


def contract():
    return dict(
        features=FEATURES,
        financial=FINANCIAL,
        statuses=PAY_COLUMNS,
        vocabulary=VOCABULARY,
        mapping=mapping(),
        dtype="float64",
        financial_transform="passthrough",
        drop=None,
        sparse=False,
        unknown="reject",
        positive_class=1,
        mode="raw",
        limit_min_exclusive=0,
        payments_min=0,
        bills_allow_negative=True,
        finite=True,
    )


def preprocess(values):
    X = frame(values, credit=True)
    array = np.concatenate(
        [
            X[FINANCIAL].to_numpy(dtype=np.float64),
            *[
                (X[[name]].to_numpy() == np.asarray(VOCABULARY[name])).astype(np.float64)
                for name in PAY_COLUMNS
            ],
        ],
        axis=1,
    )
    return pd.DataFrame(array, columns=[item["transformed_feature"] for item in mapping()])


def assign(p):
    return int(np.searchsorted(CUTOFFS, p, side="left") + 1)


@dataclass
class CreditScorer:
    model: object
    manifest: dict
    _lock: Lock = field(default_factory=Lock, repr=False)
    vocabulary: dict = field(default_factory=lambda: VOCABULARY.copy())

    def _predict(self, X, **kwargs):
        with self._lock, threadpool_limits(limits=1):
            result = self.model.predict(
                X, num_iteration=-1, validate_features=True, num_threads=1, **kwargs
            )
        if not np.isfinite(result).all():
            raise DataValidationError("Invalid frozen credit output")
        return np.asarray(result)

    def score_one(self, values):
        p = float(self._predict(preprocess(values), raw_score=False)[0])
        if not 0 <= p <= 1:
            raise DataValidationError("Invalid frozen credit output")
        band = assign(p)
        return dict(
            raw_default_risk_score=p, relative_risk_band=band, relative_risk_label=LABELS[band - 1]
        )

    def explain_one(self, values):
        X = preprocess(values)
        native = self._predict(X, pred_contrib=True)
        if native.shape != (1, 77):
            raise DataValidationError("Invalid native contributions")
        margin = float(self._predict(X, raw_score=True)[0])
        score = self.score_one(values)
        contributions = dict.fromkeys(FEATURES, 0.0)
        for i, item in enumerate(mapping()):
            contributions[item["raw_feature"]] += float(native[0, i])
        baseline = float(native[0, -1])
        reconstructed = float(baseline + sum(contributions.values()))
        margin_error = abs(reconstructed - margin)
        probability_error = abs(float(expit(reconstructed)) - score["raw_default_risk_score"])
        if (
            margin_error > 1e-10
            or probability_error > 1e-12
            or abs(baseline + native[0, :-1].sum() - margin) > 1e-10
        ):
            raise DataValidationError("Native reconstruction failed")
        pairs = list(contributions.items())
        positive = sorted(
            [(k, v) for k, v in pairs if v > 0], key=lambda x: (-x[1], FEATURES.index(x[0]))
        )[:5]
        negative = sorted(
            [(k, v) for k, v in pairs if v < 0], key=lambda x: (x[1], FEATURES.index(x[0]))
        )[:5]
        return dict(
            **score,
            model_identifier=MODEL_VERSION + ":" + MODEL_SHA256,
            baseline_model_margin=baseline,
            raw_margin_log_odds=margin,
            contribution_units="model_margin_log_odds",
            original_feature_contributions=contributions,
            largest_positive=[dict(feature=k, margin_contribution=v) for k, v in positive],
            largest_negative=[dict(feature=k, margin_contribution=v) for k, v in negative],
            reconstruction=dict(
                baseline_plus_contributions=reconstructed,
                margin_error=margin_error,
                probability_from_margin=float(expit(reconstructed)),
                probability_error=probability_error,
                verified=True,
            ),
            warnings=NATIVE_WARNINGS,
        )


def load_scorer(directory):
    model, data, manifest = load_bundle(directory, "credit")
    expected_bands = dict(
        cutoffs=CUTOFFS, labels=LABELS, equality="lower", band_version=BAND_VERSION
    )
    if (
        data["contract.json"] != contract()
        or data["bands.json"] != expected_bands
        or manifest["source_model_sha256"] != MODEL_SHA256
        or manifest["transformed_features"] != [m["transformed_feature"] for m in mapping()]
    ):
        raise DataValidationError("Frozen credit semantic contract mismatch")
    return CreditScorer(model, manifest)
