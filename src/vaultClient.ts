import { Question, Claim, Evidence, Link, SurveyOpenProblem, SurveyCandidateQuestion, Paper, Experiment } from './types';
import { AutomationItem, LLMModelItem, RunItem, ServiceItem, TargetItem, TaskItem } from './productivityTypes';
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
  services: ServiceItem[];
  runs: RunItem[];
  models: LLMModelItem[];
  automations: AutomationItem[];
  targets: TargetItem[];
  learningUnits: LearningUnit[];
}

export const EMPTY_SNAPSHOT: VaultSnapshot = {
  questions: [], claims: [], evidence: [], links: [], openProblems: [], candidateQuestions: [],
  papers: [], experiments: [], tasks: [], services: [], runs: [], models: [], automations: [], targets: [],
  learningUnits: []
};

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
  try {
    const payload = await call(dir);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`thinking_os_vault_${payload.dir}`, JSON.stringify(payload.data));
      } catch {}
    }
    return { dir: payload.dir, data: { ...EMPTY_SNAPSHOT, ...payload.data } };
  } catch (error) {
    console.warn('Vault API call failed, attempting local cache fallback:', error);
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`thinking_os_vault_${dir}`);
      if (cached) {
        try {
          return { dir, data: { ...EMPTY_SNAPSHOT, ...JSON.parse(cached) } };
        } catch {}
      }
    }
    return { dir, data: EMPTY_SNAPSHOT };
  }
}

export async function saveVault(dir: string, snapshot: VaultSnapshot): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`thinking_os_vault_${dir}`, JSON.stringify(snapshot));
    } catch {}
  }
  try {
    await call(dir, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(snapshot)
    });
  } catch (error) {
    console.warn('Vault API save failed, saved to local cache:', error);
  }
}
