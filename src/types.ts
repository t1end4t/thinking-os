// Strict Instrument domain types matching AGENTS.md and docs/storage-design.md

export type EntityAuthor = 'user' | 'system' | 'model' | `model:${string}`;

export interface Question {
  id: string;
  title: string;
  tags: string[];
  createdAt: number;
  author: EntityAuthor;
}

export type ClaimLifecycleState =
  | 'candidate'
  | 'committed'
  | 'instrumented'
  | 'contested'
  | 'defended'
  | 'narrowed'
  | 'rejected';

export interface Reproduction {
  id: string;
  claimId: string;
  baselineIdentity: string;
  publishedNumber: string | number;
  reproducedNumber: string | number;
  gap: string | number;
  evaluationScriptHash?: string;
  date: string | number;
  author: EntityAuthor;
}

export type AlternativeExplanationState = 'open' | 'removed_by_control' | 'damaged_result';

export interface AlternativeExplanation {
  id: string;
  claimId: string;
  statement: string;
  state: AlternativeExplanationState;
  controlExperimentId?: string;
  createdAt: number;
  author: EntityAuthor;
}

export type ContributionType = 'solve' | 'measure' | 'explain';

export interface WorkspaceConstraints {
  contributionType: ContributionType;
  computeBudget: string;
  dataBudget: string;
}

export interface Claim {
  id: string;
  text: string;
  rejected: boolean;
  rejectionReason?: string;
  prediction?: string;
  failureThreshold?: string;
  scopeLimits?: string;
  parentClaimId?: string;
  successorClaimId?: string;
  createdAt: number;
  author: EntityAuthor;
}

export type EvidenceOrigin = 'literature' | 'experiment' | 'own_reasoning';
export type EvidenceForm = 'measurement' | 'derivation' | 'counterexample';
export type DerivationValidity = 'unassessed' | 'valid' | 'invalid' | 'uncertain';

export interface Evidence {
  id: string;
  title: string;
  origin: EvidenceOrigin;
  form: EvidenceForm;
  citation: string;
  paperId?: string;
  pageNumber?: number;
  excerpt?: string;
  experimentId?: string;
  artifactId?: string;
  validity?: DerivationValidity;
  validityReason?: string;
  createdAt: number;
  author: EntityAuthor;
}

export type LinkStatus = 'holds' | 'weak' | 'missing';
export type LinkKind = 'question-claim' | 'claim-evidence';

export type CheckItemStatus = 'pass' | 'partial' | 'mismatch';

export interface CheckItem {
  label: 'Type' | 'Scope' | 'Target';
  status: CheckItemStatus;
  detail: string;
}

export interface CheckNote {
  modelId: string; // e.g. '[model:unknown]' or '[cx/gpt-5.6-sol]'
  tag: string;
  tagColor: 'emerald' | 'amber' | 'red' | 'neutral';
  note: string;
  items: CheckItem[];
  checkedAt: number;
}

export interface Link {
  id: string; // e.g. 'q1--c1' or 'c1--e1'
  kind: LinkKind;
  parentId: string;
  childId: string;
  status: LinkStatus;
  userReason: string; // MANDATORY: Every valid link has a user reason
  check?: CheckNote;
  createdAt: number;
  author: EntityAuthor;
}

export type SurveyRetireReasonKind = 'solved_since' | 'infeasible' | 'already_stated';

export interface SurveyRetireReason {
  kind: SurveyRetireReasonKind;
  reference: string;
  retiredAt: number;
}

export interface SurveyProblemSource {
  paperId?: string;
  pageNumber?: number;
  excerpt?: string;
  highlightId?: string;
  attribution?: 'paper-author' | 'user-inference';
}

export interface SurveyProblemLink {
  id: string;
  problemId: string;
  userReason: string;
  createdAt: number;
  author: EntityAuthor;
  legacy?: boolean;
}

export interface SurveyOpenProblem extends SurveyProblemSource {
  id: string;
  text: string;
  citation: string;
  createdAt: number;
  candidateId?: string;
  author?: EntityAuthor;
  retireReason?: SurveyRetireReason;
}

export interface SurveyCandidateQuestion {
  id: string;
  title: string;
  openProblemIds: string[];
  problemLinks?: SurveyProblemLink[];
  author?: EntityAuthor;
  createdAt: number;
  promotedQuestionId?: string;
  retireReason?: SurveyRetireReason;
}

export interface PaperParagraph {
  id: string;
  linkedClaimId?: string;
}

export interface PaperSection {
  id: string;
  title?: string;
  paragraphs: PaperParagraph[];
}

export type HighlightColor = 'amber' | 'emerald' | 'sky' | 'rose' | 'purple';

export interface PaperHighlight {
  id: string;
  text: string;
  color?: HighlightColor;
  pageNumber?: number;
  createdAt: number;
  note?: string;
  sectionId?: string;
  rects?: { pageNumber: number; coordinates: [number, number, number, number] }[];
}

export interface PaperDiscoveryContext {
  reportId: string;
  briefId: string;
  candidateId: string;
  matchingQueries: string[];
  recommendationReason: string;
  evidenceLevel: 'metadata' | 'abstract' | 'full-text';
  savedAt: number;
  decisionSource: 'user';
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  citation: string;
  pageCount: number;
  markdown: string;
  sections: PaperSection[];
  doi?: string;
  url?: string;
  pdfUrl?: string;
  pdfDataUrl?: string;
  abstract?: string;
  journal?: string;
  highlights?: PaperHighlight[];
  discoveryContexts?: PaperDiscoveryContext[];
  createdAt?: number;
}

export type ExperimentStatus = 'planned' | 'running' | 'done';

export type ExperimentArtifactType = 'plot' | 'table' | 'notes' | 'checkpoint' | 'image';

export interface ArtifactPlotPoint {
  x: string | number;
  y: number;
  baseline?: number;
}

export interface ArtifactPlotData {
  xAxisLabel: string;
  yAxisLabel: string;
  seriesName?: string;
  baselineName?: string;
  points: ArtifactPlotPoint[];
  caption?: string;
  targetThreshold?: string;
}

export interface ArtifactTableData {
  headers: string[];
  rows: string[][];
  caption?: string;
  notes?: string;
}

export interface ArtifactNotesData {
  content: string;
  language?: 'log' | 'python' | 'markdown' | 'json';
}

export interface ArtifactImageData {
  url?: string;
  caption?: string;
  dimensions?: string;
}

export interface ExperimentArtifact {
  id: string;
  name: string;
  type: ExperimentArtifactType;
  path: string;
  contentHash: string;
  observation?: string; // Required for 'done' status
  status: 'present' | 'missing';
  plotData?: ArtifactPlotData;
  tableData?: ArtifactTableData;
  notesData?: ArtifactNotesData;
  imageData?: ArtifactImageData;
}

export interface Experiment {
  id: string;
  claimId: string;
  questionId: string;
  title: string;
  status: ExperimentStatus;
  targetMetric: string;
  baseline: string;
  prediction: string;
  failureCondition: string;
  scope: string;
  artifacts: ExperimentArtifact[];
}

export type SurfaceId = 'map' | 'survey' | 'papers' | 'experiments' | 'manuscript' | 'tasks' | 'runtime' | 'learn';

export type AssistantContextType =
  | 'graph'
  | 'node'
  | 'link'
  | 'passage'
  | 'artifact'
  | 'survey'
  | 'manuscript'
  | 'section'
  | 'citation'
  | 'task'
  | 'service'
  | 'run'
  | 'model'
  | 'automation'
  | 'target'
  | 'learn'
  | 'unit'
  | 'direction'
  | 'pipeline'
  | 'weekly-review'
  | 'runtime'
  | 'environment';

export interface AssistantContextObject {
  type: AssistantContextType;
  id: string;
  label: string;
  secondaryLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelId?: string;
  timestamp: number;
  isRefusal?: boolean;
  structuredAction?: {
    type: 'check_link' | 'cluster_notes' | 'weaken_claim' | 'add_experiment' | 'reject' | 'draft_task' | `create_task:${string}` | string;
    status?: string;
    undoAvailable?: boolean;
  };
}
