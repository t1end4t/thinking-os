# Workspace State

- `WorkspaceContext.tsx` owns domain mutations and vault snapshot load/save. Preserve cross-surface state and existing normalization when editing it.
- `useCodexAssistant.ts` owns real agent chat, separate from the legacy simulated assistant actions still in `WorkspaceContext.tsx`. It sends typed text, validated uploaded-image references, and routing fields (agent, conversation, thread, provider, model, directory). Attached research context is deliberately not sent. Image references persist on user messages; image bytes stay in the local assistant image store.
- Conversations persist per assistant project directory in `localStorage`, using the existing workspace-keyed format with `threadId` for SDK resume. `parseSessions` validates stored data and throws rather than overwriting unreadable history; keep that behaviour and its test.
- `useCodexAssistant` also owns the saved folder list (`thinking_os_assistant_projects_v1`). The research workspace is always the default project, selected on reload or workspace change. Project selection changes only assistant routing/history, never vault load/save. Removing a project keeps its chats and filesystem contents; unreadable project storage must not be overwritten. Switching or changing projects is blocked during streaming.
- Persisted session state tracks `openIds` (tab strip) separately from `sessions` (saved history); vaults stored before this field open every conversation. `closeSession` only drops a tab, `deleteSession` erases the record, and both pick a neighboring tab and refuse to run during streaming.
- Assistant preferences (panel font size, provider, model) are UI-level choices layered over local Codex config; never store credentials.
- SDK types are type-only imports; the SDK runtime stays server-side.
- Checks: `npm run lint`, `npm run build`, `node --test src/context/sessions.test.mjs`, `node --test server/agent.test.mjs`.
