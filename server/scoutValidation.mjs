const ID = /^[a-z0-9-]{1,120}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const RUN_STATES = new Set(['queued', 'retrieving', 'normalizing', 'screening', 'assembling', 'completed', 'partial', 'failed', 'cancelling', 'cancelled', 'interrupted']);
const REPORT_STATES = new Set(['completed', 'partial', 'failed', 'cancelled']);

const object = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${name}.`);
  return value;
};
const text = (value, name, max, allowEmpty = false) => {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) throw new Error(`${name} must be ${allowEmpty ? '' : 'non-empty and '}at most ${max} characters.`);
  return allowEmpty ? value : value.trim();
};
const number = (value, name) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number.`);
  return value;
};
const integer = (value, name, minimum, maximum) => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  return value;
};
const identifier = (value, name = 'id') => {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error(`Invalid ${name}.`);
  return value;
};
const texts = (value, name, maximum = 32) => {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`${name} must be a list with at most ${maximum} items.`);
  return value.map((item, index) => text(item, `${name}[${index}]`, 1000));
};
const optional = (value, parse) => value === undefined ? undefined : parse(value);

function author(value) {
  const parsed = text(value, 'author', 120);
  if (parsed !== 'user' && parsed !== 'system' && !parsed.startsWith('model:')) throw new Error('Invalid author.');
  return parsed;
}

function directions(value) {
  if (!Array.isArray(value) || !value.length || value.length > 12) throw new Error('searchDirections must contain one to twelve items.');
  return value.map((item, index) => {
    const entry = object(item, `searchDirections[${index}]`);
    return { query: text(entry.query, `searchDirections[${index}].query`, 500), reason: text(entry.reason, `searchDirections[${index}].reason`, 1000) };
  });
}

export function parseScoutBriefInput(value) {
  const input = object(value, 'brief');
  const createdFrom = object(input.createdFrom, 'createdFrom');
  if (!['user', 'assistant', 'imported'].includes(createdFrom.kind)) throw new Error('Invalid createdFrom.kind.');
  return {
    question: text(input.question, 'question', 8000), purpose: text(input.purpose, 'purpose', 8000),
    scope: texts(input.scope, 'scope'), exclusions: texts(input.exclusions, 'exclusions'), constraints: texts(input.constraints, 'constraints'),
    searchDirections: directions(input.searchDirections), screeningCriteria: texts(input.screeningCriteria, 'screeningCriteria'),
    maxRecommendations: integer(input.maxRecommendations, 'maxRecommendations', 1, 5),
    createdFrom: { kind: createdFrom.kind, reference: text(createdFrom.reference, 'createdFrom.reference', 500) }, author: author(input.author)
  };
}

export function parseScoutBrief(value) {
  const input = object(value, 'brief');
  return { ...parseScoutBriefInput(input), id: identifier(input.id, 'brief id'), createdAt: number(input.createdAt, 'createdAt'), updatedAt: number(input.updatedAt, 'updatedAt') };
}

export function parseTopicWatchInput(value) {
  const input = object(value, 'watch');
  const schedule = object(input.schedule, 'schedule');
  if (!['daily', 'manual'].includes(schedule.cadence) || !TIME.test(schedule.localTime) || typeof input.enabled !== 'boolean') throw new Error('Invalid watch schedule.');
  return {
    name: text(input.name, 'name', 200), topic: text(input.topic, 'topic', 8000), purpose: text(input.purpose, 'purpose', 8000),
    scope: texts(input.scope, 'scope'), exclusions: texts(input.exclusions, 'exclusions'), searchDirections: directions(input.searchDirections),
    qualityPolicy: texts(input.qualityPolicy, 'qualityPolicy'), schedule: { cadence: schedule.cadence, localTime: schedule.localTime, timeZone: text(schedule.timeZone, 'timeZone', 100) },
    enabled: input.enabled, maxRecommendations: integer(input.maxRecommendations, 'maxRecommendations', 1, 3),
    providerBudget: integer(input.providerBudget, 'providerBudget', 1, 1000), knownPaperIds: texts(input.knownPaperIds, 'knownPaperIds', 1000), author: author(input.author)
  };
}

export function parseTopicWatch(value) {
  const input = object(value, 'watch');
  return { ...parseTopicWatchInput(input), id: identifier(input.id, 'watch id'), createdAt: number(input.createdAt, 'createdAt'), updatedAt: number(input.updatedAt, 'updatedAt'),
    lastRunAt: optional(input.lastRunAt, value => number(value, 'lastRunAt')), nextRunAt: optional(input.nextRunAt, value => number(value, 'nextRunAt')),
    legacyExpand: optional(input.legacyExpand, value => { if (typeof value !== 'boolean') throw new Error('Invalid legacyExpand.'); return value; }) };
}

function source(value) {
  const input = object(value, 'source');
  if (!['brief', 'watch'].includes(input.kind)) throw new Error('Invalid source kind.');
  return { kind: input.kind, id: identifier(input.id, 'source id') };
}

function providerAttempt(value, index) {
  const input = object(value, `providerAttempts[${index}]`);
  if (!['OpenAlex', 'arXiv', 'Crossref'].includes(input.provider) || !['completed', 'failed'].includes(input.status) || typeof input.truncated !== 'boolean') {
    throw new Error(`Invalid providerAttempts[${index}].`);
  }
  return {
    provider: input.provider, lane: text(input.lane, `providerAttempts[${index}].lane`, 100), query: text(input.query, `providerAttempts[${index}].query`, 500),
    status: input.status, attempts: integer(input.attempts, `providerAttempts[${index}].attempts`, 1, 3), resultCount: number(input.resultCount, `providerAttempts[${index}].resultCount`),
    startedAt: number(input.startedAt, `providerAttempts[${index}].startedAt`), completedAt: number(input.completedAt, `providerAttempts[${index}].completedAt`), truncated: input.truncated,
    ...(input.error === undefined ? {} : { error: text(input.error, `providerAttempts[${index}].error`, 4000) })
  };
}

export function parseScoutRun(value) {
  const input = object(value, 'run');
  if (!RUN_STATES.has(input.state) || (input.activeStage !== undefined && !RUN_STATES.has(input.activeStage))) throw new Error('Invalid run state.');
  const counters = object(input.counters, 'counters');
  return {
    id: identifier(input.id, 'run id'), source: source(input.source), inputSnapshot: object(input.inputSnapshot, 'inputSnapshot'), state: input.state,
    ...(input.activeStage === undefined ? {} : { activeStage: input.activeStage }), executedQueries: texts(input.executedQueries, 'executedQueries', 64),
    providerAttempts: Array.isArray(input.providerAttempts) ? input.providerAttempts.map(providerAttempt) : (() => { throw new Error('Invalid providerAttempts.'); })(),
    counters: { retrieved: number(counters.retrieved, 'retrieved'), normalized: number(counters.normalized, 'normalized'), screened: number(counters.screened, 'screened') },
    checkpoints: texts(input.checkpoints, 'checkpoints', 64), startedAt: number(input.startedAt, 'startedAt'), updatedAt: number(input.updatedAt, 'updatedAt'),
    ...(input.finishedAt === undefined ? {} : { finishedAt: number(input.finishedAt, 'finishedAt') }),
    ...(input.reportId === undefined ? {} : { reportId: identifier(input.reportId, 'reportId') }),
    ...(input.cancellationReason === undefined ? {} : { cancellationReason: text(input.cancellationReason, 'cancellationReason', 2000) }),
    ...(input.error === undefined ? {} : { error: text(input.error, 'error', 4000) })
  };
}

function candidate(value) {
  const input = object(value, 'candidate');
  const identities = Array.isArray(input.identities) ? input.identities.map((value, index) => {
    const identity = object(value, `identities[${index}]`);
    if (!['doi', 'arxiv', 'pubmed', 'openalex', 'url'].includes(identity.kind) || (identity.canonical !== undefined && typeof identity.canonical !== 'boolean')) throw new Error(`Invalid identities[${index}].`);
    return { kind: identity.kind, value: text(identity.value, `identities[${index}].value`, 1000), source: text(identity.source, `identities[${index}].source`, 200),
      ...(identity.canonical === undefined ? {} : { canonical: identity.canonical }) };
  }) : (() => { throw new Error('Invalid identities.'); })();
  const provenance = Array.isArray(input.provenance) ? input.provenance.map((value, index) => {
    const item = object(value, `provenance[${index}]`);
    if (!['OpenAlex', 'arXiv', 'Crossref', 'Legacy'].includes(item.provider)) throw new Error(`Invalid provenance[${index}].provider.`);
    return { provider: item.provider, lane: text(item.lane, `provenance[${index}].lane`, 100), query: text(item.query, `provenance[${index}].query`, 500), retrievedAt: number(item.retrievedAt, `provenance[${index}].retrievedAt`) };
  }) : (() => { throw new Error('Invalid provenance.'); })();
  const metadataConflicts = Array.isArray(input.metadataConflicts) ? input.metadataConflicts.map((value, index) => {
    const item = object(value, `metadataConflicts[${index}]`);
    return { field: text(item.field, `metadataConflicts[${index}].field`, 100), values: texts(item.values, `metadataConflicts[${index}].values`, 8), sources: texts(item.sources, `metadataConflicts[${index}].sources`, 8) };
  }) : (() => { throw new Error('Invalid metadataConflicts.'); })();
  if (input.relevance !== undefined && !['direct', 'supporting', 'background', 'irrelevant'].includes(input.relevance)) throw new Error('Invalid candidate relevance.');
  if (input.qualityConfidence !== undefined && !['high', 'medium', 'low'].includes(input.qualityConfidence)) throw new Error('Invalid candidate qualityConfidence.');
  if (input.outcome !== undefined && !['recommend', 'uncertain', 'reject'].includes(input.outcome)) throw new Error('Invalid candidate outcome.');
  if (input.decision !== undefined && !['unseen', 'saved', 'dismissed', 'reading', 'read', 'cited'].includes(input.decision)) throw new Error('Invalid candidate decision.');
  if (input.decisionReason !== undefined && !['not-relevant', 'already-known', 'too-weak', 'duplicate-contribution', 'not-useful-now', 'other'].includes(input.decisionReason)) throw new Error('Invalid candidate decisionReason.');
  if (input.suggestedNextAction !== undefined && !['open abstract', 'inspect full text', 'save', 'compare'].includes(input.suggestedNextAction)) throw new Error('Invalid candidate suggestedNextAction.');
  return {
    id: identifier(input.id, 'candidate id'), title: text(input.title, 'candidate title', 1000), authors: text(input.authors ?? '', 'candidate authors', 2000, true),
    ...(input.year === undefined ? {} : { year: integer(input.year, 'candidate year', 1000, new Date().getFullYear() + 2) }),
    ...(input.abstract === undefined ? {} : { abstract: text(input.abstract, 'candidate abstract', 100_000, true) }), identities,
    matchingQueries: texts(input.matchingQueries, 'matchingQueries', 64), sources: texts(input.sources, 'candidate sources'), provenance, metadataConflicts,
    limitations: texts(input.limitations ?? [], 'candidate limitations'), assessmentState: input.assessmentState === 'screened' ? 'screened' : input.assessmentState === 'unscreened' ? 'unscreened' : (() => { throw new Error('Invalid assessmentState.'); })(),
    ...(input.relevance === undefined ? {} : { relevance: input.relevance }), ...(input.evidenceExcerpt === undefined ? {} : { evidenceExcerpt: text(input.evidenceExcerpt, 'evidenceExcerpt', 1000) }),
    ...(input.relevanceAssessment === undefined ? {} : { relevanceAssessment: text(input.relevanceAssessment, 'relevanceAssessment', 4000) }),
    ...(input.expectedValue === undefined ? {} : { expectedValue: text(input.expectedValue, 'expectedValue', 4000) }),
    ...(input.qualityConfidence === undefined ? {} : { qualityConfidence: input.qualityConfidence }),
    ...(input.qualityEvidence === undefined ? {} : { qualityEvidence: texts(input.qualityEvidence, 'qualityEvidence') }),
    ...(input.outcome === undefined ? {} : { outcome: input.outcome }), ...(input.recommendationReason === undefined ? {} : { recommendationReason: text(input.recommendationReason, 'recommendationReason', 4000) }),
    ...(input.coverageTags === undefined ? {} : { coverageTags: texts(input.coverageTags, 'coverageTags', 5) }),
    ...(input.suggestedNextAction === undefined ? {} : { suggestedNextAction: input.suggestedNextAction }),
    ...(input.decision === undefined ? {} : { decision: input.decision }), ...(input.decisionReason === undefined ? {} : { decisionReason: input.decisionReason }),
    ...(input.decisionNote === undefined ? {} : { decisionNote: text(input.decisionNote, 'decisionNote', 2000, true) }),
    ...(input.decisionAt === undefined ? {} : { decisionAt: number(input.decisionAt, 'decisionAt') }),
    ...(input.paperId === undefined ? {} : { paperId: identifier(input.paperId, 'paperId') }),
    ...(input.inspection === undefined ? {} : { inspection: (() => {
      const inspection = object(input.inspection, 'inspection');
      if (inspection.status !== 'requested') throw new Error('Invalid inspection status.');
      return { status: inspection.status, requestedAt: number(inspection.requestedAt, 'inspection.requestedAt') };
    })() })
  };
}

export function parseScoutReport(value) {
  const input = object(value, 'report');
  if (!REPORT_STATES.has(input.status)) throw new Error('Invalid report status.');
  const screening = object(input.screening, 'screening');
  const rejectionCounts = object(input.rejectionCounts, 'rejectionCounts');
  for (const [key, count] of Object.entries(rejectionCounts)) { text(key, 'rejection reason', 200); number(count, `rejectionCounts.${key}`); }
  return {
    id: identifier(input.id, 'report id'), source: source(input.source), inputSnapshot: object(input.inputSnapshot, 'inputSnapshot'), status: input.status,
    summary: text(input.summary, 'summary', 20000), sources: texts(input.sources, 'sources'), executedQueries: texts(input.executedQueries, 'executedQueries', 64),
    recommendations: Array.isArray(input.recommendations) ? input.recommendations.map(candidate) : (() => { throw new Error('Invalid recommendations.'); })(),
    uncertain: Array.isArray(input.uncertain) ? input.uncertain.map(candidate) : (() => { throw new Error('Invalid uncertain candidates.'); })(),
    rejectionCounts: Object.fromEntries(Object.entries(rejectionCounts)), limitations: texts(input.limitations, 'limitations'),
    screening: { model: text(screening.model, 'screening.model', 200), instructionsVersion: text(screening.instructionsVersion, 'screening.instructionsVersion', 200) },
    createdAt: number(input.createdAt, 'createdAt')
  };
}

export const validScoutId = value => typeof value === 'string' && ID.test(value);
