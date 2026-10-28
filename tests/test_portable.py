import importlib.metadata
import importlib.util
import json
from pathlib import Path
import shutil
import sys
from unittest.mock import Mock
import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_app
from backend.app.settings import Settings
from backend.smoke_test import run_smoke
from finguard_runtime import credit, fraud, integrity
from finguard_runtime.contracts import DataValidationError


def test_actual_combined_synthetic_smoke(client):
    result = run_smoke(client)
    assert result["fraud_synthetic_score"] == 0.0006554509184609327
    assert result["credit_synthetic_raw_score"] == 0.24888492804155674


@pytest.mark.parametrize(
    "field,code", [(field, code) for field, codes in credit.VOCABULARY.items() for code in codes]
)
def test_all_fitted_categories(client, credit_input, field, code):
    response = client.post("/v1/credit/score", json={**credit_input, field: code})
    assert response.status_code == 200
    assert 0 <= response.json()["raw_default_risk_score"] <= 1


@pytest.mark.parametrize(
    "change",
    [
        {"PAY_4": 1},
        {"PAY_5": 1},
        {"PAY_6": 1},
        {"PAY_0": 9},
        {"PAY_0": 0.5},
        {"LIMIT_BAL": 0},
        {"LIMIT_BAL": -1},
        {"PAY_AMT1": -1},
        {"LIMIT_BAL": True},
        {"LIMIT_BAL": "100000"},
        {"BILL_AMT1": None},
        {"ID": 42},
        {"extra": "secret"},
    ],
)
def test_rejected_credit_inputs(client, credit_input, change):
    response = client.post("/v1/credit/score", json={**credit_input, **change})
    assert response.status_code == 422
    assert "raw_default_risk_score" not in response.json()
    assert "secret" not in response.text
    assert all("input" not in e and "ctx" not in e for e in response.json()["detail"])


@pytest.mark.parametrize("field", credit.FEATURES)
def test_missing_credit_fields(client, credit_input, field):
    assert (
        client.post(
            "/v1/credit/score", json={k: v for k, v in credit_input.items() if k != field}
        ).status_code
        == 422
    )


@pytest.mark.parametrize("token", ["NaN", "Infinity", "-Infinity", "1e999"])
def test_nonfinite_credit(client, credit_input, token):
    raw = json.dumps(credit_input).replace("100000", token, 1)
    assert (
        client.post(
            "/v1/credit/score", content=raw, headers={"Content-Type": "application/json"}
        ).status_code
        == 422
    )


def test_negative_bills_zero_payments_and_native_explanation(client, credit_input):
    data = {**credit_input, "BILL_AMT1": -100, "PAY_AMT1": 0}
    score = client.post("/v1/credit/score", json=data).json()
    response = client.post("/v1/credit/explain", json=data)
    assert response.status_code == 200
    result = response.json()
    assert len(result["original_feature_contributions"]) == 19
    assert result["raw_default_risk_score"] == score["raw_default_risk_score"]
    assert result["contribution_units"] == "model_margin_log_odds"
    assert result["reconstruction"]["verified"]
    assert result["reconstruction"]["margin_error"] <= 1e-10
    assert result["reconstruction"]["probability_error"] <= 1e-12
    assert "action" not in score and "decision" not in score


@pytest.mark.parametrize("i,cut", list(enumerate(credit.CUTOFFS)))
def test_band_boundary_equality(i, cut):
    assert credit.assign(cut) == i + 1
    assert credit.assign(np.nextafter(cut, -np.inf)) == i + 1
    assert credit.assign(np.nextafter(cut, np.inf)) == i + 2


def test_exact_fraud_policy_boundaries():
    assert fraud.decide(np.nextafter(fraud.REVIEW, -np.inf)) == "approve"
    assert fraud.decide(fraud.REVIEW) == "review"
    assert fraud.decide(np.nextafter(fraud.DECLINE, -np.inf)) == "review"
    assert fraud.decide(fraud.DECLINE) == "decline"


@pytest.mark.parametrize("bad", [{"Amount": -1}, {"Amount": True}, {"V1": "0"}, {"Class": 1}])
def test_fraud_validation(client, fraud_input, bad):
    assert client.post("/v1/fraud/score", json={**fraud_input, **bad}).status_code == 422


@pytest.mark.parametrize(
    "bad",
    [
        {"pd": -1},
        {"pd": 1.01},
        {"lgd": -1},
        {"lgd": 1.01},
        {"ead": -1},
        {"unit": "USD"},
        {"pd": True},
        {"pd": "0.2"},
    ],
)
def test_scenario_validation(client, bad):
    d = dict(pd=0.2, lgd=0.5, ead=10000, unit="NTD")
    d.update(bad)
    assert client.post("/v1/credit/scenario", json=d).status_code == 422


@pytest.mark.parametrize("broken", ["fraud", "credit"])
def test_independent_readiness(models, tmp_path, credit_input, fraud_input, broken):
    settings = Settings(
        fraud_run=tmp_path if broken == "fraud" else models / "fraud-inference-v1",
        credit_run=tmp_path if broken == "credit" else models / "credit-inference-v1",
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/health/live").status_code == 200
        assert client.get("/health/ready").status_code == (503 if broken == "fraud" else 200)
        assert client.get("/v1/credit/ready").status_code == (503 if broken == "credit" else 200)
        route = "/v1/credit/score" if broken == "fraud" else "/v1/fraud/score"
        assert (
            client.post(route, json=credit_input if broken == "fraud" else fraud_input).status_code
            == 200
        )
        assert (
            client.post(
                "/v1/credit/scenario", json=dict(pd=0.2, lgd=0.5, ead=10000, unit="NTD")
            ).json()["hypothetical_expected_loss"]
            == 1000
        )


@pytest.mark.parametrize("kind", ["fraud", "credit"])
@pytest.mark.parametrize(
    "corruption",
    [
        "model",
        "contract",
        "manifest",
        "missing",
        "extra",
        "symlink",
        "swapped",
        "forged_inventory",
        "traversal",
        "absolute",
    ],
)
def test_corruption_fails_before_native_parser(models, tmp_path, monkeypatch, kind, corruption):
    root = tmp_path / "bundle"
    shutil.copytree(models / f"{kind}-inference-v1", root)
    if corruption == "model":
        (root / "model.txt").write_bytes(b"corrupt")
    elif corruption == "contract":
        (root / "contract.json").write_text("{}")
    elif corruption == "missing":
        (root / "model.txt").unlink()
    elif corruption == "extra":
        (root / "unexpected.txt").write_text("unexpected")
    elif corruption == "symlink":
        (root / "model.txt").unlink()
        (root / "model.txt").symlink_to(models / f"{kind}-inference-v1/model.txt")
    elif corruption == "swapped":
        shutil.copyfile(
            models / f'{"credit" if kind=="fraud" else "fraud"}-inference-v1/model.txt',
            root / "model.txt",
        )
    else:
        m = json.loads((root / "manifest.json").read_text())
        if corruption == "forged_inventory":
            (root / "contract.json").write_text("{}")
            m["payloads"]["contract.json"]["sha256"] = integrity.digest(b"{}")
            m["payloads"]["contract.json"]["size"] = 2
        elif corruption in ["traversal", "absolute"]:
            m["payloads"]["../model.txt" if corruption == "traversal" else "/model.txt"] = m[
                "payloads"
            ].pop("model.txt")
        else:
            m["module"] = "unknown"
        (root / "manifest.json").write_text(json.dumps(m))
    parser = Mock(side_effect=AssertionError("Unverified native parsing forbidden"))
    monkeypatch.setattr(integrity, "Booster", parser)
    with pytest.raises(DataValidationError):
        integrity.load_bundle(root, kind)
    parser.assert_not_called()


def test_version_mismatch_fails_before_parse(models, monkeypatch):
    monkeypatch.setattr(integrity.importlib.metadata, "version", lambda name: "0.0")
    parser = Mock()
    monkeypatch.setattr(integrity, "Booster", parser)
    with pytest.raises(DataValidationError, match="version"):
        integrity.load_bundle(models / "credit-inference-v1", "credit")
    parser.assert_not_called()


def test_root_symlink_rejected(models, tmp_path):
    root = tmp_path / "link"
    root.symlink_to(models / "credit-inference-v1", target_is_directory=True)
    with pytest.raises(DataValidationError):
        credit.load_scorer(root)


def test_no_removed_dependencies_or_research_imports():
    for name in ["sklearn", "joblib", "matplotlib", "xlrd", "finguard"]:
        assert importlib.util.find_spec(name) is None
    assert not any(name == "finguard" or name.startswith("finguard.") for name in sys.modules)


def test_request_limits_query_overrides_and_cors(client, credit_input):
    assert client.post("/v1/credit/score?model=other", json=credit_input).status_code == 422
    assert client.post("/v1/credit/score", content=b" " * 17000).status_code == 413
    r = client.options(
        "/v1/credit/score",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in r.headers


@pytest.mark.parametrize(
    "case", ["traversal", "absolute", "trees", "source_identity", "contract", "objective"]
)
def test_semantic_checks_even_for_test_approved_manifest(models, tmp_path, monkeypatch, case):
    root = tmp_path / "reviewed"
    shutil.copytree(models / "credit-inference-v1", root)
    manifest = json.loads((root / "manifest.json").read_text())
    if case in ["traversal", "absolute"]:
        manifest["payloads"]["../model.txt" if case == "traversal" else "/model.txt"] = manifest[
            "payloads"
        ].pop("model.txt")
    elif case == "trees":
        manifest["trees"] = 199
    elif case == "source_identity":
        manifest["source_model_sha256"] = "0" * 64
    elif case == "contract":
        data = json.loads((root / "contract.json").read_text())
        data["vocabulary"]["PAY_4"].append(1)
        (root / "contract.json").write_text(json.dumps(data))
    else:
        text = (root / "model.txt").read_text()
        (root / "model.txt").write_text(
            text.replace("objective=binary sigmoid:1", "objective=binary sigmoid:2", 1)
        )
    for name, entry in manifest["payloads"].items():
        if name in ["contract.json", "model.txt"]:
            entry.update(
                sha256=integrity.digest((root / name).read_bytes()),
                size=(root / name).stat().st_size,
            )
    (root / "manifest.json").write_text(json.dumps(manifest))
    monkeypatch.setitem(
        integrity.CATALOG,
        "credit",
        {"manifest_sha256": integrity.digest((root / "manifest.json").read_bytes())},
    )
    with pytest.raises(DataValidationError):
        credit.load_scorer(root)


def test_public_export_provenance(client):
    for kind in ["fraud", "credit"]:
        info = client.get(f"/v1/{kind}/model-info")
        assert info.status_code == 200
        data = info.json()
        assert data["portable_release_id"] == f"{kind}-inference-v1"
        assert data["portable_manifest_sha256"] == integrity.CATALOG[kind]["manifest_sha256"]
        assert data["native_model_sha256"] != data["model_sha256"]


def test_both_models_absent_fail_closed_but_scenario_still_works(tmp_path):
    with TestClient(
        create_app(Settings(fraud_run=tmp_path / "fraud", credit_run=tmp_path / "credit"))
    ) as client:
        assert client.get("/health/live").status_code == 200
        assert client.get("/health/ready").status_code == 503
        assert client.get("/v1/credit/ready").status_code == 503
        response = client.post(
            "/v1/credit/scenario", json=dict(pd=0.2, lgd=0.5, ead=10000, unit="NTD")
        )
        assert response.status_code == 200
        assert response.json()["hypothetical_expected_loss"] == 1000
