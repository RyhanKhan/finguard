# Docker backend — verified Linux amd64 target

Milestone 7C built and executed this backend for Linux amd64 under Docker Desktop 28.5.1 on Apple Silicon. The running container reported x86_64, and its LightGBM shared library was verified as x86-64 ELF. This is emulated amd64 validation, not native Linux hardware, Linux ARM64, Windows or capacity certification.

The 8A-2 base pin is recorded in `release/docker_base.json`: Python 3.12.15 slim-trixie, AMD64 manifest SHA-256 `e8a38829209aea82774882e5157e1f7c3e8c8393ff53a697b3580896e57f345c`. A fresh explicit AMD64 build and real inference passed. The image installs locked runtime wheels plus libgomp1/libstdc++6, copies 21 approved app/lock files and runs as UID/GID 10001. The default-deny .dockerignore excludes models, Git, data, tests, frontend, environments, reservations and fixed provider secret filenames.

```sh
docker build --platform linux/amd64 -t finguard-backend:local .
export FINGUARD_INFERENCE_ROOT='/path/to/approved/private/portable-models'
docker run --rm --name finguard-local --platform linux/amd64 \
  --read-only --tmpfs /tmp:rw,nosuid,size=64m \
  --cap-drop ALL --security-opt no-new-privileges=true \
  --publish 127.0.0.1:8000:8000 \
  --mount "type=bind,source=$FINGUARD_INFERENCE_ROOT,target=/models,readonly" \
  finguard-backend:local
```

Mount only approved native exports, readable by UID 10001. Do not make original research bundles public or use them as the model mount. No model bytes enter the build context or image. If emulation/build fails, do not fall back silently to ARM64.

In another terminal:

```sh
docker exec finguard-local uname -m
docker exec finguard-local id
curl --fail http://127.0.0.1:8000/health/live
curl --fail http://127.0.0.1:8000/health/ready
curl --fail http://127.0.0.1:8000/v1/credit/ready
.venv/bin/python -B -m backend.smoke_test
```

HEALTHCHECK is liveness only; verify both readiness routes. Missing/corrupt models produce independent 503 readiness/scoring, while the other model and explicit scenario arithmetic continue. Without bundles the source-only image may be live but is not inference-ready. Use the exact existing catalog and contracts; never retrain or substitute a model to resolve readiness.

The current local image is 143,694,382 bytes. Image metadata and process confirm AMD64/x86_64 under Apple Silicon emulation. App/lock hashes match this candidate, with no research imports, private models, raw data or developer paths in application locations. The original 7C image/evidence remain unchanged. See [validation](validation.md) for exact parity and limitations.

The launcher respects PORT, disables proxy-header trust/access logs, and the healthcheck uses the configured port and approved Host. Configuration lint exits 0 with an InvalidBaseImagePlatform warning on the ARM host; actual target/run are verified independently, without ARM fallback. Build-time root pip warning remains visible. Locks are exact versions, not wheel hashes, and apt repositories remain mutable.

For cloud deployment without local bind mounts, use the opt-in private fixed-name secret files described in [deployment handoff](deployment_handoff.md). Local provider-style tests passed; actual cloud file ownership/semantics/HTTPS still need verification. No registry publication is authorized.
