"""Operator-only configuration; production requires exact Hosts and HTTPS origins."""

from dataclasses import dataclass
import os
from pathlib import Path
from urllib.parse import urlsplit
from backend.app.security import hostname

ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    fraud_run: Path = ROOT / "artifacts/fraud-inference-v1"
    credit_run: Path = ROOT / "artifacts/credit-inference-v1"
    cors_origins: tuple[str, ...] = ("http://localhost:3000", "http://127.0.0.1:3000")
    allowed_hosts: tuple[str, ...] = ("localhost", "127.0.0.1", "testserver")
    environment: str = "local"
    requests_per_minute: int = 120

    def __post_init__(self):
        if self.environment not in {"local", "production"} or self.requests_per_minute < 1:
            raise ValueError("Invalid service configuration")
        if not self.allowed_hosts or any(hostname(x) != x or ":" in x for x in self.allowed_hosts):
            raise ValueError("Configure exact allowed hostnames without URLs, wildcards or ports")
        if self.environment == "production":
            if (
                any(x in {"localhost", "127.0.0.1", "testserver"} for x in self.allowed_hosts)
                or not self.cors_origins
            ):
                raise ValueError(
                    "Production requires explicit service Hosts and HTTPS frontend origins"
                )
        for origin in self.cors_origins:
            url = urlsplit(origin)
            if (
                url.scheme
                not in ({"https"} if self.environment == "production" else {"http", "https"})
                or not url.hostname
                or url.username
                or url.password
                or url.path
                or url.query
                or url.fragment
                or "*" in origin
            ):
                raise ValueError("Configure exact frontend origins")
            hostname(url.netloc)

    @classmethod
    def from_environment(cls):
        base = Path(os.environ.get("FINGUARD_INFERENCE_ROOT", ROOT / "artifacts"))
        environment = os.environ.get("FINGUARD_ENV", "local")
        if environment == "production" and not all(
            os.environ.get(n) for n in ["FINGUARD_ALLOWED_HOSTS", "FINGUARD_CORS_ORIGINS"]
        ):
            raise ValueError("Production requires explicit Host/CORS configuration")

        def values(name, defaults):
            return tuple(
                x.strip() for x in os.environ.get(name, ",".join(defaults)).split(",") if x.strip()
            )

        return cls(
            fraud_run=base / "fraud-inference-v1",
            credit_run=base / "credit-inference-v1",
            cors_origins=values("FINGUARD_CORS_ORIGINS", cls().cors_origins),
            allowed_hosts=values("FINGUARD_ALLOWED_HOSTS", cls().allowed_hosts),
            environment=environment,
            requests_per_minute=int(os.environ.get("FINGUARD_REQUESTS_PER_MINUTE", "120")),
        )


def configured_port():
    try:
        value = int(os.environ.get("PORT", "8000"))
    except ValueError:
        raise ValueError("Invalid platform port") from None
    if not 1 <= value <= 65535:
        raise ValueError("Invalid platform port")
    return value
