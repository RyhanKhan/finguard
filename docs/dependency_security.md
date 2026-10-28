# Dependency security review — Milestone 8A-2

Review date: **2026-10-27**. The confirmed Host sanitization defect is fixed and covered by regressions. The seven earlier Starlette advisories are patched. No important high/critical issue was confirmed reachable through the current bounded JSON scoring API. The remaining native/base matches are retained below for an explicit, limited exposure assessment, not silently waived or described as fixed. No public deployment has occurred.

## Small compatible changes

- FastAPI **0.115.12 → 0.135.0**. The previous release capped Starlette below 0.47; the selected release's [published dependency metadata](https://pypi.org/pypi/fastapi/0.135.0/json) permits the patched Starlette. This avoids the newer mandatory telemetry dependency set.
- Starlette **0.46.2 → 1.3.1**, the minimum release covering all seven previously reported issues, per [maintainer release notes](https://starlette.dev/release-notes/). Add required `annotated-doc==0.0.4`. Runtime and test locks agree; pip check and all backend tests pass.
- Official pinned **Python 3.12.12 slim-bookworm → 3.12.15 slim-trixie**, AMD64 manifest recorded in `release/docker_base.json`. The refreshed Debian base addresses the old fixed high/critical package families without mixing unstable distribution packages.
- LightGBM 4.6.0, NumPy 2.2.6, SciPy 1.14.1, pandas 2.2.3 and every frozen model/contract pin are unchanged. No dependency source patch or warning suppression was used.

The ASGI Host boundary rejects malformed, duplicate and unapproved raw Hosts with static 400 JSON. Error classification now uses raw scope paths and sanitizes unexpected field names for fraud and credit. Production requires exact Hosts/HTTPS origins, and the launcher disables forwarded-header trust. All request bodies, including fraud and chunked uploads, are bounded to 16 KiB before JSON parsing with a ten-second deadline. A single-worker global POST budget defaults to 120/minute, burst 16; concurrency is limited to 16. No user/IP record store, raw financial input logging or persistence was introduced.

## Repeat scans

| Scan | Earlier 8A-1 | Current 8A-2 |
| --- | ---: | ---: |
| Python runtime pins / advisories | 21 / 7 | 22 / **0** |
| npm lock entries / advisories | 333 / 0 | 333 / **0** |
| Container critical matches | 17 | **0** |
| Container high matches | 159 | **57** |
| Distinct critical/high IDs | 90 | **14** |

Current container also reports 59 medium, 11 low and 47 negligible matches: 174 total. All 57 high matches are Debian source-to-binary matches; 56 are labelled won't-fix/no-dsa and one not-fixed in this DB. There are no reported fixed high/critical matches left in the current Trixie scan. Scanner severity is preserved even where Debian treats an issue as minor. None of these labels alone establishes API reachability or a false positive.

Methods: npm 11.19.1 audit; pip-audit 2.10.1 `--no-deps --disable-pip` over the 22 pins; Grype 0.121.0 / Syft 1.55.0 against the new local AMD64 final filesystem, updates and external lookups disabled. Advisory DB schema v6.1.10 built 2026-10-27T06:30:41Z, archive SHA-256 `16a9163729d925edbf911db3542666748f06ddb2ce541211a4f1314349e20442`. Public package versions only were queried for npm/PyPI. Docker Scout was not executed; its earlier auto-review rejection for potential SBOM transmission was not bypassed. No image, source, model or private SBOM upload occurred. A new all-layer scan is not claimed. Docker configuration check exits 0 but reports an AMD64-base/platform lint warning on the ARM host; actual build, image metadata, x86_64 process and real inference establish the target independently.

## Remaining high matches: conditions and current scope

Each linked Debian record was reviewed. These are source/API/configuration exposure assessments, not exhaustive dynamic native-code proofs.

| IDs / affected family | Required condition and portfolio assessment |
| --- | --- |
| [CVE-2026-82560](https://security-tracker.debian.org/tracker/CVE-2026-82560), [CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538) — Perl | Malicious POD formatting or Perl tar parsing. Serving invokes no Perl or archive handling and accepts fixed JSON fields only. |
| [CVE-2025-69720](https://security-tracker.debian.org/tracker/CVE-2025-69720) — ncurses | Crafted input to infocmp. No command/terminal-description execution from HTTP inputs. |
| [CVE-2026-85091](https://security-tracker.debian.org/tracker/CVE-2026-85091) — zlib | Specific nonblocking gzwrite/gzprintf state. The app has no gzip-writing/compression endpoint or middleware. Debian and upstream affected-range descriptions differ; keep the finding rather than declaring a false positive. |
| [CVE-2026-95619](https://security-tracker.debian.org/tracker/CVE-2026-95619) — libstdc++ | Huge aligned allocation overflow. Native scoring uses a fixed single-row 29/76-feature contract and a fixed trusted tree; submitted values do not set allocation sizes. No triggering path identified. |
| [CVE-2026-102010](https://security-tracker.debian.org/tracker/CVE-2026-102010) — libstdc++ | Particular binary-heap erase_if path. The API exposes frozen prediction/contribution calls, no training, heap controls or arbitrary native calls. Native indirect paths are not formally proven absent. |
| [CVE-2026-19499](https://security-tracker.debian.org/tracker/CVE-2026-19499), [CVE-2026-5435](https://security-tracker.debian.org/tracker/CVE-2026-5435) — glibc | Specific strfmon formatting or deprecated DNS-record printing. App formats neither locale-money buffers nor DNS debug records from request input. Debian marks these minor/no-dsa. |
| [CVE-2026-76642](https://security-tracker.debian.org/tracker/CVE-2026-76642), [CVE-2026-78408](https://security-tracker.debian.org/tracker/CVE-2026-78408), [CVE-2026-78409](https://security-tracker.debian.org/tracker/CVE-2026-78409), [CVE-2026-78410](https://security-tracker.debian.org/tracker/CVE-2026-78410) — util-linux | Privileged mount/namespace hooks and local attacker-controlled paths. No HTTP shell/mount operation, non-root UID, no-new-privileges and all capabilities dropped in local Docker validation. Verify equivalent host restrictions before public launch. |
| [CVE-2026-54369](https://security-tracker.debian.org/tracker/CVE-2026-54369), [CVE-2026-54370](https://security-tracker.debian.org/tracker/CVE-2026-54370) — libacl | Privileged ACL/path operations over attacker-controlled paths. App exposes no ACL/path controls or privileged subprocess. |

Retain exact package versions, IDs and fix status in [container findings](../release/container_advisories.json). Do not mix Debian unstable packages or rewrite ML/native library code merely to make the scanner zero. A newly discovered applicable important high/critical path is a deployment blocker, not an accepted consequence of this table. Reassess if routes, compression, shell/filesystem operations, native model trust or container privileges change. Provider logging, TLS, resource limits and security configuration still require a private cloud smoke check. This scoped portfolio assessment is not a claim of production security, exhaustive exploit testing or vulnerability-free software.
