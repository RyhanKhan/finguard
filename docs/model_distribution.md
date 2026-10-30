# Model hosting and distribution

The public candidate contains serving code, synthetic requests, aggregate reports, approved screenshots and nonsecret checksum identities. It contains no model bytes, raw observations, individual prediction caches, demographics or research execution evidence. Source publication is separable from live model hosting.

| Component | Practical status |
| --- | --- |
| Original FinGuard source | Owner can publish after authorship/secrets review; root LICENSE is optional and currently absent. Do not call it open-source licensed. |
| Third-party code/notices | Keep package notices and attribution; installed dependency licenses remain applicable. Source publication is not distribution of every wheel or image. |
| Credit portable native model | UCI declares CC BY 4.0, permitting sharing/adaptation with attribution. This provides a reasonable licensing basis for a portfolio using the legitimately obtained dataset; owner confirms input provenance and other applicable rights before upload. |
| Fraud portable native model | Kaggle metadata declares ODbL/DbCL. The specific public trained-tree/inference obligations remain materially unresolved; keep it private until clarified, or launch credit live with fraud static only. |
| Raw data/research bundles/caches/reservations | Keep private and excluded. They are unnecessary for serving. |
| Container image | Local only. A future image distribution also requires bundled OS/native-wheel notice compliance; GitHub source publication does not require publishing the image. |

## Credit

[UCI Default of Credit Card Clients](https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients), I-Cheng Yeh (2009), [DOI 10.24432/C55S3H](https://doi.org/10.24432/C55S3H), is offered under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Appropriate credit, a license link, indication of FinGuard's modelling/feature-contract changes and no endorsement implication are included in [ATTRIBUTION.md](../ATTRIBUTION.md) and linked visibly in the UI. No additional commercial permission is inherently required by CC BY. This is a practical reading of the published license, not a claim that the dataset license eliminates privacy or third-party rights.

Confirm the local input's provenance matches that source and retain its attribution. The model accepts financial/repayment fields, does not serve training records, and exposes no model download/upload endpoint. Native trees contain leaf statistics; training-data privacy is not formally proven. Use invented examples, bounded public inference and private payload provisioning. Formal differential privacy or an enterprise certification is not a prerequisite invented for this portfolio.

## Fraud: specific unresolved question

The deployed portfolio uses live Credit and historical Fraud presentation. Its Fraud pages do not contact the scoring endpoint or fabricate predictions. [The method note](fraud_methods.md) documents elapsed-time subsets, the identity feature contract, frozen model parameters and actual private score/action tables. Historical outputs can also engage ODbL sections 4.3-4.6: the new attribution and method description improve transparency but do not assert that every access/share-alike obligation has been discharged. Frozen weights, individual records and research caches remain private.


The [Kaggle dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) metadata labels its rights “Database: Open Database, Contents: Database Contents.” [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) distinguishes a Derivative Database and a Produced Work, with public-use attribution and possible database/access/share-alike conditions (including section 4.6); [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/) grants content rights subject to ODbL compliance. The metadata label does not settle whether this particular trained native tree export or publicly accessible inference output triggers those obligations, or which exact terms accompanied the historical local input.

Before externally provisioning/exposing the fraud model, confirm that provenance and obtain an authoritative clarification of that classification and any required attribution/access/share-alike compliance. Private storage alone does not exempt public inference. No legal prohibition or permission is invented from the label. If the answer remains unclear, do not expose that model: launch the source, aggregate fraud results and screenshots, with optional live credit scoring. Independent readiness already supports that presentation without changing either model or falsifying fraud outputs.

## Technical delivery

Keep both approved four-file native exports outside Git. For the host owner, fixed-name private secret files fit the documented Render limit; exact startup catalog/hash/schema/runtime/semantic verification is unchanged. No public download URL, arbitrary uploaded serialized model, automatic fetching or retraining is added. See [cloud instructions](deployment_handoff.md). Model artifacts remain private pending the owner actions above. Do not treat a generated/ignored model as automatically cleared for redistribution.
