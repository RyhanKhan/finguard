"""Small ASGI boundaries: exact Hosts, bounded bodies and a global demo budget."""

import asyncio
import ipaddress
import math
import re
import time
from starlette.responses import JSONResponse

MAX_BODY_BYTES = 16 * 1024
BODY_TIMEOUT_SECONDS = 10
NAME = re.compile(
    r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*", re.I
)


def hostname(value):
    """Parse the raw authority, rejecting paths, credentials, duplicates and bad ports."""
    if not value or len(value) > 260 or value != value.strip():
        raise ValueError("Invalid Host")
    if value.startswith("["):
        end = value.find("]")
        if end < 0:
            raise ValueError("Invalid Host")
        host = str(ipaddress.IPv6Address(value[1:end]))
        suffix = value[end + 1 :]
    else:
        host, sep, port = value.partition(":")
        if len(host) > 253 or not NAME.fullmatch(host):
            raise ValueError("Invalid Host")
        host = host.lower()
        suffix = sep + port
    if suffix and (not re.fullmatch(r":[0-9]{1,5}", suffix) or not 1 <= int(suffix[1:]) <= 65535):
        raise ValueError("Invalid Host")
    return host


class HostBoundary:
    def __init__(self, app, allowed_hosts):
        self.app, self.allowed = app, frozenset(allowed_hosts)

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            values = [v for k, v in scope["headers"] if k.lower() == b"host"]
            try:
                if len(values) != 1 or hostname(values[0].decode("ascii")) not in self.allowed:
                    raise ValueError("Invalid Host")
            except (ValueError, UnicodeError):
                return await JSONResponse(
                    status_code=400, content={"detail": "Invalid request host."}
                )(scope, receive, send)
        await self.app(scope, receive, send)


class RequestBoundary:
    """Bound every HTTP body before parsing. A global POST budget needs no user/IP store."""

    def __init__(self, app, requests_per_minute=120):
        self.app = app
        self.rate = requests_per_minute / 60
        self.capacity = min(requests_per_minute, 16)
        self.tokens = float(self.capacity)
        self.updated = time.monotonic()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        if scope["method"] == "POST" and scope["path"].startswith("/v1/"):
            now = time.monotonic()
            self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
            self.updated = now
            if self.tokens < 1:
                return await JSONResponse(
                    status_code=429,
                    content={"detail": "Demo request limit reached. Retry shortly."},
                    headers={"Retry-After": str(max(1, math.ceil((1 - self.tokens) / self.rate)))},
                )(scope, receive, send)
            self.tokens -= 1
        parts, size = [], 0
        try:
            async with asyncio.timeout(BODY_TIMEOUT_SECONDS):
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    body = message.get("body", b"")
                    size += len(body)
                    if size > MAX_BODY_BYTES:
                        return await JSONResponse(
                            status_code=413, content={"detail": "Request exceeds the 16 KiB limit."}
                        )(scope, receive, send)
                    parts.append(body)
                    if not message.get("more_body", False):
                        break
        except TimeoutError:
            return await JSONResponse(
                status_code=408, content={"detail": "Request body timed out."}
            )(scope, receive, send)
        pending = True

        async def replay():
            nonlocal pending
            if pending:
                pending = False
                return {"type": "http.request", "body": b"".join(parts), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)
