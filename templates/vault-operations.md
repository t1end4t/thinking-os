# Vault Operations

Save this template as VAULT_OPERATIONS.md at the workspace root, beside AGENTS.md containing the thinking modes. Saving a template in Thinking OS does not install it in a workspace.

Where workspace records live and how to change them. Read with the workspace AGENTS.md. Applies only inside the configured workspace vault, not inside an experiment-code repository. Confirm the actual vault root; ~/second-brain is only the default. All paths below are relative to that root.

## Shape

Every entity is two files sharing one ID: `<id>.md` for prose, `<id>.json` for structured metadata. The filename is the ID and the key other records link to. Links are single JSON files.

| Record | Directory | Markdown body |
| --- | --- | --- |
| Question | `questions/` | question text |
| Claim | `claims/` | claim text |
| Evidence | `evidence/` | evidence title |
| Open problem | `survey/open-problems/` | problem text |
| Candidate question | `survey/candidates/` | question title |
| Paper | `papers/` | `# title` then extracted markdown |
| Experiment | `experiments/` | experiment title |
| Task | `tasks/` | `# title` then description |
| Goal | `planning/goals/` | `# title` then description |
| Weekly review | `planning/reviews/` | `# title` then notes |
| Learning unit | `learn/units/` | `# title` then description |
| Service | `runtime/services/` | service name |
| Run | `runtime/runs/` | run name |
| Model | `runtime/models/` | model name |
| Automation | `runtime/automations/` | automation name |
| Target | `runtime/targets/` | target name |
| Link | `links/<id>.json` | none |

INDEX.md and problem briefs are plain documents with no sidecar. Keep them outside collection directories: snapshot synchronization can delete unrecognized Markdown and JSON files there. Experiment records describe plans and artifacts; experiment source code belongs in the target repository.

## Before writing

- The running app autosaves snapshots: stale state can overwrite edits, delete new records, or restore deleted records. Before direct file edits, ask me to finish pending saves and close all Thinking OS tabs using this vault. Reopen only after the edits and checks finish, and verify that the app loads the filesystem vault successfully rather than falling back to its browser cache. Reloading before edits is not protection. If working through the app's assistant, defer direct edits until this can be done safely.
- Read the existing record and a sibling record. Preserve unknown metadata fields. Check the collection's schema before adding fields; siblings are examples, not permission to copy their IDs or results. In the Thinking OS source repository, src/types.ts, src/productivityTypes.ts, and src/learnTypes.ts define records; server/vault.mjs defines serialization. If the schema cannot be established, ask rather than inventing keys.
- Back up affected files outside synchronized collection directories before editing or deleting them.
- Say which files you will create, edit, or delete, and wait for confirmation when the change is not clearly implied by my request.

## Create

- Write both files together. An `.md` without its `.json` is an incomplete record.
- Use a unique filename-safe ID; check that neither file exists before creating it. Match the sidecar's `id` to the filename. Never rename an ID to correct a title.
- Where the schema supports them, set `author` to your actual agent identity (`model:<name>`, or `model` if unknown), never `user`, and set `createdAt` from the current time in the collection's required format. Research timestamps use epoch milliseconds; task timestamps are strings. Do not add unsupported fields.
- A new link needs a non-empty `userReason`. If I did not state a reason, ask for it. Do not write the reason for me.
- Draft tasks, claims, and evidence as proposals in the conversation first unless I asked for the file directly.

### Create a task

Create `tasks/<id>.md` containing `# <title>`, a blank line, and the description. Create `tasks/<id>.json` with `id`, `status`, `priority`, `tag`, `createdAt` (a current ISO timestamp string), `author`, and `lastEditedBy`. Unless specified, use `backlog`, `medium`, and `task`. Status must be backlog / todo / in-progress / review / done; priority must be low / medium / high / urgent. Add optional `goalId` only for an existing goal. Keep title and description in Markdown, not duplicated in the sidecar.

## Edit

- Preserve `id`, existing authorship, timestamps, and unrelated metadata. Record yourself in `lastEditedBy` only where the schema supports it. Preserve multiline Markdown; the Markdown content overrides corresponding sidecar prose on load.
- Do not upgrade a claim's status, add a validity judgment, or fill in results, citations, or observations that no source supports.
- A rejected claim keeps its record and its rejection reason. Rejection is not deletion.

## Delete

Direct file deletion has no built-in undo. Confirm ambiguous targets and dependent-record changes before deleting; an explicit request naming the record already authorizes its removal.

1. Identify the record by ID and inspect references before changing anything. Check link endpoints, including legacy `parent_id` / `child_id`, and references embedded in other records, such as `paperId`, `claimId`, `questionId`, and `goalId`.
2. Explain dependent changes and obtain approval where the request does not cover them. Do not silently delete evidence, experiments, or other dependent records.
3. After the backup, remove the record's Markdown and JSON together (only JSON for a link). Remove approved incident links and repair approved references. Do not leave dangling references without reporting and resolving their disposition.
4. Report the exact changed and removed paths, backup location, and anything still unresolved.

Removing one paper means removing `papers/<id>.md` and `papers/<id>.json`. Check evidence `paperId` references and manuscript citations first. Evidence is a separate record: preserve its citation and observations; ask whether to detach its optional paper reference or cancel the deletion. Do not delete evidence, its claim links, or external PDF files merely because the paper record is removed. Manuscript references need review through the app because they are not in the vault.

## Verify

Parse every changed JSON file. Check filename/ID agreement, required fields and enum values, paired files, references, and preservation of multiline prose and unrelated records. Re-read created or edited records; confirm deleted paths are absent. Do not submit a partial collection as a vault snapshot: omitted records in a submitted collection are deleted. Report checks actually performed, not assumed UI success.

## Not in the vault

Manuscript data lives in browser storage, not in files. You cannot edit it from here; say so instead of writing a substitute file.
