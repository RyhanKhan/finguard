# Portable local startup

Use Python 3.12 and Node 24.22.1, selected independently of any research checkout.
macOS ARM64 and Linux amd64 under Apple Silicon Docker emulation are verified. Native Linux hardware, Linux ARM64 and Windows remain untested.
Dependencies need compatible wheels, package-index access and an OpenMP runtime;
LightGBM on this Mac references libomp. Do not copy a virtual environment or
node_modules between machines.

From the portable source root, create an isolated environment:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-test-lock.txt
.venv/bin/python -m pip install --no-deps --no-build-isolation .
.venv/bin/python -m pip check
```

The test lock includes HTTPX/pytest/build tooling. Production requires only
`requirements-runtime-lock.txt`; `requirements-runtime.txt` declares direct runtime
requirements. These are version locks, not wheel-hash locks. No dependency update
or training is part of normal startup. No sklearn/joblib/research package is needed.

Provision the two approved private exports under one directory, then run:

```sh
export FINGUARD_INFERENCE_ROOT='/path/to/private/portable-models'
PYTHONDONTWRITEBYTECODE=1 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
  .venv/bin/python -m backend.app.launch
```

The model root contains fraud-inference-v1 and credit-inference-v1, each with its
four fixed files. The default is `artifacts/` beneath this portable source root,
which is ignored and not populated by the source snapshot. Operator environment
variables cannot authorize an untrusted manifest. The public HTTP contract exposes
no artifact-path parameters.

In another terminal, with Node 24 selected:

```sh
cd frontend
npm ci
NEXT_TELEMETRY_DISABLED=1 npm run build
NEXT_TELEMETRY_DISABLED=1 npm start
```

Open http://127.0.0.1:3000. NEXT_PUBLIC_API_BASE_URL defaults to
http://127.0.0.1:8000; set it before building if necessary. CORS defaults to localhost
and 127.0.0.1 on port 3000; FINGUARD_CORS_ORIGINS is an operator-only comma-separated
override. No credentials belong in NEXT_PUBLIC variables.

```sh
curl --fail http://127.0.0.1:8000/health/live
curl --fail http://127.0.0.1:8000/health/ready
curl --fail http://127.0.0.1:8000/v1/credit/ready
.venv/bin/python -m backend.smoke_test
FINGUARD_INFERENCE_ROOT='/path/to/private/portable-models' \
  .venv/bin/python -m pytest -q
```

Fraud readiness is /health/ready; credit readiness is /v1/credit/ready. One failure
must not imply zero risk or disable the other module. Explicit scenario arithmetic
works independently. Corrupted/unknown exports return unavailable: never edit the
catalog, substitute models or train a replacement to fix startup.

For startup, change to this portable source root before `python -m backend.app.launch`; the wheel installs the inference runtime, while backend source is loaded from this root.
The installed runtime and operator model root must refer only to the portable copy.
Stop owned backend/frontend processes after testing.

Frontend verification: npm run typecheck, npm run lint, npm run format:check,
npm test, npm run build, then npm run test:e2e with both services running and an
installed Playwright browser. Set FINGUARD_SCREENSHOT_DIR outside the source tree.
See [validation](validation.md) for recorded checks. Without FINGUARD_INFERENCE_ROOT, model-dependent pytest cases explicitly skip; this is not a successful model-inference test. Use a private --basetemp directory for model-corruption fixtures.

The launcher binds all interfaces for container/PORT support. For local-only access use the documented loopback Docker port mapping or an appropriate local firewall. Production requires exact Host and HTTPS CORS configuration; see [cloud handoff](deployment_handoff.md).
