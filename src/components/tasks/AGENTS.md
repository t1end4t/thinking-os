# Tasks Surface Context

## Purpose

This directory owns planning direction, the Kanban delivery pipeline, and recurring reviews.

## Read First

- `../../productivityTypes.ts`
- `../../context/WorkspaceContext.tsx`
- `TasksSurface.tsx`
- `KanbanBoard.tsx`

## Conventions

- Keep the hierarchy shallow: 5-year direction, 6–12 month goals, linked tasks.
- Keep mutations in `WorkspaceContext` state setters so vault snapshot persistence remains authoritative.
- `TargetItem` means runtime infrastructure; do not reuse it for planning goals.
- Preserve task drag-and-drop, keyboard access, authorship, and goal links.

## Validation

```bash
npm run lint
node --test server/vault.test.mjs
npm run build
```
