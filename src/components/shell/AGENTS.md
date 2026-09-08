# Application Shell

- `TopBar.tsx` owns the workspace picker and the unified Settings dialog: interface font size, independent assistant font size, theme/palette, and local provider/model overrides.
- Settings use a native modal dialog for focus trapping, Escape, and focus return. Provider/model preferences affect new conversations; configuration files and credentials are not edited here.
- `Rail.tsx` remains the surface navigator. Panel position is legacy workspace state; do not reintroduce a move button into the assistant header.
- Checks: `npm run lint`, `npm run build`. Verify Settings by keyboard, at narrow widths, and at both minimum/maximum font sizes.
