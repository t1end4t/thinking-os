// Strict Instrument domain types matching AGENTS.md and docs/storage-design.md

export type EntityAuthor = 'user' | 'system' | 'model' | `model:${string}`;

export interface Question {
  id: string;
  title: string;
  tags: string[];
  createdAt: number;
  author: EntityAuthor;
}

export interface Claim {
  id: string;
  text: string;
  rejected: boolean;
  rejectionReason?: string;
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

export interface SurveyOpenProblem {
  id: string;
  text: string;
  citation: string;
  createdAt: number;
  candidateId?: string;
}

export interface SurveyCandidateQuestion {
  id: string;
  title: string;
  openProblemIds: string[];
  createdAt: number;
  promotedQuestionId?: string;
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

export interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  citation: string;
  pageCount: number;
  markdown: string;
  sections: PaperSection[];
}

export type ExperimentStatus = 'planned' | 'running' | 'done';

export interface ExperimentArtifact {
  id: string;
  name: string;
  type: 'plot' | 'table' | 'notes' | 'checkpoint';
  path: string;
  contentHash: string;
  observation?: string; // Required for 'done' status
  status: 'present' | 'missing';
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

export type SurfaceId = 'map' | 'survey' | 'papers' | 'experiments' | 'manuscript' | 'tasks' | 'runtime';

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
  | 'target';

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
