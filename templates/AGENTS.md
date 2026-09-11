# Template Editing

- Only `assistant-conversation.md`, `assistant-chat.md`, `assistant-work.md`, and `assistant-codex.md` are live dock prompts. Other templates require explicit installation.
- Keep Chat and Work reasoning in their shared conversation file; mode files describe only their action differences. Sandbox settings stay in `server/agent.mjs`.
- Register editor entries in `server/agentEnv.mjs`. Test saves with a temporary directory, never the real templates or vault.
- Checks: `node --test server/agent.test.mjs server/agentEnv.test.mjs`.
