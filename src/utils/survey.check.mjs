import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readVault, writeVault } from '../../server/vault.mjs';

const load = async name => {
  const bundle = await build({ entryPoints: [new URL(name, import.meta.url).pathname], bundle: true, format: 'esm', write: false });
  return import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);
};
const { normalizeSurvey, linkSurveyProblems, unlinkSurveyProblem } = await load('./survey.ts');
const { paperIdentity } = await load('./paperIdentity.ts');
const problem = { id: 'op1', text: 'Memory limit\n\nSecond paragraph.', citation: 'Paper A', candidateId: 'cq1', createdAt: 1, author: 'model:legacy' };
const candidate = { id: 'cq1', title: 'Can we reduce memory?', openProblemIds: ['op1'], createdAt: 1 };
const migrated = normalizeSurvey([problem], [candidate]);
assert.equal(migrated.openProblems[0].candidateId, undefined);
assert.equal(migrated.openProblems[0].author, 'model:legacy');
assert.equal(migrated.candidateQuestions[0].problemLinks.length, 1);
assert.equal(migrated.candidateQuestions[0].problemLinks[0].legacy, true);
assert.deepEqual(normalizeSurvey(migrated.openProblems, migrated.candidateQuestions), migrated);
const first = linkSurveyProblems(migrated.candidateQuestions[0], ['op2', 'op2'], 'Both concern activation storage.');
assert.equal(first.problemLinks.length, 2);
assert.throws(() => linkSurveyProblems(first, ['op2'], ' '), /Explain/);
const second = linkSurveyProblems({ ...candidate, id: 'cq2', openProblemIds: [], problemLinks: [] }, ['op1'], 'A different intervention.');
assert.deepEqual(second.openProblemIds, ['op1']);
const unlinked = unlinkSurveyProblem(first, 'op1');
assert.deepEqual(unlinked.openProblemIds, ['op2']);
assert.deepEqual(second.openProblemIds, ['op1']);
assert.deepEqual(normalizeSurvey([problem], [unlinked]).candidateQuestions[0].openProblemIds, ['op2'], 'removed legacy links must never reappear');
const paper = { title: 'Title', authors: 'Ada', year: 2024 };
assert.equal(paperIdentity({ ...paper, doi: 'https://doi.org/10.1234/ABC' }), paperIdentity({ ...paper, doi: '10.1234/abc' }));
assert.equal(paperIdentity({ ...paper, url: 'https://arxiv.org/abs/2401.12345v3' }), paperIdentity({ ...paper, doi: '10.48550/arXiv.2401.12345' }));

const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-survey-'));
try {
  await mkdir(path.join(root, 'survey/open-problems'), { recursive: true });
  await mkdir(path.join(root, 'survey/candidates'), { recursive: true });
  await writeFile(path.join(root, 'survey/open-problems/op1.md'), `# ${problem.text}\n`);
  await writeFile(path.join(root, 'survey/open-problems/op1.json'), JSON.stringify(problem));
  await writeFile(path.join(root, 'survey/candidates/cq1.md'), `# ${candidate.title}\n`);
  await writeFile(path.join(root, 'survey/candidates/cq1.json'), JSON.stringify(candidate));
  const legacy = await readVault(root);
  const normalized = normalizeSurvey(legacy.openProblems, legacy.candidateQuestions);
  const sourced = { ...normalized.openProblems[0], paperId: 'p1', pageNumber: 3, excerpt: 'First line\n\nSecond line.', attribution: 'user-inference' };
  await writeVault(root, { ...legacy, openProblems: [sourced], candidateQuestions: [first, second] });
  const saved = await readVault(root);
  assert.deepEqual(saved.openProblems, [sourced]);
  assert.deepEqual(saved.candidateQuestions, [first, second]);
  assert.match(await readFile(path.join(root, 'research/survey/open-problems/op1.md'), 'utf8'), /Memory limit\n\nSecond paragraph/);
  await writeVault(root, { ...saved, candidateQuestions: [unlinked, second] });
  const updated = await readVault(root);
  assert.deepEqual(normalizeSurvey(updated.openProblems, updated.candidateQuestions).candidateQuestions, [unlinked, second]);
  await writeVault(root, { ...updated, candidateQuestions: [second] });
  assert.equal((await readVault(root)).openProblems.length, 1);
  await assert.rejects(readFile(path.join(root, 'research/survey/candidates/cq1.json')), { code: 'ENOENT' });
} finally { await rm(root, { recursive: true, force: true }); }
console.log('Survey many-to-many, legacy normalization, paper identity, source metadata and vault CRUD passed.');
