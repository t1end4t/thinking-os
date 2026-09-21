import { realpath, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { searchPapers } from './discovery.mjs';
import { isLocalRequest } from './agent.mjs';
import { DEFAULT_VAULT, resolveVaultDir, withVaultLock } from './vault.mjs';
import { deleteJob, loadLiteratureState, nextDailyRun, persistJob, saveJob, saveResult, saveRun, validateJobInput } from './literatureStore.mjs';

const BODY_LIMIT = 64 * 1024;
const ID = /^[a-z0-9-]{1,120}$/;

async function bodyOf(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new Error('Request exceeds 64 KiB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function scheduler() {
  return { active: true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'server local time' };
}

export function literaturePlugin({ search = searchPapers, intervalMs = 30_000, now = Date.now } = {}) {
  const roots = new Set();
  const activeJobs = new Set();
  let timer;

  const resolveRoot = async raw => {
    const resolved = resolveVaultDir(raw);
    const root = await realpath(resolved);
    if (!(await stat(root)).isDirectory()) throw new Error('Workspace folder must be a directory.');
    roots.add(root);
    return root;
  };

  const runJob = async (root, job) => {
    const key = `${root}:${job.id}`;
    if (activeJobs.has(key)) throw new Error('This job is already running.');
    activeJobs.add(key);
    const startedAt = now();
    const run = { id: `run-${crypto.randomUUID()}`, jobId: job.id, startedAt, status: 'running', resultCount: 0 };
    await withVaultLock(root, async () => {
      await saveRun(root, run);
      await persistJob(root, { ...job, lastRunAt: startedAt, ...(job.enabled ? { nextRunAt: nextDailyRun(job.dailyTime, startedAt) } : {}) });
    });
    void (async () => {
      try {
        const response = await search({ brief: job.brief, queries: job.queries, expand: job.expand });
        await withVaultLock(root, async () => {
          const current = await loadLiteratureState(root, now());
          for (const paper of response.results) {
            const previous = current.results.find(item => item.id === paper.id);
            await saveResult(root, { ...(previous ?? {}), ...paper, queries: [...new Set([...(previous?.queries ?? []), ...paper.queries])], jobId: job.id, runId: run.id });
          }
          await saveRun(root, { ...run, finishedAt: now(), status: 'completed', resultCount: response.results.length });
        });
      } catch (error) {
        await withVaultLock(root, () => saveRun(root, { ...run, finishedAt: now(), status: 'failed', resultCount: 0,
          error: error instanceof Error ? error.message : 'Literature search failed.' }));
      } finally { activeJobs.delete(key); }
    })();
    return run;
  };

  const tick = async () => {
    for (const root of roots) {
      try {
        const state = await withVaultLock(root, () => loadLiteratureState(root, now()));
        for (const job of state.jobs.filter(item => item.enabled && item.nextRunAt <= now())) {
          if (!activeJobs.has(`${root}:${job.id}`)) await runJob(root, job);
        }
      } catch (error) { console.error('Literature scheduler:', error instanceof Error ? error.message : error); }
    }
  };

  const send = (res, status, payload) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(payload));
  };

  return {
    name: 'thinking-os-literature',
    configureServer(server) {
      if (existsSync(DEFAULT_VAULT)) void resolveRoot(DEFAULT_VAULT).catch(() => {});
      timer = setInterval(() => void tick(), intervalMs);
      timer.unref?.();
      server.httpServer?.once('close', () => clearInterval(timer));
      server.middlewares.use('/api/literature', async (req, res) => {
        if (!isLocalRequest(req)) return send(res, 403, { error: 'Literature discovery requires a same-origin localhost connection.' });
        try {
          const url = new URL(req.originalUrl || req.url, 'http://localhost');
          const root = await resolveRoot(url.searchParams.get('dir') || '');
          if (req.method === 'GET') {
            const state = await withVaultLock(root, () => loadLiteratureState(root, now()));
            return send(res, 200, { ...state, scheduler: scheduler() });
          }
          if (req.method !== 'POST') return send(res, 405, { error: 'Only GET and POST are supported.' });
          if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(res, 415, { error: 'Expected application/json.' });
          const input = await bodyOf(req);
          if (input.action === 'search') return send(res, 200, await search(input));
          if (input.action === 'create') {
            const job = await withVaultLock(root, () => saveJob(root, input, undefined, now()));
            return send(res, 201, { job });
          }
          if (!ID.test(input.id || '')) throw new Error('Invalid job id.');
          const state = await withVaultLock(root, () => loadLiteratureState(root, now()));
          const existing = state.jobs.find(job => job.id === input.id);
          if (!existing) return send(res, 404, { error: 'Literature job not found.' });
          if (input.action === 'update') {
            validateJobInput(input);
            const job = await withVaultLock(root, () => saveJob(root, input, existing, now()));
            return send(res, 200, { job });
          }
          if (input.action === 'delete') {
            if (activeJobs.has(`${root}:${input.id}`)) return send(res, 409, { error: 'Stop waiting for the active run before deleting this job.' });
            await withVaultLock(root, () => deleteJob(root, input.id));
            return send(res, 200, { ok: true });
          }
          if (input.action === 'run') return send(res, 202, { run: await runJob(root, existing) });
          return send(res, 400, { error: 'Unknown literature action.' });
        } catch (error) { return send(res, 400, { error: error instanceof Error ? error.message : 'Invalid literature request.' }); }
      });
    }
  };
}
