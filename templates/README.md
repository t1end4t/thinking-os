# Instruction templates

These Markdown files are the source of truth for the app's Templates editor. Saving edits this repository, not ~/.thinking-os.

## Active assistant prompts

The dock loads these files each turn. Edits apply on the next turn, including existing conversations; no rebuild is required. Missing or empty files fail the turn instead of falling back to embedded instructions.

| File | Used by |
| --- | --- |
| assistant-conversation.md | Chat and Work: shared conversational behavior |
| assistant-chat.md | Chat: read-only behavior |
| assistant-work.md | Work: apply requested workspace changes |
| assistant-codex.md | Codex: implementation and experiment execution |

Sandbox and approval settings remain in `server/agent.mjs`; editing prose does not change those settings. Codex still loads applicable global and local instructions. Work uses the workspace-write sandbox; this is not a record-schema or external-tool permission boundary.

## Copyable templates

The files below are not active assistant prompts and are never automatically installed.

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
