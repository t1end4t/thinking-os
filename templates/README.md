# Instruction templates

These Markdown files are the source of truth for the app's Templates editor. Saving edits this repository, not ~/.thinking-os.

## Copyable templates

The files below are not active assistant prompts and are never automatically installed.

| Template | Intended destination |
| --- | --- |
| shared-behavior.md | Agent's global instructions |
| thinking-mode.md | Research workspace AGENTS.md |
| coding-mode.md | Coding repository AGENTS.md |
| vault-operation.md | Research workspace VAULT_OPERATIONS.md, read before record changes |
| assistant-chat.md | Research workspace agents/chat.md |
| local-agent.md | AGENTS.md in a directory needing distinct rules; includes Nushell and direnv command guidance |
| index.md | INDEX.md for navigation |

Adapt templates to the destination. Merge with existing instructions rather than overwriting them. The workspace and target repository have separate responsibilities. Backups from editor saves use .bak files beside the templates and are ignored by Git.
