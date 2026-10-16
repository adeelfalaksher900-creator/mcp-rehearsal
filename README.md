# MCP Rehearsal

Test approval and recovery contracts before an MCP workflow reaches a person.

An assistant can prepare a plausible action, then receive a duplicate request or discover that the world has changed. Undo can also overwrite a record someone edited afterward. MCP Rehearsal makes those application behaviors repeatable in disposable fixtures.

It provides two separate entry points:

- A ten-check workflow harness using an adapter and explicit observation boundary. It executes configured writes and undo against disposable fixtures.
- A read-only official-SDK probe for MCP 2025-11-25 initialization, the initialized notification, negotiated headers and first-page tool discovery. It never calls a tool.

This is an independent MIT-licensed project created during the 2026 Amazon Developer Hackathon, alongside the Dayweave Alexa+ simulation. It is not an Amazon or MCP-maintainer product. It has not been published to npm.

## Run

Requires Node.js 24.15+ or 22.22.2+ and npm. No account, API key or paid service is needed for the examples.

```sh
git clone https://github.com/adeelfalaksher900-creator/mcp-rehearsal.git
cd mcp-rehearsal
npm ci
npm test
npm run demo
```

The working inventory example passes ten workflow checks. This intentionally broken version exits with code 1 and fails three separate undo checks:

```sh
npm run demo:bug
```

For a server you are authorized to inspect, the probe only initializes and lists tools:

```sh
node bin/rehearse.mjs --probe https://your-server.example/mcp
```

HTTP is accepted only for loopback servers. URLs containing credentials, query parameters or fragments are refused. Authentication can be supplied programmatically through an authorized fetch wrapper. Keep credentials out of code, command arguments and reports. The probe does not perform account linking or OAuth onboarding.

## Reuse the harness

```js
import {rehearseWorkflow, formatMarkdown} from './src/index.mjs';
import {fixtureAdapter} from './examples/fixture.mjs';

const report = await rehearseWorkflow(fixtureAdapter(), {name: 'Inventory'});
console.log(formatMarkdown(report));
process.exitCode = report.failed ? 1 : 0;
```

Implement the adapter contract in [docs/ADAPTERS.md](docs/ADAPTERS.md) to exercise your own workflow. [The example report](docs/example-report.md) contains no state snapshots or credentials.

| Check | Evidence required |
| --- | --- |
| Prepare without writes | Input and independent observer remain unchanged |
| Explicit commit approval | Recognized approval rejection, then a successful approved change |
| Duplicate-key replay | State, observer and receipt have no additional change |
| Stale but feasible context | Old proposal rejected, fresh proposal succeeds |
| Injected service rejection | Working baseline, classified failure, no observed change |
| Undo after unrelated addition | Added record survives |
| Undo after unrelated edit | Edited value survives |
| Undo after unrelated removal | Removed record stays absent |
| Undo a replacement | Exact previous owned projection is restored |
| Explicit undo approval | Rejection preserves state, confirmed undo works |

Positive controls reject always-error and no-op adapters. Unexpected connection, schema or timeout errors do not establish an intended approval or freshness rejection. The adapter must classify only the exact errors it understands.

## What the results mean

These are configured **application contracts**, not requirements MCP imposes on every tool. The protocol leaves the interaction model open. A boolean approval flag does not prove a human consented. Tool annotations are hints, not behavioral proof.

The replay check uses the same application idempotency key against advanced state. This differs from MCP's idempotency hint about repeated identical arguments and environmental effects.

The observer and projections define the evidence boundary. A pure state adapter covers returned/client-applied JSON only. To cover an external sandbox, the observer must independently read that sandbox. The included example has no external effects. Rejection preservation for an injected precondition does not establish crash consistency, partial-write rollback, authorization or production safety.

The current profile does not test another actor modifying the same owned resource, distributed concurrency, long-running tasks, protocol pagination, every transport/version combination, model quality or real human interaction. Passing is not a security certification or full MCP conformance result.

## Dayweave integration

Dayweave vendors the versioned source and runs it against its real SDK-based MCP Request/Response handler. Its adapter keeps the original $28 outing feasible while changing a $40 budget to $39, and injects independent appointment additions, edits and removals before undo. The observation boundary is the stateless server's returned/client-carried fictional state, not browser localStorage or a real calendar service.

Primary project: https://github.com/adeelfalaksher900-creator/dayweave (private reviewer access required). Dayweave's testing instructions include the runnable adapter and reports. MCP Rehearsal is the separate public contribution.

## Development and research

The 16 self-tests include official SDK integration, deliberately broken workflows, independent-observer failure, classified rejection, deterministic output and CLI exit behavior. Source dependencies are pinned in package-lock.json. No telemetry is sent by the harness. The probe contacts only the endpoint explicitly supplied by its caller.

The [official MCP Inspector](https://github.com/modelcontextprotocol/inspector) provides general server inspection. MCP Rehearsal focuses on repeatable application approval/recovery contracts.

References:

- [MCP tools and interaction model, 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [Hackathon rules](https://amazonappdev2026.devpost.com/rules)

Codex assisted design, source implementation, tests and documentation under Adeel Falak Sher's project direction. No Amazon runtime, user study or external adoption is claimed.

## License

MIT. The official MCP SDK and its dependencies retain their own licenses.
