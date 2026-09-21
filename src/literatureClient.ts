import type { DiscoveryPaper, LiteratureCommand, LiteratureJob, LiteratureRun, LiteratureSnapshot } from './literatureTypes';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid literature response: expected an object.');
  return Object.fromEntries(Object.entries(value));
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid literature response: expected text.');
  return value;
}

function identifier(value: unknown): string {
  const result = text(value);
  if (!result.trim()) throw new Error('Invalid literature response: missing identifier.');
  return result;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid literature response: expected a non-negative number.');
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid literature response: expected a boolean.');
  return value;
}

function optional<Value>(value: unknown, parse: (input: unknown) => Value): Value | undefined {
  return value === undefined ? undefined : parse(value);
}

function list<Value>(value: unknown, parse: (input: unknown) => Value): Value[] {
  if (!Array.isArray(value)) throw new Error('Invalid literature response: expected a list.');
  return value.map(parse);
}

function url(value: unknown): string {
  const result = text(value);
  const parsed = new URL(result);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid literature response: unsafe source URL.');
  return result;
}

export function parseDiscoveryPaper(value: unknown): DiscoveryPaper {
  const item = record(value);
  return { id: identifier(item.id), title: identifier(item.title), authors: text(item.authors), year: number(item.year),
    doi: optional(item.doi, text), url: optional(item.url, url), abstract: optional(item.abstract, text),
    source: identifier(item.source), queries: list(item.queries, text), discoveredAt: number(item.discoveredAt),
    jobId: optional(item.jobId, identifier), runId: optional(item.runId, identifier) };
}

export function parseLiteratureJob(value: unknown): LiteratureJob {
  const item = record(value);
  const dailyTime = text(item.dailyTime);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime)) throw new Error('Invalid literature response: expected HH:mm schedule.');
  return { id: identifier(item.id), name: identifier(item.name), brief: text(item.brief), queries: list(item.queries, text),
    dailyTime, enabled: boolean(item.enabled), expand: boolean(item.expand), createdAt: number(item.createdAt),
    lastRunAt: optional(item.lastRunAt, number), nextRunAt: optional(item.nextRunAt, number) };
}

export function parseLiteratureRun(value: unknown): LiteratureRun {
  const item = record(value);
  const status = item.status;
  if (status !== 'running' && status !== 'completed' && status !== 'failed') throw new Error('Invalid literature response: unknown run status.');
  return { id: identifier(item.id), jobId: identifier(item.jobId), startedAt: number(item.startedAt),
    finishedAt: optional(item.finishedAt, number), status, resultCount: number(item.resultCount), error: optional(item.error, text) };
}

export function parseLiteratureSnapshot(value: unknown): LiteratureSnapshot {
  const item = record(value);
  const scheduler = record(item.scheduler);
  const timeZone = identifier(scheduler.timeZone);
  new Intl.DateTimeFormat('en', { timeZone });
  return { jobs: list(item.jobs, parseLiteratureJob), runs: list(item.runs, parseLiteratureRun),
    results: list(item.results, parseDiscoveryPaper), scheduler: { active: boolean(scheduler.active), timeZone } };
}

async function request(dir: string, signal: AbortSignal, command?: LiteratureCommand): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/literature?${new URLSearchParams({ dir })}`, {
    method: command ? 'POST' : 'GET', signal,
    ...(command ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) } : {}),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = record(payload).error;
    throw new Error(typeof error === 'string' ? error : `Literature request failed (${response.status}).`);
  }
  return record(payload);
}

export async function loadLiterature(dir: string, signal: AbortSignal): Promise<LiteratureSnapshot> {
  return parseLiteratureSnapshot(await request(dir, signal));
}

export async function mutateLiterature(dir: string, command: LiteratureCommand, signal: AbortSignal) {
  const payload = await request(dir, signal, command);
  switch (command.action) {
    case 'search': return { results: list(payload.results, parseDiscoveryPaper), queries: list(payload.queries, text) };
    case 'create': case 'update': return { job: parseLiteratureJob(payload.job) };
    case 'run': return { run: parseLiteratureRun(payload.run) };
    case 'delete':
      if (payload.ok !== true) throw new Error('The literature job deletion was not confirmed.');
      return { ok: true };
  }
}

type PaperIdentity = { readonly title: string; readonly doi?: string; readonly url?: string };

function identities(paper: PaperIdentity): string[] {
  return [paper.doi, paper.url].flatMap(value => {
    if (!value) return [];
    const normalized = value.trim().toLowerCase();
    const arxiv = normalized.match(/(?:arxiv(?:\.org\/(?:abs|pdf)\/|:|\.))([\w.-]+(?:\/\d{7})?)/)?.[1];
    if (arxiv) return [`doi:10.48550/arxiv.${arxiv.replace(/\.pdf$/, '').replace(/v\d+$/, '')}`];
    const doi = normalized.match(/10\.\d{4,9}\/\S+/)?.[0];
    return doi ? [`doi:${doi.replace(/[.,;]+$/, '')}`] : [];
  });
}

export function sameDiscoveryPaper(first: PaperIdentity, second: PaperIdentity): boolean {
  const firstIds = identities(first);
  const secondIds = identities(second);
  if (firstIds.length && secondIds.length) return firstIds.some(identifier => secondIds.includes(identifier));
  const title = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return !!title(first.title) && title(first.title) === title(second.title);
}

export function mergeDiscoveryPapers(papers: readonly DiscoveryPaper[]): DiscoveryPaper[] {
  const result: DiscoveryPaper[] = [];
  for (const paper of papers) {
    const index = result.findIndex(existing => sameDiscoveryPaper(existing, paper));
    if (index === -1) result.push(paper);
    else result[index] = { ...result[index], queries: [...new Set([...result[index].queries, ...paper.queries])] };
  }
  return result;
}
