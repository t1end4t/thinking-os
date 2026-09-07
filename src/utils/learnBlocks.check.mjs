// Self-check for src/utils/learnBlocks.ts: node --test src/utils/learnBlocks.check.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const outputDir = await mkdtemp(path.join(tmpdir(), 'thinking-os-learn-check-'));
const outputFile = path.join(outputDir, 'learnBlocks.mjs');
await build({
  entryPoints: [new URL('./learnBlocks.ts', import.meta.url).pathname],
  outfile: outputFile,
  bundle: true,
  platform: 'node',
  format: 'esm'
});
const mod = await import(outputFile);
const { scheduleCard, dueCards, normalizeLearningUnit, REVIEW_STEPS_DAYS, DAY_MS } = mod;

test('recall promotes a card and pushes its due date out', () => {
  const card = { id: 'c', kind: 'card', level: 'remembering', front: 'f', back: 'b', box: 0, dueAt: 0, createdAt: 0, updatedAt: 0 };
  const promoted = scheduleCard(card, true, 1_000);
  assert.equal(promoted.box, 1);
  assert.equal(promoted.dueAt, 1_000 + REVIEW_STEPS_DAYS[1] * DAY_MS);
  assert.equal(scheduleCard(promoted, false, 2_000).box, 0);
  assert.equal(scheduleCard({ ...card, box: 5 }, true, 0).box, 5);
});

test('only cards at or past their due time surface', () => {
  const unit = {
    id: 'u',
    blocks: [
      { id: 'due', kind: 'card', box: 0, dueAt: 500 },
      { id: 'later', kind: 'card', box: 2, dueAt: 5_000 },
      { id: 'note', kind: 'note', text: 'x' }
    ]
  };
  assert.deepEqual(dueCards([unit], 1_000).map(entry => entry.card.id), ['due']);
});

test('legacy units gain a source and blocks without losing old keys', () => {
  const legacy = normalizeLearningUnit({
    id: 'u1',
    title: 'Attention Math',
    book: 'Understanding Deep Learning',
    category: 'Attention & Architecture',
    progress: { remembering: 40 }
  });
  assert.deepEqual(legacy.source, { kind: 'note', title: 'Understanding Deep Learning' });
  assert.deepEqual(legacy.blocks, []);
  assert.deepEqual(legacy.tags, []);
  assert.equal(legacy.category, 'Attention & Architecture');
  assert.deepEqual(legacy.progress, { remembering: 40 });
});
