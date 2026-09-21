import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { literaturePlugin } from './literature.mjs';
import { deleteJob, loadLiteratureState, nextDailyRun, saveJob, saveResult, saveRun } from './literatureStore.mjs';

test('daily schedule uses server-local HH:mm and rolls to tomorrow', () => {
  const morning = new Date(2026, 8, 21, 8, 0).getTime();
  assert.equal(nextDailyRun('09:30', morning), new Date(2026, 8, 21, 9, 30).getTime());
  const evening = new Date(2026, 8, 21, 10, 0).getTime();
  assert.equal(nextDailyRun('09:30', evening), new Date(2026, 8, 22, 9, 30).getTime());
  assert.throws(() => nextDailyRun('25:00', morning), /HH:mm/);
});

test('job CRUD and run/results preserve multiline briefs and history', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-literature-'));
  try {
    const input = { name: 'Tiny devices', brief: 'Memory limits\n\nCompiler approaches', queries: ['activation memory'], dailyTime: '09:00', enabled: true, expand: false };
    const job = await saveJob(root, input, undefined, 1000);
    assert.match(job.id, /^literature-/);
    const changed = await saveJob(root, { ...input, name: 'Edited', enabled: false }, job, 2000);
    assert.equal(changed.id, job.id);
    assert.equal(changed.nextRunAt, undefined);
    const run = { id: 'run-test', jobId: job.id, startedAt: 3, finishedAt: 4, status: 'completed', resultCount: 1 };
    const result = { id: 'paper-test', title: 'Paper', authors: 'Author', year: 2026, source: 'Test metadata', queries: ['activation memory'], discoveredAt: 3, jobId: job.id, runId: run.id };
    await saveRun(root, run);
    await saveResult(root, result);
    const state = await loadLiteratureState(root, 5000);
    assert.deepEqual(state, { jobs: [changed], runs: [run], results: [result] });
    assert.match(await readFile(path.join(root, 'runtime/agent-jobs/literature/jobs', `${job.id}.json`), 'utf8'), /Memory limits\\n\\nCompiler/);
    await deleteJob(root, job.id);
    const after = await loadLiteratureState(root, 6000);
    assert.deepEqual(after.jobs, []);
    assert.deepEqual(after.runs, [run]);
    assert.deepEqual(after.results, [result]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('direct searches persist candidates and merge query provenance across reloads', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-literature-search-'));
  const server = createServer();
  const paper = { id: 'paper-search', title: 'Cached paper', authors: 'Ada Author', year: 2026,
    doi: '10.1234/cached', url: 'https://doi.org/10.1234/cached', abstract: 'Cached abstract.',
    source: 'Crossref metadata/abstract (not full text)', discoveredAt: 123 };
  literaturePlugin({ intervalMs: 60_000, now: () => 123, search: async input => ({
    results: [{ ...paper, queries: [input.brief] }], queries: [input.brief]
  }) }).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => {
    server.closeAllConnections();
    server.close();
    await rm(root, { recursive: true, force: true });
  });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/literature?${new URLSearchParams({ dir: root })}`;
  const post = brief => fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', origin: new URL(endpoint).origin },
    body: JSON.stringify({ action: 'search', brief, queries: [], expand: false }) });

  assert.equal((await post('first query')).status, 200);
  assert.equal((await post('second query')).status, 200);
  const reloaded = await (await fetch(endpoint, { headers: { origin: new URL(endpoint).origin } })).json();
  assert.equal(reloaded.results.length, 1);
  assert.deepEqual(reloaded.results[0].queries, ['first query', 'second query']);
  assert.match(await readFile(path.join(root, 'research/survey/discovery/paper-search.json'), 'utf8'), /Cached abstract/);
});
