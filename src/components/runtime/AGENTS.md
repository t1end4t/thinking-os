# Runtime Surface

- `RuntimeSurface.tsx` selects runtime views. `AgentEnvironmentView.tsx` edits local instruction/skill files through the agent-environment middleware.
- Environment's Templates category is a shared library across project scopes. Its editor reads and saves repository-root `templates/*.md`; no project deployment. The `template:assistant-*` entries are the live dock prompts and say so in the editor note; every other template stays a copyable reference with no automatic assistant injection. Keep template badges and save messaging distinct from active config files.
- `MarkdownPreview.tsx` is also used by the assistant dock. Render model text as React nodes, not raw HTML; reject executable link protocols. Dock-specific font scaling belongs in `../assistant/assistant.css`.
- Fenced code uses lowlight's common grammars and React-rendered token nodes. `text`, unknown languages, and blocks above 100,000 characters stay plain; expand grammar coverage or move highlighting off-thread if larger blocks need it. `markdown.css` colors tokens with existing theme variables. Copy always uses the original code, never highlighted markup.
- `CopyButton.tsx` shares clipboard behavior with the assistant's question/response controls. Keep accessible labels and success/failure feedback; never report success if clipboard access fails.
- Checks: `npm run lint`, `npm run build`, `node --test server/agentEnv.test.mjs server/runtime.test.mjs`.
