import type { ScoutCandidate, ScoutExternalIdentity, ScoutReport, ScoutSnapshot } from './scoutTypes';
import {
  boolean,
  identifier,
  integer,
  list,
  literal,
  number,
  optional,
  parseBrief,
  parseInputSnapshot,
  parseRun,
  parseSource,
  parseWatch,
  record,
  text,
  texts
} from './scoutValueParsers';

function parseIdentity(value: unknown, index: number): ScoutExternalIdentity {
  const item = record(value, `identities[${index}]`);
  return {
    kind: literal(item.kind, ['doi', 'arxiv', 'pubmed', 'openalex', 'url'] as const, 'identity kind'),
    value: identifier(item.value, `identities[${index}].value`),
    source: identifier(item.source, `identities[${index}].source`),
    canonical: optional(item.canonical, input => boolean(input, `identities[${index}].canonical`))
  };
}

function parseCandidate(value: unknown, index: number): ScoutCandidate {
  const item = record(value, `candidate[${index}]`);
  return {
    id: identifier(item.id, `candidate[${index}].id`),
    title: identifier(item.title, `candidate[${index}].title`),
    authors: text(item.authors, `candidate[${index}].authors`),
    year: optional(item.year, input => integer(input, `candidate[${index}].year`)),
    abstract: optional(item.abstract, input => text(input, `candidate[${index}].abstract`)),
    identities: list(item.identities, `candidate[${index}].identities`, parseIdentity),
    matchingQueries: texts(item.matchingQueries, `candidate[${index}].matchingQueries`),
    sources: texts(item.sources, `candidate[${index}].sources`),
    provenance: list(item.provenance, `candidate[${index}].provenance`, (input, provenanceIndex) => {
      const provenance = record(input, `candidate[${index}].provenance[${provenanceIndex}]`);
      return {
        provider: literal(provenance.provider, ['OpenAlex', 'arXiv', 'Crossref', 'Legacy'] as const, 'candidate provider'),
        lane: identifier(provenance.lane, `candidate[${index}].provenance[${provenanceIndex}].lane`),
        query: identifier(provenance.query, `candidate[${index}].provenance[${provenanceIndex}].query`),
        retrievedAt: number(provenance.retrievedAt, `candidate[${index}].provenance[${provenanceIndex}].retrievedAt`)
      };
    }),
    metadataConflicts: list(item.metadataConflicts, `candidate[${index}].metadataConflicts`, (input, conflictIndex) => {
      const conflict = record(input, `candidate[${index}].metadataConflicts[${conflictIndex}]`);
      return {
        field: identifier(conflict.field, `candidate[${index}].metadataConflicts[${conflictIndex}].field`),
        values: texts(conflict.values, `candidate[${index}].metadataConflicts[${conflictIndex}].values`),
        sources: texts(conflict.sources, `candidate[${index}].metadataConflicts[${conflictIndex}].sources`)
      };
    }),
    relevance: optional(item.relevance, input => literal(input, ['direct', 'supporting', 'background', 'irrelevant'] as const, 'relevance')),
    evidenceExcerpt: optional(item.evidenceExcerpt, input => text(input, 'candidate.evidenceExcerpt')),
    relevanceAssessment: optional(item.relevanceAssessment, input => text(input, 'candidate.relevanceAssessment')),
    expectedValue: optional(item.expectedValue, input => text(input, 'candidate.expectedValue')),
    qualityConfidence: optional(item.qualityConfidence, input => literal(input, ['high', 'medium', 'low'] as const, 'quality confidence')),
    qualityEvidence: optional(item.qualityEvidence, input => texts(input, 'candidate.qualityEvidence')),
    limitations: texts(item.limitations, 'candidate.limitations'),
    outcome: optional(item.outcome, input => literal(input, ['recommend', 'uncertain', 'reject'] as const, 'candidate outcome')),
    recommendationReason: optional(item.recommendationReason, input => text(input, 'candidate.recommendationReason')),
    coverageTags: optional(item.coverageTags, input => texts(input, 'candidate.coverageTags')),
    suggestedNextAction: optional(item.suggestedNextAction, input => literal(input, ['open abstract', 'inspect full text', 'save', 'compare'] as const, 'suggested action')),
    assessmentState: literal(item.assessmentState, ['screened', 'unscreened'] as const, 'assessment state'),
    decision: optional(item.decision, input => literal(input, ['unseen', 'saved', 'dismissed', 'reading', 'read', 'cited'] as const, 'candidate decision')),
    decisionReason: optional(item.decisionReason, input => literal(input, ['not-relevant', 'already-known', 'too-weak', 'duplicate-contribution', 'not-useful-now', 'other'] as const, 'dismissal reason')),
    decisionNote: optional(item.decisionNote, input => text(input, 'candidate.decisionNote')),
    decisionAt: optional(item.decisionAt, input => number(input, 'candidate.decisionAt')),
    paperId: optional(item.paperId, input => identifier(input, 'candidate.paperId')),
    inspection: optional(item.inspection, input => {
      const inspection = record(input, 'candidate.inspection');
      return { status: literal(inspection.status, ['requested'] as const, 'inspection status'), requestedAt: number(inspection.requestedAt, 'candidate.inspection.requestedAt') };
    })
  };
}

export function parseScoutReport(value: unknown): ScoutReport {
  const item = record(value, 'report');
  const screening = record(item.screening, 'report.screening');
  const rejectionCounts = record(item.rejectionCounts, 'report.rejectionCounts');
  const parsedRejections: Record<string, number> = {};
  for (const [reason, count] of Object.entries(rejectionCounts)) parsedRejections[reason] = integer(count, `report.rejectionCounts.${reason}`);
  return {
    id: identifier(item.id, 'report.id'),
    source: parseSource(item.source),
    inputSnapshot: parseInputSnapshot(item.inputSnapshot),
    status: literal(item.status, ['completed', 'partial', 'failed', 'cancelled'] as const, 'report status'),
    summary: text(item.summary, 'report.summary'),
    sources: texts(item.sources, 'report.sources'),
    executedQueries: texts(item.executedQueries, 'report.executedQueries'),
    recommendations: list(item.recommendations, 'report.recommendations', parseCandidate),
    uncertain: list(item.uncertain, 'report.uncertain', parseCandidate),
    rejectionCounts: parsedRejections,
    limitations: texts(item.limitations, 'report.limitations'),
    screening: { model: identifier(screening.model, 'report.screening.model'), instructionsVersion: identifier(screening.instructionsVersion, 'report.screening.instructionsVersion') },
    createdAt: number(item.createdAt, 'report.createdAt')
  };
}

export function parseScoutSnapshot(value: unknown): ScoutSnapshot {
  const item = record(value, 'snapshot');
  return {
    briefs: list(item.briefs, 'snapshot.briefs', input => parseBrief(input)),
    watches: list(item.watches, 'snapshot.watches', input => parseWatch(input)),
    runs: list(item.runs, 'snapshot.runs', input => parseRun(input)),
    reports: list(item.reports, 'snapshot.reports', input => parseScoutReport(input))
  };
}
