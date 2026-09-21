import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readVault, writeVault } from '../../server/vault.mjs';

const bundled = await build({
  entryPoints: [new URL('./evidenceSource.ts', import.meta.url).pathname],
  bundle: true, format: 'esm', write: false
});
const { getEvidenceSource } = await import(`data:text/javascript,${encodeURIComponent(bundled.outputFiles[0].text)}`);

const papers = [{ id: 'p1', title: 'A paper' }];
const experiments = [{ id: 'exp1', title: 'An experiment', artifacts: [{ id: 'art1', name: 'plot' }] }];
const base = { id: 'e1', title: 'Finding', form: 'measurement', citation: '' };
const resolve = extra => getEvidenceSource({ ...base, ...extra }, papers, experiments);

assert.equal(resolve({ origin: 'own_reasoning', paperId: 'p1' }).kind, 'reasoning', 'reasoning never claims an external source');
assert.deepEqual(resolve({ origin: 'literature', paperId: 'p1' }), { kind: 'paper', paper: papers[0] });
assert.match(resolve({ origin: 'literature' }).message, /No source linked/);
assert.match(resolve({ origin: 'literature', paperId: 'gone' }).message, /unavailable/);
assert.deepEqual(resolve({ origin: 'experiment', experimentId: 'exp1' }), { kind: 'experiment', experiment: experiments[0], artifact: undefined });
assert.equal(resolve({ origin: 'experiment', experimentId: 'exp1', artifactId: 'art1' }).artifact, experiments[0].artifacts[0]);
assert.match(resolve({ origin: 'experiment', experimentId: 'exp1', artifactId: 'gone' }).message, /artifact is unavailable/);
assert.match(resolve({ origin: 'experiment' }).message, /No source linked/);
console.log('evidenceSource checks passed.');

const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-evidence-'));
try {
  await mkdir(path.join(root, 'evidence'));
  const legacy = { ...base, origin: 'literature', paperId: 'p1', author: 'model:test', createdAt: 1 };
  await writeFile(path.join(root, 'evidence/e1.md'), '# Finding\n');
  await writeFile(path.join(root, 'evidence/e1.json'), JSON.stringify(legacy));
  const loaded = await readVault(root);
  assert.deepEqual(loaded.evidence, [legacy]);
  const linked = { ...legacy, title: 'Finding\n\nSecond paragraph.', pageNumber: 2, excerpt: 'First line\n\nSecond line.' };
  const measured = { ...base, id: 'e2', origin: 'experiment', experimentId: 'exp1', artifactId: 'art1', author: 'user', createdAt: 2 };
  await writeVault(root, { ...loaded, evidence: [linked, measured] });
  const created = await readVault(root);
  assert.deepEqual(created.evidence, [linked, measured]);
  assert.match(await readFile(path.join(root, 'research/map/evidence/e1.md'), 'utf8'), /Finding\n\nSecond paragraph/);
  const edited = { ...measured, artifactId: 'art2' };
  await writeVault(root, { ...created, evidence: [linked, edited] });
  assert.deepEqual((await readVault(root)).evidence, [linked, edited]);
  await writeVault(root, { ...created, evidence: [linked] });
  assert.deepEqual((await readVault(root)).evidence, [linked]);
  await assert.rejects(readFile(path.join(root, 'research/map/evidence/e2.json')), { code: 'ENOENT' });
} finally {
  await rm(root, { recursive: true, force: true });
}
console.log('Evidence legacy migration, source metadata, multiline prose, create/update/delete: passed.');
