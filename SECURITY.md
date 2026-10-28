# Security notes

This is a personal ML portfolio demonstration, not a financial decision service. Use invented inputs. Request values are not logged or persisted by the app. Two trusted native model exports are accepted only through operator provisioning and pinned integrity/semantic checks; no public model upload/download exists.

The server applies exact Host allowlists, explicit production HTTPS CORS origins, a 16 KiB body limit, a 10-second body-read deadline and a global single-worker POST budget. It ignores forwarded headers for trust decisions. These are modest demo controls, not authentication or denial-of-service guarantees.

See [dependency status](docs/dependency_security.md), [cloud checks](docs/deployment_handoff.md) and [model rights](docs/model_distribution.md). Do not post credentials, real financial records, private model payloads or exploit-sensitive details in public issues. The owner should choose a private reporting contact before soliciting sensitive reports; none is invented here. No commercial support or response-time promise is made.
