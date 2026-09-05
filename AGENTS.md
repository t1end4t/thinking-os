# Thinking OS Agent Guide

## Product

Thinking OS is a single-user, local-first research workspace. Its purpose is to make an argument's structure visible and testable: questions lead to claims, claims require evidence, experiments produce artifacts, and those objects feed tasks and a manuscript.

Keep this product model intact. Prefer features that improve traceability, falsifiability, provenance, or focused research work. Avoid turning it into a generic project manager, chat app, or cloud collaboration product unless explicitly requested.

## Current Architecture

- React 19 + TypeScript + Vite 6.
- Tailwind CSS 4 is available, but much of the established visual system lives in `src/index.css`.
- `src/App.tsx` owns the application shell and surface routing.
- `src/context/WorkspaceContext.tsx` is the current client state/action boundary. It loads and saves vault data and coordinates cross-surface selection, editors, assistant context, and manuscript state.
- `src/types.ts` contains research-domain types.
- `src/productivityTypes.ts` contains tasks/runtime types.
- `src/manuscriptTypes.ts` contains manuscript and synthesis types.
- `src/components/<surface>/` contains surface-specific UI; `shell/` contains shared application chrome.
- `server/vault.mjs` is a Vite middleware plugin, not a separate backend service.
- `src/vaultClient.ts` is the browser boundary for vault persistence.
- Default vault: `~/second-brain`.

## Data Model Invariants

- Canonical research chain: `Question -> Claim -> Evidence`.
- Links are first-class records. Every valid link needs a non-empty `userReason`.
- Preserve authorship/provenance (`user`, `system`, or `model:*`) when creating or editing entities.
- Do not silently invent scientific conclusions, citations, observations, validity judgments, or experiment results.
- A rejected claim retains its record and rejection reason; do not erase it merely because it is rejected.
- Evidence distinguishes origin and form. Respect the unions in `src/types.ts` rather than weakening them to strings.
- Completed experiment artifacts need observations where the type requires them.
- IDs are durable filenames and relationship keys. Do not casually regenerate IDs.

## Persistence Contract

- The filesystem vault is the source of truth for research and runtime collections.
- Human-readable prose belongs in `.md`; structured metadata belongs in same-ID `.json` sidecars.
- Links live as individual JSON files under `links/`.
- Collection-to-directory mappings live in `MD_COLLECTIONS` in `server/vault.mjs`. Update server mapping, client snapshot types, context load/save, and tests together when adding a persisted collection.
- `writeVault` is snapshot synchronization: absent entities are deleted from disk. Treat changes here as data-loss-sensitive.
- Manuscript data currently persists separately in browser `localStorage` under `thinking_os_manuscript`.
- Browser storage is a fallback/cache, not a reason to bypass filesystem persistence.
- Keep vault endpoints local-only. Never broaden filesystem access or accept arbitrary remote use without an explicit security design.
- Preserve backward-compatible normalization for existing vaults when changing serialized field names.

## UI Conventions

- Preserve the dense research-instrument aesthetic: restrained color, compact controls, mono metadata, clear hierarchy.
- Reuse CSS variables and existing component classes before adding new styling systems.
- Support light/dark themes and the configurable base font size.
- Keep keyboard behavior intact: `Cmd/Ctrl+J` toggles the assistant dock, `/` focuses search, `Escape` clears transient UI.
- Maintain accessible labels, dialog semantics, focus behavior, and keyboard alternatives for pointer interactions.
- Do not add a dependency for behavior supported cleanly by React, CSS, or the platform.

## Change Rules

- Read the relevant types, `WorkspaceContext`, target component, and persistence path before editing a feature.
- Fix the narrow root cause. Avoid speculative abstractions and unrelated cleanup.
- Keep domain mutations centralized in workspace actions rather than duplicating mutation logic inside components.
- Extend existing types; do not use `any` to bypass domain constraints.
- Preserve existing vault data. Add migration/normalization when a schema change cannot be backward-compatible directly.
- Update sample data only when it helps exercise a real new capability.
- Never edit generated/dependency state: `node_modules/`, `tsconfig.tsbuildinfo`, `.devenv/`.
- Do not commit unless explicitly requested.

## Validation

Run the smallest relevant check first, then the full build:

```bash
npm run lint
node --test server/vault.test.mjs
npm run build
```

For UI behavior, run `npm run dev` and verify the affected surface at desktop width and a narrow viewport. Check both themes when styling changes.

Persistence changes require a round-trip test covering create/read/update/delete and preservation of multiline Markdown. Data-loss-sensitive changes also require testing an existing/legacy representation.

## Session Startup

At the start of a new implementation session:

1. Read this file and `package.json`.
2. Inspect `git status` and recent commits; preserve uncommitted user work.
3. Read the target surface plus its relevant domain types.
4. Trace its actions through `WorkspaceContext` and, if persisted, through `vaultClient.ts` and `server/vault.mjs`.
5. State the smallest intended change, implement it, then validate it.

## Known Constraints

- `WorkspaceContext.tsx` is large. Do not refactor it merely for size; extract only when a requested change has a concrete boundary and reduces risk.
- The assistant behavior is currently local/simulated unless a real provider is explicitly introduced. Do not imply model-backed behavior that is not implemented.
- There is no separate production API server or database. Vite middleware provides local filesystem access.
- The app is single-user. Avoid auth, tenancy, synchronization, or collaboration scaffolding without a direct requirement.
