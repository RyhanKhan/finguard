# Public source and privacy review

Milestone 8A-2, extending the approved 8A-1 snapshot, **2026-10-27**. This candidate was copied from verified portable source using an explicit reviewed allowlist. It was not built from the research checkout. There is no `.git` directory, remote, author/config metadata or reachable original commit history. An original application commit digest is retained solely as a nonsecret provenance identifier.

## Included and excluded

The authoritative complete publication inventory is `release/source_inventory.json`; `release/commit_paths.txt` is the exact later staging path list. `release/preparation_allowlist.json` records the 106 initially copied source files and 12 excluded staging-source paths. Every additional notice text is explicitly inventoried by digest in `release/license_text_inventory.json`. Current source hashes take precedence over the initial copy hashes for intentionally adapted documentation/tests.

Included: frontend/application/runtime source, synthetic requests, serving/packaging tests, locks, Docker configuration, safe environment examples, curated aggregate reports, 14 reviewed screenshots, architecture/setup/security/deployment documentation, nonsecret model pins and dependency notices/advisory summaries.

Excluded entirely: the original research checkout/history/config, raw data, split assignments, individual observations/predictions, demographic audits, original model bundles, reservations, sealed evidence, research/exporter tooling, native portable payloads and private 7B/7C proof ledgers, environments, caches and generated builds. The full private excluded-path/preservation ledger is intentionally not published. Package dependency notice texts are not package binaries or private model payloads.

## Review performed

All proposed file bytes were read for inventory/hygiene review and assigned a publication-content category. Application/config review checked environment use, URLs, JSON examples, logging, storage/network paths, model loading and absence of research imports/fitting. Frontend history files contain static aggregates, not browser transaction history. Credit/fraud examples and response fixtures are invented inputs/outputs. Original quarantine positions and real individual explanation examples are absent.

The text scan checks known personal home/temp paths, private keys, token families, credential-bearing URLs, AWS key shapes, forbidden formats/trees and unnecessary record identifiers. A separate private review checked the known developer name and historical row positions; no unintended match was found. Dependency copyrights and dataset authors are intentional published attributions, not private owner details. Hash-like package integrity strings, model/protocol identities and example numeric inputs are not classified as secrets merely for being identifiers.

All **14** screenshots were visually inspected at full-scene resolution: only synthetic demonstrations or approved aggregate research results are visible. They have no browser URL/account chrome, faces/contact details, local paths or identifiable dataset record. PNG chunk/CRC review found **no text or EXIF metadata**; pixel content was reviewed separately. Originals were copied unchanged, not regenerated or redacted in the preserved staging candidate. The per-image review is in `release/screenshots.json`.

Local Markdown links and public-file references are checked for missing targets. Required private bundles are clearly described as separately provisioned, absent and subject to approval; no startup/setup command depends on private research exporters, original paths or missing proof files. Screenshots reflect historical local runs and are not proof that a public deployment exists.

## Limits and decisions

Regexes and inventory hashes do not prove there are no secrets, novel identifying features or vulnerabilities. Manual/structural/content review complements them; it is not a formal privacy audit. Third-party notice text intentionally contains public author names. Native trees remain private pending learned-statistics and license review; no dataset anonymity or differential privacy guarantee is inferred from PCA/native format.

The patched Host defect, updated dependencies and remaining container exposure assessment are documented in [dependency review](dependency_security.md). Passing source hygiene is not production-security or model-distribution clearance. The source auditor defaults to rejecting any Git metadata. A later authorized checkout may explicitly use --allow-git for a source-only check; that mode does not assess or certify history safety. No project software license is selected. Before publication, the owner approves authorship and this exact inventory and authorizes a new clean-history repository. A root software LICENSE and dedicated reporting channel are optional; no permissive license is assumed. No original history is rewritten or attached.
