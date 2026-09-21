import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scoutPlugin } from './scout.mjs';
import {
  deleteScoutBrief,
  deleteTopicWatch,
  loadScoutState,
  interruptScoutRuns,
  saveScoutBrief,
  saveScoutReport,
  saveScoutRun,
  saveTopicWatch
} from './scoutStore.mjs';

const briefInput = {
  question: 'Can TinyML training fit on microcontrollers?\n\nWhich memory strategy matters most?',
  purpose: 'Choose an experiment direction without claiming results.',
  scope: ['On-device training'], exclusions: ['Inference-only work'], constraints: ['Open metadata'],
  searchDirections: [{ query: 'TinyML on-device training memory', reason: 'Direct terminology' }],
  screeningCriteria: ['Must discuss training'], maxRecommendations: 5,
  createdFrom: { kind: 'user', reference: 'assistant:test' }, author: 'user'
};

const watchInput = {
  name: 'Tiny training', topic: 'On-device neural-network training', purpose: 'Track methods worth reproducing.',
  scope: ['Microcontrollers'], exclusions: [], searchDirections: briefInput.searchDirections,
  qualityPolicy: ['Observable evaluation'], recencyPolicy: 'mixed', qualityThreshold: 'medium',
  schedule: { cadence: 'daily', localTime: '09:00', timeZone: 'Asia/Ho_Chi_Minh' },
  enabled: true, maxRecommendations: 3, providerBudget: 30, knownPaperIds: [],
  createdFrom: { kind: 'user', reference: 'test watch' }, author: 'user'
};

test('briefs, watches, runs, and reports round-trip without deleting history', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-'));
  try {
    const brief = await saveScoutBrief(root, briefInput, undefined, 1000);
    const edited = await saveScoutBrief(root, { ...briefInput, purpose: 'Revised\n\npurpose.' }, brief, 2000);
    assert.equal(edited.id, brief.id);
    assert.equal(edited.createdAt, 1000);
    assert.equal(edited.updatedAt, 2000);

    const watch = await saveTopicWatch(root, watchInput, undefined, 1000);
    const changedWatch = await saveTopicWatch(root, { ...watchInput, enabled: false }, watch, 2000);
    assert.equal(changedWatch.id, watch.id);

    const run = {
      id: 'scout-run-test', source: { kind: 'brief', id: brief.id }, inputSnapshot: edited,
      state: 'completed', activeStage: 'assembling', executedQueries: ['TinyML training'], providerAttempts: [],
      counters: { retrieved: 4, normalized: 3, screened: 3 }, checkpoints: ['report'],
      startedAt: 3000, updatedAt: 4000, finishedAt: 4000, reportId: 'scout-run-test'
    };
    const report = {
      id: run.id, source: run.source, inputSnapshot: edited, status: 'completed', summary: 'Three candidates screened.\n\nOne was useful.',
      sources: ['OpenAlex'], executedQueries: run.executedQueries, recommendations: [], uncertain: [],
      rejectionCounts: { irrelevant: 2 }, limitations: ['Fixture report'],
      screening: { model: 'fixture', instructionsVersion: 'v1' }, createdAt: 4000
    };
    await saveScoutRun(root, run);
    await saveScoutReport(root, report);

    const state = await loadScoutState(root, 5000);
    assert.deepEqual(state.briefs, [edited]);
    assert.deepEqual(state.watches, [changedWatch]);
    assert.deepEqual(state.runs, [run]);
    assert.deepEqual(state.reports, [report]);
    assert.match(await readFile(path.join(root, 'research/survey/scouting/briefs', `${brief.id}.md`), 'utf8'), /Which memory strategy/);
    assert.doesNotMatch(await readFile(path.join(root, 'research/survey/scouting/briefs', `${brief.id}.json`), 'utf8'), /Which memory strategy/);

    await deleteScoutBrief(root, brief.id);
    await deleteTopicWatch(root, watch.id);
    const after = await loadScoutState(root, 6000);
    assert.deepEqual(after.briefs, []);
    assert.deepEqual(after.watches, []);
    assert.deepEqual(after.runs, [run]);
    assert.deepEqual(after.reports, [report]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('legacy literature records migrate once, remain untouched, and stale runs become interrupted', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-migration-'));
  try {
    const job = { id: 'literature-test', name: 'Legacy', brief: 'Legacy\n\nbrief', queries: ['old query'], dailyTime: '08:30', enabled: true, expand: false, createdAt: 10 };
    const run = { id: 'run-legacy', jobId: job.id, startedAt: 20, status: 'running', resultCount: 1 };
    const result = { id: 'paper-legacy', title: 'Legacy paper', authors: 'A. Author', year: 2025, source: 'Crossref', queries: ['old query'], discoveredAt: 21, jobId: job.id, runId: run.id };
    for (const [relative, value] of [
      [`runtime/agent-jobs/literature/jobs/${job.id}.json`, job],
      [`runtime/agent-jobs/literature/runs/${run.id}.json`, run],
      [`research/survey/discovery/${result.id}.json`, result]
    ]) {
      await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
      await writeFile(path.join(root, relative), JSON.stringify(value));
    }

    const first = await loadScoutState(root, 100);
    assert.equal(first.watches[0].id, job.id);
    assert.equal(first.runs[0].state, 'interrupted');
    assert.equal(first.reports[0].recommendations[0].assessmentState, 'unscreened');
    assert.equal(first.reports[0].recommendations[0].title, result.title);
    assert.equal((await readFile(path.join(root, `runtime/agent-jobs/literature/jobs/${job.id}.json`), 'utf8')).length > 0, true);
    assert.deepEqual(await loadScoutState(root, 200), first);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('malformed scout sidecars fail without overwriting valid files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-invalid-'));
  try {
    const brief = await saveScoutBrief(root, briefInput, undefined, 1000);
    const file = path.join(root, 'research/survey/scouting/briefs', `${brief.id}.json`);
    const valid = await readFile(file, 'utf8');
    await writeFile(file, '{"id":42}');
    await assert.rejects(loadScoutState(root), /brief/);
    assert.equal(await readFile(file, 'utf8'), '{"id":42}');
    await writeFile(file, valid);
    assert.equal((await loadScoutState(root)).briefs.length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('startup recovery marks non-terminal scout runs interrupted', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-recovery-'));
  try {
    const brief = await saveScoutBrief(root, briefInput, undefined, 1000);
    await saveScoutRun(root, { id: 'scout-run-recovery', source: { kind: 'brief', id: brief.id }, inputSnapshot: brief,
      state: 'retrieving', activeStage: 'retrieving', executedQueries: [], providerAttempts: [],
      counters: { retrieved: 0, normalized: 0, screened: 0 }, checkpoints: ['created'], startedAt: 1001, updatedAt: 1001 });
    await interruptScoutRuns(root, 2000);
    const run = (await loadScoutState(root, 2001)).runs[0];
    assert.equal(run.state, 'interrupted');
    assert.equal(run.finishedAt, 2000);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('scout endpoint requires same-origin JSON and exposes persisted state', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-http-'));
  const server = createServer();
  scoutPlugin().configureServer({ middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => { server.closeAllConnections(); server.close(); await rm(root, { recursive: true, force: true }); });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/scouts?${new URLSearchParams({ dir: root })}`;
  const origin = new URL(endpoint).origin;
  const unsupported = await fetch(endpoint, { method: 'POST', headers: { origin }, body: '{}' });
  assert.equal(unsupported.status, 415);
  const crossOrigin = await fetch(endpoint, { headers: { origin: 'https://example.com' } });
  assert.equal(crossOrigin.status, 403);
  const created = await fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'save-brief', brief: briefInput }) });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  const updated = await fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'save-brief', id: createdBody.brief.id, brief: { ...briefInput, purpose: 'Updated purpose.' } }) });
  assert.equal(updated.status, 200);
  const snapshot = await (await fetch(endpoint, { headers: { origin } })).json();
  assert.equal(snapshot.briefs.length, 1);
  assert.equal(snapshot.briefs[0].question, briefInput.question);
  assert.equal(snapshot.briefs[0].purpose, 'Updated purpose.');
  const deleted = await fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'delete-brief', id: createdBody.brief.id }) });
  assert.equal(deleted.status, 200);
  assert.equal((await (await fetch(endpoint, { headers: { origin } })).json()).briefs.length, 0);
});

async function waitForRun(endpoint, origin, runId, state) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const snapshot = await (await fetch(endpoint, { headers: { origin } })).json();
    const run = snapshot.runs.find(item => item.id === runId);
    if (run?.state === state) return { run, snapshot };
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(`Run ${runId} did not reach ${state}.`);
}

test('manual runs detach, persist normalized candidates, and reject concurrent starts', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-run-'));
  const server = createServer();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const candidate = { id: 'candidate-test', title: 'Retrieved paper', authors: 'Ada Author', year: 2026, identities: [],
    matchingQueries: ['query'], sources: ['OpenAlex'], provenance: [{ provider: 'OpenAlex', lane: 'lexical', query: 'query', retrievedAt: 2 }],
    metadataConflicts: [], limitations: [], assessmentState: 'unscreened' };
  scoutPlugin({ now: (() => { let value = 100; return () => ++value; })(), retrieve: async () => {
    await gate;
    return { candidates: [candidate], attempts: [{ provider: 'OpenAlex', lane: 'lexical', query: 'query', status: 'completed', attempts: 1, resultCount: 1, startedAt: 1, completedAt: 2, truncated: false }],
      limitations: [], partial: false, executedQueries: ['query'] };
  }, screen: async () => ({ assessed: [{ ...candidate, relevance: 'direct', evidenceExcerpt: candidate.title,
    relevanceAssessment: 'Directly addresses the brief.', expectedValue: 'Provides a method to inspect.', qualityConfidence: 'medium',
    qualityEvidence: [candidate.title], limitations: ['Fixture assessment.'], outcome: 'recommend',
    recommendationReason: 'Directly useful.', coverageTags: ['memory'], suggestedNextAction: 'inspect full text', assessmentState: 'screened' }],
    unscreened: [], failures: [], model: 'fixture', instructionsVersion: 'fixture-v1' })
  }).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => { server.closeAllConnections(); server.close(); await rm(root, { recursive: true, force: true }); });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/scouts?${new URLSearchParams({ dir: root })}`;
  const origin = new URL(endpoint).origin;
  const post = body => fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const created = await (await post({ action: 'save-brief', brief: briefInput })).json();
  const startedResponse = await post({ action: 'start-run', id: created.brief.id });
  assert.equal(startedResponse.status, 202);
  const started = await startedResponse.json();
  assert.equal((await post({ action: 'start-run', id: created.brief.id })).status, 409);
  release();
  const { run, snapshot } = await waitForRun(endpoint, origin, started.run.id, 'completed');
  assert.equal(run.reportId, run.id);
  assert.equal(snapshot.reports[0].recommendations[0].title, candidate.title);
  assert.equal(snapshot.reports[0].screening.model, 'fixture');
});

test('active manual runs can be cancelled without later completing', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-cancel-'));
  const server = createServer();
  scoutPlugin({ retrieve: async (_brief, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }) }).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => { server.closeAllConnections(); server.close(); await rm(root, { recursive: true, force: true }); });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/scouts?${new URLSearchParams({ dir: root })}`;
  const origin = new URL(endpoint).origin;
  const post = body => fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const created = await (await post({ action: 'save-brief', brief: briefInput })).json();
  const started = await (await post({ action: 'start-run', id: created.brief.id })).json();
  assert.equal((await post({ action: 'cancel-run', id: started.run.id })).status, 202);
  const { snapshot } = await waitForRun(endpoint, origin, started.run.id, 'cancelled');
  assert.equal(snapshot.reports.length, 0);
});

test('topic watch reruns omit candidates already surfaced by the same watch', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-watch-repeat-'));
  const server = createServer();
  const candidate = { id: 'candidate-repeat', title: 'Repeated paper', authors: 'Ada Author', year: 2026,
    identities: [{ kind: 'doi', value: '10.1000/repeat', source: 'OpenAlex', canonical: true }], matchingQueries: ['query'], sources: ['OpenAlex'],
    provenance: [{ provider: 'OpenAlex', lane: 'lexical', query: 'query', retrievedAt: 2 }], metadataConflicts: [], limitations: [], assessmentState: 'unscreened' };
  scoutPlugin({ now: (() => { let value = Date.parse('2026-09-21T00:00:00Z'); return () => ++value; })(), retrieve: async () => ({
    candidates: [candidate], attempts: [{ provider: 'OpenAlex', lane: 'lexical', query: 'query', status: 'completed', attempts: 1, resultCount: 1, startedAt: 1, completedAt: 2, truncated: false }],
    limitations: [], partial: false, executedQueries: ['query']
  }), screen: async () => ({ assessed: [{ ...candidate, relevance: 'direct', evidenceExcerpt: candidate.title,
    relevanceAssessment: 'Direct.', expectedValue: 'Useful.', qualityConfidence: 'medium', qualityEvidence: [candidate.title], limitations: [],
    outcome: 'recommend', recommendationReason: 'Useful.', coverageTags: ['method'], suggestedNextAction: 'save', assessmentState: 'screened' }],
    unscreened: [], failures: [], model: 'fixture', instructionsVersion: 'fixture-v1' })
  }).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => { server.closeAllConnections(); server.close(); await rm(root, { recursive: true, force: true }); });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/scouts?${new URLSearchParams({ dir: root })}`;
  const origin = new URL(endpoint).origin;
  const post = body => fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const created = await (await post({ action: 'save-watch', watch: { ...watchInput, schedule: { ...watchInput.schedule, cadence: 'manual' }, enabled: false } })).json();
  const first = await (await post({ action: 'start-run', kind: 'watch', id: created.watch.id })).json();
  await waitForRun(endpoint, origin, first.run.id, 'completed');
  const second = await (await post({ action: 'start-run', kind: 'watch', id: created.watch.id })).json();
  const { snapshot } = await waitForRun(endpoint, origin, second.run.id, 'completed');
  const secondReport = snapshot.reports.find(report => report.id === second.run.id);
  assert.equal(secondReport.recommendations.length, 0);
  assert.match(secondReport.limitations.join(' '), /previously surfaced candidate/);
});

test('daily watch scheduling performs one catch-up run and advances to the next future slot', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-watch-schedule-'));
  const server = createServer();
  let clock = Date.parse('2026-09-21T00:00:00Z');
  scoutPlugin({ now: () => clock, intervalMs: 5, retrieve: async () => ({ candidates: [], attempts: [], limitations: [], partial: false, executedQueries: ['query'] }),
    screen: async () => ({ assessed: [], unscreened: [], failures: [], model: 'fixture', instructionsVersion: 'fixture-v1' })
  }).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => { server.closeAllConnections(); server.close(); await rm(root, { recursive: true, force: true }); });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/scouts?${new URLSearchParams({ dir: root })}`;
  const origin = new URL(endpoint).origin;
  const created = await (await fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'save-watch', watch: watchInput }) })).json();
  clock = created.watch.nextRunAt + 3 * 24 * 60 * 60 * 1000;
  let snapshot;
  for (let attempt = 0; attempt < 100; attempt++) {
    snapshot = await (await fetch(endpoint, { headers: { origin } })).json();
    if (snapshot.runs.some(run => run.source.kind === 'watch' && run.state === 'completed')) break;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(snapshot.runs.filter(run => run.source.kind === 'watch').length, 1);
  assert.ok(snapshot.watches[0].nextRunAt > clock);
});

test('candidate decisions and deeper-inspection requests persist in reports', async context => {
  const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-decisions-'));
  const server = createServer();
  scoutPlugin({ now: (() => { let value = 500; return () => ++value; })() }).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(async () => { server.closeAllConnections(); server.close(); await rm(root, { recursive: true, force: true }); });
  const brief = await saveScoutBrief(root, briefInput, undefined, 100);
  const screened = { id: 'candidate-decision', title: 'Decision paper', authors: 'Ada Author', year: 2026, identities: [], matchingQueries: ['query'], sources: ['OpenAlex'],
    provenance: [{ provider: 'OpenAlex', lane: 'lexical', query: 'query', retrievedAt: 1 }], metadataConflicts: [], limitations: [], assessmentState: 'screened',
    relevance: 'direct', evidenceExcerpt: 'Decision paper', relevanceAssessment: 'Direct.', expectedValue: 'Useful.', qualityConfidence: 'low', qualityEvidence: ['Decision paper'],
    outcome: 'recommend', recommendationReason: 'Useful.', coverageTags: ['method'], suggestedNextAction: 'inspect full text' };
  await saveScoutReport(root, { id: 'scout-run-decision', source: { kind: 'brief', id: brief.id }, inputSnapshot: brief, status: 'completed', summary: 'One result.',
    sources: ['OpenAlex'], executedQueries: ['query'], recommendations: [screened], uncertain: [], rejectionCounts: {}, limitations: [],
    screening: { model: 'fixture', instructionsVersion: 'v1' }, createdAt: 200 });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/scouts?${new URLSearchParams({ dir: root })}`;
  const origin = new URL(endpoint).origin;
  const post = body => fetch(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const saved = await post({ action: 'decide-candidate', reportId: 'scout-run-decision', candidateId: screened.id, decision: 'saved', paperId: 'p-decision' });
  assert.equal(saved.status, 200);
  const inspected = await post({ action: 'request-inspection', reportId: 'scout-run-decision', candidateId: screened.id });
  assert.equal(inspected.status, 200);
  const report = (await (await fetch(endpoint, { headers: { origin } })).json()).reports[0];
  assert.equal(report.recommendations[0].decision, 'saved');
  assert.equal(report.recommendations[0].paperId, 'p-decision');
  assert.equal(report.recommendations[0].inspection.status, 'requested');
});
