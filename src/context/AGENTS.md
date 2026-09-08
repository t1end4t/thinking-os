# Workspace State

- `WorkspaceContext.tsx` owns domain mutations and vault snapshot load/save. Preserve cross-surface state and existing normalization when editing it.
- `useCodexAssistant.ts` owns real agent chat, separate from the legacy simulated assistant actions still in `WorkspaceContext.tsx`. It sends only the typed message plus routing fields (agent, conversation, thread, provider, model, directory). Attached research context is deliberately not sent.
- Conversations persist per workspace directory in `localStorage`, with `threadId` for SDK resume. `parseSessions` validates stored data and throws rather than overwriting unreadable history; keep that behaviour and its test.
- Assistant preferences (panel font size, provider, model) are UI-level choices layered over local Codex config; never store credentials.
- SDK types are type-only imports; the SDK runtime stays server-side.
- Checks: `npm run lint`, `npm run build`, `node --test src/context/sessions.test.mjs`, `node --test server/agent.test.mjs`.
