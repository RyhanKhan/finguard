MODEL_VERSION = "fraud-lightgbm-v1"
POLICY_VERSION = "fraud-economic-policy-v1"
FEATURE_SCHEMA_VERSION = "fraud-features-v1"
MODEL_SHA256 = "a630186bef8b8cbd4e45b5c19277e4da54fbe984164051b75e0f887e8c162d0d"
POLICY_SHA256 = "1da15167250fa5ee880b403b789a1e4fbff5d9a9d5c4e7f83ccd1644e11f0cc4"
SCORE_LIMITATION = (
    "Raw LightGBM predict_proba positive-class score; not validated as a "
    "well-calibrated fraud probability."
)
DEMONSTRATION_SCOPE = "Portfolio research demonstration; not a production fraud decision API."
DATASET_SCOPE = (
    "Kaggle credit-card fraud research dataset; V1-V28 are supplied transformed "
    "predictors and Amount is nonnegative in the original unspecified unit."
)
EVALUATION_SCOPE = (
    "Frozen historical development and held-out evaluation; not production validation. "
    "This service reads no datasets, labels, split assignments or prediction caches. "
    "Static thresholds do not guarantee future review or decline capacity."
)
