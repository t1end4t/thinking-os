import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readVault, writeVault, resolveVaultDir, DEFAULT_VAULT, listDirs } from './vault.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-vault-'));

const snapshot = {
  questions: [{ id: 'q1', title: 'Does it round-trip?', tags: ['x'], createdAt: 1, author: 'user' }],
  claims: [{ id: 'c1', text: 'First line.\n\nSecond line.', rejected: true, rejectionReason: 'Insufficient support.', createdAt: 1, author: 'user' }],
  evidence: [{ id: 'e1', title: 'Observation', origin: 'own_reasoning', form: 'derivation', citation: '', createdAt: 1, author: 'user' }],
  openProblems: [{ id: 'op1', text: 'Open problem', citation: '', createdAt: 1 }],
  candidateQuestions: [{ id: 'cq1', title: 'Candidate?', openProblemIds: ['op1'], createdAt: 1 }],
  experiments: [{ id: 'exp1', title: 'Experiment', claimId: 'c1', status: 'queued', artifacts: [] }],
  tasks: [{ id: 't1', title: 'Ship it', description: 'Body text.\n\nSecond line.', status: 'todo', priority: 'low', tag: 'x', createdAt: 'now' }],
  goals: [{ id: 'g1', title: 'Publish the result', description: 'A durable outcome.\n\nWith context.', horizon: 'one-year', status: 'active', createdAt: 'now' }],
  weeklyReviews: [{ id: 'wr1', title: 'Week of 2026-09-07', weekOf: '2026-09-07', notes: '## Wins\n\nOne.\n\n## Next focus\n\nTwo.', status: 'draft', createdAt: 'now' }],
  links: [{ id: 'q1--c1', kind: 'question-claim', parentId: 'q1', childId: 'c1', status: 'weak', userReason: 'because', createdAt: 2, author: 'user' }],
  papers: [{ id: 'p1', title: 'A paper', markdown: '### Abstract\nText.', authors: 'X', year: 2024, citation: 'X 2024', pageCount: 1, sections: [] }],
  learningUnits: [{ id: 'u1', title: 'Attention Math', description: 'Softmax geometry.', category: 'Attention & Architecture' }],
  services: [{ id: 's1', name: 'Service', port: null, command: 'true', status: 'stopped' }],
  runs: [{ id: 'r1', name: 'Run', status: 'queued', target: 'target1', duration: '', resourceLock: '', timestamp: 'now' }],
  models: [{ id: 'm1', name: 'Model', hash: '', quantization: '', parameters: '', contextLength: '', vramRequired: '', status: 'ready' }],
  automations: [{ id: 'a1', name: 'Automation', trigger: '', action: '', target: 'target1', enabled: false, lastRun: '' }],
  targets: [{ id: 'target1', name: 'Target', kind: 'workspace', location: '.', resourceUsage: '', status: 'offline' }]
};

await writeVault(root, snapshot);
const roundTripped = await readVault(root);

assert.deepEqual(roundTripped.questions, snapshot.questions);
assert.deepEqual(roundTripped.tasks, snapshot.tasks);
assert.deepEqual(roundTripped.goals, snapshot.goals);
assert.deepEqual(roundTripped.weeklyReviews, snapshot.weeklyReviews);
assert.deepEqual(roundTripped.links, snapshot.links);
assert.deepEqual(roundTripped.papers, snapshot.papers);
assert.deepEqual(roundTripped.learningUnits, snapshot.learningUnits);
for (const [key, items] of Object.entries(snapshot)) assert.deepEqual(roundTripped[key], items);

const highlightedPaper = {
  ...snapshot.papers[0],
  markdown: '## Abstract\n\nFirst paragraph.\n\nSecond paragraph.',
  highlights: [
    { id: 'legacy-highlight', text: 'First paragraph.', pageNumber: 1, createdAt: 1 },
    { id: 'anchored-highlight', text: 'Second paragraph.', pageNumber: 1, createdAt: 2,
      rects: [{ pageNumber: 1, coordinates: [60, 720, 180, 705] }] }
  ]
};
await writeVault(root, { ...snapshot, papers: [highlightedPaper] });
assert.deepEqual((await readVault(root)).papers, [highlightedPaper]);
await writeVault(root, { ...snapshot, papers: [{ ...highlightedPaper, highlights: [] }] });
assert.deepEqual((await readVault(root)).papers[0].highlights, []);

// prose stays plain markdown, no frontmatter noise
assert.equal(await readFile(path.join(root, 'research/map/questions/q1.md'), 'utf8'), 'Does it round-trip?\n');
assert.ok(existsSync(path.join(root, 'research/map/links/q1--c1.json')));
assert.ok(existsSync(path.join(root, 'tasks/pipeline/t1.md')));
assert.ok(existsSync(path.join(root, 'tasks/direction/g1.md')));
assert.ok(existsSync(path.join(root, 'learn/board/u1.md')));
assert.deepEqual(
  (await readdir(root)).filter(name => !name.startsWith('.')).sort(),
  ['learn', 'research', 'runtime', 'tasks']
);

// deletions propagate to disk
await writeVault(root, { ...snapshot, questions: [] });
assert.deepEqual((await readVault(root)).questions, []);

// legacy snake_case links normalize
await writeVault(root, { links: [{ id: 'l2', parent_id: 'a', child_id: 'b', status: 'holds', user_reason: 'r' }] });
const legacy = (await readVault(root)).links[0];
assert.equal(legacy.parentId, 'a');
assert.equal(legacy.userReason, 'r');

assert.equal(resolveVaultDir('~/second-brain'), DEFAULT_VAULT);
assert.equal(resolveVaultDir(''), DEFAULT_VAULT);

const legacyRoot = await mkdtemp(path.join(tmpdir(), 'thinking-os-legacy-'));
await mkdir(path.join(legacyRoot, 'questions'), { recursive: true });
await mkdir(path.join(legacyRoot, 'planning/goals'), { recursive: true });
await mkdir(path.join(legacyRoot, 'links'), { recursive: true });
await writeFile(path.join(legacyRoot, 'questions/q9.md'), 'Legacy question?\n');
await writeFile(path.join(legacyRoot, 'questions/q9.json'), '{"id":"q9","tags":[],"createdAt":1,"author":"user"}\n');
await writeFile(path.join(legacyRoot, 'planning/goals/g9.md'), '# Legacy goal\n\nBody.\n\nMore body.\n');
await writeFile(path.join(legacyRoot, 'planning/goals/g9.json'), '{"id":"g9","horizon":"one-year","status":"active","createdAt":"now"}\n');
await writeFile(path.join(legacyRoot, 'links/q9--c9.json'), '{"id":"q9--c9","parent_id":"q9","child_id":"c9","status":"weak","user_reason":"r"}\n');
const migrated = await readVault(legacyRoot);
assert.deepEqual(migrated.questions, [{ id: 'q9', title: 'Legacy question?', tags: [], createdAt: 1, author: 'user' }]);
assert.equal(migrated.goals[0].description, 'Body.\n\nMore body.');
assert.equal(migrated.links[0].parentId, 'q9');
assert.ok(existsSync(path.join(legacyRoot, 'research/map/questions/q9.md')));
assert.ok(!existsSync(path.join(legacyRoot, 'questions')));
assert.ok(!existsSync(path.join(legacyRoot, 'planning')));

const conflictRoot = await mkdtemp(path.join(tmpdir(), 'thinking-os-conflict-'));
await mkdir(path.join(conflictRoot, 'claims'), { recursive: true });
await mkdir(path.join(conflictRoot, 'research/map/claims'), { recursive: true });
await writeFile(path.join(conflictRoot, 'claims/c9.md'), 'legacy text\n');
await writeFile(path.join(conflictRoot, 'research/map/claims/c9.md'), 'current text\n');
await assert.rejects(() => readVault(conflictRoot), /migration conflict/);
await assert.rejects(() => writeVault(conflictRoot, { claims: [] }), /migration conflict/);
assert.equal(await readFile(path.join(conflictRoot, 'claims/c9.md'), 'utf8'), 'legacy text\n');
assert.equal(await readFile(path.join(conflictRoot, 'research/map/claims/c9.md'), 'utf8'), 'current text\n');

const layout = {
  questions: ['questions', 'research/map/questions'],
  claims: ['claims', 'research/map/claims'],
  evidence: ['evidence', 'research/map/evidence'],
  links: ['links', 'research/map/links'],
  openProblems: ['survey/open-problems', 'research/survey/open-problems'],
  candidateQuestions: ['survey/candidates', 'research/survey/candidates'],
  papers: ['papers', 'research/papers'],
  experiments: ['experiments', 'research/experiments'],
  tasks: ['tasks', 'tasks/pipeline'],
  goals: ['planning/goals', 'tasks/direction'],
  weeklyReviews: ['planning/reviews', 'tasks/reviews'],
  services: ['runtime/services', 'runtime/services'],
  runs: ['runtime/runs', 'runtime/agent-jobs/runs'],
  models: ['runtime/models', 'runtime/llm-models'],
  automations: ['runtime/automations', 'runtime/agent-jobs/automations'],
  targets: ['runtime/targets', 'runtime/agent-jobs/targets'],
  learningUnits: ['learn/units', 'learn/board']
};
const allLegacyRoot = await mkdtemp(path.join(tmpdir(), 'thinking-os-all-legacy-'));
await writeVault(allLegacyRoot, snapshot);
const originalFiles = new Map();
for (const [key, [oldDir, newDir]] of Object.entries(layout)) {
  for (const extension of key === 'links' ? ['json'] : ['md', 'json']) {
    const filename = `${snapshot[key][0].id}.${extension}`;
    const destination = path.join(allLegacyRoot, newDir, filename);
    originalFiles.set(destination, await readFile(destination, 'utf8'));
    if (oldDir === newDir) continue;
    await mkdir(path.join(allLegacyRoot, oldDir), { recursive: true });
    await rename(destination, path.join(allLegacyRoot, oldDir, filename));
  }
}
await writeFile(path.join(allLegacyRoot, 'questions/notes.txt'), 'Keep this file.');
await mkdir(path.join(allLegacyRoot, 'research/map/questions'), { recursive: true });
await writeFile(path.join(allLegacyRoot, 'research/map/questions/q1.md'), 'Does it round-trip?\n');
assert.deepEqual(await readVault(allLegacyRoot), snapshot);
assert.deepEqual(await readVault(allLegacyRoot), snapshot);
for (const [filename, content] of originalFiles) assert.equal(await readFile(filename, 'utf8'), content);
assert.equal(await readFile(path.join(allLegacyRoot, 'questions/notes.txt'), 'utf8'), 'Keep this file.');
const updatedSnapshot = {
  ...snapshot,
  tasks: [{ ...snapshot.tasks[0], description: 'Updated.\n\nStill multiline.' }]
};
await writeVault(allLegacyRoot, updatedSnapshot);
assert.deepEqual(await readVault(allLegacyRoot), updatedSnapshot);
const deletedSnapshot = Object.fromEntries(Object.keys(snapshot).map(key => [key, []]));
await writeVault(allLegacyRoot, deletedSnapshot);
assert.deepEqual(await readVault(allLegacyRoot), deletedSnapshot);
for (const filename of originalFiles.keys()) assert.ok(!existsSync(filename));
assert.equal(await readFile(path.join(allLegacyRoot, 'questions/notes.txt'), 'utf8'), 'Keep this file.');

await writeFile(path.join(conflictRoot, 'research/map/claims/c9.md'), 'legacy text\n');
await writeVault(conflictRoot, { tasks: snapshot.tasks });
assert.deepEqual((await readVault(conflictRoot)).claims, [{ id: 'c9', text: 'legacy text' }]);
assert.ok(!existsSync(path.join(conflictRoot, 'claims')));

await mkdir(path.join(root, 'visible-folder'));
await mkdir(path.join(root, '.hidden-folder'));
const listing = await listDirs(root);
assert.ok(listing.entries.includes('visible-folder'));
assert.ok(!listing.entries.includes('.hidden-folder'));
assert.deepEqual(listing.entries, [...listing.entries].sort());
assert.equal(listing.parent, path.dirname(root));
assert.deepEqual((await listDirs(path.join(root, 'nope'))).entries, []);

console.log('vault ok');
