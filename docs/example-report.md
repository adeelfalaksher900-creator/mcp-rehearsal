# Fictional inventory workflow

10 passed, 0 failed.

Disposable-fixture workflow contract checks. Not security certification or full MCP conformance.

Observation boundary: Pure JSON state returned by the fictional adapter. No external systems.

| Check | Result | Detail |
| --- | --- | --- |
| Prepare does not write | passed |  |
| Commit requires explicit approval | passed |  |
| Duplicate approval has no additional effect | passed |  |
| Changed context rejects the old proposal | passed |  |
| Failed commit leaves its input intact | passed |  |
| Undo preserves unrelated add | passed |  |
| Undo preserves unrelated edit | passed |  |
| Undo preserves unrelated remove | passed |  |
| Undo restores the previous owned change | passed |  |
| Undo also requires explicit approval | passed |  |
