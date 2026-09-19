# <Directory name>

One or two sentences: what this directory is responsible for, and what it is not.

## Read first

- `file.ts` - why it matters
- `other.ts` - why it matters

## Local conventions

- Rules that differ from the parent instructions. Nothing already stated upstream.

## Boundaries

- What must not move, change shape, or be imported from elsewhere.

## Commands

- Prefer Nushell syntax for user-facing commands.
- Keep copyable commands on one line.
- Do not use Bash-only forms such as `&&`, `||`, `export`, or `source` without labeling them as Bash and giving a Nushell form.
- In Nix projects with direnv, run environment-dependent checks through `direnv exec . <command>` when the current process may not inherit the project shell.
- For Playwright, use the browser package and `PLAYWRIGHT_BROWSERS_PATH` supplied by the project dev shell. Do not recommend global browser-library installation when the project shell already provides them.

```nu
# one-line local test, lint, or build command
```

## Gotchas

- Behavior that is not obvious from reading the code.

---

Create this file only for directories with distinct responsibilities, conventions, commands, or boundaries. Not for trivial folders, generated output, or one-off files. Add a sibling `CLAUDE.md` containing only `@AGENTS.md`.
