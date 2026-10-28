# Source-only candidate. Linux amd64 validated under Apple Silicon emulation; models excluded.
FROM python:3.12.15-slim-trixie@sha256:e8a38829209aea82774882e5157e1f7c3e8c8393ff53a697b3580896e57f345c
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    FINGUARD_INFERENCE_ROOT=/models
RUN test "$(dpkg --print-architecture)" = "amd64" \
    && apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 finguard \
    && useradd --uid 10001 --gid 10001 --no-create-home finguard
WORKDIR /app
COPY requirements-runtime-lock.txt ./
RUN python -m pip install --no-cache-dir --only-binary=:all: -r requirements-runtime-lock.txt \
    && python -m pip check
COPY --chown=10001:10001 src/finguard_runtime/ ./src/finguard_runtime/
COPY --chown=10001:10001 backend/__init__.py ./backend/__init__.py
COPY --chown=10001:10001 backend/app/ ./backend/app/
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -m backend.app.healthcheck
CMD ["python", "-m", "backend.app.launch"]
