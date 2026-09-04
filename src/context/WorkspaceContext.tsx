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
import { loadVault, saveVault } from '../vaultClient';
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

interface WorkspaceContextValue {
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
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaceDir, setWorkspaceDirState] = useState(() => localStorage.getItem('thinking_os_workspace_dir') || '~/second-brain');
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [vaultReady, setVaultReady] = useState(false);
  const [activeSurface, setActiveSurface] = useState<SurfaceId>('tasks');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Assistant Dock
  const [isDockOpen, setIsDockOpen] = useState<boolean>(true);
  const [dockWidth, setDockWidth] = useState<number>(360);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('assistant');
  const [taskEditor, setTaskEditor] = useState<TaskEditorState | null>(null);
  const [activeContext, setActiveContext] = useState<AssistantContextObject | null>({
    type: 'task',
    id: 'task-pipeline',
    label: 'Task pipeline',
    secondaryLabel: 'Backlog through verified completion'
  });
  const [attachedContexts, setAttachedContexts] = useState<AssistantContextObject[]>([]);

  const setWorkspaceDir = useCallback(async (dir: string) => {
    const requestedDir = dir.trim() || '~/second-brain';
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setVaultReady(false);
    try {
      const loaded = await loadVault(requestedDir);
      const data = loaded.data;
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
        tasks, services, runs, models, automations, targets
      }).catch(error => setWorkspaceError(String(error instanceof Error ? error.message : error)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    vaultReady, workspaceDir, questions, claims, evidence, links, openProblems, candidateQuestions,
    papers, experiments, tasks, services, runs, models, automations, targets
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
    setRightPanelView('assistant');
    setIsDockOpen(true);
  }, []);

  const closeTaskEditor = useCallback(() => {
    setTaskEditor(null);
    setTaskDraft(null);
  }, []);

  const applyAiDraftToEditor = useCallback((prompt?: string) => {
    const currentTask = taskEditor?.taskId ? tasks.find(t => t.id === taskEditor.taskId) : null;
    const draft = generateAiTaskDraft(prompt || 'Gợi ý tiêu chí và kế hoạch thực hiện', currentTask, taskEditor?.defaultStatus || 'todo');
    setTaskDraft(draft);
    if (!taskEditor) {
      setTaskEditor({ taskId: null, defaultStatus: draft.status });
    }
    setIsDockOpen(true);
    setRightPanelView('assistant');
  }, [taskEditor, tasks]);

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
  const [threads, setThreads] = useState<Record<string, AssistantMessage[]>>({});

  // Toggle Theme
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
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

      replyContent = `🤖 **Đã tạo task mới trực tiếp vào ${statusMap[newTask.status] || newTask.status}:**\n\n` +
        `• **Tiêu đề:** ${newTask.title}\n` +
        `• **Cột:** ${statusMap[newTask.status] || newTask.status}\n` +
        `• **Độ ưu tiên:** ${newTask.priority.toUpperCase()}\n` +
        `• **Tag:** #${newTask.tag}\n` +
        `• **ID:** \`${newTask.id}\`\n\n` +
        `🏷️ *Cờ tác giả: \`author: model\` · \`lastEditedBy: model\` (AI tạo ra)*\n\n` +
        `Card đã xuất hiện trên bảng Kanban Tasks. Bạn có thể mở chỉnh sửa hoặc kéo thả giữa các cột.`;

      structuredAction = {
        type: `create_task:${newTask.id}`,
        status: 'holds'
      };
    } else if (isDraftRequest || (taskEditor && (lower.includes('viết') || lower.includes('mô tả') || lower.includes('gợi ý') || lower.includes('draft') || lower.includes('điền')))) {
      // Case 2: AI drafts/fills into editor
      const currentTask = taskEditor?.taskId ? tasks.find(t => t.id === taskEditor.taskId) : null;
      const draft = generateAiTaskDraft(userText, currentTask, taskEditor?.defaultStatus || 'todo');
      setTaskDraft(draft);
      if (!taskEditor) {
        setTaskEditor({ taskId: null, defaultStatus: draft.status });
      }
      setIsDockOpen(true);

      replyContent = `✨ **Tôi đã điền nội dung gợi ý vào Task Editor:**\n\n` +
        `• **Tiêu đề:** ${draft.title}\n` +
        `• **Cột:** ${draft.status}\n` +
        `• **Độ ưu tiên:** ${draft.priority.toUpperCase()}\n` +
        `• **Tag:** #${draft.tag}\n\n` +
        `👉 *Nội dung chi tiết đã được điền tự động vào form editor phía trên và gắn cờ \`AI Drafted\`. Bạn hãy kiểm tra lại và bấm nút **"Lưu (Save)"** để lưu thay đổi.*`;

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
        checkLinkWithAssistant
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
