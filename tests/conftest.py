"""Synthetic-only serving tests. No research package is installed in this environment."""

import json
import os
from pathlib import Path
import pytest


@pytest.fixture(scope="session")
def source():
    return Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def models():
    value = os.environ.get("FINGUARD_INFERENCE_ROOT")
    if not value:
        pytest.skip("Approved private models required; set FINGUARD_INFERENCE_ROOT externally")
    return Path(value)


@pytest.fixture(scope="session")
def credit_input(source):
    return json.loads((source / "backend/examples/credit_request.json").read_text())


@pytest.fixture(scope="session")
def fraud_input(source):
    return json.loads((source / "backend/examples/fraud_request.json").read_text())


@pytest.fixture(scope="session")
def client(models):
    from fastapi.testclient import TestClient
    from backend.app.main import create_app
    from backend.app.settings import Settings

    with TestClient(
        create_app(
            Settings(
                requests_per_minute=100000,
                fraud_run=models / "fraud-inference-v1",
                credit_run=models / "credit-inference-v1",
            )
        )
    ) as c:
        yield c
