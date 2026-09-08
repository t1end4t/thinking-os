# Assistant Dock

- Agent-neutral surface. Codex is the only implemented backend today, so keep labels generic ("Assistant") and show the concrete agent/provider/model as status text.
- State and streaming live in `../../context/useCodexAssistant.ts`; the dock renders only.
- Assistant replies render through `../runtime/MarkdownPreview`. Non-message SDK items (reasoning, commands, tools, plans, file changes, provider notices) render as collapsed activity rows with live progress, not chat bubbles.
- Drag-and-drop attachments are intentionally display-only: chips are reference UI and are never sent. Say so in the composer; do not silently start sending them.
- `assistant.css` maps the panel's own font-size preference; use it instead of hardcoding sizes so the setting scales the whole dock.
- Panel placement is controlled by workspace state, not by a dock button. Conversation switching belongs in the header selector.
- Checks: `npm run lint`, `npm run build`, `node --test src/context/sessions.test.mjs`, `node src/components/assistant/assistant.test.mjs` (optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for a system browser). The UI check starts an isolated Vite server and mocks vault/model traffic; it does not change the user's vault or make paid model calls.
