# Runtime Surface

- `RuntimeSurface.tsx` selects runtime views. `AgentEnvironmentView.tsx` edits local instruction/skill files through the agent-environment middleware.
- `MarkdownPreview.tsx` is also used by the assistant dock. Render model text as React nodes, not raw HTML; reject executable link protocols. Dock-specific font scaling belongs in `../assistant/assistant.css`.
- Checks: `npm run lint`, `npm run build`, `node --test server/agentEnv.test.mjs server/runtime.test.mjs`.
