# Adapter contract

The harness consumes a trusted adapter object. It does not load arbitrary adapters from a CLI URL or discover production credentials. Only use disposable fixtures for workflow checks.

All state, receipts, proposals, observations and projections must be finite, acyclic JSON data. Each check calls createState for a fresh isolated fixture. A state-transformer adapter returns new state and leaves its input unchanged. An external sandbox adapter must perform its own isolation/cleanup around a run.

| Member | Contract |
| --- | --- |
| options | At least two distinct, feasible option IDs producing different owned data |
| observationScope | Nonempty description of precisely what the observer sees |
| createState() | Fresh fixture, including an unrelated record that can be edited and removed |
| prepare(state, option) | Proposal without writes |
| commit(state, proposal, {key, confirmed}) | Return {state, receipt}; reject missing approval, stale context or injected service failure |
| undo(state, {confirmed}) | Return restored state; require approval and preserve unrelated changes |
| invalidateContext(state) | Return/apply a changed context while the selected option remains feasible |
| breakService(state) | Return/apply the declared service-rejection condition |
| changeProtected(state, kind) | For add, edit or remove, apply exactly that unrelated-record change and return state |
| observe(state) | Independently read current domain state, or explicitly disclose pure returned-state observation |
| viewOwned(observedState) | Exact JSON projection of the workflow-owned resource and draft, excluding unrelated revision/audit metadata |
| viewProtected(observedState) | JSON projection of unrelated records that must survive |
| classifyError(error) | approval-required, stale-context or service-unavailable only for recognized expected errors; otherwise return unexpected |

All methods except classifyError may return promises. Projections are applied to observed domain state. The returned state's owned projection must agree with the observer after a successful commit. Expected owned snapshots are captured before later writes, avoiding comparison with a moving external observer.

Do not classify any thrown exception as an expected rejection. An authentication failure, missing tool, network timeout or malformed response should fail the check. If your server encodes a domain error as an MCP tool result, inspect isError and the exact domain error before classifying it.

Do not omit timestamps or fields merely to obtain a pass. If a projection excludes volatile metadata, explain why it is outside the owned/protected resource contract. Include draft text and event fields when they matter. Dayweave's projection includes its outing event, venue identifier and full message draft.

The replay test is application-key replay. It does not prove exact-argument transport retry safety. An adapter for a stateful backend must independently observe its effects and handle fixture teardown in finally. The core harness cannot inspect unknown external systems or restore a real account.
