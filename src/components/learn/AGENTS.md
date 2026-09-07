# Learn Surface

## Purpose

Visual-first source study. A learning unit is one focused question tied to a book, video, paper, course, or note. Learners capture visual blocks with source locators and Bloom-level provenance.

## Read First

- `../../learnTypes.ts`
- `LearnSurface.tsx`
- `VisualBlock.tsx`
- `../../context/WorkspaceContext.tsx`

## Boundaries

- Keep the board a vertical stream; do not introduce free-canvas coordinates.
- Every block keeps a Bloom level and optional source locator.
- Prefer editable tables, trees, graphs, cards, and screenshots over long forms.
- Legacy learning-unit keys remain unrendered but preserved by normalization.

## Checks

- `npm run lint`
- `npm run build`
- Verify source creation, block editing/reordering, card review, desktop and narrow layouts.
