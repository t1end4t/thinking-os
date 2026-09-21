export type ScoutAuthor = 'user' | 'system' | `model:${string}`;
export type ScoutRunState = 'queued' | 'retrieving' | 'normalizing' | 'screening' | 'assembling' |
  'completed' | 'partial' | 'failed' | 'cancelling' | 'cancelled' | 'interrupted';
export type ScoutTerminalState = Extract<ScoutRunState, 'completed' | 'partial' | 'failed' | 'cancelled' | 'interrupted'>;
export type ScoutReportStatus = Extract<ScoutTerminalState, 'completed' | 'partial' | 'failed' | 'cancelled'>;
export type ScoutRelevance = 'direct' | 'supporting' | 'background' | 'irrelevant';
export type ScoutQualityConfidence = 'high' | 'medium' | 'low';
export type ScoutOutcome = 'recommend' | 'uncertain' | 'reject';
export type ScoutDecision = 'unseen' | 'saved' | 'dismissed' | 'reading' | 'read' | 'cited';
export type ScoutDismissalReason = 'not-relevant' | 'already-known' | 'too-weak' | 'duplicate-contribution' | 'not-useful-now' | 'other';

export type ScoutSearchDirection = {
  readonly query: string;
  readonly reason: string;
};

export type ScoutSourceContext = {
  readonly kind: 'user' | 'assistant' | 'imported';
  readonly reference: string;
};

export type ScoutBriefInput = {
  readonly question: string;
  readonly purpose: string;
  readonly scope: readonly string[];
  readonly exclusions: readonly string[];
  readonly constraints: readonly string[];
  readonly searchDirections: readonly ScoutSearchDirection[];
  readonly screeningCriteria: readonly string[];
  readonly maxRecommendations: number;
  readonly createdFrom: ScoutSourceContext;
  readonly author: ScoutAuthor;
};

export type ScoutBrief = ScoutBriefInput & {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type TopicWatchInput = {
  readonly name: string;
  readonly topic: string;
  readonly purpose: string;
  readonly scope: readonly string[];
  readonly exclusions: readonly string[];
  readonly searchDirections: readonly ScoutSearchDirection[];
  readonly qualityPolicy: readonly string[];
  readonly recencyPolicy: 'recent' | 'mixed' | 'foundational-gap';
  readonly qualityThreshold: ScoutQualityConfidence;
  readonly schedule: {
    readonly cadence: 'daily' | 'manual';
    readonly localTime: string;
    readonly timeZone: string;
  };
  readonly enabled: boolean;
  readonly maxRecommendations: number;
  readonly providerBudget: number;
  readonly knownPaperIds: readonly string[];
  readonly createdFrom: ScoutSourceContext;
  readonly author: ScoutAuthor;
};

export type TopicWatch = TopicWatchInput & {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastRunAt?: number;
  readonly nextRunAt?: number;
  readonly legacyExpand?: boolean;
};

export type ScoutSource = {
  readonly kind: 'brief' | 'watch';
  readonly id: string;
};

export type ScoutProviderAttempt = {
  readonly provider: 'OpenAlex' | 'arXiv' | 'Crossref';
  readonly lane: string;
  readonly query: string;
  readonly status: 'completed' | 'failed';
  readonly attempts: number;
  readonly resultCount: number;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly truncated: boolean;
  readonly error?: string;
};

export type ScoutRun = {
  readonly id: string;
  readonly source: ScoutSource;
  readonly inputSnapshot: ScoutBrief | TopicWatch;
  readonly state: ScoutRunState;
  readonly activeStage?: ScoutRunState;
  readonly executedQueries: readonly string[];
  readonly providerAttempts: readonly ScoutProviderAttempt[];
  readonly counters: {
    readonly retrieved: number;
    readonly normalized: number;
    readonly screened: number;
  };
  readonly checkpoints: readonly string[];
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly finishedAt?: number;
  readonly reportId?: string;
  readonly cancellationReason?: string;
  readonly error?: string;
};

export type ScoutExternalIdentity = {
  readonly kind: 'doi' | 'arxiv' | 'pubmed' | 'openalex' | 'url';
  readonly value: string;
  readonly source: string;
  readonly canonical?: boolean;
};

export type ScoutCandidateProvenance = {
  readonly provider: 'OpenAlex' | 'arXiv' | 'Crossref' | 'Legacy';
  readonly lane: string;
  readonly query: string;
  readonly retrievedAt: number;
};

export type ScoutMetadataConflict = {
  readonly field: string;
  readonly values: readonly string[];
  readonly sources: readonly string[];
};

export type ScoutCandidate = {
  readonly id: string;
  readonly title: string;
  readonly authors: string;
  readonly year?: number;
  readonly abstract?: string;
  readonly identities: readonly ScoutExternalIdentity[];
  readonly matchingQueries: readonly string[];
  readonly sources: readonly string[];
  readonly provenance: readonly ScoutCandidateProvenance[];
  readonly metadataConflicts: readonly ScoutMetadataConflict[];
  readonly relevance?: ScoutRelevance;
  readonly evidenceExcerpt?: string;
  readonly relevanceAssessment?: string;
  readonly expectedValue?: string;
  readonly qualityConfidence?: ScoutQualityConfidence;
  readonly qualityEvidence?: readonly string[];
  readonly limitations: readonly string[];
  readonly outcome?: ScoutOutcome;
  readonly recommendationReason?: string;
  readonly coverageTags?: readonly string[];
  readonly suggestedNextAction?: 'open abstract' | 'inspect full text' | 'save' | 'compare';
  readonly assessmentState: 'screened' | 'unscreened';
  readonly decision?: ScoutDecision;
  readonly decisionReason?: ScoutDismissalReason;
  readonly decisionNote?: string;
  readonly decisionAt?: number;
  readonly paperId?: string;
  readonly inspection?: {
    readonly status: 'requested';
    readonly requestedAt: number;
  };
};

export type ScoutReport = {
  readonly id: string;
  readonly source: ScoutSource;
  readonly inputSnapshot: ScoutBrief | TopicWatch;
  readonly status: ScoutReportStatus;
  readonly summary: string;
  readonly sources: readonly string[];
  readonly executedQueries: readonly string[];
  readonly recommendations: readonly ScoutCandidate[];
  readonly uncertain: readonly ScoutCandidate[];
  readonly rejectionCounts: Readonly<Record<string, number>>;
  readonly limitations: readonly string[];
  readonly screening: {
    readonly model: string;
    readonly instructionsVersion: string;
  };
  readonly createdAt: number;
};

export type ScoutSnapshot = {
  readonly briefs: readonly ScoutBrief[];
  readonly watches: readonly TopicWatch[];
  readonly runs: readonly ScoutRun[];
  readonly reports: readonly ScoutReport[];
};
