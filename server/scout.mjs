import { existsSync } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { isLocalRequest } from './agent.mjs';
import { DEFAULT_VAULT, resolveVaultDir, withVaultLock } from './vault.mjs';
import {
  deleteScoutBrief,
  deleteScoutReport,
  deleteScoutRun,
  deleteTopicWatch,
  interruptScoutRuns,
  loadScoutState,
  saveScoutReport,
  saveScoutBrief,
  saveScoutRun,
  saveTopicWatch,
  persistTopicWatch,
  updateScoutCandidate
} from './scoutStore.mjs';
import { validScoutId } from './scoutValidation.mjs';
import { nextWatchRun } from './scoutSchedule.mjs';
import { retrieveScoutCandidates } from './scoutRetrieval.mjs';
import { assembleScoutReport, screenScoutCandidates } from './scoutScreening.mjs';

const BODY_LIMIT = 128 * 1024;

async function bodyOf(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new Error('Request exceeds 128 KiB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function resolveRoot(raw) {
  const root = await realpath(resolveVaultDir(raw));
  if (!(await stat(root)).isDirectory()) throw new Error('Workspace folder must be a directory.');
  return root;
}

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
}

const TERMINAL_STATES = new Set(['completed', 'partial', 'failed', 'cancelled', 'interrupted']);

const CARD_TEXT_LIMIT = 500;

function cardText(value) {
  return value.length <= CARD_TEXT_LIMIT ? value : `${value.slice(0, CARD_TEXT_LIMIT - 1).trimEnd()}\u2026`;
}

function candidateKeys(candidate) {
  return new Set([candidate.id, ...candidate.identities.map(identity => `${identity.kind}:${identity.value.toLowerCase()}`)]);
}

export function scoutPlugin({ now = Date.now, intervalMs = 30_000, retrieve = retrieveScoutCandidates, screen = screenScoutCandidates, assemble = assembleScoutReport } = {}) {
  const activeRuns = new Map();
  const initializedRoots = new Set();
  const roots = new Set();
  let timer;

  async function prepareRoot(raw) {
    const root = await resolveRoot(raw);
    if (!initializedRoots.has(root)) {
      await withVaultLock(root, () => interruptScoutRuns(root, now()));
      initializedRoots.add(root);
    }
    roots.add(root);
    return root;
  }

  async function removeRepeatedCandidates(root, run, screening) {
    if (run.source.kind !== 'watch') return { screening, repeatCount: 0 };
    const state = await withVaultLock(root, () => loadScoutState(root, now()));
    const previous = state.reports.filter(report => report.source.kind === 'watch' && report.source.id === run.source.id && report.id !== run.id)
      .flatMap(report => [...report.recommendations, ...report.uncertain]);
    const seen = new Set(previous.flatMap(candidate => [...candidateKeys(candidate)]));
    run.inputSnapshot.knownPaperIds.forEach(id => seen.add(id.toLowerCase()));
    const repeated = candidate => [...candidateKeys(candidate)].some(key => seen.has(key) || seen.has(key.toLowerCase()));
    const assessed = screening.assessed.filter(candidate => !repeated(candidate));
    const unscreened = screening.unscreened.filter(candidate => !repeated(candidate));
    return { screening: { ...screening, assessed, unscreened }, repeatCount: screening.assessed.length + screening.unscreened.length - assessed.length - unscreened.length };
  }

  async function executeRun(root, run, controller) {
    try {
      const retrieving = { ...run, state: 'retrieving', activeStage: 'retrieving', updatedAt: now() };
      await withVaultLock(root, () => saveScoutRun(root, retrieving));
      const result = await retrieve(run.inputSnapshot, { signal: controller.signal });
      if (controller.signal.aborted) throw controller.signal.reason ?? new DOMException('Cancelled', 'AbortError');
      const liveCandidates = (result.candidates || []).slice(0, 20).map(c => ({
        id: c.id,
        title: cardText(c.title),
        authors: cardText(c.authors || ''),
        ...(c.year ? { year: c.year } : {}),
        sources: c.sources || [],
        status: 'retrieved'
      }));
      const normalizing = { ...retrieving, state: 'normalizing', activeStage: 'normalizing', executedQueries: result.executedQueries,
        providerAttempts: result.attempts, counters: { retrieved: result.retrievedCount ?? result.candidates.length, normalized: result.normalizedCount ?? result.candidates.length, screened: 0 },
        checkpoints: ['retrieval-complete'], updatedAt: now(), liveCandidates };
      await withVaultLock(root, () => saveScoutRun(root, normalizing));
      if (controller.signal.aborted) throw controller.signal.reason ?? new DOMException('Cancelled', 'AbortError');
      const discoveryAttempts = result.attempts.filter(attempt => attempt.lane !== 'doi-verification');
      if (discoveryAttempts.length && discoveryAttempts.every(attempt => attempt.status === 'failed')) throw new Error('Every discovery provider failed.');
      const screeningRun = { ...normalizing, state: 'screening', activeStage: 'screening', updatedAt: now() };
      await withVaultLock(root, () => saveScoutRun(root, screeningRun));
      let checkpointRun = screeningRun;
      const screening = await screen(run.inputSnapshot, result.candidates, { signal: controller.signal, onBatch: async progress => {
        const assessedMap = new Map((progress.assessed || []).map(a => [a.id, a.outcome]));
        const updatedLive = (checkpointRun.liveCandidates || liveCandidates).map(c => {
          const outcome = assessedMap.get(c.id);
          if (outcome === 'recommend') return { ...c, status: 'recommended' };
          if (outcome === 'uncertain') return { ...c, status: 'uncertain' };
          if (outcome === 'reject') return { ...c, status: 'rejected' };
          if (outcome) return { ...c, status: 'screened' };
          return c;
        });
        checkpointRun = { ...checkpointRun, counters: { ...checkpointRun.counters, screened: progress.completed },
          checkpoints: [...checkpointRun.checkpoints, `screening:${progress.completed}`], updatedAt: now(),
          liveCandidates: updatedLive };
        await withVaultLock(root, () => saveScoutRun(root, checkpointRun));
      } });
      if (controller.signal.aborted) throw controller.signal.reason ?? new DOMException('Cancelled', 'AbortError');
      const assembling = { ...checkpointRun, state: 'assembling', activeStage: 'assembling',
        counters: { ...checkpointRun.counters, screened: screening.assessed.length }, checkpoints: [...checkpointRun.checkpoints, 'screening-complete'], updatedAt: now(),
        liveCandidates: checkpointRun.liveCandidates };
      await withVaultLock(root, () => saveScoutRun(root, assembling));
      const novelty = await removeRepeatedCandidates(root, run, screening);
      const retrieval = novelty.repeatCount ? { ...result, limitations: [...result.limitations, `${novelty.repeatCount} previously surfaced candidate(s) were omitted for this watch.`] } : result;
      const report = assemble({ brief: run.inputSnapshot, source: run.source, runId: run.id, retrieval, screening: novelty.screening, createdAt: now() });
      const finishedAt = now();
      await withVaultLock(root, async () => {
        if (controller.signal.aborted) throw controller.signal.reason ?? new DOMException('Cancelled', 'AbortError');
        await saveScoutReport(root, report);
        await saveScoutRun(root, { ...assembling, state: report.status, checkpoints: [...assembling.checkpoints, 'report'],
          reportId: run.id, updatedAt: finishedAt, finishedAt });
      });
    } catch (error) {
      const cancelled = controller.signal.aborted || error?.name === 'AbortError';
      const interrupted = cancelled && controller.signal.reason?.message === 'Server closed';
      const finishedAt = now();
      await withVaultLock(root, async () => {
        const state = await loadScoutState(root, finishedAt);
        const current = state.runs.find(item => item.id === run.id) ?? run;
        await saveScoutRun(root, { ...current, state: interrupted ? 'interrupted' : cancelled ? 'cancelled' : 'failed', updatedAt: finishedAt, finishedAt,
          ...(interrupted ? { error: 'The application stopped before this scout run completed.' }
            : cancelled ? { cancellationReason: 'Cancelled by user.' } : { error: error instanceof Error ? error.message : 'Scout retrieval failed.' }) });
      });
    } finally {
      activeRuns.delete(`${root}:${run.source.kind}:${run.source.id}`);
    }
  }

  async function createRun(root, kind, id) {
    const key = `${root}:${kind}:${id}`;
    if (activeRuns.has(key)) return 'active';
    const run = await withVaultLock(root, async () => {
      const state = await loadScoutState(root, now());
      const source = kind === 'brief' ? state.briefs.find(item => item.id === id) : state.watches.find(item => item.id === id);
      if (!source) return null;
      if (state.runs.some(item => item.source.kind === kind && item.source.id === id && !TERMINAL_STATES.has(item.state))) return 'active';
      const startedAt = now();
      const created = { id: `scout-run-${crypto.randomUUID()}`, source: { kind, id }, inputSnapshot: source,
        state: 'queued', activeStage: 'queued', executedQueries: [], providerAttempts: [],
        counters: { retrieved: 0, normalized: 0, screened: 0 }, checkpoints: ['created'], startedAt, updatedAt: startedAt };
      await saveScoutRun(root, created);
      if (kind === 'watch') await persistTopicWatch(root, { ...source, lastRunAt: startedAt,
        ...(source.enabled && source.schedule.cadence === 'daily'
          ? { nextRunAt: nextWatchRun(source.schedule.localTime, source.schedule.timeZone, startedAt) }
          : { nextRunAt: undefined }) });
      return created;
    });
    if (!run || run === 'active') return run;
    const controller = new AbortController();
    activeRuns.set(key, controller);
    void executeRun(root, run, controller);
    return run;
  }

  async function tick() {
    for (const root of roots) {
      try {
        const state = await withVaultLock(root, () => loadScoutState(root, now()));
        for (const watch of state.watches.filter(item => item.enabled && item.schedule.cadence === 'daily' && item.nextRunAt !== undefined && item.nextRunAt <= now())) {
          await createRun(root, 'watch', watch.id);
        }
      } catch (error) {
        console.error('Scout scheduler:', error instanceof Error ? error.message : error);
      }
    }
  }

  return {
    name: 'thinking-os-scouts',
    configureServer(server) {
      if (existsSync(DEFAULT_VAULT)) void prepareRoot(DEFAULT_VAULT).catch(() => {});
      timer = setInterval(() => void tick(), intervalMs);
      timer.unref?.();
      server.httpServer?.once('close', () => {
        clearInterval(timer);
        activeRuns.forEach(controller => controller.abort(new DOMException('Server closed', 'AbortError')));
      });
      server.middlewares.use('/api/scouts', async (request, response) => {
        if (!isLocalRequest(request)) return send(response, 403, { error: 'Paper scouting requires a same-origin localhost connection.' });
        try {
          const url = new URL(request.originalUrl || request.url, 'http://localhost');
          const root = await prepareRoot(url.searchParams.get('dir') || '');
          if (request.method === 'GET') return send(response, 200, await withVaultLock(root, () => loadScoutState(root, now())));
          if (request.method !== 'POST') return send(response, 405, { error: 'Only GET and POST are supported.' });
          if (request.headers['content-type']?.split(';')[0] !== 'application/json') return send(response, 415, { error: 'Expected application/json.' });
          const input = await bodyOf(request);
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid scout request.');
          if (input.action === 'save-brief') {
            const result = await withVaultLock(root, async () => {
              const state = await loadScoutState(root, now());
              const previous = input.id === undefined ? undefined : state.briefs.find(item => item.id === input.id);
              if (input.id !== undefined && !previous) return { missing: true };
              return { brief: await saveScoutBrief(root, input.brief, previous, now()), updated: Boolean(previous) };
            });
            if (result.missing) return send(response, 404, { error: 'Scout brief not found.' });
            return send(response, result.updated ? 200 : 201, { brief: result.brief });
          }
          if (input.action === 'save-watch') {
            const result = await withVaultLock(root, async () => {
              const state = await loadScoutState(root, now());
              const previous = input.id === undefined ? undefined : state.watches.find(item => item.id === input.id);
              if (input.id !== undefined && !previous) return { missing: true };
              return { watch: await saveTopicWatch(root, input.watch, previous, now()), updated: Boolean(previous) };
            });
            if (result.missing) return send(response, 404, { error: 'Topic watch not found.' });
            return send(response, result.updated ? 200 : 201, { watch: result.watch });
          }
          if (input.action === 'start-run') {
            if (!validScoutId(input.id)) throw new Error('Invalid scout source id.');
            const kind = input.kind === 'watch' ? 'watch' : 'brief';
            const run = await createRun(root, kind, input.id);
            if (!run) return send(response, 404, { error: kind === 'watch' ? 'Topic watch not found.' : 'Scout brief not found.' });
            if (run === 'active') return send(response, 409, { error: `This ${kind === 'watch' ? 'topic watch' : 'scout brief'} already has an active run.` });
            return send(response, 202, { run });
          }
          if (input.action === 'cancel-run') {
            if (!validScoutId(input.id)) throw new Error('Invalid scout run id.');
            const state = await withVaultLock(root, () => loadScoutState(root, now()));
            const run = state.runs.find(item => item.id === input.id);
            if (!run) return send(response, 404, { error: 'Scout run not found.' });
            const key = `${root}:${run.source.kind}:${run.source.id}`;
            const controller = activeRuns.get(key);
            if (!controller) return send(response, 409, { error: 'Scout run is not active.' });
            const cancelling = { ...run, state: 'cancelling', activeStage: run.activeStage, updatedAt: now() };
            await withVaultLock(root, () => saveScoutRun(root, cancelling));
            controller.abort(new DOMException('Cancelled', 'AbortError'));
            return send(response, 202, { run: cancelling });
          }
          if (input.action === 'delete-run') {
            if (!validScoutId(input.id)) throw new Error('Invalid scout run id.');
            const result = await withVaultLock(root, async () => {
              const state = await loadScoutState(root, now());
              const run = state.runs.find(item => item.id === input.id);
              if (!run) return { missing: true };
              if (activeRuns.has(`${root}:${run.source.kind}:${run.source.id}`)) return { active: true };
              await deleteScoutRun(root, run.id);
              if (run.reportId) await deleteScoutReport(root, run.reportId);
              return { ok: true };
            });
            if (result.missing) return send(response, 404, { error: 'Scout run not found.' });
            if (result.active) return send(response, 409, { error: 'Cancel the run before deleting it.' });
            return send(response, 200, { ok: true });
          }
          if (input.action === 'decide-candidate') {
            if (!validScoutId(input.reportId) || !validScoutId(input.candidateId) || !['saved', 'dismissed'].includes(input.decision)) throw new Error('Invalid candidate decision.');
            if (input.decision === 'saved' && !validScoutId(input.paperId)) throw new Error('Saved candidates require a paper id.');
            if (input.reason !== undefined && !['not-relevant', 'already-known', 'too-weak', 'duplicate-contribution', 'not-useful-now', 'other'].includes(input.reason)) throw new Error('Invalid dismissal reason.');
            if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 2000)) throw new Error('Invalid decision note.');
            const report = await withVaultLock(root, () => updateScoutCandidate(root, input.reportId, input.candidateId, {
              decision: input.decision, decisionAt: now(), ...(input.reason ? { decisionReason: input.reason } : {}),
              ...(input.note?.trim() ? { decisionNote: input.note.trim() } : {}), ...(input.paperId ? { paperId: input.paperId } : {})
            }));
            return report ? send(response, 200, { report }) : send(response, 404, { error: 'Scout candidate not found.' });
          }
          if (input.action === 'request-inspection') {
            if (!validScoutId(input.reportId) || !validScoutId(input.candidateId)) throw new Error('Invalid inspection request.');
            const report = await withVaultLock(root, () => updateScoutCandidate(root, input.reportId, input.candidateId, { inspection: { status: 'requested', requestedAt: now() } }));
            return report ? send(response, 200, { report }) : send(response, 404, { error: 'Scout candidate not found.' });
          }
          if (!validScoutId(input.id)) throw new Error('Invalid scout record id.');
          if (input.action === 'delete-brief') await withVaultLock(root, () => deleteScoutBrief(root, input.id));
          else if (input.action === 'delete-watch') await withVaultLock(root, () => deleteTopicWatch(root, input.id));
          else if (input.action === 'delete-report') await withVaultLock(root, () => deleteScoutReport(root, input.id));
          else return send(response, 400, { error: 'Unknown scout action.' });
          return send(response, 200, { ok: true });
        } catch (error) {
          return send(response, 400, { error: error instanceof Error ? error.message : 'Invalid scout request.' });
        }
      });
    }
  };
}
