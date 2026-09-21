import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const JOBS = 'runtime/agent-jobs/literature/jobs';
const RUNS = 'runtime/agent-jobs/literature/runs';
const RESULTS = 'research/survey/discovery';
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID = /^[a-z0-9-]{1,120}$/;

async function readDir(root, relative) {
  const dir = path.join(root, relative);
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter(name => name.endsWith('.json')).sort();
  return Promise.all(names.map(name => readFile(path.join(dir, name), 'utf8').then(JSON.parse)));
}

async function atomicJson(root, relative, value) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

export function nextDailyRun(dailyTime, now = Date.now()) {
  if (!TIME.test(dailyTime)) throw new Error('dailyTime must use HH:mm.');
  const [hours, minutes] = dailyTime.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next.getTime();
}

export function validateJobInput(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid job.');
  const text = (value, name, max) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${name} is required and must be at most ${max} characters.`);
    return value.trim();
  };
  if (!Array.isArray(input.queries) || !input.queries.length || input.queries.length > 8 || !input.queries.every(query => typeof query === 'string' && query.trim() && query.length <= 300)) {
    throw new Error('queries must contain one to eight non-empty strings of up to 300 characters.');
  }
  if (!TIME.test(input.dailyTime) || typeof input.enabled !== 'boolean' || typeof input.expand !== 'boolean') throw new Error('Invalid schedule options.');
  return { name: text(input.name, 'name', 200), brief: text(input.brief, 'brief', 4000),
    queries: [...new Set(input.queries.map(query => query.trim()))], dailyTime: input.dailyTime,
    enabled: input.enabled, expand: input.expand };
}

export async function loadLiteratureState(root, now = Date.now()) {
  const jobs = (await readDir(root, JOBS)).filter(job => ID.test(job.id));
  const runs = (await readDir(root, RUNS)).filter(run => ID.test(run.id));
  const results = (await readDir(root, RESULTS)).filter(result => ID.test(result.id));
  return { jobs: jobs.map(job => job.enabled && (!Number.isFinite(job.nextRunAt) || job.nextRunAt <= 0)
    ? { ...job, nextRunAt: nextDailyRun(job.dailyTime, now) } : job), runs, results };
}

export async function saveJob(root, input, previous, now = Date.now()) {
  const values = validateJobInput(input);
  const job = { ...values, id: previous?.id ?? `literature-${crypto.randomUUID()}`, createdAt: previous?.createdAt ?? now,
    ...(previous?.lastRunAt === undefined ? {} : { lastRunAt: previous.lastRunAt }),
    ...(values.enabled ? { nextRunAt: nextDailyRun(values.dailyTime, now) } : {}) };
  await atomicJson(root, `${JOBS}/${job.id}.json`, job);
  return job;
}

export async function deleteJob(root, id) {
  if (!ID.test(id)) throw new Error('Invalid job id.');
  await unlink(path.join(root, JOBS, `${id}.json`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
}

export const saveRun = (root, run) => atomicJson(root, `${RUNS}/${run.id}.json`, run);
export const saveResult = (root, result) => atomicJson(root, `${RESULTS}/${result.id}.json`, result);
export const persistJob = (root, job) => atomicJson(root, `${JOBS}/${job.id}.json`, job);
