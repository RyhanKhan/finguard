# Fraud research methods and licensing status

FinGuard's public Fraud section presents frozen historical research. Interactive Fraud scoring is not enabled. Credit Risk is the live inference module. This document records existing methods; it is not a declaration of licensing clearance or a claim that the description alone is a complete ODbL section 4.6(b) offering.

## Dataset and attribution

Historical Fraud results contain information derived from [Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud), published by the Machine Learning Group - ULB from its research collaboration with Worldline. Saved publisher metadata retrieved on 2026-10-27 identifies dataset version 3 and the database/content license label. The database is made available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), with contents under [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/). No publisher endorsement is implied.

Citation requested by the publisher: Andrea Dal Pozzolo, Olivier Caelen, Reid A. Johnson and Gianluca Bontempi (2015), *Calibrating Probability with Undersampling for Unbalanced Classification*, IEEE CIDM.

## Actual research transformations

1. Retain original CSV record positions internally. Assign elapsed-Time coverage fractions of 50% development, 15% calibration, 15% policy and 20% test. For start a=min(Time) and end b=max(Time), boundaries are a+[0.50,0.65,0.80]*(b-a). Equal timestamps enter the same later interval. Fractions describe elapsed time, not row counts.
2. Use V1-V28 and Amount as float64 predictors, with Class as the target. Time is excluded from model predictors. V1-V28 are supplied PCA components: FinGuard does not refit the original PCA. The selected LightGBM feature transformation is identity, without scaling, imputation or primary-population deduplication. Exact-profile exclusions were limited to labelled sensitivity calculations.
3. Compare logistic and LightGBM candidates with two forward folds inside development. Those folds use elapsed-time blocks 50/25/25: fit first -> validate second; fit first+second -> validate third. Fit the selected model once on full development.
4. The selected model is LightGBM 4.6.0, binary GBDT, 300 rounds, learning rate 0.03, max depth 4, 7 leaves, minimum child samples 100, scale_pos_weight 10, reg_alpha 0, reg_lambda 1, max_bin 255, full rows/features, seed 42, deterministic CPU execution, one thread and force_col_wise. The published RAW model is not the separately examined sigmoid challenger.
5. Private research archives align original record positions with labels and probabilities. Calibration archives add calibrated scores; policy archives add time blocks; economic assignment tables add Amount and simulated actions. Historical final-test caches preserve frozen scores/actions. No archive is served to portfolio visitors, and no final evaluation is rerun for this presentation.
6. Frozen review/decline thresholds are 0.480177454887009 and 0.9986654773731469. Equality enters the higher-risk action. Thresholds were selected on the policy partition using retrospective observed-label replay, declared hypothetical costs, capacity constraints and deterministic ties. Default assumed review cost is 1 AMU, legitimate-review friction 0.5 AMU, false-decline cost 10 AMU, review effectiveness 80%, decline effectiveness 95%, review capacity 0.5% and decline cap 0.2%. AMU means assumed Amount unit; currency is unspecified. These are invented portfolio assumptions, not bank operating parameters.
7. The public pages display previously frozen aggregates, charts and documented scenario replays. They do not generate live Fraud scores. Future approved inference would apply the frozen trees/policy to a caller-supplied vector without a historical-row lookup or training on requests.

## What the license text supports, and what remains unresolved

ODbL section 4.3 requires a notice for public Produced Works. Section 4.5(b) says making a Produced Work does not itself create a derivative database. Separately, section 4.4(c) can engage obligations for an underlying derivative database when its Produced Work is publicly used. Section 4.6 offers the derivative database or a file containing its alterations/method, including added contents; internet access must be free. DbCL requires ODbL compliance. Education does not itself resolve these conditions.

Treating learned trees, model outputs and aggregate charts as statistical Produced Works is a reasoned interpretation, not an authoritative legal determination. Actual research subsets and score/action tables warrant separate consideration as derivative databases. Private storage does not by itself remove obligations arising from public outputs; historical/static outputs are not a blanket exemption.

The remaining focused question is whether a complete alteration/training/scoring method offering adequately covers added prediction/action contents while frozen weights and individual tables remain private, and what further material or permission is necessary. Attribution and this method summary do not claim to settle that question. Appropriate next steps are a scoped open-data/IP licensing review or clarification from the original publisher. No Fraud weights are uploaded while that issue remains open.

## Interpretation limits

The final test contains only 98 fraud cases over a historical period. Timestamp dependence, upstream PCA provenance and unknown identities limit generalization. Average precision and ROC-AUC describe ranking, not validated probability calibration. Review/decline routing is not measured prevention. Retrospective scenario costs are not causal or realized savings. No American Express affiliation, operational effectiveness or production financial-decisioning claim is made. Credit has its own population, attribution and limitations.
