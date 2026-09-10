# Instruction templates

These Markdown files are the source of truth for the app's Templates editor. Saving edits this repository, not ~/.thinking-os. Templates are not active instructions and are never automatically installed.

| Template | Intended destination |
| --- | --- |
| shared-core.md | Agent's global instructions |
| thinking-modes.md | Research workspace AGENTS.md |
| vault-operations.md | Research workspace VAULT_OPERATIONS.md, read before record changes |
| coding-project.md | Experiment-code repository AGENTS.md |
| directory-context.md | AGENTS.md in a directory needing distinct rules |
| index.md | INDEX.md for navigation |
| problem-brief.md | One document per problem, outside vault collection directories |

Adapt templates to the destination. Merge with existing instructions rather than overwriting them. The workspace and target repository have separate responsibilities. Backups from editor saves use .bak files beside the templates and are ignored by Git.
