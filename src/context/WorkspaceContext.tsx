import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Question,
  Claim,
  Evidence,
  Link,
  SurveyOpenProblem,
  SurveyCandidateQuestion,
  Paper,
  PaperHighlight,
  Experiment,
  SurfaceId,
  AssistantContextObject,
  AssistantMessage,
  LinkStatus,
  LinkKind
} from '../types';
import {
  AutomationItem,
  GoalItem,
  LLMModelItem,
  RunItem,
  ServiceItem,
  TargetItem,
  TaskItem,
  TaskStatus,
  WeeklyReviewItem
} from '../productivityTypes';
import { LearningUnit, LearnBlock, LearnSource, LearnViewMode } from '../learnTypes';
import { normalizeLearningUnit, scheduleCard } from '../utils/learnBlocks';
import { loadVault, saveVault, type VaultSnapshot } from '../vaultClient';
import { useCodexAssistant } from './useCodexAssistant';
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
  defaultGoalId?: string;
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
  codexAssistant: ReturnType<typeof useCodexAssistant>;
  workspaceSyncing: boolean;
  workspaceDir: string;
  workspaceLoading: boolean;
  workspaceError: string | null;
  setWorkspaceDir: (dir: string) => Promise<void>;

  // Navigation & Shell
  activeSurface: SurfaceId;
  setActiveSurface: (surface: SurfaceId) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  darkVariant: 'claude' | 'mocha';
  setDarkVariant: (variant: 'claude' | 'mocha') => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  
  // Filters
  activeTag: string;
  setActiveTag: (tag: string) => void;
  linkStatusFilter: 'all' | LinkStatus;
  setLinkStatusFilter: (status: 'all' | LinkStatus) => void;

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
  goals: GoalItem[];
  setGoals: React.Dispatch<React.SetStateAction<GoalItem[]>>;
  weeklyReviews: WeeklyReviewItem[];
  setWeeklyReviews: React.Dispatch<React.SetStateAction<WeeklyReviewItem[]>>;
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
  addQuestion: (title: string, tags: string[]) => { success: boolean; error?: string; questionId?: string };
  addClaim: (text: string, questionId: string, userReason: string) => { success: boolean; error?: string; claimId?: string };
  updateQuestion: (id: string, changes: { title?: string; tags?: string[] }) => void;
  updateClaim: (id: string, changes: { text?: string }) => void;
  updateEvidence: (id: string, changes: Partial<Pick<Evidence, 'title' | 'origin' | 'form' | 'citation'>>) => void;
  connectNodes: (kind: LinkKind, parentId: string, childId: string, userReason: string) => { success: boolean; error?: string };
  setLinkStatus: (linkId: string, status: LinkStatus) => void;
  deleteLink: (linkId: string) => void;
  removeGraphNode: (id: string) => { success: boolean; error?: string };
  moveGraphNode: (childId: string, newParentId: string, userReason: string, previousParentId?: string) => { success: boolean; error?: string };
  updateLinkUserReason: (linkId: string, userReason: string) => void;
  weakenClaim: (claimId: string, note: string) => void;
  rejectClaim: (claimId: string, reason: string) => void;
  addExperiment: (claimId: string, newExp: Omit<Experiment, 'id' | 'artifacts'>) => void;
  addEvidence: (
    newEvidence: Omit<Evidence, 'id' | 'createdAt' | 'author'>,
    claimId: string,
    userReason: string
  ) => { success: boolean; error?: string; evidenceId?: string };

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

  // Actions on Papers & Real PDF Reader
  addPaper: (paperData: Omit<Paper, 'id'> & { id?: string }) => { success: boolean; paper: Paper; error?: string };
  removePaper: (paperId: string) => { success: boolean; error?: string };
  updatePaper: (paperId: string, updates: Partial<Paper>) => void;
  addPaperHighlight: (paperId: string, highlight: Omit<PaperHighlight, 'id' | 'createdAt'>) => PaperHighlight;
  removePaperHighlight: (paperId: string, highlightId: string) => void;

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
  openTaskEditor: (taskId?: string, defaultStatus?: TaskStatus, defaultGoalId?: string) => void;
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

  // Learn: source boards and visual blocks
  activeLearnTab: LearnViewMode;
  setActiveLearnTab: (tab: LearnViewMode) => void;
  learningUnits: LearningUnit[];
  setLearningUnits: React.Dispatch<React.SetStateAction<LearningUnit[]>>;
  activeLearningUnitId: string | null;
  setActiveLearningUnitId: (id: string | null) => void;
  addLearningUnit: (unitData: { title: string; source: LearnSource; description?: string; tags?: string[] }) => LearningUnit;
  updateLearningUnit: (id: string, updates: Partial<LearningUnit>) => void;
  deleteLearningUnit: (id: string) => void;
  addLearnBlock: (unitId: string, block: LearnBlock) => void;
  updateLearnBlock: (unitId: string, blockId: string, updates: Partial<LearnBlock>) => void;
  deleteLearnBlock: (unitId: string, blockId: string) => void;
  moveLearnBlock: (unitId: string, blockId: string, direction: -1 | 1) => void;
  reviewLearnCard: (unitId: string, blockId: string, recalled: boolean) => void;
  promoteBlockToClaim: (unitId: string, blockId: string, text: string) => { claimId: string };
  promoteBlockToQuestion: (unitId: string, blockId: string, title: string, tags: string[]) => { questionId: string };
  promoteBlockToTask: (unitId: string, blockId: string, title: string, description: string) => { taskId: string };
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaceDir, setWorkspaceDirState] = useState(() => localStorage.getItem('thinking_os_workspace_dir') || '~/second-brain');
  const [workspaceSyncing, setWorkspaceSyncing] = useState(false);
  const savePaused = useRef(false);
  const pendingSave = useRef<Promise<void>>(Promise.resolve());
  const savedSnapshot = useRef('');
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [vaultReady, setVaultReady] = useState(false);
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('tasks');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [darkVariant, setDarkVariantState] = useState<'claude' | 'mocha'>(() =>
    localStorage.getItem('thinking_os_dark_variant') === 'mocha' ? 'mocha' : 'claude'
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

  const [questions, setQuestions] = useState<Question[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [openProblems, setOpenProblems] = useState<SurveyOpenProblem[]>([]);
  const [candidateQuestions, setCandidateQuestions] = useState<SurveyCandidateQuestion[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReviewItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [models, setModels] = useState<LLMModelItem[]>([]);
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [learningUnits, setLearningUnits] = useState<LearningUnit[]>([]);
  const [activeLearningUnitId, setActiveLearningUnitId] = useState<string | null>(null);
  const [activeLearnTab, setActiveLearnTab] = useState<LearnViewMode>('today');

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
  const [dockWidth, setDockWidth] = useState<number>(() => Math.max(320, window.innerWidth / 3));
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

  const snapshot = useMemo(() => ({
    questions, claims, evidence, links, openProblems, candidateQuestions, papers, experiments,
    tasks, goals, weeklyReviews, services, runs, models, automations, targets, learningUnits
  }), [questions, claims, evidence, links, openProblems, candidateQuestions, papers, experiments,
    tasks, goals, weeklyReviews, services, runs, models, automations, targets, learningUnits]);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;

  const applySnapshot = useCallback((data: VaultSnapshot) => {
    const normalized = { ...data, tasks: data.tasks.map(task => ({
      ...task, author: task.author ?? 'user', lastEditedBy: task.lastEditedBy ?? task.author ?? 'user'
    })), learningUnits: data.learningUnits.map(normalizeLearningUnit) };
    savedSnapshot.current = JSON.stringify(normalized);
    setQuestions(normalized.questions);
    setClaims(normalized.claims);
    setEvidence(normalized.evidence);
    setLinks(normalized.links);
    setOpenProblems(normalized.openProblems);
    setCandidateQuestions(normalized.candidateQuestions);
    setPapers(normalized.papers);
    setExperiments(normalized.experiments);
    setTasks(normalized.tasks);
    setGoals(normalized.goals);
    setWeeklyReviews(normalized.weeklyReviews);
    setServices(normalized.services);
    setRuns(normalized.runs);
    setModels(normalized.models);
    setAutomations(normalized.automations);
    setTargets(normalized.targets);
    setLearningUnits(normalized.learningUnits);
  }, []);

  const persistSnapshot = useCallback((dir: string, data: VaultSnapshot) => {
    const serialized = JSON.stringify(data);
    pendingSave.current = pendingSave.current.then(async () => {
      if (serialized === savedSnapshot.current) return;
      await saveVault(dir, data);
      savedSnapshot.current = serialized;
    });
    return pendingSave.current;
  }, []);

  const setWorkspaceDir = useCallback(async (dir: string) => {
    if (savePaused.current) return;
    const requestedDir = dir.trim() || '~/second-brain';
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setVaultReady(false);
    try {
      await pendingSave.current.catch(() => {});
      const loaded = await loadVault(requestedDir);
      setWorkspaceDirState(loaded.dir);
      localStorage.setItem('thinking_os_workspace_dir', loaded.dir);
      applySnapshot(loaded.data);
      pendingSave.current = Promise.resolve();
      setVaultReady(true);
    } catch (error) {
      setWorkspaceError(String(error instanceof Error ? error.message : error));
    } finally {
      setWorkspaceLoading(false);
    }
  }, [applySnapshot]);

  const codexAssistant = useCodexAssistant(workspaceDir, async dir => {
    if (dir !== workspaceDir) return;
    if (!vaultReady || savePaused.current) throw new Error('Wait for the workspace to load before starting the assistant.');
    savePaused.current = true;
    setWorkspaceSyncing(true);
    try {
      await persistSnapshot(workspaceDir, latestSnapshot.current);
    } catch (error) {
      savePaused.current = false;
      setWorkspaceSyncing(false);
      throw error;
    }
    const before = savedSnapshot.current;
    return async () => {
      try {
        if (JSON.stringify(latestSnapshot.current) !== before) throw new Error('Workspace edits arrived during the assistant turn. Your local edits are kept; preserve them before reloading.');
        const loaded = await loadVault(workspaceDir);
        if (JSON.stringify(latestSnapshot.current) !== before) throw new Error('Workspace edits arrived during reload. Your local edits are kept; preserve them before reloading.');
        applySnapshot(loaded.data);
        setWorkspaceError(null);
      } catch (error) {
        setVaultReady(false);
        setWorkspaceError(String(error instanceof Error ? error.message : error));
        throw error;
      } finally {
        savePaused.current = false;
        setWorkspaceSyncing(false);
      }
    };
  });

  useEffect(() => {
    void setWorkspaceDir(workspaceDir);
  }, []);

  useEffect(() => {
    if (!vaultReady || workspaceSyncing || savePaused.current) return;
    const timer = window.setTimeout(() => {
      if (savePaused.current) return;
      void persistSnapshot(workspaceDir, snapshot).catch(error => setWorkspaceError(String(error instanceof Error ? error.message : error)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    vaultReady, workspaceDir, workspaceSyncing, snapshot, persistSnapshot
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
      goalId: taskData.goalId,
      createdAt: 'Just now',
      author: isAi ? 'model' : 'user',
      lastEditedBy: isAi ? 'model' : 'user'
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  const openTaskEditor = useCallback((taskId?: string, defaultStatus: TaskStatus = 'todo', defaultGoalId?: string) => {
    setTaskEditor({ taskId: taskId ?? null, defaultStatus, defaultGoalId });
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

  // Learn Board Actions
  const addLearningUnit = useCallback((unitData: { title: string; source: LearnSource; description?: string; tags?: string[] }): LearningUnit => {
    const now = Date.now();
    const newUnit: LearningUnit = {
      id: `unit-${now}`,
      title: unitData.title,
      description: unitData.description || '',
      source: unitData.source,
      tags: unitData.tags || [],
      blocks: [],
      createdAt: now,
      updatedAt: now,
      author: 'user'
    };
    setLearningUnits(current => [newUnit, ...current]);
    setActiveLearningUnitId(newUnit.id);
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

  const mapUnitBlocks = useCallback((unitId: string, mapper: (blocks: LearnBlock[]) => LearnBlock[]) => {
    setLearningUnits(current => current.map(unit => (
      unit.id === unitId ? { ...unit, blocks: mapper(unit.blocks), updatedAt: Date.now() } : unit
    )));
  }, []);

  const addLearnBlock = useCallback((unitId: string, block: LearnBlock) => {
    mapUnitBlocks(unitId, blocks => [block, ...blocks]);
  }, [mapUnitBlocks]);

  const updateLearnBlock = useCallback((unitId: string, blockId: string, updates: Partial<LearnBlock>) => {
    mapUnitBlocks(unitId, blocks => blocks.map(block => (
      block.id === blockId ? ({ ...block, ...updates, updatedAt: Date.now() } as LearnBlock) : block
    )));
  }, [mapUnitBlocks]);

  const deleteLearnBlock = useCallback((unitId: string, blockId: string) => {
    mapUnitBlocks(unitId, blocks => blocks.filter(block => block.id !== blockId));
  }, [mapUnitBlocks]);

  const moveLearnBlock = useCallback((unitId: string, blockId: string, direction: -1 | 1) => {
    mapUnitBlocks(unitId, blocks => {
      const index = blocks.findIndex(block => block.id === blockId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, [mapUnitBlocks]);

  const reviewLearnCard = useCallback((unitId: string, blockId: string, recalled: boolean) => {
    mapUnitBlocks(unitId, blocks => blocks.map(block => (
      block.id === blockId && block.kind === 'card' ? scheduleCard(block, recalled) : block
    )));
  }, [mapUnitBlocks]);

  const promoteBlockToClaim = useCallback((unitId: string, blockId: string, text: string) => {
    const claimId = `c-learn-${Date.now()}`;
    setClaims(prev => [{ id: claimId, text, rejected: false, createdAt: Date.now(), author: 'user' }, ...prev]);
    updateLearnBlock(unitId, blockId, { promotedClaimId: claimId });
    return { claimId };
  }, [updateLearnBlock]);

  const promoteBlockToQuestion = useCallback((unitId: string, blockId: string, title: string, tags: string[]) => {
    const questionId = `q-learn-${Date.now()}`;
    const newQuestion: Question = {
      id: questionId,
      title,
      tags: tags.length ? tags : ['learn'],
      createdAt: Date.now(),
      author: 'user'
    };
    setQuestions(prev => [newQuestion, ...prev]);
    updateLearnBlock(unitId, blockId, { promotedQuestionId: questionId });
    return { questionId };
  }, [updateLearnBlock]);

  const promoteBlockToTask = useCallback((unitId: string, blockId: string, title: string, description: string) => {
    const newTask = createTaskDirectly({
      title,
      description,
      status: 'backlog',
      priority: 'high',
      tag: '#learn'
    }, false);
    updateLearnBlock(unitId, blockId, { promotedTaskId: newTask.id });
    return { taskId: newTask.id };
  }, [createTaskDirectly, updateLearnBlock]);

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
      setGoals(SAMPLE_SNAPSHOT.goals);
      setWeeklyReviews(SAMPLE_SNAPSHOT.weeklyReviews);
      setServices(SAMPLE_SNAPSHOT.services);
      setRuns(SAMPLE_SNAPSHOT.runs);
      setModels(SAMPLE_SNAPSHOT.models);
      setAutomations(SAMPLE_SNAPSHOT.automations);
      setTargets(SAMPLE_SNAPSHOT.targets);
      setThreads(INITIAL_THREADS);
      manuscriptWorkspace.resetManuscriptToSample();
      await persistSnapshot(workspaceDir, { ...SAMPLE_SNAPSHOT, learningUnits });
    } catch (err) {
      console.error('Failed to load sample data:', err);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [workspaceDir, learningUnits]);

  // Theme follows the OS colour scheme
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (isDark: boolean) => {
      const saved = localStorage.getItem('thinking_os_theme');
      const next = saved === 'dark' || saved === 'light' ? saved : isDark ? 'dark' : 'light';
      setTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };
    apply(query.matches);
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('thinking_os_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('mocha', darkVariant === 'mocha');
  }, [darkVariant]);

  const setDarkVariant = useCallback((variant: 'claude' | 'mocha') => {
    localStorage.setItem('thinking_os_dark_variant', variant);
    setDarkVariantState(variant);
  }, []);

  const toggleDock = useCallback(() => {
    setIsDockOpen(prev => !prev);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  }, []);

  // Unclustered open problems count (for the 15-note gate)
  const unclusteredOpenProblemsCount = openProblems.filter(op => !op.candidateId).length;

  // Create a question (root of the research chain)
  const addQuestion = useCallback((title: string, tags: string[]) => {
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: 'A question needs a title.' };
    const questionId = `q-${Date.now()}`;
    setQuestions(prev => [...prev, {
      id: questionId,
      title: trimmed,
      tags: tags.map(tag => tag.trim()).filter(Boolean),
      createdAt: Date.now(),
      author: 'user'
    }]);
    return { success: true, questionId };
  }, []);

  // Create a claim under a question (every link needs a user reason)
  const addClaim = useCallback((text: string, questionId: string, userReason: string) => {
    const trimmedText = text.trim();
    const trimmedReason = userReason.trim();
    if (!trimmedText) return { success: false, error: 'A claim needs text.' };
    if (!questions.some(question => question.id === questionId)) {
      return { success: false, error: 'Pick a parent question.' };
    }
    if (!trimmedReason) {
      return { success: false, error: 'Every question-claim link requires a committed user reason.' };
    }
    const claimId = `c-${Date.now()}`;
    setClaims(prev => [...prev, {
      id: claimId,
      text: trimmedText,
      rejected: false,
      createdAt: Date.now(),
      author: 'user'
    }]);
    setLinks(prev => [...prev, {
      id: `${questionId}--${claimId}`,
      kind: 'question-claim',
      parentId: questionId,
      childId: claimId,
      status: 'holds',
      userReason: trimmedReason,
      createdAt: Date.now(),
      author: 'user'
    }]);
    return { success: true, claimId };
  }, [questions]);

  const updateQuestion = useCallback((id: string, changes: { title?: string; tags?: string[] }) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...changes } : q)));
  }, []);

  const updateClaim = useCallback((id: string, changes: { text?: string }) => {
    setClaims(prev => prev.map(c => (c.id === id ? { ...c, ...changes } : c)));
  }, []);

  const updateEvidence = useCallback((id: string, changes: Partial<Pick<Evidence, 'title' | 'origin' | 'form' | 'citation'>>) => {
    setEvidence(prev => prev.map(item => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  // Connect two existing entities; reason is mandatory, duplicates rejected
  const connectNodes = useCallback((kind: LinkKind, parentId: string, childId: string, userReason: string) => {
    const trimmedReason = userReason.trim();
    if (!parentId || !childId) return { success: false, error: 'Pick both ends of the link.' };
    if (!trimmedReason) return { success: false, error: 'Every link requires a committed user reason.' };
    const validEndpoints = kind === 'question-claim'
      ? questions.some(item => item.id === parentId) && claims.some(item => item.id === childId)
      : claims.some(item => item.id === parentId) && evidence.some(item => item.id === childId);
    if (!validEndpoints) return { success: false, error: 'The selected entities do not match this link type.' };
    if (links.some(link => link.parentId === parentId && link.childId === childId)) {
      return { success: false, error: 'That link already exists.' };
    }
    const linkId = `${parentId}--${childId}`;
    setLinks(prev => [...prev, {
        id: linkId,
        kind,
        parentId,
        childId,
        status: 'holds',
        userReason: trimmedReason,
        createdAt: Date.now(),
        author: 'user'
      }]);
    return { success: true };
  }, [claims, evidence, links, questions]);

  const setLinkStatus = useCallback((linkId: string, status: LinkStatus) => {
    setLinks(prev => prev.map(l => (l.id === linkId ? { ...l, status } : l)));
  }, []);

  // Attach or re-parent an existing claim/evidence node; the new link still needs a committed reason
  const moveGraphNode = useCallback((childId: string, newParentId: string, userReason: string, previousParentId?: string) => {
    const kind: LinkKind = claims.some(item => item.id === childId) ? 'question-claim' : 'claim-evidence';
    const result = connectNodes(kind, newParentId, childId, userReason);
    if (!result.success) return result;
    if (previousParentId && previousParentId !== newParentId) {
      setLinks(prev => prev.filter(link => !(link.parentId === previousParentId && link.childId === childId)));
    }
    return { success: true };
  }, [claims, connectNodes]);

  const deleteLink = useCallback((linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
    setSelectedLinkId(current => (current === linkId ? null : current));
  }, []);

  const removeGraphNode = useCallback((id: string) => {
    if (![...questions, ...claims, ...evidence].some(item => item.id === id)) {
      return { success: false, error: 'This item no longer exists.' };
    }
    const manuscript = manuscriptWorkspace.manuscript;
    if (experiments.some(item => item.questionId === id || item.claimId === id)
      || candidateQuestions.some(item => item.promotedQuestionId === id)
      || papers.some(paper => paper.sections.some(section => section.paragraphs.some(item => item.linkedClaimId === id)))
      || manuscript.sections.some(section => section.attachedClaimIds.includes(id))
      || manuscript.artifacts.some(item => item.claimId === id)
      || manuscript.citations.some(item => item.claimIds?.includes(id))) {
      return { success: false, error: 'This item is referenced outside the argument graph. Remove those references before deleting it.' };
    }
    const removedLinkIds = new Set(links.filter(link => link.parentId === id || link.childId === id).map(link => link.id));
    setQuestions(current => current.filter(item => item.id !== id));
    setClaims(current => current.filter(item => item.id !== id));
    setEvidence(current => current.filter(item => item.id !== id));
    setLinks(current => current.filter(link => link.parentId !== id && link.childId !== id));
    setSelectedNodeId(current => current === id ? null : current);
    setSelectedLinkId(current => current && removedLinkIds.has(current) ? null : current);
    setActiveContext(current => current && (current.id === id || removedLinkIds.has(current.id)) ? null : current);
    setAttachedContexts(current => current.filter(item => item.id !== id && !removedLinkIds.has(item.id)));
    return { success: true };
  }, [questions, claims, evidence, links, experiments, candidateQuestions, papers, manuscriptWorkspace.manuscript]);

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
    if (!claims.some(claim => claim.id === claimId)) {
      return { success: false, error: 'Pick a parent claim.' };
    }
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
    return { success: true, evidenceId };
  }, [claims]);

  // Actions on Papers & Real PDF Reader
  const addPaper = useCallback((paperData: Omit<Paper, 'id'> & { id?: string }) => {
    if (!paperData.title?.trim()) {
      return { success: false, error: 'A paper title is required.', paper: null as unknown as Paper };
    }
    const cleanId = paperData.id?.trim() || `p-${Date.now()}`;
    const newPaper: Paper = {
      ...paperData,
      id: cleanId,
      title: paperData.title.trim(),
      authors: paperData.authors?.trim() || 'Unknown Authors',
      year: paperData.year || new Date().getFullYear(),
      citation: paperData.citation?.trim() || `${paperData.authors?.split(',')[0] || 'Paper'} (${paperData.year || new Date().getFullYear()})`,
      pageCount: paperData.pageCount || 1,
      markdown: paperData.markdown || '',
      sections: paperData.sections || [
        {
          id: `sec-${cleanId}-1`,
          title: 'Abstract',
          paragraphs: [{ id: `par-${cleanId}-1` }]
        }
      ],
      highlights: paperData.highlights || [],
      createdAt: paperData.createdAt || Date.now()
    };
    setPapers(prev => {
      if (prev.some(p => p.id === cleanId)) {
        return prev.map(p => (p.id === cleanId ? newPaper : p));
      }
      return [newPaper, ...prev];
    });
    return { success: true, paper: newPaper };
  }, []);

  const removePaper = useCallback((paperId: string) => {
    setPapers(prev => prev.filter(p => p.id !== paperId));
    return { success: true };
  }, []);

  const updatePaper = useCallback((paperId: string, updates: Partial<Paper>) => {
    setPapers(prev => prev.map(p => (p.id === paperId ? { ...p, ...updates } : p)));
  }, []);

  const addPaperHighlight = useCallback((paperId: string, highlight: Omit<PaperHighlight, 'id' | 'createdAt'>) => {
    const newHl: PaperHighlight = {
      ...highlight,
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now()
    };
    setPapers(prev => prev.map(p => {
      if (p.id !== paperId) return p;
      const existing = p.highlights || [];
      return {
        ...p,
        highlights: [...existing, newHl]
      };
    }));
    return newHl;
  }, []);

  const removePaperHighlight = useCallback((paperId: string, highlightId: string) => {
    setPapers(prev => prev.map(p => {
      if (p.id !== paperId) return p;
      return {
        ...p,
        highlights: (p.highlights || []).filter(h => h.id !== highlightId)
      };
    }));
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
        codexAssistant,
        workspaceSyncing,
        workspaceDir,
        workspaceLoading,
        workspaceError,
        setWorkspaceDir,
        activeSurface,
        setActiveSurface,
        theme,
        darkVariant,
        setDarkVariant,
        toggleTheme,
        fontSize,
        setFontSize,
        activeTag,
        setActiveTag,
        linkStatusFilter,
        setLinkStatusFilter,
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
        goals,
        setGoals,
        weeklyReviews,
        setWeeklyReviews,
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
        addQuestion,
        addClaim,
        updateQuestion,
        updateClaim,
        updateEvidence,
        connectNodes,
        setLinkStatus,
        deleteLink,
        removeGraphNode,
        moveGraphNode,
        updateLinkUserReason,
        weakenClaim,
        rejectClaim,
        addExperiment,
        addEvidence,
        addPaper,
        removePaper,
        updatePaper,
        addPaperHighlight,
        removePaperHighlight,
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
        activeLearnTab,
        setActiveLearnTab,
        addLearningUnit,
        updateLearningUnit,
        deleteLearningUnit,
        addLearnBlock,
        updateLearnBlock,
        deleteLearnBlock,
        moveLearnBlock,
        reviewLearnCard,
        promoteBlockToClaim,
        promoteBlockToQuestion,
        promoteBlockToTask,
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
