# Contributing

Run npm ci and npm test on a supported Node version. Add a deliberately broken adapter that reproduces the behavior you want checked, then verify the working example still passes. Keep reports deterministic and free of state payloads or credentials.

Application-specific cases belong in adapters. Keep protocol probing read-only and label its limited coverage. Describe the observation boundary and expected rejection categories in examples. Include setup and cleanup when using an external disposable sandbox.

Please include a minimal fictional fixture, expected result and actual result in bug reports. Do not post real household data, tokens or private server logs.
