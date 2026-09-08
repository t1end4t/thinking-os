# Local Middleware

- Vite loads these plugins for development and preview; there is no standalone API server.
- `agent.mjs` serves `/api/assistant` for the assistant dock. It is agent-keyed (`agent: 'codex'` today) so other backends can be added without changing the client contract.
- Codex runs through `@openai/codex-sdk` with the installed `codex` executable, inheriting local login and config. `GET` exposes only non-secret provider/model names parsed from `config.toml`; never return credentials or `env_key` values.
- Read-only sandbox and no escalation are intentional overrides: vault snapshot autosave cannot safely coexist with agent file edits.
- Loopback, same-origin JSON only. Do not reuse the permissive legacy runtime/vault guards.
- Threads are keyed by directory, conversation, model, and provider; `threadId` resumes an SDK session. Stream NDJSON and abort on disconnect, timeout, or shutdown.
- Checks: `node --test server/agent.test.mjs`, `node --test server/vault.test.mjs`, `npm run build`.
