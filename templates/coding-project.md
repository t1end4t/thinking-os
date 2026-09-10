# Project Implementation Rules

Read with the shared behavior file. Applies when the mode is Execute or Verify.

## Simplicity

- State material assumptions before implementing. Surface a simpler approach or important tradeoff rather than silently choosing.
- Minimum code that solves the stated problem. Nothing speculative.
- No features beyond what was asked. No abstraction for single-use code.
- No configurability that was not requested. No error handling for impossible states.
- If it is 200 lines and could be 50, rewrite it.

## Surgical changes

- Touch only what the request requires. Every changed line traces to the request.
- Do not refactor working code, adjacent comments, or formatting.
- Match existing style even when you would do it differently.
- Mention unrelated dead code; do not delete it.
- Remove only the imports, variables, and functions that your change orphaned.

## Verifiable goals

State a short plan before multi-step work:

1. [Step] -> verify: [check]
2. [Step] -> verify: [check]

- "Add validation" becomes "write tests for invalid inputs, then make them pass".
- "Fix the bug" becomes "write a test that reproduces it, then make it pass".
- "Refactor X" becomes "tests pass before and after".
- Read the relevant code and local instructions first. Inspect existing changes and preserve other work. Run the smallest relevant check, then broader validation. Report what was verified and what remains unverified.

## Directory context

Create or update local AGENTS.md only when a directory introduces distinct responsibilities, conventions, commands, boundaries, or gotchas. Keep it a scoped index, not full documentation. Do not duplicate parent rules or create files for trivial folders, generated output, or one-off files. For Claude Code compatibility, add a sibling CLAUDE.md containing only @AGENTS.md.

## Never simplify away

Input validation at trust boundaries, error handling that prevents data loss, security, accessibility, and anything explicitly requested.

## Commands

Replace with this repository's real commands:

```bash
# lint
# test
# build
```

## Boundaries

- Do not commit unless asked.
- Do not edit generated or dependency directories.
- Preserve existing data. Add migration or normalization when a schema change cannot be backward-compatible.
