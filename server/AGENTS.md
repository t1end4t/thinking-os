# Local Middleware

- `agentEnv.mjs` exposes fixed instruction-template IDs alongside active configs. Templates read and save repository-root `templates/<slug>.md`, resolved relative to the module, with the existing backup/atomic-write path. Missing templates report a read error; there is no embedded or home-directory fallback. Never activate templates or include them in vault snapshot synchronization. Tests inject a temporary template directory rather than editing repository files. Checks: `node --test server/agentEnv.test.mjs`.

- Vite loads these plugins for development and preview; there is no standalone API server.
- `agent.mjs` serves `/api/assistant` for the assistant dock. It is agent-keyed (`agent: 'codex'` today) so other backends can be added without changing the client contract.
- Codex runs through `@openai/codex-sdk` with the installed `codex` executable, inheriting local login and config. `GET` exposes only non-secret provider/model names parsed from `config.toml`; never return credentials or `env_key` values.
- The assistant inherits local Codex sandbox/approval config. Agent file edits can race vault snapshot autosave (`writeVault` deletes absent entities).
- Loopback, same-origin JSON only. Do not reuse the permissive legacy runtime/vault guards.
- Threads are keyed by directory, conversation, model, and provider; `threadId` resumes an SDK session. Stream NDJSON and abort on disconnect, timeout, or shutdown.
- Checks: `node --test server/agent.test.mjs`, `node --test server/vault.test.mjs`, `npm run build`.
