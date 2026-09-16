# Template Editing

- Templates are copyable starting points. The assistant dock does not load them automatically.
- Register editor entries in `server/agentEnv.mjs`. Test saves with a temporary directory, never the real templates or vault.
- Checks: `node --test server/agent.test.mjs server/agentEnv.test.mjs`.
