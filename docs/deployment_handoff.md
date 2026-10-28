# Portfolio deployment handoff

Target: Next.js on Vercel, one Docker FastAPI service on Render, and private fixed-name model files. No database, account system, model registry or persistent disk is needed. Deployment and external model upload have NOT been performed. Local provider-style testing does not establish cloud compatibility.

## Backend configuration

Use the repository-root Dockerfile, Linux AMD64 target, and its pinned Python 3.12.15 slim-trixie AMD64 digest. Keep UID/GID 10001; do not build models into the image. Set the variables in [deploy/render.env.example](../deploy/render.env.example) using the real assigned domains. Render's port is configurable: the launcher listens on `0.0.0.0:$PORT` (default 8000), one worker, concurrency limit 16, five-second keepalive, no access logging, no forwarded-header trust. Render terminates HTTPS. Enable the platform's HTTP-to-HTTPS redirect before public access.

`FINGUARD_ENV=production` requires explicit exact `FINGUARD_ALLOWED_HOSTS` and HTTPS `FINGUARD_CORS_ORIGINS`. Hosts contain no scheme, wildcard or port. Include the assigned onrender.com hostname and any verified custom backend domain actually in use. CORS values are exact frontend origins, without trailing slashes; authorize a stable frontend domain, not all preview deployments. Do not enable proxy-header trust to fix a Host mismatch. Render's health-check Host is a verified custom domain if present, otherwise its onrender.com subdomain ([health-check documentation](https://render.com/docs/health-checks)).

Set health-check path `/health/live` for process liveness; explicitly check `/health/ready` (fraud) and `/v1/credit/ready` (credit) before announcing availability. Credit-only operation may use `/v1/credit/ready` as the platform health gate. The other missing model must remain honestly unavailable. A live process alone does not establish inference readiness.

## Private model provisioning

Render documents a **1 MB combined secret-file limit**. The eight approved portable files total **480,848 bytes**. Use dashboard-managed secret files, not a local Mac bind mount, environment-variable model strings, public URLs or arbitrary archives. Verify permission to host each model first; see [model rights](model_distribution.md). Do not upload files in this milestone.

| Provider secret filename | Canonical runtime file |
| --- | --- |
| fraud-manifest.json | fraud-inference-v1/manifest.json |
| fraud-model.txt | fraud-inference-v1/model.txt |
| fraud-contract.json | fraud-inference-v1/contract.json |
| fraud-policy.json | fraud-inference-v1/policy.json |
| credit-manifest.json | credit-inference-v1/manifest.json |
| credit-model.txt | credit-inference-v1/model.txt |
| credit-contract.json | credit-inference-v1/contract.json |
| credit-bands.json | credit-inference-v1/bands.json |

Use the owner-approved authoritative byte streams without reformatting JSON or normalizing model text. Download/copy them back privately if the provider permits and compare SHA-256 against `release/artifact_inventory.json`; startup verification will reject any changed bytes. The provider's file editor may alter terminal newlines, so do not assume pasting is byte-preserving. Upload through a byte-preserving supported mechanism or correct the provider input from the approved bytes; never change catalog pins to accept edits.

With `FINGUARD_SECRET_FILES_DIR=/etc/secrets`, startup reads only these eight fixed filenames, refuses symlinks/nonregular/multiply linked/oversized inputs, creates canonical files in a private ephemeral `/tmp` directory (0700 directories, 0400 files), and runs the unchanged manifest, payload, runtime and semantic verifiers before native LightGBM parsing. No network download, deserialization endpoint or fitting occurs. Failure removes that module's staging copy and logs only a static unavailable message; the other module can start. Missing both models leaves liveness and explicit scenario arithmetic available. The provider input is read-only; the application UID owns its staging copies, so file mode 0400 is not an immutable-filesystem security claim.

Render exposes secret files at `/etc/secrets` and also places copies at the Docker build-context root. Our default-deny `.dockerignore` excludes all eight names and the Dockerfile copies only runtime/backend source and the lock. Preserve that rule. Never add model contents as build args, broad COPY commands or public build logs. Verify provider file ownership/readability for UID 10001 and regular-file semantics during the first private cloud smoke test; do not weaken verification if the provider representation is incompatible. Fall back to an approved host's private read-only volume if necessary. These cloud-specific checks remain pending.

Sources checked 2026-10-27: [Render secret files](https://render.com/docs/configure-environment-variables), [Docker secret/build behavior](https://render.com/docs/docker). No free-tier, storage availability or price promise is made. Review the actual selected plan's memory, idle/cold-start behavior and cost before creating services. No payment authorization is implied.

## Frontend and public traffic

Import only sanitized source into Vercel, root directory `frontend`, Node 24, build `npm run build`. Set `NEXT_PUBLIC_API_BASE_URL=https://<actual-backend-domain>` before building; it is a public URL, never a credential. The stable Vercel frontend origin must exactly match backend CORS. Rebuild after changing this build-time setting. Static evaluation pages and attribution work without model files; scoring displays unavailable states rather than invented predictions.

The API accepts at most 16 KiB per request body, with a 10-second total body-read deadline. Fraud and credit share an in-memory 120 POST/minute budget, burst 16; excess gets 429 and Retry-After. These single-process demo controls reduce accidental abuse; they do not prevent distributed denial of service. Readiness GETs remain available. The launcher disables request access logs, errors omit values and unexpected field names, and no financial requests are persisted. Check provider logging/retention independently; never enable raw body capture or submit real personal/financial inputs. CORS is a browser policy, not authentication.

## First private cloud smoke, before exposure

1. Confirm hosting rights, actual plan/region/cost, secret-file semantics and exact hashes privately.
2. Confirm x86_64 runtime, non-root UID, no models in image layers, HTTPS and explicit Host/CORS.
3. Check liveness and both intended readiness endpoints. Compare the recorded synthetic fraud/credit scores, policy thresholds, band and all 19 explanation contributions against [validation](validation.md). Check PAY_4=1 rejection and explicit NTD 1,000 scenario.
4. Confirm malformed/unapproved Host returns sanitized 400, forwarded headers grant nothing, oversize gives 413, and rate excess gives 429. Do not change numerical tolerances.
5. Run existing production-browser journeys against actual HTTPS domains; test unavailable states and mobile navigation. Functional tests are not a production security certificate.
6. Keep the backend private/unannounced if an important applicable high/critical risk or model-rights issue remains unresolved. A source/static portfolio can launch separately.
