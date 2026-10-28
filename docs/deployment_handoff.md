# Portfolio deployment handoff

Target: Next.js on Vercel, one Docker FastAPI service on Render, and private fixed-name model files. No database, account system, model registry or persistent disk is needed. [Source is public on GitHub](https://github.com/RyhanKhan/finguard), initially published at commit `5054fdf5efe059f07ba63401a852d5c6005863ac`. Deployment and external model upload have NOT been performed. Local provider-style testing does not establish cloud compatibility.

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

Sources rechecked 2026-10-28: [Render secret files](https://render.com/docs/configure-environment-variables), [Docker secret/build behavior](https://render.com/docs/docker). No plan was selected. No free-tier, storage availability or price promise is made. Review the actual selected plan's memory, idle/cold-start behavior and cost before creating services. No payment authorization is implied.

## Frontend and public traffic

Import only sanitized source into Vercel, root directory `frontend`, Node 24.x, install `npm ci`, build `npm run build` (the commands are also in `frontend/vercel.json`). Set `NEXT_PUBLIC_API_BASE_URL=https://<actual-backend-domain>` before building; it is a public URL, never a credential. Vercel supplies `VERCEL=1`; keep system environment-variable exposure enabled. The Next.js config rejects missing/non-HTTPS/loopback API origins, credentials, paths, queries and fragments on Vercel builds. Local production-browser checks can explicitly target the loopback API without VERCEL set. The public client API URL is compiled at build time; there is no alternate runtime settings or secret-provisioning UI. The stable Vercel frontend origin must exactly match backend CORS. Rebuild after changing this build-time setting. Static evaluation pages and attribution work without model files; scoring displays unavailable states rather than invented predictions.

The API accepts at most 16 KiB per request body, with a 10-second total body-read deadline. Fraud and credit share an in-memory 120 POST/minute budget, burst 16; excess gets 429 and Retry-After. These single-process demo controls reduce accidental abuse; they do not prevent distributed denial of service. Readiness GETs remain available. The launcher disables request access logs, errors omit values and unexpected field names, and no financial requests are persisted. Check provider logging/retention independently; never enable raw body capture or submit real personal/financial inputs. CORS is a browser policy, not authentication.

## First private cloud smoke, before exposure

1. Confirm hosting rights, actual plan/region/cost, secret-file semantics and exact hashes privately.
2. Confirm x86_64 runtime, non-root UID, no models in image layers, HTTPS and explicit Host/CORS.
3. Check liveness and both intended readiness endpoints. Compare the recorded synthetic fraud/credit scores, policy thresholds, band and all 19 explanation contributions against [validation](validation.md). Check PAY_4=1 rejection and explicit NTD 1,000 scenario.
4. Confirm malformed/unapproved Host returns sanitized 400, forwarded headers grant nothing, oversize gives 413, and rate excess gives 429. Do not change numerical tolerances.
5. Run existing production-browser journeys against actual HTTPS domains; test unavailable states and mobile navigation. Functional tests are not a production security certificate.
6. Keep the backend private/unannounced if an important applicable high/critical risk or model-rights issue remains unresolved. A source/static portfolio can launch separately.

## Milestone 8B-1: exact platform setup and authorization gates

The local checkout and published main baseline were verified at `5054fdf5efe059f07ba63401a852d5c6005863ac`. This milestone prepares a follow-up local commit; pushing it requires separate approval. The Dockerfile, dependency pins, backend serving code, native payloads and source trust catalog remain unchanged. No image rebuild is needed for documentation/frontend-only changes; reuse the locally verified AMD64 image for synthetic smoke.

There is no authenticated Render/Vercel connector or CLI available in this session, no provider credential in the checked environment, and no standard local provider auth file detected. Browser login state is not accessible or asserted. No account, project, paid plan, service, deployment or secret upload was created. The next cloud action requires the owner to sign in and authorize the intended account/team, project creation, plan/cost and deployment. Do not put tokens in Git or this document.

| Render setting | Value to configure after approval |
| --- | --- |
| Source / branch | `https://github.com/RyhanKhan/finguard`, `main`; explicitly approve pushing the new preparation commit first |
| Service | Docker web service; single instance; owner chooses region and plan |
| Root / Docker context / Dockerfile | Repository root / repository root / `./Dockerfile` |
| Build / start | Dockerfile commands; no custom build/start override |
| Architecture | Linux AMD64 only; pinned AMD64 base and build-time architecture assertion must succeed; verify `x86_64` and UID 10001 in running service |
| Auto-deploy | Disable while preparing; manually deploy only after authorization |
| PORT | `10000`; launcher binds `0.0.0.0` |
| Environment | `FINGUARD_ENV=production`, `FINGUARD_REQUESTS_PER_MINUTE=120`, `OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, `PYTHONDONTWRITEBYTECODE=1` |
| Host | `FINGUARD_ALLOWED_HOSTS` = actual assigned backend hostname plus any verified custom backend domain, comma separated |
| CORS | `FINGUARD_CORS_ORIGINS` = actual stable frontend HTTPS origin, no trailing slash/wildcard |
| Models | `FINGUARD_SECRET_FILES_DIR=/etc/secrets`; fixed names above, only after rights and explicit upload authorization |
| Health | `/health/live`; verify both model readiness routes separately |
| Storage | Ephemeral private `/tmp` staging; no persistent disk requested |

Copy the actual hostname from Render's service domain / `RENDER_EXTERNAL_HOSTNAME` into the explicit Host setting. Do not paste `$RENDER_EXTERNAL_HOSTNAME` as a literal value expecting automatic expansion. If a host cannot build/run the pinned AMD64 base or expose regular, readable secret files to UID 10001, stop and report the exact incompatibility. Do not weaken verification, switch architecture silently or run as root. Render's actual secret-file permissions, newline preservation, effective capabilities/no-new-privileges and runtime architecture remain cloud checks, not inferred from the Mac Docker run. CORS and Host restrictions do not make a public Render service private; do not upload unapproved models to an already reachable service. If supported account access controls are unavailable, provision only after public hosting rights are resolved.

| Vercel setting | Value to configure after approval |
| --- | --- |
| Source | The same sanitized GitHub repository; approve GitHub access for this repo only |
| Framework / root | Next.js / `frontend` |
| Node / install / build | 24.x / `npm ci` / `npm run build` |
| Output / start | Next.js defaults; no static-export directory or custom start command |
| Public API variable | `NEXT_PUBLIC_API_BASE_URL` = actual verified backend HTTPS origin, set before Production build; configure Preview only if separately intended |
| System env vars | Expose platform system variables so the VERCEL build guard runs |
| Private files | None: no model bundle, backend secret, private QA or research directory belongs in the frontend project |

### Deployment order, including domain preflight

Production backend startup deliberately requires an actual frontend HTTPS origin. Therefore reserve/confirm the stable Vercel project domain (or owner-controlled frontend custom domain) as an **administrative preflight**, before starting the backend. Do not substitute a fabricated domain or loosen CORS to work around this dependency. Project reservation itself still requires owner authorization; avoid linking a Git import that triggers an automatic deploy until intended. No frontend deployment is required merely to know an approved stable origin. If the chosen workflow cannot reserve it without deployment, stop for a concrete owner decision.

After those approvals/domains are available:

1. Deploy the source-only backend with exact PORT/Host/CORS; without private model files expect liveness 200, model readiness 503 and explicit scenario arithmetic to work.
2. Resolve the existing hosting-rights question and obtain explicit upload approval. Add only the eight approved fixed-name secret files through a byte-preserving mechanism; saving Render secret files triggers a new deployment. Reverify all manifest/payload hashes after canonical assembly. Do not print contents or repin changed bytes.
3. Confirm both intended models ready and the exact synthetic probabilities/actions/band and all 19 contribution tolerances unchanged. If fraud rights remain unresolved, choose static fraud/live credit rather than exposing fraud without clearance. Credit provenance and attribution still need owner confirmation.
4. Set Vercel's actual backend HTTPS origin and deploy the existing frontend. Its build must reject missing or local API configuration.
5. Confirm the final stable frontend origin matches backend CORS, updating and redeploying the backend if necessary. Add an actual verified backend custom domain to Host if used; frontend domains belong in CORS, not in the backend Host list.
6. Run the existing public HTTPS browser journeys with invented requests; check independent unavailable states, explanations/economics/evidence routes, sanitized errors and 413/429 behavior before announcing a live demo.

Only actual provider-assigned URLs are deployment results. No Render or Vercel URL currently exists for this project in the verified handoff. The example domains in config examples are placeholders, not deployed endpoints.

Pricing is an owner decision: inspect [Render's current pricing](https://render.com/pricing), the chosen service instance's memory/idle/cold-start limits, and [Vercel's current plans](https://vercel.com/pricing) in the authenticated account. No paid plan or charge is approved here. Prior local tests establish functional compatibility, not a measured cloud memory/capacity requirement. Do not promise a free tier or select a plan automatically.

Official configuration references checked 2026-10-28: [Render Docker](https://render.com/docs/docker), [Render web services/PORT](https://render.com/docs/web-services), [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Vercel project configuration](https://vercel.com/docs/project-configuration), [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).
