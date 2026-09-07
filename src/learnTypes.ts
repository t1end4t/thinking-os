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
  actionVerbs: string[];
  color: string;
  lightBg: string;
  darkBg: string;
  badgeClass: string;
  iconName: string;
}

export const COGNITIVE_LEVELS: Record<CognitiveLevelId, CognitiveLevelMeta> = {
  remembering: {
    id: 'remembering',
    levelNumber: 1,
    name: 'Remembering',
    shortDesc: 'Recalling basic facts, terms, and core concepts without necessarily grasping their wider meaning.',
    promptQuestion: 'What are the exact definitions, mathematical notations, and tensor dimensions?',
    actionVerbs: ['Recall', 'Define', 'List', 'State', 'Identify', 'Memorize'],
    color: 'text-sky-600 dark:text-sky-400',
    lightBg: 'bg-sky-50',
    darkBg: 'dark:bg-sky-950/50',
    badgeClass: 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 border-sky-300 dark:border-sky-800',
    iconName: 'BookMarked'
  },
  understanding: {
    id: 'understanding',
    levelNumber: 2,
    name: 'Understanding',
    shortDesc: 'Explaining ideas, translating concepts, or summarizing information in your own words.',
    promptQuestion: 'Can you explain the intuition and mechanism in plain words without jargon (Feynman technique)?',
    actionVerbs: ['Explain', 'Translate', 'Paraphrase', 'Illustrate', 'Interpret', 'Summarize'],
    color: 'text-emerald-600 dark:text-emerald-400',
    lightBg: 'bg-emerald-50',
    darkBg: 'dark:bg-emerald-950/50',
    badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800',
    iconName: 'Lightbulb'
  },
  applying: {
    id: 'applying',
    levelNumber: 3,
    name: 'Applying',
    shortDesc: 'Using information, rules, or formulas to solve problems in new situations.',
    promptQuestion: 'Can you compute a toy numerical example or write a minimal implementation?',
    actionVerbs: ['Compute', 'Calculate', 'Solve', 'Implement', 'Execute', 'Derive'],
    color: 'text-amber-600 dark:text-amber-400',
    lightBg: 'bg-amber-50',
    darkBg: 'dark:bg-amber-950/50',
    badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-800',
    iconName: 'Wrench'
  },
  analyzing: {
    id: 'analyzing',
    levelNumber: 4,
    name: 'Analyzing',
    shortDesc: 'Breaking information down into component parts to see patterns, relationships, and hidden structures.',
    promptQuestion: 'What are the core assumptions, boundary conditions, and failure modes when stressed?',
    actionVerbs: ['Decompose', 'Contrast', 'Deduce', 'Dissect', 'Stress-Test', 'Isolate'],
    color: 'text-indigo-600 dark:text-indigo-400',
    lightBg: 'bg-indigo-50',
    darkBg: 'dark:bg-indigo-950/50',
    badgeClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-800',
    iconName: 'Network'
  },
  evaluating: {
    id: 'evaluating',
    levelNumber: 5,
    name: 'Evaluating',
    shortDesc: 'Making judgments, critiquing arguments, and validating ideas based on clear criteria.',
    promptQuestion: 'What are the real-world trade-offs, limitations, and empirical edge cases?',
    actionVerbs: ['Critique', 'Validate', 'Falsify', 'Audit', 'Weigh', 'Detect Flaws'],
    color: 'text-rose-600 dark:text-rose-400',
    lightBg: 'bg-rose-50',
    darkBg: 'dark:bg-rose-950/50',
    badgeClass: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-800',
    iconName: 'ShieldAlert'
  },
  creating: {
    id: 'creating',
    levelNumber: 6,
    name: 'Creating',
    shortDesc: 'Combining separate elements in novel ways to build, design, or produce original work.',
    promptQuestion: 'How can you synthesize this concept into a new research hypothesis or architecture?',
    actionVerbs: ['Synthesize', 'Conjecture', 'Hypothesize', 'Design', 'Formulate', 'Bridge to Claims'],
    color: 'text-purple-600 dark:text-purple-400',
    lightBg: 'bg-purple-50',
    darkBg: 'dark:bg-purple-950/50',
    badgeClass: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 border-purple-300 dark:border-purple-800',
    iconName: 'Sparkles'
  }
};

export interface FlashcardItem {
  id: string;
  term: string;
  symbolLatex?: string;
  definition: string;
  mnemonic?: string;
  recallRating?: 'again' | 'hard' | 'good' | 'easy';
  lastReviewedAt?: number;
}

export interface AxiomIdentity {
  id: string;
  name: string;
  latex: string;
  statement: string;
  significance: string;
}

export interface RememberingLevelData {
  keyTerms: FlashcardItem[];
  axiomsAndIdentities: AxiomIdentity[];
  masteryPercent?: number;
}

export interface FeynmanCheckRubric {
  id: string;
  prompt: string;
  verified: boolean;
}

export interface UnderstandingLevelData {
  formalDefinition: {
    statement: string;
    preconditions: string[];
    notationKey: Array<{ symbol: string; meaning: string }>;
  };
  geometricIntuition: {
    visualMetaphor: string;
    physicalInterpretation: string;
    coreInsight: string;
  };
  feynmanWorkspace: {
    guidingQuestion: string;
    learnerExplanation: string;
    rubricChecks: FeynmanCheckRubric[];
  };
  conceptDecomposition: Array<{
    part: string;
    role: string;
    impactIfMissing: string;
  }>;
}

export interface DerivationStep {
  stepIndex: number;
  label: string;
  mathExpression: string;
  justification: string;
}

export interface WorkedDerivation {
  id: string;
  title: string;
  problemStatement: string;
  initialAssumptions: string[];
  steps: DerivationStep[];
  conclusion: string;
}

export interface PracticeChallenge {
  id: string;
  question: string;
  mathContext: string;
  hints: string[];
  options?: string[];
  correctOptionIndex?: number;
  solutionWalkthrough: string;
  userAnswer?: string;
  isCompleted?: boolean;
}

export interface SandboxParameter {
  id: string;
  label: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  description: string;
}

export interface ApplyingLevelData {
  workedDerivations: WorkedDerivation[];
  practiceChallenges: PracticeChallenge[];
  sandboxConfig?: {
    sandboxType: 'softmax_temperature' | 'lora_rank' | 'kl_divergence' | 'adamw_momentum';
    title: string;
    equationLatex: string;
    parameters: SandboxParameter[];
  };
}

export interface StructuralComponent {
  id: string;
  component: string;
  formulaSnippet: string;
  mathematicalFunction: string;
  invariantPreserved: string;
}

export interface AssumptionStressTest {
  id: string;
  assumption: string;
  failureMode: string;
  mathematicalConsequence: string;
  llmResearchImplication: string;
}

export interface ContrastivePair {
  dimension: string;
  conceptA: string;
  conceptB: string;
  mathematicalDivergence: string;
}

export interface AnalyzingLevelData {
  structuralComponents: StructuralComponent[];
  assumptionStressTests: AssumptionStressTest[];
  contrastiveAnalysis: {
    titleA: string;
    titleB: string;
    dimensions: ContrastivePair[];
  };
}

export interface CritiqueChallenge {
  id: string;
  title: string;
  allegedClaim: string;
  presentedDerivation: string;
  hiddenFlawType: 'unwarranted_assumption' | 'domain_mismatch' | 'non_convexity_leak' | 'dimension_inconsistency' | 'boundary_failure';
  hiddenFlawExplanation: string;
  guidedQuestions: string[];
  verdictOptions: Array<{ id: string; label: string; isCorrect: boolean }>;
  learnerVerdictId?: string;
  learnerCritiqueNotes?: string;
  isEvaluated?: boolean;
}

export interface TradeoffCriterion {
  criterion: string;
  approachA: string;
  approachB: string;
  verdict: string;
}

export interface EvaluatingLevelData {
  critiqueChallenges: CritiqueChallenge[];
  tradeoffMatrix: {
    approachAName: string;
    approachBName: string;
    criteria: TradeoffCriterion[];
  };
}

export interface CreatingLevelData {
  conjecturePrompt: string;
  conjectureDraft: string;
  mathematicalPremises: string[];
  proposedMechanism: string;
  falsificationCriteria: string;
  promotedClaimId?: string;
  promotedQuestionId?: string;
  linkedTaskId?: string;
  novelIdeasInspiration: string[];
}

export interface LearningUnit {
  id: string;
  title: string;
  description: string;
  category: 'Linear Algebra' | 'Information Theory' | 'Optimization & Calculus' | 'Attention & Architecture' | 'LLM Reasoning & Alignment' | 'General Math';
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced' | 'Research Frontier';
  book?: string;
  chapter?: string;
  section?: string;
  readingStatus?: 'reading' | 'annotated' | 'tested' | 'synthesized';
  keyFormulaLatex?: string;
  toyCodeSnippet?: string;
  tags: string[];
  prerequisites: string[];
  mathFields: string[];
  createdAt: number;
  updatedAt: number;
  author: EntityAuthor;
  progress: Record<CognitiveLevelId, number>; // 0 to 100 percentage
  studyNotes?: string;
  status?: 'to_learn' | 'in_progress' | 'review_needed' | 'mastered';
  remembering: RememberingLevelData;
  understanding: UnderstandingLevelData;
  applying: ApplyingLevelData;
  analyzing: AnalyzingLevelData;
  evaluating: EvaluatingLevelData;
  creating: CreatingLevelData;
}

export type LearnViewMode =
  | 'roadmap'
  | 'theory'
  | 'labs'
  | 'practice'
  | 'notes'
  | 'graph'
  | 'desk'
  | 'ladder'
  | 'matrix';
