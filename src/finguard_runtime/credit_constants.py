MODEL_VERSION = "credit-lightgbm-v2"
MODEL_SHA256 = "0f59dd17123ca85864bc018b6800e588d8e0c8eca09901082473d3445c537412"
API_SCHEMA_VERSION = "credit-api-v1"
BAND_VERSION = "credit-risk-segmentation-v1"
WARNINGS = [
    "Historical next-month payment-default research estimate among existing cardholders; not a validated production PD or underwriting probability.",
    "Frozen relative-risk bands are research segments, not verified regulatory credit grades. No approval, denial or other lending decision is provided.",
    "Historical data, repeated profiles, unknown borrower/time dependence and sparse probability bins limit transfer and calibration; no fairness or compliance certification.",
]
EXPLANATION_WARNINGS = [
    "Contributions and baseline use model margin/log-odds units, not additive probability changes.",
    "Model mechanics are not causal effects or verified adverse-action reasons; no regulatory compliance conclusion.",
]
SCENARIO_WARNINGS = [
    "All inputs and returned amounts are hypothetical assumptions, not measured PD, LGD, EAD or realized losses.",
    "Not a charge-off prediction, actual bank savings or regulatory capital estimate. No credit limit is inferred as exposure.",
]
NATIVE_WARNINGS = [
    "Contributions describe fitted model mechanics, not causal drivers or legally adequate adverse-action reasons.",
    "Native contributions and baseline are on the margin/log-odds scale, not additive probability changes.",
    "Raw default scores are not established calibrated production PDs; relative bands are not regulatory grades.",
    "Repayment codes -2 and 0 have no invented meaning; correlated histories complicate attribution.",
    "Historical single population, no chronological validation or borrower independence; repeated profiles and prior policy use limit independent validation.",
    "Demographic exclusion does not prove fairness; descriptive subgroup disparities do not establish discrimination, causality or compliance.",
]
