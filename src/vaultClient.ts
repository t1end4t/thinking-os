import { Question, Claim, Evidence, Link, SurveyOpenProblem, SurveyCandidateQuestion, Paper, Experiment } from './types';
import { AutomationItem, GoalItem, LLMModelItem, RunItem, ServiceItem, TargetItem, TaskItem, WeeklyReviewItem } from './productivityTypes';
import { LearningUnit } from './learnTypes';

export interface VaultSnapshot {
  questions: Question[];
  claims: Claim[];
  evidence: Evidence[];
  links: Link[];
  openProblems: SurveyOpenProblem[];
  candidateQuestions: SurveyCandidateQuestion[];
  papers: Paper[];
  experiments: Experiment[];
  tasks: TaskItem[];
  goals: GoalItem[];
  weeklyReviews: WeeklyReviewItem[];
  services: ServiceItem[];
  runs: RunItem[];
  models: LLMModelItem[];
  automations: AutomationItem[];
  targets: TargetItem[];
  learningUnits: LearningUnit[];
}

export const EMPTY_SNAPSHOT: VaultSnapshot = {
  questions: [], claims: [], evidence: [], links: [], openProblems: [], candidateQuestions: [],
  papers: [], experiments: [], tasks: [], goals: [], weeklyReviews: [], services: [], runs: [], models: [], automations: [], targets: [],
  learningUnits: []
};

const revisions = new Map<string, string>();

async function call(dir: string, init?: RequestInit) {
  const response = await fetch(`/api/vault?dir=${encodeURIComponent(dir)}`, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `Vault request failed (${response.status})`);
  return payload;
}

export interface WorkspaceDirListing {
  dir: string;
  parent: string;
  home: string;
  exists: boolean;
  entries: string[];
}

export async function listWorkspaceDirs(dir: string): Promise<WorkspaceDirListing> {
  const response = await fetch(`/api/dirs?dir=${encodeURIComponent(dir)}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `Folder request failed (${response.status})`);
  return payload;
}

export async function loadVault(dir: string): Promise<{ dir: string; data: VaultSnapshot }> {
  const payload = await call(dir);
  if (!payload.data || typeof payload.data !== 'object' || !Object.values(payload.data).every(Array.isArray) || typeof payload.revision !== 'string') {
    throw new Error('Invalid vault response. The workspace was not replaced.');
  }
  revisions.set(dir, payload.revision);
  revisions.set(payload.dir, payload.revision);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`thinking_os_vault_${payload.dir}`, JSON.stringify(payload.data));
    } catch {}
  }
  return { dir: payload.dir, data: { ...EMPTY_SNAPSHOT, ...payload.data } };
}

export async function saveVault(dir: string, snapshot: VaultSnapshot): Promise<void> {
  const revision = revisions.get(dir);
  if (!revision) throw new Error('Load the workspace successfully before saving.');
  const payload = await call(dir, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'if-match': revision },
    body: JSON.stringify(snapshot)
  });
  if (typeof payload.revision !== 'string') throw new Error('Save returned no vault revision. Reload before continuing.');
  revisions.set(dir, payload.revision);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`thinking_os_vault_${dir}`, JSON.stringify(snapshot));
    } catch {}
  }
}
