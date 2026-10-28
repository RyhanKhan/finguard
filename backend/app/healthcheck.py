"""Liveness probe follows the configured platform port and trusted Host."""

import urllib.request
from backend.app.settings import Settings, configured_port


def main():
    try:
        settings = Settings.from_environment()
        request = urllib.request.Request(
            f"http://127.0.0.1:{configured_port()}/health/live",
            headers={"Host": settings.allowed_hosts[0]},
        )
        with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(
            request, timeout=3
        ) as response:
            if response.status != 200:
                raise ValueError("Unhealthy")
    except Exception:
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
