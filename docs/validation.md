# Validation scope and results — Milestone 8A-2

Only invented serving fixtures were used. Historical research metrics remain static, previously approved aggregates; no training, calibration, policy optimization, export regeneration or final evaluation ran.

| Executed check | Result |
| --- | --- |
| Backend and verified native inference | **201 passed**, including 39 focused security/provisioning cases |
| Without approved model root | **49 passed, 152 skipped**; skips are not inference passes |
| pip check | Pass |
| Frontend TypeScript / ESLint / Prettier / production build | Pass |
| Vitest | **72 passed** |
| Production-browser journeys | **11 passed**, zero retries, 13.81 seconds |
| Real Docker build/run | Explicit Linux AMD64; process x86_64, Python 3.12.15, UID/GID 10001 |
| Provider-style private files | Exact hashes, production PORT 10000, Host/CORS and independent module faults pass locally |
| Error/abuse checks | Host 400, input 422, body 413, default-budget 429/Retry-After; readiness remains available |
| Dependency advisory checks | Python 0, npm 0; container 0 critical / 57 high with exposure review |

Docker mounted-export and provider-secret modes both produce fraud **0.0006554509184609327**, action **approve**, and credit RAW **0.24888492804155674**, band **4**. Probability differences from recorded macOS ARM64 are exactly zero. All 19 grouped contributions reconstruct; maximum cross-platform contribution difference **5.551115123125783e-17**, baseline/margin differences zero. Existing margin/contribution tolerance 1e-10 and probability reconstruction tolerance 1e-12 were unchanged. PAY_4=1 remains rejected; explicit PD .2 × LGD .5 × EAD 10,000 returns hypothetical **NTD 1,000**. Frozen policy thresholds and band boundaries remain byte-identical.

Production-browser tests use real local inference for ordinary flows; readiness-fault interception is explicitly labelled in existing journeys. Bulk QA/browser runs use an elevated test-only POST budget so rate control does not obscure functional tests. A separate fresh container tests the actual 120/minute default and returns 429 with Retry-After. No screenshots or build outputs were added to the public candidate; the 14 approved prior screenshots remain unchanged.

The local Docker root and original bundle mount are read-only, with capabilities dropped and no-new-privileges. Secret inputs are mounted read-only, staged privately and verified by unchanged runtime/catalog code. Missing/corrupt fraud and credit inputs each leave the other module ready. Image audit checks all 21 app/lock files, no original research package, sklearn/joblib/pytest, model bytes, data or developer paths in application locations. The image size is **143,694,382 bytes**. Docker configuration lint exits 0 with InvalidBaseImagePlatform warning on the ARM host; actual runtime architecture is verified independently. No ARM fallback occurred.

The host test environment is Python 3.12.2/macOS ARM64; Node 24.22.1/npm 11.19.1. Two test-client dependency deprecations are visible, not suppressed. The patched container uses Python 3.12.15 with identical ML package pins. Prior 7B relocated native validation and 7C emulated AMD64 evidence remain untouched, outside public source.

**NOT EXECUTED:** actual Render/Vercel provisioning/deployment, public HTTPS-domain smoke, native Linux hardware, Windows, Linux ARM64, production performance/load or security certification. Local production-browser passes do not prove production security. See [security assessment](dependency_security.md), [cloud checks](deployment_handoff.md) and [machine-readable results](../release/validation_results.json). Private logs, model-corruption fixtures and preservation ledgers remain outside GitHub source.
