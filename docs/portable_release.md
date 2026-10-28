# Portable inference architecture

The separately versioned native export is a serving representation of the frozen research models. It does not alter, overwrite or replace the original research bundles. This source distribution contains the runtime and trust catalog, not the exports or research environment.

The `finguard_runtime` namespace has no import of original research, sklearn or joblib. It uses fixed JSON contracts plus trusted native LightGBM text. Fraud retains 29 inputs, identity preprocessing and the exact frozen policy. Credit retains 19 raw inputs, 13 financial passthrough fields and 63 full one-hot indicators: 76 transformed features mapped back to 19 explanations. Unsupported repayment codes, including PAY_4=1, fail before encoding. Five bands use four exact frozen boundaries, with equality in the lower band.

RAW API scores are uncalibrated positive-class probabilities, not `raw_score=True` margins. Credit native contributions add in margin/log-odds units; their logistic transform reconstructs the score. Scenario arithmetic accepts explicit PD, LGD and EAD independently of model readiness. No credit lending decision or fraud feature-attribution endpoint exists.

## Integrity and relocation

Each external bundle contains exactly four fixed files:

- Fraud: manifest.json, model.txt, contract.json, policy.json.
- Credit: manifest.json, model.txt, contract.json, bands.json.

The source catalog pins manifest digests. The verifier checks this trusted pin before trusting the payload inventory, then checks every payload digest/size, strict JSON schema, regular files/no links, runtime versions, feature names, tree counts, objective and frozen policy/vocabulary/band semantics. Verified bytes are passed to the native parser without a second disk read. A checksum delivered only inside an untrusted archive cannot establish provenance.

Operator `FINGUARD_INFERENCE_ROOT` controls location; request parameters cannot select a model path. No absolute developer path, training data, split manifest, individual prediction archive, demographic audit, calibration object or sealed evidence is required. There is no startup fitting, fallback model or artifact download. Model verification failures disable only the affected module. Arithmetic scenarios and liveness remain independent.

The original pipeline and policy identities remain in `model_sha256`/`policy_sha256`. `native_model_sha256`, `portable_manifest_sha256` and `portable_release_id` identify the serving export. These are nonsecret identity references, not permission to distribute model payloads. Checksums provide meaningful integrity relative to a trusted source catalog; they do not protect against malicious edits to both code and catalog or make arbitrary native model files safe to parse.

## Serving boundaries

Pydantic rejects extra/nonfinite/invalid fields. A shared ASGI boundary bounds request bodies to 16 KiB, including fraud/chunked input, with a ten-second body-read deadline. Validation errors omit values/context and sanitize unexpected field locations for both modules. Exact Host allowlists and explicit production HTTPS CORS origins are required; forwarded headers confer no trust. The single-worker launcher supports platform PORT, concurrency 16 and a global 120 POST/minute budget, burst 16. CORS is not authentication; these are small demo controls rather than enterprise denial-of-service protection. No application financial-input logging or persistence is implemented; platform logs remain an operator concern.

Opt-in `FINGUARD_SECRET_FILES_DIR` stages fixed-name operator files privately and runs the unchanged catalog/hash/schema/runtime/semantic verifiers. It does not redefine the portable export or alter original research verifiers. See [cloud provisioning](deployment_handoff.md) for exact names, provider limitations and pending actual-cloud checks.

Exact synthetic probabilities/actions/bands were preserved on macOS ARM64 and Linux amd64 emulation. Contribution/margin tolerance is 1e-10; reconstruction probability tolerance is 1e-12. See [validation](validation.md), [startup](local_startup.md) and [distribution status](model_distribution.md). Research exporters and private preservation ledgers are intentionally excluded from public source.
