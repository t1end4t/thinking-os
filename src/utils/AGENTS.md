# Shared Utilities

- `pdfGenerator.ts` generates fallback PDFs for papers without source files, caches their blob URLs, and holds Crossref lookup/arXiv parsing. Actual import orchestration lives in `../components/papers/paperMetadata.ts`.
- Keep paper landing URLs separate from PDF download URLs. Publication year comes from published/issued metadata, not the registry creation timestamp. Preserve arXiv version identifiers in PDF links.
- arXiv PDF links omit `.pdf`: that suffix redirects without CORS headers and breaks browser fetches. `getPaperPdfUrl` normalizes legacy arXiv URLs at read time without rewriting saved paper records.
- `paths.ts` `tildePath` shortens a home directory prefix to `~` for display only. Never feed its output back to a filesystem API, the clipboard, or a request parameter. Check: `node src/utils/paths.check.mjs`.
- Other utilities serve domain-specific consumers; inspect callers before changing exported helpers.
- Checks: `npm run lint`, `npm run build`; paper import/reader checks are documented in `../components/papers/AGENTS.md`.
