# Thinking OS Design System

## 1. Atmosphere & Identity

Thinking OS is a dense, quiet research instrument. Compact controls, restrained color, and visible structure keep attention on evidence and argument flow.

## 2. Color

- Use the semantic CSS variables in `src/index.css`.
- Use surface tones for hierarchy, `--color-rule` for boundaries, and `--accent-indigo` only for active or primary actions.
- Preserve all light and dark theme variants.

## 3. Typography

- Use the local system sans stack for prose and controls.
- Use monospace only for paths, metadata, code, and runtime output.
- Keep assistant sizing relative to `--assistant-font-size`.

## 4. Spacing & Layout

- Use the existing 4px-derived spacing scale.
- Keep research surfaces compact and information-dense.
- Keep dialogs within the viewport and make long collections scroll internally.

## 5. Components

- Buttons use compact radii, clear hover and focus states, and icons when the action is conventional.
- Primary actions use `--accent-indigo`; secondary actions use surface or border treatment.
- Filesystem pickers follow desktop file-manager grammar: navigation controls, address field, folder list, then confirmation.

## 6. Interaction & Motion

- Prefer immediate state changes and short existing transitions.
- Preserve keyboard access, visible focus, native dialog behavior, and Escape dismissal.
- Do not add decorative motion to research workflows.

## 7. Responsive & Accessibility

- Support narrow viewports without horizontal overflow.
- Every icon-only control needs an accessible label and tooltip.
- Maintain readable contrast and disabled-state clarity in every theme.

## 8. Constraints & Debt

- Reuse existing CSS variables and component patterns before adding abstractions.
- The visual system is currently distributed across `src/index.css` and surface CSS files; consolidate only when a requested change creates a concrete reusable boundary.
