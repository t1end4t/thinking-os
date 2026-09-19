# Local Middleware

- `agentEnv.mjs` exposes fixed instruction-template IDs alongside active configs. Templates read and save repository-root `templates/<slug>.md`, resolved relative to the module, with the existing backup/atomic-write path. Missing templates report a read error; there is no embedded or home-directory fallback. Only the four `assistant-*.md` files are active dock prompts; all other templates remain copyable references. Never include templates in vault snapshot synchronization. Tests inject a temporary template directory rather than editing repository files. Checks: `node --test server/agentEnv.test.mjs`.

- Vite loads these plugins for development and preview; there is no standalone API server.
- `agent.mjs` serves `/api/assistant` for the assistant dock. It is agent-keyed (`agent: 'codex'` today) so other backends can be added without changing the client contract.
- Assistant mode is explicit. `chat` wraps each turn with vault/research behavior and sanitized object references. `codex` and legacy requests with no mode send the typed message unchanged.
- Codex runs through `@openai/codex-sdk` with the installed `codex` executable, local login/config, and fixed `9router` provider. Provider/model controls and custom endpoint discovery do not belong in the app UI or request contract.
- Codex inherits local sandbox, approval, login, instructions, model, and other configuration through the normal SDK path. The app overrides only the `9router` provider and working directory. Assistant turns and vault HTTP reads/writes share a per-directory queue, including symlink aliases. Vault saves require the revision returned by the last successful read/save (`If-Match`); reject stale snapshots with 409 before touching files. Locks cover one Vite process: do not run multiple servers against the same vault. Direct `readVault`/`writeVault` calls do not acquire the HTTP queue.
- A turn holds its directory lock until the SDK iterator exits, including failure or abort. Never release it merely because the client disconnects. During a turn, the agent verifies files directly; vault HTTP reads wait until it finishes.
- Loopback, same-origin JSON only. Do not reuse the permissive legacy runtime/vault guards.
- Threads are keyed by directory and conversation. `threadId` resumes the SDK session. Stream NDJSON and abort on disconnect, timeout, or shutdown.
- Checks: `node --test server/agent.test.mjs`, `node --test server/vault.test.mjs`, `npm run build`.
