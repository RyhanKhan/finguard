# FinGuard — curated published fraud aggregates

Aggregate-only excerpt of the completed frozen historical evaluation. No individual
observations, prediction arrays, research execution commands or sealed artifacts
are included. These are copied published figures, not a rerun or live evaluation.

Original model: fraud-lightgbm-v1. Frozen policy: fraud-economic-policy-v1.
Original evaluation protocol SHA-256:
081a626c7e5a86c05ef77ea5297bad95ec8883c782246ac35af515a6f7c156ac

| Final-test metric | Published result |
| --- | ---: |
| Transactions | 73,766 |
| Fraud | 98 |
| Average precision | 0.641268 |
| ROC-AUC | 0.963003 |
| Brier | 0.001030958 |
| Log loss | 0.007075619 |
| Mean raw score | 0.365674% |
| Observed prevalence | 0.132853% |

Mean risk exceeds prevalence; ranking quality does not prove calibrated fraud
probabilities. Development mean AP 0.794298 and policy AP 0.579781 describe separate
historical populations and are not interchangeable final-test results.

| Frozen routing | Total | Fraud | Legitimate | Fraud amount (AMU) |
| --- | ---: | ---: | ---: | ---: |
| Approve | 73,638 | 23 | 73,615 | 2760.79 |
| Review | 76 | 32 | 44 | 3012.89 |
| Decline | 52 | 43 | 9 | 5824.14 |

Review threshold 0.480177454887009; decline threshold 0.9986654773731469.
Equality enters the higher action. Routing is not measured prevention.

| Fixed historical review budget | Selected | Fraud captured |
| --- | ---: | ---: |
| 0.1% | 74 | 51 |
| 0.5% | 369 | 79 |
| 1% | 738 | 80 |

| Assumed-cost scenario | Approve-all AMU | Reference AMU | Frozen selected AMU |
| --- | ---: | ---: | ---: |
| Default | 11597.82 | 4073.1795 | 3,842.5750 |
| Higher customer costs | 11597.82 | 4717.6795 | 4119.575 |
| Weaker intervention | 11597.82 | 6721.475 | 6503.766 |

These are hypothetical costs under documented intervention/customer assumptions
and unspecified dataset amount units (AMU), not realized savings or verified
currency. No thresholds are reoptimized by the UI. Small positive samples,
chronological dependence, historical transfer, upstream PCA uncertainty and
imperfect probability quality limit interpretation. No production, compliance,
fairness, latency or causal-effect claim is made.
