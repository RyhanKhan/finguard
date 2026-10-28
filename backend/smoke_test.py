"""Combined local API check: python -m backend.smoke_test.

Only the checked-in invented requests are submitted. No dataset, research runner,
individual evaluation prediction or artifact is opened by this HTTP client.
"""

import json
import math
from pathlib import Path

import httpx

from finguard_runtime.credit import MODEL_SHA256 as CREDIT_SHA256
from finguard_runtime.fraud import MODEL_SHA256, MODEL_VERSION, POLICY_SHA256, POLICY_VERSION

EXAMPLES = Path(__file__).parent / "examples"
FRAUD_SCORE = 0.0006554509184609327
CREDIT_SCORE = 0.24888492804155674


def run_smoke(client):
    """Fail loudly on unavailable services, changed provenance or synthetic parity."""

    def get(path):
        response = client.get(path)
        response.raise_for_status()
        return response.json()

    def post(path, payload):
        response = client.post(path, json=payload)
        response.raise_for_status()
        return response.json()

    def rejected(path, payload):
        response = client.post(path, json=payload)
        assert response.status_code == 422, f"Expected validation rejection for {path}"
        assert "detail" in response.json(), "Validation failure must explain the error"
        assert "raw_default_risk_score" not in response.json(), "Invalid input returned a score"

    assert get("/health/live") == {"status": "alive"}
    for path in ["/health/ready", "/v1/credit/ready"]:
        assert get(path) == {"status": "ready"}, f"Service is not ready: {path}"
    fraud_info = get("/v1/fraud/model-info")
    fraud_input = json.loads((EXAMPLES / "fraud_request.json").read_text())
    fraud = post("/v1/fraud/score", fraud_input)
    for result in [fraud_info, fraud]:
        assert result["model_version"] == MODEL_VERSION, "Fraud model version changed"
        assert result["policy_version"] == POLICY_VERSION, "Fraud policy version changed"
        assert result["model_sha256"] == MODEL_SHA256, "Fraud model checksum changed"
        assert result["policy_sha256"] == POLICY_SHA256, "Fraud policy checksum changed"
    assert fraud["raw_score"] == FRAUD_SCORE, "Fraud synthetic score changed"
    assert fraud["action"] == "approve", "Fraud synthetic policy action changed"
    assert fraud["thresholds"]["review"] == 0.480177454887009
    assert fraud["thresholds"]["decline"] == 0.9986654773731469
    rejected("/v1/fraud/score", {**fraud_input, "Amount": -1})

    credit_info = get("/v1/credit/model-info")
    credit_input = json.loads((EXAMPLES / "credit_request.json").read_text())
    credit = post("/v1/credit/score", credit_input)
    explained = post("/v1/credit/explain", credit_input)
    for result in [credit_info, credit, explained]:
        assert result["model_version"] == "credit-lightgbm-v2", "Credit model version changed"
        assert result["model_sha256"] == CREDIT_SHA256, "Credit model checksum changed"
        assert result["scoring_mode"] == "raw", "Credit scoring mode changed"
        assert "action" not in result and "decision" not in result
    for result in [credit, explained]:
        assert result["raw_default_risk_score"] == CREDIT_SCORE, "Credit synthetic score changed"
        assert result["relative_risk_band"] == 4, "Credit synthetic band changed"
    contributions = explained["original_feature_contributions"]
    assert set(contributions) == set(credit_input), "Explanation must cover all 19 input fields"
    margin = explained["baseline_model_margin"] + sum(contributions.values())
    assert abs(margin - explained["raw_margin_log_odds"]) <= 1e-10
    assert abs(1 / (1 + math.exp(-margin)) - CREDIT_SCORE) <= 1e-12
    reconstruction = explained["reconstruction"]
    assert reconstruction["verified"] is True
    assert reconstruction["margin_error"] <= 1e-10
    assert reconstruction["probability_error"] <= 1e-12

    rejected("/v1/credit/score", {**credit_input, "PAY_4": 1})
    rejected("/v1/credit/score", {k: v for k, v in credit_input.items() if k != "LIMIT_BAL"})
    rejected("/v1/credit/score", {**credit_input, "LIMIT_BAL": 0})
    rejected("/v1/credit/score", {**credit_input, "PAY_AMT1": -1})
    accepted = post("/v1/credit/score", {**credit_input, "BILL_AMT1": -100, "PAY_AMT1": 0})
    assert 0 <= accepted["raw_default_risk_score"] <= 1
    assumptions = json.loads((EXAMPLES / "credit_scenario_request.json").read_text())
    scenario = post("/v1/credit/scenario", assumptions)
    assert scenario["hypothetical"] is True and scenario["unit"] == "NTD"
    assert scenario["hypothetical_expected_loss"] == 1000
    return {
        "services": "fraud and credit ready",
        "fraud_synthetic_score": fraud["raw_score"],
        "fraud_action": fraud["action"],
        "credit_synthetic_raw_score": credit["raw_default_risk_score"],
        "credit_band": credit["relative_risk_band"],
        "credit_reconstruction_verified": True,
        "hypothetical_loss_ntd": scenario["hypothetical_expected_loss"],
        "invalid_inputs_rejected": True,
    }


def main():
    with httpx.Client(base_url="http://127.0.0.1:8000", timeout=30, trust_env=False) as client:
        print(json.dumps(run_smoke(client), indent=2))


if __name__ == "__main__":
    main()
