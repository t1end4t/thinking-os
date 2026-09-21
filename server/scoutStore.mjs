import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseScoutBrief,
  parseScoutBriefInput,
  parseScoutReport,
  parseScoutRun,
  parseTopicWatch,
  parseTopicWatchInput,
  validScoutId
} from './scoutValidation.mjs';
import { nextWatchRun, validateTimeZone } from './scoutSchedule.mjs';

const BRIEFS = 'research/survey/scouting/briefs';
const WATCHES = 'research/survey/scouting/watches';
const REPORTS = 'research/survey/scouting/reports';
const RUNS = 'runtime/agent-jobs/scouting/runs';
const MIGRATION = 'runtime/agent-jobs/scouting/legacy-literature-v1.json';
const LEGACY_JOBS = 'runtime/agent-jobs/literature/jobs';
const LEGACY_RUNS = 'runtime/agent-jobs/literature/runs';
const LEGACY_RESULTS = 'research/survey/discovery';

async function atomicFile(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, content, { mode: 0o600 });
  await rename(temporary, file);
}

async function atomicJson(root, relative, value) {
  await atomicFile(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
}

async function readJsonDir(root, relative) {
  const dir = path.join(root, relative);
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter(name => name.endsWith('.json')).sort();
  return Promise.all(names.map(async name => JSON.parse(await readFile(path.join(dir, name), 'utf8'))));
}

async function readProseDir(root, relative, parse, proseFields) {
  const dir = path.join(root, relative);
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter(name => name.endsWith('.json')).sort();
  return Promise.all(names.map(async name => {
    const id = name.slice(0, -5);
    try {
      const metadata = JSON.parse(await readFile(path.join(dir, name), 'utf8'));
      const markdown = await readFile(path.join(dir, `${id}.md`), 'utf8');
      const match = /<!-- thinking-os:scout-prose:([^\n]+) -->/.exec(markdown);
      if (!match) throw new Error('missing prose metadata');
      const prose = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
      const values = Object.fromEntries(proseFields.map(field => [field, prose[field]]));
      return parse({ ...metadata, ...values });
    } catch (error) {
      throw new Error(`Invalid ${path.basename(relative)} record ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }));
}

async function saveProseRecord(root, relative, record, parse, proseFields) {
  const parsed = parse(record);
  const prose = Object.fromEntries(proseFields.map(field => [field, parsed[field]]));
  const metadata = Object.fromEntries(Object.entries(parsed).filter(([field]) => !proseFields.includes(field)));
  const base = path.join(root, relative, parsed.id);
  const title = relative === BRIEFS ? 'Scout Brief' : relative === WATCHES ? 'Topic Watch' : 'Scout Report';
  const markdown = [`# ${title}`, ...proseFields.flatMap(field => [``, `## ${field[0].toUpperCase()}${field.slice(1)}`, ``, prose[field]]),
    ``, `<!-- thinking-os:scout-prose:${Buffer.from(JSON.stringify(prose)).toString('base64url')} -->`, ``].join('\n');
  await atomicFile(`${base}.md`, markdown);
  await atomicFile(`${base}.json`, `${JSON.stringify(metadata, null, 2)}\n`);
  return parsed;
}

async function deletePair(root, relative, id) {
  if (!validScoutId(id)) throw new Error('Invalid scout record id.');
  await Promise.all(['md', 'json'].map(extension => unlink(path.join(root, relative, `${id}.${extension}`)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  })));
}

export async function saveScoutBrief(root, input, previous, now = Date.now()) {
  const values = parseScoutBriefInput(input);
  return saveProseRecord(root, BRIEFS, { ...values, id: previous?.id ?? `scout-brief-${crypto.randomUUID()}`,
    createdAt: previous?.createdAt ?? now, updatedAt: now }, parseScoutBrief, ['question', 'purpose']);
}

export async function saveTopicWatch(root, input, previous, now = Date.now()) {
  const values = parseTopicWatchInput(input);
  validateTimeZone(values.schedule.timeZone);
  const scheduled = values.enabled && values.schedule.cadence === 'daily';
  return saveProseRecord(root, WATCHES, { ...values, id: previous?.id ?? `topic-watch-${crypto.randomUUID()}`,
    createdAt: previous?.createdAt ?? now, updatedAt: now,
    ...(previous?.lastRunAt === undefined ? {} : { lastRunAt: previous.lastRunAt }),
    ...(scheduled ? { nextRunAt: nextWatchRun(values.schedule.localTime, values.schedule.timeZone, now) } : {}),
    ...(previous?.legacyExpand === undefined ? {} : { legacyExpand: previous.legacyExpand }) }, parseTopicWatch, ['topic', 'purpose']);
}

export const persistTopicWatch = (root, watch) => saveProseRecord(root, WATCHES, watch, parseTopicWatch, ['topic', 'purpose']);

export const saveScoutRun = (root, run) => atomicJson(root, `${RUNS}/${parseScoutRun(run).id}.json`, parseScoutRun(run));
export const saveScoutReport = (root, report) => saveProseRecord(root, REPORTS, report, parseScoutReport, ['summary']);
export const deleteScoutBrief = (root, id) => deletePair(root, BRIEFS, id);
export const deleteTopicWatch = (root, id) => deletePair(root, WATCHES, id);
export const deleteScoutReport = (root, id) => deletePair(root, REPORTS, id);

export async function deleteScoutRun(root, id) {
  if (!validScoutId(id)) throw new Error('Invalid scout record id.');
  await unlink(path.join(root, RUNS, `${id}.json`)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
}

export async function updateScoutCandidate(root, reportId, candidateId, changes) {
  if (!validScoutId(reportId) || !validScoutId(candidateId)) throw new Error('Invalid scout candidate reference.');
  const state = await loadCurrentState(root);
  const report = state.reports.find(item => item.id === reportId);
  if (!report) return null;
  let found = false;
  const update = candidate => {
    if (candidate.id !== candidateId) return candidate;
    found = true;
    return { ...candidate, ...changes };
  };
  if (!report.recommendations.some(item => item.id === candidateId) && !report.uncertain.some(item => item.id === candidateId)) return null;
  const updated = { ...report, recommendations: report.recommendations.map(update), uncertain: report.uncertain.map(update) };
  if (!found) return null;
  return saveScoutReport(root, updated);
}

function legacyWatch(job) {
  return parseTopicWatch({
    id: job.id, name: job.name, topic: job.brief ?? '', purpose: job.brief ?? '', scope: [], exclusions: [],
    searchDirections: (job.queries ?? []).map(query => ({ query, reason: 'Imported legacy query' })), qualityPolicy: [],
    schedule: { cadence: 'daily', localTime: job.dailyTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    enabled: Boolean(job.enabled), maxRecommendations: 3, providerBudget: 30, knownPaperIds: [], author: 'system',
    createdAt: job.createdAt ?? 0, updatedAt: job.lastRunAt ?? job.createdAt ?? 0,
    ...(job.lastRunAt === undefined ? {} : { lastRunAt: job.lastRunAt }), ...(job.nextRunAt === undefined ? {} : { nextRunAt: job.nextRunAt }),
    legacyExpand: Boolean(job.expand)
  });
}

function legacyRun(run, watch) {
  const state = run.status === 'running' ? 'interrupted' : run.status === 'completed' ? 'completed' : 'failed';
  const finishedAt = run.finishedAt ?? (state === 'interrupted' ? run.startedAt : undefined);
  return parseScoutRun({
    id: run.id, source: { kind: 'watch', id: watch.id }, inputSnapshot: watch, state,
    executedQueries: watch.searchDirections.map(direction => direction.query), providerAttempts: [],
    counters: { retrieved: run.resultCount ?? 0, normalized: run.resultCount ?? 0, screened: 0 }, checkpoints: ['legacy-import'],
    startedAt: run.startedAt ?? 0, updatedAt: finishedAt ?? run.startedAt ?? 0,
    ...(finishedAt === undefined ? {} : { finishedAt }), ...(run.error ? { error: run.error } : {})
  });
}

function legacyCandidate(result) {
  const identities = [];
  if (result.doi) identities.push({ kind: 'doi', value: result.doi, source: result.source, canonical: true });
  if (result.url) identities.push({ kind: 'url', value: result.url, source: result.source, canonical: !result.doi });
  return {
    id: result.id, title: result.title, authors: result.authors ?? '', ...(Number.isFinite(result.year) ? { year: result.year } : {}),
    ...(result.abstract ? { abstract: result.abstract } : {}), identities, matchingQueries: result.queries ?? [], sources: [result.source],
    provenance: [{ provider: 'Legacy', lane: 'legacy-import', query: result.queries?.[0] ?? 'legacy discovery', retrievedAt: result.discoveredAt ?? 0 }],
    metadataConflicts: [], limitations: ['Imported legacy result; no scout screening was recorded.'], assessmentState: 'unscreened'
  };
}

async function migrateLegacy(root, now) {
  if (existsSync(path.join(root, MIGRATION))) return;
  const [legacyJobs, legacyRuns, legacyResults] = await Promise.all([
    readJsonDir(root, LEGACY_JOBS), readJsonDir(root, LEGACY_RUNS), readJsonDir(root, LEGACY_RESULTS)
  ]);
  const watches = new Map((await readProseDir(root, WATCHES, parseTopicWatch, ['topic', 'purpose'])).map(watch => [watch.id, watch]));
  for (const job of legacyJobs.filter(item => validScoutId(item.id))) {
    const watch = watches.get(job.id) ?? legacyWatch(job);
    watches.set(watch.id, watch);
    if (!existsSync(path.join(root, WATCHES, `${watch.id}.json`))) await saveProseRecord(root, WATCHES, watch, parseTopicWatch, ['topic', 'purpose']);
  }
  for (const legacy of legacyRuns.filter(item => validScoutId(item.id) && watches.has(item.jobId))) {
    const run = legacyRun(legacy, watches.get(legacy.jobId));
    if (!existsSync(path.join(root, RUNS, `${run.id}.json`))) await saveScoutRun(root, run);
    const candidates = legacyResults.filter(result => result.runId === legacy.id && validScoutId(result.id)).map(legacyCandidate);
    if (candidates.length && !existsSync(path.join(root, REPORTS, `${run.id}.json`))) {
      await saveScoutReport(root, {
        id: run.id, source: run.source, inputSnapshot: run.inputSnapshot, status: run.state === 'completed' ? 'completed' : 'partial',
        summary: 'Imported legacy discovery results. These candidates have not been screened.', sources: [...new Set(candidates.flatMap(candidate => candidate.sources))],
        executedQueries: run.executedQueries, recommendations: candidates, uncertain: [], rejectionCounts: {},
        limitations: ['Legacy results were imported without retroactive assessment.'], screening: { model: 'none', instructionsVersion: 'legacy-import-v1' },
        createdAt: legacy.finishedAt ?? legacy.startedAt ?? now
      });
    }
  }
  await loadCurrentState(root);
  await atomicJson(root, MIGRATION, { version: 1, completedAt: now });
}

async function loadCurrentState(root) {
  const [briefs, watches, runs, reports] = await Promise.all([
    readProseDir(root, BRIEFS, parseScoutBrief, ['question', 'purpose']),
    readProseDir(root, WATCHES, parseTopicWatch, ['topic', 'purpose']),
    readJsonDir(root, RUNS).then(items => items.map(parseScoutRun)),
    readProseDir(root, REPORTS, parseScoutReport, ['summary'])
  ]);
  return { briefs, watches, runs, reports };
}

export async function loadScoutState(root, now = Date.now()) {
  await migrateLegacy(root, now);
  return loadCurrentState(root);
}

export async function interruptScoutRuns(root, now = Date.now()) {
  const state = await loadScoutState(root, now);
  const terminal = new Set(['completed', 'partial', 'failed', 'cancelled', 'interrupted']);
  for (const run of state.runs.filter(item => !terminal.has(item.state))) {
    await saveScoutRun(root, { ...run, state: 'interrupted', updatedAt: now, finishedAt: now,
      error: run.error ?? 'The application stopped before this scout run reached a terminal state.' });
  }
}
