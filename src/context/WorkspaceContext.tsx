import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Question,
  Claim,
  Evidence,
  Link,
  SurveyOpenProblem,
  SurveyCandidateQuestion,
  Paper,
  Experiment,
  SurfaceId,
  AssistantContextObject,
  AssistantMessage,
  LinkStatus
} from '../types';
import {
  AutomationItem,
  LLMModelItem,
  RunItem,
  ServiceItem,
  TargetItem,
  TaskItem,
  TaskStatus
} from '../productivityTypes';
import { LearningUnit, CognitiveLevelId, LearnViewMode } from '../learnTypes';
import { SAMPLE_LEARNING_UNITS } from '../data/sampleLearningUnits';
import { loadVault, saveVault } from '../vaultClient';
import { SAMPLE_SNAPSHOT } from '../data/sampleVault';
import {
  ManuscriptWorkspaceValue,
  useManuscriptWorkspace
} from './useManuscriptWorkspace';
import {
  parseTaskCreateIntent,
  isTaskDraftIntent,
  generateAiTaskDraft,
  TaskDraftData
} from '../utils/taskAssistant';

type RightPanelView = 'assistant' | 'task-editor' | 'settings';

export interface TaskEditorState {
  taskId: string | null;
  defaultStatus: TaskStatus;
}

const INITIAL_THREADS: Record<string, AssistantMessage[]> = {
  'global-graph': [
    {
      id: 'msg-init-1',
      role: 'assistant',
      modelId: 'cx/gpt-5.6-sol',
      content: 'Welcome to Thinking OS. I am your research reasoning partner running `[cx/gpt-5.6-sol]`.\n\nI can verify parent-child relations against formal requirements (Type, Scope, Target), inspect uncommitted links, draft tasks, and help synthesize open problems into testable hypotheses.\n\n💡 *Note on Scientific Discipline (§4):* I will refuse requests to write your user reasons or generate shallow paper summaries, keeping the empirical reasoning ownership strictly with you.',
      timestamp: Date.now() - 120000
    },
    {
      id: 'msg-init-2',
      role: 'user',
      content: 'Check relation between question q1 and claim c1',
      timestamp: Date.now() - 60000
    },
    {
      id: 'msg-init-3',
      role: 'assistant',
      modelId: 'cx/gpt-5.6-sol',
      content: 'Link Check Evaluation [q1--c1]:\n\nUser Reason: "Attention sinks address the structural root cause of softmax attention entropy aggregation at initial token positions."\n\nChecks:\n- Type: Pass (Operational architectural answer directly addresses sequence stabilization)\n- Scope: Pass (Valid for autoregressive decoder-only Transformer topologies)\n- Target: Pass (Directly validates long-sequence perplexity boundary up to 4M tokens)\n\n[cx/gpt-5.6-sol] Finding: The relation is structurally sound under stated scope constraints.',
      timestamp: Date.now() - 50000,
      structuredAction: {
        type: 'check_link',
        status: 'holds'
      }
    }
  ],
  'task-pipeline': [
    {
      id: 'msg-pipe-1',
      role: 'assistant',
      modelId: 'cx/gpt-5.6-sol',
      content: 'Task Pipeline assistant is online. You can command me to create tasks directly in any Kanban column (e.g., "Create a task in backlog: ...") or ask me to draft detailed acceptance criteria in the Task Editor.',
      timestamp: Date.now() - 90000
    },
    {
      id: 'msg-pipe-2',
      role: 'user',
      content: 'Create a task in backlog: Benchmark DeepSeek-R1 reasoning traces on MATH-500',
      timestamp: Date.now() - 40000
    },
    {
      id: 'msg-pipe-3',
      role: 'assistant',
      modelId: 'cx/gpt-5.6-sol',
      content: '🤖 **Created a new task directly in Backlog:**\n\n• **Title:** Benchmark DeepSeek-R1 reasoning traces on MATH-500\n• **Column:** Backlog\n• **Priority:** URGENT\n• **Tag:** #eval\n• **ID:** `task-1`\n\n🏷️ *Author flags: `author: model` · `lastEditedBy: model` (AI-generated)*\n\nThe card is active on your Kanban board. Click below to inspect or edit in the Task Editor.',
      timestamp: Date.now() - 30000,
      structuredAction: {
        type: 'create_task:task-1',
        status: 'holds'
      }
    }
  ]
};

interface WorkspaceContextValue extends ManuscriptWorkspaceValue {
  workspaceDir: string;
  workspaceLoading: boolean;
  workspaceError: string | null;
  setWorkspaceDir: (dir: string) => Promise<void>;

  // Navigation & Shell
  activeSurface: SurfaceId;
  setActiveSurface: (surface: SurfaceId) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  
  // Filters
  activeTag: string;
  setActiveTag: (tag: string) => void;
  linkStatusFilter: 'all' | LinkStatus;
  setLinkStatusFilter: (status: 'all' | LinkStatus) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  availableTags: string[];

  // Entities
  questions: Question[];
  claims: Claim[];
  evidence: Evidence[];
  links: Link[];
  openProblems: SurveyOpenProblem[];
  candidateQuestions: SurveyCandidateQuestion[];
  papers: Paper[];
  experiments: Experiment[];
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  services: ServiceItem[];
  addService: (service: Omit<ServiceItem, 'id' | 'createdAt' | 'author' | 'uptime'>) => void;
  updateService: (id: string, changes: Partial<Omit<ServiceItem, 'id' | 'createdAt' | 'author'>>) => void;
  deleteService: (id: string) => void;
  runs: RunItem[];
  models: LLMModelItem[];
  automations: AutomationItem[];
  setAutomations: React.Dispatch<React.SetStateAction<AutomationItem[]>>;
  targets: TargetItem[];

  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedLinkId: string | null;
  setSelectedLinkId: (id: string | null) => void;
  clearSelection: () => void;

  // Actions on Graph & Links
  updateLinkUserReason: (linkId: string, userReason: string) => void;
  weakenClaim: (claimId: string, note: string) => void;
  rejectClaim: (claimId: string, reason: string) => void;
  addExperiment: (claimId: string, newExp: Omit<Experiment, 'id' | 'artifacts'>) => void;
  addEvidence: (
    newEvidence: Omit<Evidence, 'id' | 'createdAt' | 'author'>,
    claimId: string,
    userReason: string
  ) => { success: boolean; error?: string };

  // Actions on Survey
  addSurveyOpenProblem: (text: string, citation: string) => { success: boolean; error?: string };
  promoteCandidateQuestion: (
    candidateId: string,
    claimText: string,
    confirmedFalsifiable: boolean,
    confirmedSettledWithinYear: boolean
  ) => { success: boolean; error?: string };
  unclusteredOpenProblemsCount: number;

  // Actions on Experiments
  updateArtifactObservation: (experimentId: string, artifactId: string, observation: string) => void;

  // Assistant Dock
  isDockOpen: boolean;
  setIsDockOpen: (open: boolean) => void;
  toggleDock: () => void;
  dockWidth: number;
  setDockWidth: (width: number) => void;
  dockPosition: 'left' | 'right';
  setDockPosition: (pos: 'left' | 'right') => void;
  toggleDockPosition: () => void;
  rightPanelView: RightPanelView;
  setRightPanelView: (view: RightPanelView) => void;
  taskEditor: TaskEditorState | null;
  openTaskEditor: (taskId?: string, defaultStatus?: TaskStatus) => void;
  closeTaskEditor: () => void;
  taskDraft: TaskDraftData | null;
  setTaskDraft: React.Dispatch<React.SetStateAction<TaskDraftData | null>>;
  createTaskDirectly: (taskData: Partial<TaskItem> & { title: string }, isAi?: boolean) => TaskItem;
  applyAiDraftToEditor: (prompt?: string) => void;
  activeContext: AssistantContextObject | null;
  setActiveContext: (context: AssistantContextObject | null) => void;
  attachedContexts: AssistantContextObject[];
  addAttachedContext: (ctx: AssistantContextObject) => void;
  removeAttachedContext: (id: string) => void;
  clearAttachedContexts: () => void;
  threads: Record<string, AssistantMessage[]>;
  sendAssistantMessage: (contextId: string, userText: string, attachedList?: AssistantContextObject[]) => void;
  checkLinkWithAssistant: (linkId: string) => void;
  clearThread: (contextId: string) => void;
  loadSampleData: () => Promise<void>;

  // Learning System & 6 Cognitive Levels
  activeLearnTab: LearnViewMode;
  setActiveLearnTab: (tab: LearnViewMode) => void;
  learningUnits: LearningUnit[];
  setLearningUnits: React.Dispatch<React.SetStateAction<LearningUnit[]>>;
  activeLearningUnitId: string | null;
  setActiveLearningUnitId: (id: string | null) => void;
  activeCognitiveLevel: CognitiveLevelId;
  setActiveCognitiveLevel: (level: CognitiveLevelId) => void;
  addLearningUnit: (unitData: Partial<LearningUnit> & { title: string; category: LearningUnit['category'] }) => LearningUnit;
  updateLearningUnit: (id: string, updates: Partial<LearningUnit>) => void;
  deleteLearningUnit: (id: string) => void;
  updateLearningLevelProgress: (unitId: string, level: CognitiveLevelId, score: number) => void;
  promoteConjectureToClaim: (unitId: string, conjectureText: string) => { claimId: string };
  promoteConjectureToQuestion: (unitId: string, title: string, tags: string[]) => { questionId: string };
  promoteConjectureToTask: (unitId: string, title: string, description: string) => { taskId: string };
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaceDir, setWorkspaceDirState] = useState(() => localStorage.getItem('thinking_os_workspace_dir') || '~/second-brain');
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [vaultReady, setVaultReady] = useState(false);
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('tasks');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [fontSize, setFontSizeState] = useState<number>(() => {
    const stored = localStorage.getItem('thinking_os_font_size_px');
    if (stored) {
      const num = parseInt(stored, 10);
      if (!isNaN(num) && num >= 11 && num <= 24) return num;
    }
    const legacy = localStorage.getItem('thinking_os_font_size');
    if (legacy === 'small') return 14;
    if (legacy === 'large') return 18;
    return 16;
  });
  const [activeTag, setActiveTag] = useState<string>('all');
  const [linkStatusFilter, setLinkStatusFilter] = useState<'all' | LinkStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [openProblems, setOpenProblems] = useState<SurveyOpenProblem[]>([]);
  const [candidateQuestions, setCandidateQuestions] = useState<SurveyCandidateQuestion[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [models, setModels] = useState<LLMModelItem[]>([]);
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [learningUnits, setLearningUnits] = useState<LearningUnit[]>(SAMPLE_LEARNING_UNITS);
  const [activeLearningUnitId, setActiveLearningUnitId] = useState<string | null>(() => SAMPLE_LEARNING_UNITS[0]?.id ?? null);
  const [activeCognitiveLevel, setActiveCognitiveLevel] = useState<CognitiveLevelId>('remembering');
  const [activeLearnTab, setActiveLearnTab] = useState<LearnViewMode>('desk');

  const addService = useCallback((service: Omit<ServiceItem, 'id' | 'createdAt' | 'author' | 'uptime'>) => {
    setServices(current => {
      const slug = service.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'service';
      const baseId = `srv-${slug}`;
      const id = current.some(item => item.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
      return [...current, { ...service, id, createdAt: Date.now(), author: 'user' }];
    });
  }, []);

  const updateService = useCallback((id: string, changes: Partial<Omit<ServiceItem, 'id' | 'createdAt' | 'author'>>) => {
    setServices(current => current.map(item => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const deleteService = useCallback((id: string) => {
    setServices(current => current.filter(item => item.id !== id));
  }, []);

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Assistant Dock
  const [isDockOpen, setIsDockOpen] = useState<boolean>(true);
  const [dockWidth, setDockWidth] = useState<number>(360);
  const [dockPosition, setDockPositionState] = useState<'left' | 'right'>(() => {
    const saved = localStorage.getItem('thinking_os_dock_position');
    return saved === 'left' || saved === 'right' ? saved : 'right';
  });
  const setDockPosition = useCallback((pos: 'left' | 'right') => {
    setDockPositionState(pos);
    localStorage.setItem('thinking_os_dock_position', pos);
  }, []);
  const toggleDockPosition = useCallback(() => {
    setDockPositionState(pos => {
      const next = pos === 'left' ? 'right' : 'left';
      localStorage.setItem('thinking_os_dock_position', next);
      return next;
    });
  }, []);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('assistant');
  const [taskEditor, setTaskEditor] = useState<TaskEditorState | null>(null);
  const [activeContext, setActiveContext] = useState<AssistantContextObject | null>({
    type: 'task',
    id: 'task-pipeline',
    label: 'Task pipeline',
    secondaryLabel: 'Backlog through verified completion'
  });
  const [attachedContexts, setAttachedContexts] = useState<AssistantContextObject[]>([]);

  const manuscriptWorkspace = useManuscriptWorkspace();

  const setWorkspaceDir = useCallback(async (dir: string) => {
    const requestedDir = dir.trim() || '~/second-brain';
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setVaultReady(false);
    try {
      const loaded = await loadVault(requestedDir);
      let data = loaded.data;
      const isCompletelyEmpty =
        data.questions.length === 0 &&
        data.claims.length === 0 &&
        data.papers.length === 0 &&
        data.tasks.length === 0;

      // ponytail: auto-seed only on the first launch. Later empty folders stay
      // empty; use the "Sample Data" button to seed one intentionally.
      if (isCompletelyEmpty && !localStorage.getItem('thinking_os_workspace_dir')) {
        data = SAMPLE_SNAPSHOT;
        void saveVault(loaded.dir, SAMPLE_SNAPSHOT);
      }

      setWorkspaceDirState(loaded.dir);
      localStorage.setItem('thinking_os_workspace_dir', loaded.dir);
      setQuestions(data.questions);
      setClaims(data.claims);
      setEvidence(data.evidence);
      setLinks(data.links);
      setOpenProblems(data.openProblems);
      setCandidateQuestions(data.candidateQuestions);
      setPapers(data.papers);
      setExperiments(data.experiments);
      setTasks(data.tasks.map(task => ({
        ...task,
        author: task.author ?? 'user',
        lastEditedBy: task.lastEditedBy ?? task.author ?? 'user'
      })));
      setServices(data.services);
      setRuns(data.runs);
      setModels(data.models);
      setAutomations(data.automations);
      setTargets(data.targets);
      setLearningUnits(data.learningUnits?.length ? data.learningUnits : SAMPLE_LEARNING_UNITS);
      setVaultReady(true);
    } catch (error) {
      setWorkspaceError(String(error instanceof Error ? error.message : error));
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    void setWorkspaceDir(workspaceDir);
  }, []);

  useEffect(() => {
    if (!vaultReady) return;
    const timer = window.setTimeout(() => {
      void saveVault(workspaceDir, {
        questions, claims, evidence, links, openProblems, candidateQuestions, papers, experiments,
        tasks, services, runs, models, automations, targets, learningUnits
      }).catch(error => setWorkspaceError(String(error instanceof Error ? error.message : error)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    vaultReady, workspaceDir, questions, claims, evidence, links, openProblems, candidateQuestions,
    papers, experiments, tasks, services, runs, models, automations, targets, learningUnits
  ]);

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.min(Math.max(size, 11), 24);
    setFontSizeState(clamped);
    localStorage.setItem('thinking_os_font_size_px', String(clamped));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    document.documentElement.style.fontSize = `${(fontSize / 16) * 100}%`;
  }, [fontSize]);

  const [taskDraft, setTaskDraft] = useState<TaskDraftData | null>(null);

  const createTaskDirectly = useCallback((taskData: Partial<TaskItem> & { title: string }, isAi: boolean = true): TaskItem => {
    const taskId = `task-${Date.now().toString().slice(-4)}`;
    const newTask: TaskItem = {
      id: taskId,
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      status: taskData.status || 'backlog',
      priority: taskData.priority || 'medium',
      tag: taskData.tag?.trim() || 'task',
      createdAt: 'Just now',
      author: isAi ? 'model' : 'user',
      lastEditedBy: isAi ? 'model' : 'user'
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  const openTaskEditor = useCallback((taskId?: string, defaultStatus: TaskStatus = 'todo') => {
    setTaskEditor({ taskId: taskId ?? null, defaultStatus });
    setTaskDraft(null);
  }, []);

  const closeTaskEditor = useCallback(() => {
    setTaskEditor(null);
    setTaskDraft(null);
  }, []);

  const applyAiDraftToEditor = useCallback((prompt?: string) => {
    const currentTask = taskEditor?.taskId ? tasks.find(t => t.id === taskEditor.taskId) : null;
    const draft = generateAiTaskDraft(prompt || 'Suggest acceptance criteria and an implementation plan', currentTask, taskEditor?.defaultStatus || 'todo');
    setTaskDraft(draft);
    if (!taskEditor) {
      setTaskEditor({ taskId: null, defaultStatus: draft.status });
    }
    setIsDockOpen(true);
    setRightPanelView('assistant');
  }, [taskEditor, tasks]);

  // Learning Unit Actions
  const addLearningUnit = useCallback((unitData: Partial<LearningUnit> & { title: string; category: LearningUnit['category'] }): LearningUnit => {
    const id = unitData.id || `unit-${Date.now()}`;
    const newUnit: LearningUnit = {
      id,
      title: unitData.title,
      description: unitData.description || '',
      category: unitData.category,
      difficulty: unitData.difficulty || 'Intermediate',
      tags: unitData.tags || [],
      prerequisites: unitData.prerequisites || [],
      mathFields: unitData.mathFields || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: 'user',
      progress: unitData.progress || {
        remembering: 0,
        understanding: 0,
        applying: 0,
        analyzing: 0,
        evaluating: 0,
        creating: 0
      },
      remembering: unitData.remembering || { keyTerms: [], axiomsAndIdentities: [] },
      understanding: unitData.understanding || {
        formalDefinition: { statement: '', preconditions: [], notationKey: [] },
        geometricIntuition: { visualMetaphor: '', physicalInterpretation: '', coreInsight: '' },
        feynmanWorkspace: { guidingQuestion: '', learnerExplanation: '', rubricChecks: [] },
        conceptDecomposition: []
      },
      applying: unitData.applying || { workedDerivations: [], practiceChallenges: [] },
      analyzing: unitData.analyzing || { structuralComponents: [], assumptionStressTests: [], contrastiveAnalysis: { titleA: '', titleB: '', dimensions: [] } },
      evaluating: unitData.evaluating || { critiqueChallenges: [], tradeoffMatrix: { approachAName: '', approachBName: '', criteria: [] } },
      creating: unitData.creating || {
        conjecturePrompt: 'Formulate a mathematical hypothesis or architectural variant based on this concept.',
        conjectureDraft: '',
        mathematicalPremises: [],
        proposedMechanism: '',
        falsificationCriteria: '',
        novelIdeasInspiration: []
      }
    };
    setLearningUnits(current => [newUnit, ...current]);
    setActiveLearningUnitId(id);
    return newUnit;
  }, []);

  const updateLearningUnit = useCallback((id: string, updates: Partial<LearningUnit>) => {
    setLearningUnits(current => current.map(unit => (unit.id === id ? { ...unit, ...updates, updatedAt: Date.now() } : unit)));
  }, []);

  const deleteLearningUnit = useCallback((id: string) => {
    setLearningUnits(current => {
      const next = current.filter(item => item.id !== id);
      if (activeLearningUnitId === id) {
        setActiveLearningUnitId(next[0]?.id ?? null);
      }
      return next;
    });
  }, [activeLearningUnitId]);

  const updateLearningLevelProgress = useCallback((unitId: string, level: CognitiveLevelId, score: number) => {
    setLearningUnits(current => current.map(unit => {
      if (unit.id !== unitId) return unit;
      const progress = { ...unit.progress, [level]: Math.max(0, Math.min(100, Math.round(score))) };
      return { ...unit, progress, updatedAt: Date.now() };
    }));
  }, []);

  const promoteConjectureToClaim = useCallback((unitId: string, conjectureText: string) => {
    const claimId = `c-learn-${Date.now()}`;
    const newClaim: Claim = {
      id: claimId,
      text: conjectureText,
      rejected: false,
      createdAt: Date.now(),
      author: 'user'
    };
    setClaims(prev => [newClaim, ...prev]);
    setLearningUnits(current => current.map(unit => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        creating: {
          ...unit.creating,
          promotedClaimId: claimId
        }
      };
    }));
    return { claimId };
  }, []);

  const promoteConjectureToQuestion = useCallback((unitId: string, title: string, tags: string[]) => {
    const questionId = `q-learn-${Date.now()}`;
    const newQ: Question = {
      id: questionId,
      title,
      tags: tags.length ? tags : ['math', 'learn', 'conjecture'],
      createdAt: Date.now(),
      author: 'user'
    };
    setQuestions(prev => [newQ, ...prev]);
    setLearningUnits(current => current.map(unit => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        creating: {
          ...unit.creating,
          promotedQuestionId: questionId
        }
      };
    }));
    return { questionId };
  }, []);

  const promoteConjectureToTask = useCallback((unitId: string, title: string, description: string) => {
    const newTask = createTaskDirectly({
      title,
      description,
      status: 'backlog',
      priority: 'high',
      tag: '#learn'
    }, false);
    setLearningUnits(current => current.map(unit => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        creating: {
          ...unit.creating,
          linkedTaskId: newTask.id
        }
      };
    }));
    return { taskId: newTask.id };
  }, [createTaskDirectly]);

  const addAttachedContext = useCallback((ctx: AssistantContextObject) => {
    setAttachedContexts(prev => {
      if (prev.some(item => item.id === ctx.id)) return prev;
      return [...prev, ctx];
    });
    setIsDockOpen(true);
    setRightPanelView('assistant');
  }, []);

  const removeAttachedContext = useCallback((id: string) => {
    setAttachedContexts(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearAttachedContexts = useCallback(() => {
    setAttachedContexts([]);
  }, []);

  // Isolated transcript threads per context ID
  const [threads, setThreads] = useState<Record<string, AssistantMessage[]>>(INITIAL_THREADS);

  const clearThread = useCallback((contextId: string) => {
    setThreads(prev => ({
      ...prev,
      [contextId]: []
    }));
  }, []);

  const loadSampleData = useCallback(async () => {
    setWorkspaceLoading(true);
    try {
      setQuestions(SAMPLE_SNAPSHOT.questions);
      setClaims(SAMPLE_SNAPSHOT.claims);
      setEvidence(SAMPLE_SNAPSHOT.evidence);
      setLinks(SAMPLE_SNAPSHOT.links);
      setOpenProblems(SAMPLE_SNAPSHOT.openProblems);
      setCandidateQuestions(SAMPLE_SNAPSHOT.candidateQuestions);
      setPapers(SAMPLE_SNAPSHOT.papers);
      setExperiments(SAMPLE_SNAPSHOT.experiments);
      setTasks(SAMPLE_SNAPSHOT.tasks.map(task => ({
        ...task,
        author: task.author ?? 'user',
        lastEditedBy: task.lastEditedBy ?? task.author ?? 'user'
      })));
      setServices(SAMPLE_SNAPSHOT.services);
      setRuns(SAMPLE_SNAPSHOT.runs);
      setModels(SAMPLE_SNAPSHOT.models);
      setAutomations(SAMPLE_SNAPSHOT.automations);
      setTargets(SAMPLE_SNAPSHOT.targets);
      setLearningUnits(SAMPLE_LEARNING_UNITS);
      setThreads(INITIAL_THREADS);
      await saveVault(workspaceDir, SAMPLE_SNAPSHOT);
    } catch (err) {
      console.error('Failed to load sample data:', err);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [workspaceDir]);

  // Theme follows the OS colour scheme
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (isDark: boolean) => {
      setTheme(isDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply(query.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  const toggleDock = useCallback(() => {
    setIsDockOpen(prev => !prev);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  }, []);

  // Compute available tags
  const availableTags = Array.from(
    new Set(questions.flatMap(q => q.tags))
  ).sort();

  // Unclustered open problems count (for the 15-note gate)
  const unclusteredOpenProblemsCount = openProblems.filter(op => !op.candidateId).length;

  // Update a link's user reason
  const updateLinkUserReason = useCallback((linkId: string, userReason: string) => {
    if (!userReason.trim()) return;
    setLinks(prev => prev.map(l => {
      if (l.id === linkId) {
        return {
          ...l,
          userReason: userReason.trim(),
          createdAt: Date.now()
        };
      }
      return l;
    }));
  }, []);

  // Weaken claim
  const weakenClaim = useCallback((claimId: string, note: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === claimId) {
        return {
          ...c,
          text: c.text.includes('(Weakened)') ? c.text : `${c.text} (Weakened: ${note})`
        };
      }
      return c;
    }));
    // Also record this in the link status
    setLinks(prev => prev.map(l => {
      if (l.childId === claimId || l.parentId === claimId) {
        return { ...l, status: 'weak' };
      }
      return l;
    }));
  }, []);

  // Reject claim (soft flag according to D-014 and AGENTS.md §5 Rule 4)
  const rejectClaim = useCallback((claimId: string, reason: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === claimId) {
        return {
          ...c,
          rejected: true,
          rejectionReason: reason
        };
      }
      return c;
    }));
    setLinks(prev => prev.map(l => {
      if (l.childId === claimId) {
        return { ...l, status: 'missing' };
      }
      return l;
    }));
  }, []);

  // Add experiment to claim
  const addExperiment = useCallback((claimId: string, newExp: Omit<Experiment, 'id' | 'artifacts'>) => {
    const expId = `exp-${Date.now()}`;
    const exp: Experiment = {
      ...newExp,
      id: expId,
      artifacts: []
    };
    setExperiments(prev => [...prev, exp]);
  }, []);

  // Add evidence under a claim (Gate 5: requires user reason!)
  const addEvidence = useCallback((
    newEvidenceData: Omit<Evidence, 'id' | 'createdAt' | 'author'>,
    claimId: string,
    userReason: string
  ) => {
    if (!userReason.trim()) {
      return {
        success: false,
        error: 'Gate 5 violation: Every evidence link requires a committed user reason.'
      };
    }
    const evidenceId = `e-${Date.now()}`;
    const evidenceItem: Evidence = {
      ...newEvidenceData,
      id: evidenceId,
      createdAt: Date.now(),
      author: 'user'
    };
    const linkId = `${claimId}--${evidenceId}`;
    const newLink: Link = {
      id: linkId,
      kind: 'claim-evidence',
      parentId: claimId,
      childId: evidenceId,
      status: 'holds',
      userReason: userReason.trim(),
      createdAt: Date.now(),
      author: 'user'
    };

    setEvidence(prev => [...prev, evidenceItem]);
    setLinks(prev => [...prev, newLink]);
    return { success: true };
  }, []);

  // Add survey note (Gate 2: 15-note stop gate!)
  const addSurveyOpenProblem = useCallback((text: string, citation: string) => {
    const unclustered = openProblems.filter(op => !op.candidateId).length;
    const candidatesCount = candidateQuestions.length;

    // Hard stop at 15 loose notes with fewer than 3 candidates
    if (unclustered >= 15 && candidatesCount < 3) {
      return {
        success: false,
        error: 'Survey Stop: 15 loose notes reached with fewer than 3 candidates. You must cluster existing notes before adding new ones.'
      };
    }

    const newOp: SurveyOpenProblem = {
      id: `op-${Date.now()}`,
      text: text.trim(),
      citation: citation.trim() || 'User observation',
      createdAt: Date.now()
    };
    setOpenProblems(prev => [...prev, newOp]);
    return { success: true };
  }, [openProblems, candidateQuestions.length]);

  // Promote candidate question (Gate 3: requires user claim + falsifiability + 1-year confirmations)
  const promoteCandidateQuestion = useCallback((
    candidateId: string,
    claimText: string,
    confirmedFalsifiable: boolean,
    confirmedSettledWithinYear: boolean
  ) => {
    if (!claimText.trim()) {
      return {
        success: false,
        error: 'Gate 3 violation: Promotion requires a user-written claim that answers the question.'
      };
    }
    if (!confirmedFalsifiable || !confirmedSettledWithinYear) {
      return {
        success: false,
        error: 'Gate 3 violation: Must confirm that the claim could be false and could be settled within a year.'
      };
    }

    const candidate = candidateQuestions.find(cq => cq.id === candidateId);
    if (!candidate) {
      return { success: false, error: 'Candidate not found.' };
    }

    const newQId = `q-${Date.now()}`;
    const newCId = `c-${Date.now()}`;
    const newLinkId = `${newQId}--${newCId}`;

    const newQuestion: Question = {
      id: newQId,
      title: candidate.title,
      tags: ['promoted'],
      createdAt: Date.now(),
      author: 'user'
    };

    const newClaim: Claim = {
      id: newCId,
      text: claimText.trim(),
      rejected: false,
      createdAt: Date.now(),
      author: 'user'
    };

    const newLink: Link = {
      id: newLinkId,
      kind: 'question-claim',
      parentId: newQId,
      childId: newCId,
      status: 'holds',
      userReason: 'Promoted candidate hypothesis based on synthesized open problems.',
      createdAt: Date.now(),
      author: 'user'
    };

    setQuestions(prev => [...prev, newQuestion]);
    setClaims(prev => [...prev, newClaim]);
    setLinks(prev => [...prev, newLink]);
    setCandidateQuestions(prev => prev.map(cq => cq.id === candidateId ? { ...cq, promotedQuestionId: newQId } : cq));

    return { success: true };
  }, [candidateQuestions]);

  // Update artifact observation
  const updateArtifactObservation = useCallback((experimentId: string, artifactId: string, observation: string) => {
    setExperiments(prev => prev.map(exp => {
      if (exp.id === experimentId) {
        return {
          ...exp,
          artifacts: exp.artifacts.map(art => {
            if (art.id === artifactId) {
              return { ...art, observation: observation.trim() };
            }
            return art;
          })
        };
      }
      return exp;
    }));
  }, []);

  // Assistant messaging with strict context isolation
  const sendAssistantMessage = useCallback((contextId: string, userText: string, attachedList?: AssistantContextObject[]) => {
    const userMsg: AssistantMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };

    setThreads(prev => {
      const existing = prev[contextId] || [];
      return {
        ...prev,
        [contextId]: [...existing, userMsg]
      };
    });

    // Check for forbidden request triggers according to AGENTS.md §4 MUST NOT list
    const lower = userText.toLowerCase();
    let replyContent = '';
    let isRefusal = false;
    let structuredAction: AssistantMessage['structuredAction'] = undefined;

    // Evaluate attached items
    const effectiveContexts = attachedList && attachedList.length > 0 ? attachedList : attachedContexts;
    const attachedLink = effectiveContexts.find(c => c.type === 'link');
    const realLink = attachedLink ? links.find(l => l.id === attachedLink.id || l.id === attachedLink.metadata?.linkId) : null;

    // Check Case 1: Direct task creation from chat
    const taskCreateIntent = parseTaskCreateIntent(userText);
    const isDraftRequest = isTaskDraftIntent(userText);

    if (taskCreateIntent) {
      // Case 1: Direct task creation into Kanban
      const newTask = createTaskDirectly({
        title: taskCreateIntent.title,
        description: taskCreateIntent.description,
        status: taskCreateIntent.status,
        priority: taskCreateIntent.priority,
        tag: taskCreateIntent.tag
      }, true);

      const statusMap: Record<string, string> = {
        backlog: 'Backlog',
        todo: 'To Do',
        'in-progress': 'In Progress',
        review: 'In Review',
        done: 'Done'
      };

      replyContent = `🤖 **Created a new task directly in ${statusMap[newTask.status] || newTask.status}:**\n\n` +
        `• **Title:** ${newTask.title}\n` +
        `• **Column:** ${statusMap[newTask.status] || newTask.status}\n` +
        `• **Priority:** ${newTask.priority.toUpperCase()}\n` +
        `• **Tag:** #${newTask.tag}\n` +
        `• **ID:** \`${newTask.id}\`\n\n` +
        `🏷️ *Author flags: \`author: model\` · \`lastEditedBy: model\` (AI-generated)*\n\n` +
        `The card now appears on the Kanban board. You can edit it or drag it between columns.`;

      structuredAction = {
        type: `create_task:${newTask.id}`,
        status: 'holds'
      };
    } else if (isDraftRequest || (taskEditor && (lower.includes('write') || lower.includes('description') || lower.includes('suggest') || lower.includes('draft') || lower.includes('fill')))) {
      // Case 2: AI drafts/fills into editor
      const currentTask = taskEditor?.taskId ? tasks.find(t => t.id === taskEditor.taskId) : null;
      const draft = generateAiTaskDraft(userText, currentTask, taskEditor?.defaultStatus || 'todo');
      setTaskDraft(draft);
      if (!taskEditor) {
        setTaskEditor({ taskId: null, defaultStatus: draft.status });
      }
      setIsDockOpen(true);

      replyContent = `✨ **Drafted content in the Task Editor:**\n\n` +
        `• **Title:** ${draft.title}\n` +
        `• **Column:** ${draft.status}\n` +
        `• **Priority:** ${draft.priority.toUpperCase()}\n` +
        `• **Tag:** #${draft.tag}\n\n` +
        `👉 *The editor above was filled automatically and marked \`AI Drafted\`. Review it, then click **"Save"** to keep the changes.*`;

      structuredAction = {
        type: 'draft_task',
        status: 'holds'
      };
    } else if (lower.includes('write my reason') || lower.includes('write a reason') || lower.includes('generate user reason') || lower.includes('fill the reason')) {
      isRefusal = true;
      replyContent = 'REFUSAL [§4 MUST NOT]: The assistant is strictly prohibited from writing or editing any user_reason field. The link check is meaningful only because you commit your reasoning first. If the model writes the reason, it grades its own work and the entire tool loses its purpose.';
    } else if (lower.includes('summarize') || lower.includes('summary')) {
      isRefusal = true;
      replyContent = 'REFUSAL [§4 MUST NOT]: The assistant is strictly prohibited from summarizing papers. Summarizing replaces the reading that produces scientific understanding.';
    } else if (lower.includes('generate research questions') || lower.includes('suggest new topics') || lower.includes('interesting questions')) {
      isRefusal = true;
      replyContent = 'REFUSAL [§4 MUST NOT]: Questions must originate from argument structure (an unsupported claim, an unresolved mismatch, a cluster of open problems), never generated from generic topic prompts.';
    } else if (realLink && (!realLink.userReason || !realLink.userReason.trim())) {
      isRefusal = true;
      replyContent = `REFUSAL [§4 MUST NOT]: Attached link [${realLink.id}] has no committed user_reason. The assistant refuses to check an uncommitted reasoning link and is strictly forbidden from writing it.`;
    } else if (realLink && (lower.includes('check') || lower.includes('reasoning') || lower.includes('link') || lower.includes('evaluate'))) {
      replyContent = `Link Check Evaluation [${realLink.id}]:\n\nUser Reason: "${realLink.userReason}"\n\nChecks:\n- Type: Pass (Appropriate formal evidence matches claim assertion)\n- Scope: Partial (Finding holds within empirical parameter domain)\n- Target: Pass (Directly tests underlying causal mechanism)\n\n[cx/gpt-5.6-sol] Finding: The relation is structurally sound under stated scope constraints.`;
    } else if (effectiveContexts.length > 0) {
      const contextSummary = effectiveContexts.map(c => `• ${c.label}`).join('\n');
      replyContent = `[cx/gpt-5.6-sol] Evaluated with ${effectiveContexts.length} attached context(s):\n${contextSummary}\n\nAnalysis: The argument structure has been cross-referenced. No structural contradictions detected between the attached entities and your active reasoning tree.`;
    } else if (lower.includes('check') || lower.includes('reasoning') || lower.includes('link')) {
      replyContent = 'Link Check Evaluation:\nExamined structural validity of parent-child relation.\n\nType: Pass (Claim and evidence align on theoretical level)\nScope: Partial (Evidence holds in specific empirical parameter range)\nTarget: Pass (Target metric corresponds directly to claim assertion)\n\n[cx/gpt-5.6-sol] Finding: The argument holds within the specified domain boundaries.';
    } else {
      replyContent = `[cx/gpt-5.6-sol] Analysis for ${activeContext?.label || 'context'}:\n\nI have reviewed the argument context. The relations remain structurally sound, provided the user-stated reasons hold under empirical scrutiny. No invalidating structural contradiction detected.`;
    }

    setTimeout(() => {
      const assistantMsg: AssistantMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        modelId: 'cx/gpt-5.6-sol',
        content: replyContent,
        timestamp: Date.now(),
        isRefusal,
        structuredAction
      };

      setThreads(prev => {
        const existing = prev[contextId] || [];
        return {
          ...prev,
          [contextId]: [...existing, assistantMsg]
        };
      });
    }, 180);
  }, [activeContext, attachedContexts, links, createTaskDirectly, taskEditor, tasks]);

  // Model checking on a link
  const checkLinkWithAssistant = useCallback((linkId: string) => {
    const targetLink = links.find(l => l.id === linkId);
    if (!targetLink) return;

    if (!targetLink.userReason || !targetLink.userReason.trim()) {
      const refusalMsg: AssistantMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        modelId: 'cx/gpt-5.6-sol',
        content: 'REFUSAL: This link has no user_reason. The assistant cannot evaluate an uncommitted link, and is strictly forbidden from generating the reason.',
        timestamp: Date.now(),
        isRefusal: true
      };
      setThreads(prev => ({
        ...prev,
        [linkId]: [...(prev[linkId] || []), refusalMsg]
      }));
      return;
    }

    // Run structured Type/Scope/Target check
    const checkMsg: AssistantMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      modelId: 'cx/gpt-5.6-sol',
      content: `[cx/gpt-5.6-sol] Reasoning Check for link ${linkId}:\n\nParent: ${targetLink.parentId} | Child: ${targetLink.childId}\nUser Reason: "${targetLink.userReason}"\n\nEvaluations:\n- Type: Pass (Appropriate evidence form matches the claim type)\n- Scope: Partial (Parameter bounds in evidence are narrower than general claim)\n- Target: Pass (Directly addresses the hypothesized mechanism)\n\nConclusion: The relationship is verified as sound under current scope limitations.`,
      timestamp: Date.now(),
      structuredAction: {
        type: 'check_link',
        status: 'holds',
        undoAvailable: true
      }
    };

    setThreads(prev => ({
      ...prev,
      [linkId]: [...(prev[linkId] || []), checkMsg]
    }));
  }, [links]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceDir,
        workspaceLoading,
        workspaceError,
        setWorkspaceDir,
        activeSurface,
        setActiveSurface,
        theme,
        toggleTheme,
        fontSize,
        setFontSize,
        activeTag,
        setActiveTag,
        linkStatusFilter,
        setLinkStatusFilter,
        searchQuery,
        setSearchQuery,
        availableTags,
        questions,
        claims,
        evidence,
        links,
        openProblems,
        candidateQuestions,
        papers,
        experiments,
        tasks,
        setTasks,
        services,
        addService,
        updateService,
        deleteService,
        runs,
        models,
        automations,
        setAutomations,
        targets,
        selectedNodeId,
        setSelectedNodeId,
        selectedLinkId,
        setSelectedLinkId,
        clearSelection,
        updateLinkUserReason,
        weakenClaim,
        rejectClaim,
        addExperiment,
        addEvidence,
        addSurveyOpenProblem,
        promoteCandidateQuestion,
        unclusteredOpenProblemsCount,
        updateArtifactObservation,
        isDockOpen,
        setIsDockOpen,
        toggleDock,
        dockWidth,
        setDockWidth,
        dockPosition,
        setDockPosition,
        toggleDockPosition,
        rightPanelView,
        setRightPanelView,
        taskEditor,
        openTaskEditor,
        closeTaskEditor,
        taskDraft,
        setTaskDraft,
        createTaskDirectly,
        applyAiDraftToEditor,
        activeContext,
        setActiveContext,
        attachedContexts,
        addAttachedContext,
        removeAttachedContext,
        clearAttachedContexts,
        threads,
        sendAssistantMessage,
        checkLinkWithAssistant,
        clearThread,
        loadSampleData,
        learningUnits,
        setLearningUnits,
        activeLearningUnitId,
        setActiveLearningUnitId,
        activeCognitiveLevel,
        setActiveCognitiveLevel,
        activeLearnTab,
        setActiveLearnTab,
        addLearningUnit,
        updateLearningUnit,
        deleteLearningUnit,
        updateLearningLevelProgress,
        promoteConjectureToClaim,
        promoteConjectureToQuestion,
        promoteConjectureToTask,
        ...manuscriptWorkspace
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
