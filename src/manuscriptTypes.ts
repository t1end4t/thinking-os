// Types for Research Manuscript, Synthesis Locker & Argumentation Engine

export type SynthesisArtifactType = 'figure' | 'table' | 'fact' | 'note' | 'claim' | 'citation';

export interface SynthesisTableData {
  headers: string[];
  rows: string[][];
  caption?: string;
  notes?: string;
}

export interface SynthesisFigureData {
  figureType: 'plot' | 'architecture' | 'comparison' | 'heatmap';
  url?: string;
  caption: string;
  sourceExperimentId?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  dataPoints?: { label: string; value: number; baseline?: number }[];
}

export interface SynthesisArtifact {
  id: string;
  type: SynthesisArtifactType;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  // Payload
  figure?: SynthesisFigureData;
  table?: SynthesisTableData;
  factMetric?: string;
  factContext?: string;
  noteMarkdown?: string;
  claimId?: string;
  citationKey?: string;
  source?: string;
  tags?: string[];
  createdAt: number;
}

export interface CitationItem {
  key: string; // e.g. 'xiao2024streamingllm'
  title: string;
  authors: string;
  year: number;
  venue: string;
  doi?: string;
  url?: string;
  abstract?: string;
  bibtex: string;
  paperId?: string; // Tied to a Paper in Vault
  claimIds?: string[]; // Claims this citation supports
  tags?: string[];
}

export type ArgumentRole =
  | 'hook_motivation'        // Problem statement, empirical dilemma & opening gap
  | 'thesis_claim'           // Introducing core proposition / claim
  | 'theoretical_derivation' // Formal mathematical proof / lemma
  | 'methodology_system'     // Architecture, pipeline & algorithmic design
  | 'empirical_evidence'     // Defending claim with experiment / benchmark
  | 'counterargument_refute' // Dialectic refutation & boundary analysis
  | 'implications_future';   // Broader impact, limitations & outlook

export interface ManuscriptSection {
  id: string;
  sectionNumber: string; // e.g. '1', '2', '2.1', '3'
  title: string;
  narrativeGoal: string; // The argumentative / dialectic purpose of this section
  argumentRole: ArgumentRole;
  content: string; // Markdown text with \cite{key}, Figure 1, Table 1
  attachedClaimIds: string[]; // Claims linked
  attachedCitationKeys: string[]; // Citations attached
  attachedArtifactIds: string[]; // Figures, tables, facts, notes attached
  targetWordCount: number;
  isExpanded?: boolean;
}

export interface ManuscriptMeta {
  title: string;
  subtitle?: string;
  authors: { name: string; affiliation: string; email?: string }[];
  abstract: string;
  keywords: string[];
  targetVenue: string; // e.g. 'ICLR 2025', 'NeurIPS', 'Nature Machine Intelligence'
  status: 'drafting' | 'review_ready' | 'submitted';
  lastEditedAt: number;
}

export interface ManuscriptDocument {
  meta: ManuscriptMeta;
  sections: ManuscriptSection[];
  artifacts: SynthesisArtifact[];
  citations: CitationItem[];
}
