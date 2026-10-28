# FinGuard: published credit research aggregates — Milestone 5F-v2

Source: curated aggregates from the frozen Milestone 5F-v2 report; original research evidence remains private.
This is a static aggregate excerpt, not a live evaluation or individual dataset.

Original observations: 6,001. Supported/evaluated: 6,000. Unscorable: 1.
Supported-population defaults: 1,274; nondefaults: 4,726.
Full-original-population performance is unavailable.

ROC-AUC 0.775807; average precision 0.534170; KS 0.425234;
Brier 0.132728; log loss 0.424144.

Frozen-band observed default rates: very low 5.224%, low 10.356%,
medium 14.759%, high 24.400%, very high 54.365%.

Fixed top-10% historical review: 600 accounts flagged, 406 defaults captured,
67.667% precision and 31.868% recall. Flags are not prevented defaults or savings.

These figures apply only to the historical supported population, not a new API
submission. One original observation was unscorable. This was not chronological
or borrower-independent validation. RAW scores are not validated production PDs,
regulatory grades or underwriting recommendations. No fairness/compliance
certification, lending decision or causal intervention impact is established.

Metric uncertainty, profile-overlap sensitivity, frozen methods and limitations
are documented in the source report. No prediction arrays, labels, demographics
or final-test artifacts are runtime dependencies of this frontend.
