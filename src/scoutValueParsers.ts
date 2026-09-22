import type {
  ScoutAuthor,
  ScoutBrief,
  ScoutLiveCandidate,
  ScoutProviderAttempt,
  ScoutRun,
  ScoutRunActivity,
  ScoutSearchDirection,
  ScoutSource,
  ScoutSourceContext,
  TopicWatch
} from './scoutTypes';

export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid scout response: ${label} must be an object.`);
  return Object.fromEntries(Object.entries(value));
}

export function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid scout response: ${label} must be text.`);
  return value;
}

export function identifier(value: unknown, label: string): string {
  const result = text(value, label);
  if (!result.trim()) throw new Error(`Invalid scout response: ${label} is missing.`);
  return result;
}

export function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Invalid scout response: ${label} must be a non-negative number.`);
  return value;
}

export function integer(value: unknown, label: string): number {
  const result = number(value, label);
  if (!Number.isInteger(result)) throw new Error(`Invalid scout response: ${label} must be an integer.`);
  return result;
}

export function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid scout response: ${label} must be a boolean.`);
  return value;
}

export function optional<Value>(value: unknown, parse: (input: unknown) => Value): Value | undefined {
  return value === undefined ? undefined : parse(value);
}

export function list<Value>(value: unknown, label: string, parse: (input: unknown, index: number) => Value): Value[] {
  if (!Array.isArray(value)) throw new Error(`Invalid scout response: ${label} must be a list.`);
  return value.map(parse);
}

export function texts(value: unknown, label: string): string[] {
  return list(value, label, (item, index) => text(item, `${label}[${index}]`));
}

export function literal<Value extends string>(value: unknown, values: readonly Value[], label: string): Value {
  const match = values.find(item => item === value);
  if (!match) throw new Error(`Invalid scout response: unknown ${label}.`);
  return match;
}

function parseAuthor(value: unknown): ScoutAuthor {
  const result = identifier(value, 'author');
  if (result === 'user' || result === 'system') return result;
  if (result.startsWith('model:')) return `model:${result.slice(6)}`;
  throw new Error('Invalid scout response: unknown author.');
}

function parseDirection(value: unknown, index: number): ScoutSearchDirection {
  const item = record(value, `searchDirections[${index}]`);
  return { query: identifier(item.query, `searchDirections[${index}].query`), reason: identifier(item.reason, `searchDirections[${index}].reason`) };
}

export function parseSourceContext(value: unknown): ScoutSourceContext {
  const item = record(value, 'createdFrom');
  return {
    kind: literal(item.kind, ['user', 'assistant', 'imported'] as const, 'source-context kind'),
    reference: identifier(item.reference, 'createdFrom.reference')
  };
}

export function parseBrief(value: unknown): ScoutBrief {
  const item = record(value, 'brief');
  return {
    id: identifier(item.id, 'brief.id'),
    question: identifier(item.question, 'brief.question'),
    purpose: identifier(item.purpose, 'brief.purpose'),
    scope: texts(item.scope, 'brief.scope'),
    exclusions: texts(item.exclusions, 'brief.exclusions'),
    constraints: texts(item.constraints, 'brief.constraints'),
    searchDirections: list(item.searchDirections, 'brief.searchDirections', parseDirection),
    screeningCriteria: texts(item.screeningCriteria, 'brief.screeningCriteria'),
    maxRecommendations: integer(item.maxRecommendations, 'brief.maxRecommendations'),
    recencyPolicy: item.recencyPolicy === undefined ? 'recent' : literal(item.recencyPolicy, ['recent', 'mixed', 'foundational-gap'] as const, 'brief recency policy'),
    createdFrom: parseSourceContext(item.createdFrom),
    author: parseAuthor(item.author),
    createdAt: number(item.createdAt, 'brief.createdAt'),
    updatedAt: number(item.updatedAt, 'brief.updatedAt')
  };
}

export function parseWatch(value: unknown): TopicWatch {
  const item = record(value, 'watch');
  const schedule = record(item.schedule, 'watch.schedule');
  return {
    id: identifier(item.id, 'watch.id'),
    name: identifier(item.name, 'watch.name'),
    topic: identifier(item.topic, 'watch.topic'),
    purpose: identifier(item.purpose, 'watch.purpose'),
    scope: texts(item.scope, 'watch.scope'),
    exclusions: texts(item.exclusions, 'watch.exclusions'),
    searchDirections: list(item.searchDirections, 'watch.searchDirections', parseDirection),
    qualityPolicy: texts(item.qualityPolicy, 'watch.qualityPolicy'),
    recencyPolicy: item.recencyPolicy === undefined ? 'mixed' : literal(item.recencyPolicy, ['recent', 'mixed', 'foundational-gap'] as const, 'watch recency policy'),
    qualityThreshold: item.qualityThreshold === undefined ? 'medium' : literal(item.qualityThreshold, ['high', 'medium', 'low'] as const, 'watch quality threshold'),
    schedule: {
      cadence: literal(schedule.cadence, ['daily', 'manual'] as const, 'watch cadence'),
      localTime: identifier(schedule.localTime, 'watch.schedule.localTime'),
      timeZone: identifier(schedule.timeZone, 'watch.schedule.timeZone')
    },
    enabled: boolean(item.enabled, 'watch.enabled'),
    maxRecommendations: integer(item.maxRecommendations, 'watch.maxRecommendations'),
    providerBudget: integer(item.providerBudget, 'watch.providerBudget'),
    knownPaperIds: texts(item.knownPaperIds, 'watch.knownPaperIds'),
    createdFrom: item.createdFrom === undefined ? { kind: 'imported', reference: 'legacy topic watch' } : parseSourceContext(item.createdFrom),
    author: parseAuthor(item.author),
    createdAt: number(item.createdAt, 'watch.createdAt'),
    updatedAt: number(item.updatedAt, 'watch.updatedAt'),
    lastRunAt: optional(item.lastRunAt, input => number(input, 'watch.lastRunAt')),
    nextRunAt: optional(item.nextRunAt, input => number(input, 'watch.nextRunAt')),
    legacyExpand: optional(item.legacyExpand, input => boolean(input, 'watch.legacyExpand'))
  };
}

export function parseSource(value: unknown): ScoutSource {
  const item = record(value, 'source');
  return { kind: literal(item.kind, ['brief', 'watch'] as const, 'source kind'), id: identifier(item.id, 'source.id') };
}

function parseAttempt(value: unknown, index: number): ScoutProviderAttempt {
  const item = record(value, `providerAttempts[${index}]`);
  return {
    provider: literal(item.provider, ['OpenAlex', 'arXiv', 'Crossref'] as const, 'provider'),
    lane: identifier(item.lane, `providerAttempts[${index}].lane`),
    query: identifier(item.query, `providerAttempts[${index}].query`),
    status: literal(item.status, ['completed', 'failed'] as const, 'provider status'),
    attempts: integer(item.attempts, `providerAttempts[${index}].attempts`),
    resultCount: integer(item.resultCount, `providerAttempts[${index}].resultCount`),
    startedAt: number(item.startedAt, `providerAttempts[${index}].startedAt`),
    completedAt: number(item.completedAt, `providerAttempts[${index}].completedAt`),
    truncated: boolean(item.truncated, `providerAttempts[${index}].truncated`),
    error: optional(item.error, input => text(input, `providerAttempts[${index}].error`))
  };
}

export function parseInputSnapshot(value: unknown): ScoutBrief | TopicWatch {
  const item = record(value, 'inputSnapshot');
  return item.question === undefined ? parseWatch(item) : parseBrief(item);
}

function parseLiveCandidate(value: unknown, index: number): ScoutLiveCandidate {
  const item = record(value, `run.liveCandidates[${index}]`);
  return {
    id: identifier(item.id, `run.liveCandidates[${index}].id`),
    title: identifier(item.title, `run.liveCandidates[${index}].title`),
    authors: text(item.authors ?? '', `run.liveCandidates[${index}].authors`),
    year: optional(item.year, input => integer(input, `run.liveCandidates[${index}].year`)),
    sources: texts(item.sources ?? [], `run.liveCandidates[${index}].sources`),
    status: literal(item.status ?? 'retrieved', ['retrieved', 'screening', 'screened', 'recommended', 'uncertain', 'rejected'] as const, `run.liveCandidates[${index}].status`)
  };
}

function parseRunActivity(value: unknown): ScoutRunActivity {
  const item = record(value, 'run.currentActivity');
  return {
    label: identifier(item.label, 'run.currentActivity.label'),
    detail: text(item.detail, 'run.currentActivity.detail'),
    startedAt: number(item.startedAt, 'run.currentActivity.startedAt')
  };
}

export function parseRun(value: unknown): ScoutRun {
  const item = record(value, 'run');
  const counters = record(item.counters, 'run.counters');
  const states = ['queued', 'retrieving', 'normalizing', 'screening', 'assembling', 'completed', 'partial', 'failed', 'cancelling', 'cancelled', 'interrupted'] as const;
  return {
    id: identifier(item.id, 'run.id'),
    source: parseSource(item.source),
    inputSnapshot: parseInputSnapshot(item.inputSnapshot),
    state: literal(item.state, states, 'run state'),
    activeStage: optional(item.activeStage, input => literal(input, states, 'active run stage')),
    executedQueries: texts(item.executedQueries, 'run.executedQueries'),
    providerAttempts: list(item.providerAttempts, 'run.providerAttempts', parseAttempt),
    counters: {
      retrieved: integer(counters.retrieved, 'run.counters.retrieved'),
      normalized: integer(counters.normalized, 'run.counters.normalized'),
      screened: integer(counters.screened, 'run.counters.screened')
    },
    checkpoints: texts(item.checkpoints, 'run.checkpoints'),
    startedAt: number(item.startedAt, 'run.startedAt'),
    updatedAt: number(item.updatedAt, 'run.updatedAt'),
    finishedAt: optional(item.finishedAt, input => number(input, 'run.finishedAt')),
    reportId: optional(item.reportId, input => identifier(input, 'run.reportId')),
    cancellationReason: optional(item.cancellationReason, input => text(input, 'run.cancellationReason')),
    error: optional(item.error, input => text(input, 'run.error')),
    liveCandidates: optional(item.liveCandidates, input => list(input, 'run.liveCandidates', parseLiveCandidate)),
    currentActivity: optional(item.currentActivity, parseRunActivity)
  };
}
