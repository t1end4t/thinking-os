# Template Editing

- Templates are copyable starting points. `assistant-chat.md` is the repository fallback; a workspace `agents/chat.md` overrides it.
- Register editor entries in `server/agentEnv.mjs`. Test saves with a temporary directory, never the real templates or vault.
- Checks: `node --test server/agent.test.mjs server/agentEnv.test.mjs`.
