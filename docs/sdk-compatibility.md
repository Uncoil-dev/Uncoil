# SDK compatibility matrix

The TypeScript and Python SDKs expose equivalent concepts with language-native naming. The package name is `uncoil-sdk` in both registries.

| Capability | TypeScript | Python | Wire field |
| --- | --- | --- | --- |
| Agent run | `traceAgent` | `trace_agent` | `runId` |
| LLM observation | `llmCall` | `llm_call` | `spanType=llm` |
| Tool observation | `toolCall` | `tool_call` | `spanType=tool` |
| Release | `release` | `release` | `release` |
| Environment | `environment` | `environment` | `environment` |
| Session | `sessionId` | `session_id` | `sessionId` |
| End user | `endUserId` | `end_user_id` | `endUserId` |
| Tags | `tags` | `tags` | `tags` |
| Feedback | `client.feedback` | `client.feedback` | feedback endpoint |
| Score | `client.score` | `client.score` | score endpoint |

Existing payloads remain accepted. New context fields are optional during migration. Missing release/environment values are treated as legacy or unattributed rather than fabricated.

Every SDK release must build, pass tests, pass a clean-install smoke test, and use the published package name in its examples.
