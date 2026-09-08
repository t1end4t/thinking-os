# Argument Map Surface

## Purpose

Renders and edits the canonical research chain `Question -> Claim -> Evidence`. Two views share one header: `Map` (read-only pan/zoom graph) and `Detail` (create, edit, connect, weaken).

## Read First

- `../../types.ts`
- `MapSurface.tsx` (view switch, filters, canvas)
- `DetailView.tsx` (create form and per-entity editor)
- `ArgumentTree.tsx` (nested cards, shared children, unlinked roots, confirmed removal)
- `computeLayout.ts` (deterministic column layout)
- `../../context/WorkspaceContext.tsx` (all mutations)

## Boundaries

- The canvas stays read-only; all mutation lives in `DetailView.tsx` through workspace actions.
- Every created link carries a non-empty `userReason`; new links start at `holds` only when the user commits a reason.
- Detail edits questions, claims, evidence, and links only. Link check notes stay in `../shell/Inspector.tsx`.
- Rejected claims keep their record and rejection reason.
- Layout is derived from links; there are no stored node coordinates.
- Missing-child gap cards use `--color-missing`, not the amber weak-link state. Keep their `computeLayout.ts` height large enough for all `NodeCard.tsx` content; that height also controls branch spacing and edge anchors.
- Detail defaults to a native disclosure/list tree, even when a graph node is selected. Edit opens the existing editor; Back to tree returns to the hierarchy.
- Removal uses `removeGraphNode`: delete only the chosen entity and incident links, preserve descendants, block external research references. Rejection remains a separate, non-deleting action.

## Checks

- `npm run lint`
- `npm run build`
- `BROWSER_EXECUTABLE=<chrome> node gap.test.mjs` (dev server on `:3000`): gap cards in both themes, narrow viewport, enlarged base font, keyboard activation.
- Verify: New question, New claim under a question, New evidence under a claim, link status change, link delete, weaken/reject claim, desktop and narrow widths, both themes.
