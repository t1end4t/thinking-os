# Thinking OS Design System

## 1. Atmosphere & Identity
Preserve the compact research-instrument interface. Argument structure and provenance take precedence over decoration. Design variance: 2; motion intensity: 1; visual density: 8.

## 2. Color
Reuse `src/index.css` semantic tokens: `--color-surface`, `--color-paper`, `--color-ink`, `--color-ink-muted`, and `--color-rule`. Preserve Latte, Claude dark, and Mocha palettes. Research status colors remain distinct from surface accents. Filled controls use paired background/text tokens with at least 4.5:1 contrast.

## 3. Typography
Public Sans serves controls and research prose; IBM Plex Mono serves IDs, paths, and metadata; Newsreader serves manuscript prose. Fonts load locally with `font-display: swap`. Controls and meaningful labels use at least `0.75rem`; secondary metadata may use `0.6875rem`. Existing font-size preferences remain authoritative.

## 4. Spacing & Layout
Keep the existing 4px spacing rhythm, 4rem navigation rail, and compact headers. Bound the shell to `100dvh`. Flex children must shrink within their available width. The Tasks board owns horizontal scrolling; its toolbar does not. Below 1024px, the assistant starts closed and opens as a native modal drawer. Desktop assistant width is capped at 35vw. Manuscript sidebars appear together only when at least 74rem is available; otherwise they are individually accessible overlays. Section fields use a native disclosure, collapsed in compact layouts; its expanded body owns a bounded scroll region so manuscript prose remains visible.

## 5. Components
Reuse existing React surfaces, Lucide icons, workspace actions, and CSS classes. Preserve IDs and navigation labels. Manuscript panel buttons expose `aria-expanded` and `aria-controls`. Native assistant dialogs supply focus containment and focus return. Sidebar overlays remain nonmodal and dismiss through their controls, the backdrop, or Escape.

## 6. Motion
Retain restrained hover and state feedback. Add no decorative or continuous animation. New layout behavior is immediate.

## 7. Accessibility
Preserve keyboard shortcuts and native dialog behavior. Controls retain accessible names and visible focus. Panel resizing supports arrow keys. Never encode research state through color alone.

## 8. Validation
Check Tasks and Manuscript with the assistant open and closed at desktop and narrow widths, both themes and font-size limits. Verify modal focus, Escape, panel toggles, local font loading, and empty states. Browser checks intercept vault/provider requests so real research data and paid model calls remain untouched.
