import { EntityAuthor } from './types';

export type CognitiveLevelId =
  | 'remembering'
  | 'understanding'
  | 'applying'
  | 'analyzing'
  | 'evaluating'
  | 'creating';

export interface CognitiveLevelMeta {
  id: CognitiveLevelId;
  levelNumber: number;
  name: string;
  shortDesc: string;
  promptQuestion: string;
  color: string;
  dotClass: string;
  badgeClass: string;
}

export const COGNITIVE_LEVELS: Record<CognitiveLevelId, CognitiveLevelMeta> = {
  remembering: {
    id: 'remembering',
    levelNumber: 1,
    name: 'Remember',
    shortDesc: 'Recall facts, terms, notation.',
    promptQuestion: 'What exactly does the source state?',
    color: 'text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500',
    badgeClass: 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 border-sky-300 dark:border-sky-800'
  },
  understanding: {
    id: 'understanding',
    levelNumber: 2,
    name: 'Understand',
    shortDesc: 'Explain it in your own words.',
    promptQuestion: 'How would you explain this without jargon?',
    color: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800'
  },
  applying: {
    id: 'applying',
    levelNumber: 3,
    name: 'Apply',
    shortDesc: 'Use it on a concrete case.',
    promptQuestion: 'What small example or computation uses this?',
    color: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-800'
  },
  analyzing: {
    id: 'analyzing',
    levelNumber: 4,
    name: 'Analyze',
    shortDesc: 'Break it into parts and relations.',
    promptQuestion: 'What are the parts, and how do they connect?',
    color: 'text-indigo-600 dark:text-indigo-400',
    dotClass: 'bg-indigo-500',
    badgeClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-800'
  },
  evaluating: {
    id: 'evaluating',
    levelNumber: 5,
    name: 'Evaluate',
    shortDesc: 'Judge it against criteria.',
    promptQuestion: 'Where does this hold, and where does it break?',
    color: 'text-rose-600 dark:text-rose-400',
    dotClass: 'bg-rose-500',
    badgeClass: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-800'
  },
  creating: {
    id: 'creating',
    levelNumber: 6,
    name: 'Create',
    shortDesc: 'Build something new from it.',
    promptQuestion: 'What new idea, design, or question follows?',
    color: 'text-purple-600 dark:text-purple-400',
    dotClass: 'bg-purple-500',
    badgeClass: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 border-purple-300 dark:border-purple-800'
  }
};

export const COGNITIVE_LEVEL_ORDER: CognitiveLevelId[] = [
  'remembering',
  'understanding',
  'applying',
  'analyzing',
  'evaluating',
  'creating'
];

export type LearnSourceKind = 'book' | 'video' | 'paper' | 'course' | 'article' | 'note';

export interface LearnSource {
  kind: LearnSourceKind;
  title: string;
  url?: string;
  authorOrChannel?: string;
}

export interface SyllabusSection {
  id: string;
  title: string;
  locator?: string;
  completed?: boolean;
}

export interface NotationSymbol {
  id: string;
  symbol: string;
  meaning: string;
  shape?: string;
}

export type LearnBlockKind =
  | 'card'
  | 'note'
  | 'image'
  | 'table'
  | 'tree'
  | 'graph'
  | 'derivation'
  | 'tensor'
  | 'code';

interface LearnBlockBase {
  id: string;
  level: CognitiveLevelId;
  /** Where in the source this came from: `p.184`, `14:32`, `§12.2`. */
  locator?: string;
  /** Optional reference to a syllabus lecture/chapter section */
  sectionId?: string;
  createdAt: number;
  updatedAt: number;
  promotedClaimId?: string;
  promotedQuestionId?: string;
  promotedTaskId?: string;
}

export interface DerivationStep {
  id: string;
  latex: string;
  explanation: string;
  rule?: string;
  revealedInTestMode?: boolean;
}

export interface DerivationBlock extends LearnBlockBase {
  kind: 'derivation';
  title: string;
  objective?: string;
  initialEquation?: string;
  steps: DerivationStep[];
  conclusion?: string;
  testMode?: boolean;
}

export interface TensorOpRow {
  id: string;
  operation: string;
  inputShape: string;
  outputShape: string;
  parameters?: string;
  notes?: string;
}

export interface TensorBlock extends LearnBlockBase {
  kind: 'tensor';
  title: string;
  architectureName?: string;
  symbolsLegend?: string;
  rows: TensorOpRow[];
}

export interface CodeBlock extends LearnBlockBase {
  kind: 'code';
  title: string;
  language: string;
  code: string;
  notes?: string;
  highlightLines?: string;
}

export interface CardBlock extends LearnBlockBase {
  kind: 'card';
  front: string;
  back: string;
  latex?: string;
  /** Leitner box index into REVIEW_STEPS_DAYS. */
  box: number;
  dueAt: number;
}

export interface NoteBlock extends LearnBlockBase {
  kind: 'note';
  text: string;
  latex?: string;
}

export interface ImageBlock extends LearnBlockBase {
  kind: 'image';
  caption: string;
  /** Inline data URL of a pasted screenshot. */
  dataUrl: string;
}

export interface TableBlock extends LearnBlockBase {
  kind: 'table';
  title: string;
  columns: string[];
  rows: string[][];
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  label: string;
  detail?: string;
}

export interface TreeBlock extends LearnBlockBase {
  kind: 'tree';
  title: string;
  nodes: TreeNode[];
}

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface GraphBlock extends LearnBlockBase {
  kind: 'graph';
  title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type LearnBlock =
  | CardBlock
  | NoteBlock
  | ImageBlock
  | TableBlock
  | TreeBlock
  | GraphBlock
  | DerivationBlock
  | TensorBlock
  | CodeBlock;

/**
 * A board: one source (book, video, paper) plus the visual blocks captured from it.
 * Persisted under `learn/board`. Pre-redesign vaults keep extra JSON keys on disk;
 * they are carried through untouched and are not rendered.
 */
export interface LearningUnit {
  id: string;
  title: string;
  description: string;
  source: LearnSource;
  tags: string[];
  blocks: LearnBlock[];
  sections?: SyllabusSection[];
  activeSectionId?: string | null;
  notation?: NotationSymbol[];
  createdAt: number;
  updatedAt: number;
  author: EntityAuthor;
  /** Legacy locator hints kept so old units still show their origin. */
  book?: string;
  chapter?: string;
}

export type LearnViewMode = 'today' | 'board';
