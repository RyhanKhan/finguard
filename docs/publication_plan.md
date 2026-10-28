# Lean publication checklist

Nothing has been initialized, committed, uploaded, published or deployed from this candidate.

## A. Before GitHub source publication

- Owner approves the sanitized source inventory, authorship and required third-party notices. Review the exact staged inventory, not a whole Downloads directory. No original Git history, model, raw data, private QA evidence, environment or build output belongs in it.
- Run the source audit again. The root LICENSE is optional; leave it absent unless the owner chooses terms. Publicly visible source without a selected license must not be described as open-source licensed. This choice does not block source publication.
- Owner authorizes a fresh repository and actual GitHub remote. Use the new sanitized folder only; never rewrite/push the original research repository.

Later, from this candidate root, with an isolated Python environment and Git installed:

```sh
python3.12 -B scripts/audit_public_source.py
# Run only after authorizing creation of this NEW repository:
git init -b main
git add --pathspec-from-file=release/commit_paths.txt
git diff --cached --check
git diff --cached --name-only
# Compare the preceding inventory exactly to release/commit_paths.txt.
git status --short
python3.12 -B scripts/audit_public_source.py --allow-git
git commit -m "feat: prepare FinGuard portable portfolio demo"
# Set this to the owner's approved actual GitHub repository URL:
git remote add origin "$FINGUARD_APPROVED_GITHUB_URL"
git push -u origin main
```

These commands are recommendations, not executed actions. Set the approved remote variable deliberately; no credential belongs in the URL. The source auditor checks files and heuristics, not a future Git history or every possible secret.

## B. Before publicly exposing backend/models

- Confirm credit provenance/attribution and resolve the specific fraud hosting question, or choose live credit with fraud static only. Do not upload either bundle until authorized.
- Review the current dependency scan and any important applicable unresolved high/critical item. Run the cloud-specific private smoke checks in [deployment handoff](deployment_handoff.md), including non-root secret-file readability, exact hashes, HTTPS, PORT, Host, CORS, readiness and parity.
- Owner selects actual provider plan/cost/region, backend domain and stable frontend origin. Provision the approved bytes privately; never commit them. Configure the public frontend API URL at build time.
- Verify logging excludes request bodies and unexpected errors remain sanitized. Use invented data and clearly retain the research limitations and attribution.

## C. Optional future work

Project LICENSE selection; wheel hashes and apt snapshot pinning; CI; a dedicated security contact; native Linux performance testing; custom domains; provider spend alerts. None is an invented enterprise prerequisite for a static portfolio. Recheck dependency advisories over time. Native Linux/Windows support and real cloud compatibility require their own tests; local browser success is not security certification.
