"""Lean public boundary regressions; all requests and paths are invented."""

import asyncio
import json
from pathlib import Path
import shutil
from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_app
from backend.app.settings import Settings, configured_port
from backend.app import security, launch
from backend.app.provision import SECRET_FILES, stage_secret_files
from finguard_runtime import credit, fraud


@pytest.fixture
def local(tmp_path):
    with TestClient(
        create_app(
            Settings(
                fraud_run=tmp_path / "fraud",
                credit_run=tmp_path / "credit",
                requests_per_minute=100000,
            )
        )
    ) as client:
        yield client


@pytest.mark.parametrize(
    "host",
    [
        "localhost/other?x=",
        "localhost:8000/other",
        "other.example",
        "localhost@other.example",
        "localhost:bad",
        "localhost:65536",
        "localhost#frag",
        "localhost.",
        "-localhost",
        "localhost:0",
    ],
)
def test_malformed_or_unapproved_host_rejected_before_validation(local, host):
    response = local.post(
        "/v1/credit/score", headers={"Host": host}, json={"AUDIT_INPUT": "invented_private_value"}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid request host."}
    assert "AUDIT_INPUT" not in response.text and "invented_private_value" not in response.text


def test_duplicate_host_rejected(local):
    assert (
        local.get(
            "/health/live", headers=[("Host", "localhost"), ("Host", "other.example")]
        ).status_code
        == 400
    )


def test_forwarded_headers_cannot_authorize_host(local):
    assert (
        local.get(
            "/health/live",
            headers={
                "Host": "other.example",
                "X-Forwarded-Host": "localhost",
                "X-Forwarded-Proto": "https",
            },
        ).status_code
        == 400
    )
    assert (
        local.get(
            "/health/live", headers={"Host": "localhost", "X-Forwarded-Host": "other.example"}
        ).status_code
        == 200
    )


@pytest.mark.parametrize("route", ["/v1/fraud/score", "/v1/credit/score"])
def test_extra_field_names_values_and_context_are_sanitized(local, route, caplog):
    result = local.post(route, json={"AUDIT_INPUT": "invented_private_value"})
    assert result.status_code == 422
    assert "AUDIT_INPUT" not in result.text and "invented_private_value" not in result.text
    assert all("input" not in e and "ctx" not in e for e in result.json()["detail"])
    assert "AUDIT_INPUT" not in caplog.text and "invented_private_value" not in caplog.text


@pytest.mark.parametrize(
    "route", ["/v1/fraud/score", "/v1/credit/score", "/v1/credit/explain", "/v1/credit/scenario"]
)
def test_all_scoring_and_scenario_bodies_are_bounded(local, route):
    assert local.post(route, content=b" " * 16385).status_code == 413
    assert local.post(route, content=b" " * 16384).status_code == 422

    def chunks():
        yield b" " * 9000
        yield b" " * 9000

    assert local.post(route, content=chunks()).status_code == 413


def test_body_deadline(monkeypatch):
    monkeypatch.setattr(security, "BODY_TIMEOUT_SECONDS", 0.001)
    app = Mock()
    sent = []

    async def receive():
        await asyncio.sleep(1)

    async def send(message):
        sent.append(message)

    asyncio.run(
        security.RequestBoundary(app)(
            {"type": "http", "method": "POST", "path": "/v1/fraud/score"}, receive, send
        )
    )
    assert sent[0]["status"] == 408
    app.assert_not_called()


def test_global_budget_refills_and_does_not_limit_health(monkeypatch):
    clock = [0.0]
    monkeypatch.setattr(security, "time", SimpleNamespace(monotonic=lambda: clock[0]))

    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"{}"})

    limiter = security.RequestBoundary(app, requests_per_minute=2)

    async def request(method="POST"):
        sent = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            sent.append(message)

        await limiter({"type": "http", "method": method, "path": "/v1/fraud/score"}, receive, send)
        return sent[0]

    assert asyncio.run(request())["status"] == 200
    assert asyncio.run(request())["status"] == 200
    denied = asyncio.run(request())
    assert denied["status"] == 429 and (b"retry-after", b"30") in denied["headers"]
    assert asyncio.run(request("GET"))["status"] == 200
    clock[0] = 30.0
    assert asyncio.run(request())["status"] == 200


def test_concurrent_budget_has_no_user_store():
    async def app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})

    limiter = security.RequestBoundary(app, requests_per_minute=1)

    async def one():
        sent = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            sent.append(message)

        await limiter(
            {"type": "http", "method": "POST", "path": "/v1/credit/explain"}, receive, send
        )
        return sent[0]["status"]

    async def run():
        return await asyncio.gather(*[one() for _ in range(10)])

    statuses = asyncio.run(run())
    assert statuses.count(200) == 1 and statuses.count(429) == 9


def test_production_host_cors_and_raw_scope(tmp_path):
    settings = Settings(
        fraud_run=tmp_path / "fraud",
        credit_run=tmp_path / "credit",
        environment="production",
        allowed_hosts=("api.example.test",),
        cors_origins=("https://portfolio.example.test",),
    )
    with TestClient(create_app(settings), base_url="https://api.example.test") as client:
        assert client.get("/health/live").status_code == 200
        assert client.get("/health/live", headers={"Host": "localhost"}).status_code == 400
        response = client.options(
            "/v1/credit/score",
            headers={
                "Origin": "https://portfolio.example.test",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.headers["access-control-allow-origin"] == "https://portfolio.example.test"
        other = client.options(
            "/v1/credit/score",
            headers={
                "Origin": "https://other.example.test",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert "access-control-allow-origin" not in other.headers


@pytest.mark.parametrize(
    "host",
    [
        "*",
        "*.example.test",
        "https://api.example.test",
        "api.example.test:8000",
        "api.example.test/path",
    ],
)
def test_operator_host_config_rejects_wildcards_urls_and_ports(host):
    with pytest.raises(ValueError):
        Settings(allowed_hosts=(host,))


def test_production_requires_explicit_security_configuration(monkeypatch):
    monkeypatch.setenv("FINGUARD_ENV", "production")
    monkeypatch.delenv("FINGUARD_ALLOWED_HOSTS", raising=False)
    monkeypatch.delenv("FINGUARD_CORS_ORIGINS", raising=False)
    with pytest.raises(ValueError):
        Settings.from_environment()
    with pytest.raises(ValueError):
        Settings(
            environment="production",
            allowed_hosts=("api.example.test",),
            cors_origins=("http://portfolio.example.test",),
        )


@pytest.mark.parametrize("port", ["0", "65536", "not-a-port"])
def test_bad_platform_port_rejected(monkeypatch, port):
    monkeypatch.setenv("PORT", port)
    with pytest.raises(ValueError):
        configured_port()


def test_launcher_uses_platform_port_and_ignores_forwarded_headers(monkeypatch):
    monkeypatch.setenv("PORT", "10000")
    server = Mock()
    monkeypatch.setattr(launch.uvicorn, "run", server)
    launch.serve()
    options = server.call_args.kwargs
    assert options["port"] == 10000 and options["host"] == "0.0.0.0"
    assert options["proxy_headers"] is False and options["access_log"] is False
    assert options["workers"] == 1 and options["limit_concurrency"] == 16


def flat_secrets(models, destination):
    destination.mkdir()
    for kind, names in SECRET_FILES.items():
        for original, flat in names.items():
            shutil.copyfile(models / f"{kind}-inference-v1" / original, destination / flat)


def test_secret_provisioning_preserves_exact_payloads_and_predictions(
    models, tmp_path, fraud_input, credit_input
):
    source, target = tmp_path / "secrets", tmp_path / "models"
    flat_secrets(models, source)
    assert stage_secret_files(source, target) == {"fraud": True, "credit": True}
    for kind, names in SECRET_FILES.items():
        for original in names:
            copied = target / f"{kind}-inference-v1" / original
            assert copied.read_bytes() == (models / f"{kind}-inference-v1" / original).read_bytes()
            assert copied.stat().st_mode & 0o777 == 0o400
    assert fraud.load_scorer(target / "fraud-inference-v1").score_one(fraud_input) == (
        0.0006554509184609327,
        "approve",
    )
    assert (
        credit.load_scorer(target / "credit-inference-v1").score_one(credit_input)[
            "raw_default_risk_score"
        ]
        == 0.24888492804155674
    )
    with pytest.raises(ValueError):
        stage_secret_files(source, target)


@pytest.mark.parametrize("kind", ["fraud", "credit"])
@pytest.mark.parametrize("fault", ["missing", "corrupt", "symlink"])
def test_secret_module_faults_are_independent_and_sanitized(models, tmp_path, kind, fault, caplog):
    source, target = tmp_path / "secrets", tmp_path / "models"
    flat_secrets(models, source)
    p = source / f"{kind}-model.txt"
    p.unlink()
    if fault == "corrupt":
        p.write_text("INVENTED_CORRUPTION")
    elif fault == "symlink":
        p.symlink_to(models / f"{kind}-inference-v1/model.txt")
    result = stage_secret_files(source, target)
    other = "credit" if kind == "fraud" else "fraud"
    assert result[kind] is False and result[other] is True
    assert not (target / f"{kind}-inference-v1").exists()
    assert "INVENTED_CORRUPTION" not in caplog.text and str(tmp_path) not in caplog.text
