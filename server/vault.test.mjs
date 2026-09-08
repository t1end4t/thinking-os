import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readVault, writeVault, resolveVaultDir, DEFAULT_VAULT, listDirs } from './vault.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-vault-'));

const snapshot = {
  questions: [{ id: 'q1', title: 'Does it round-trip?', tags: ['x'], createdAt: 1, author: 'user' }],
  tasks: [{ id: 't1', title: 'Ship it', description: 'Body text.\n\nSecond line.', status: 'todo', priority: 'low', tag: 'x', createdAt: 'now' }],
  goals: [{ id: 'g1', title: 'Publish the result', description: 'A durable outcome.\n\nWith context.', horizon: 'one-year', status: 'active', createdAt: 'now' }],
  weeklyReviews: [{ id: 'wr1', title: 'Week of 2026-09-07', weekOf: '2026-09-07', notes: '## Wins\n\nOne.\n\n## Next focus\n\nTwo.', status: 'draft', createdAt: 'now' }],
  links: [{ id: 'q1--c1', kind: 'question-claim', parentId: 'q1', childId: 'c1', status: 'weak', userReason: 'because', createdAt: 2, author: 'user' }],
  papers: [{ id: 'p1', title: 'A paper', markdown: '### Abstract\nText.', authors: 'X', year: 2024, citation: 'X 2024', pageCount: 1, sections: [] }],
  learningUnits: [{ id: 'u1', title: 'Attention Math', description: 'Softmax geometry.', category: 'Attention & Architecture' }]
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
assert.equal(await readFile(path.join(root, 'questions/q1.md'), 'utf8'), 'Does it round-trip?\n');

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

await mkdir(path.join(root, 'visible-folder'));
await mkdir(path.join(root, '.hidden-folder'));
const listing = await listDirs(root);
assert.ok(listing.entries.includes('visible-folder'));
assert.ok(!listing.entries.includes('.hidden-folder'));
assert.deepEqual(listing.entries, [...listing.entries].sort());
assert.equal(listing.parent, path.dirname(root));
assert.deepEqual((await listDirs(path.join(root, 'nope'))).entries, []);

console.log('vault ok');
