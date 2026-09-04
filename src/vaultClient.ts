import { Question, Claim, Evidence, Link, SurveyOpenProblem, SurveyCandidateQuestion, Paper, Experiment } from './types';
import { AutomationItem, LLMModelItem, RunItem, ServiceItem, TargetItem, TaskItem } from './productivityTypes';

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
}

export const EMPTY_SNAPSHOT: VaultSnapshot = {
  questions: [], claims: [], evidence: [], links: [], openProblems: [], candidateQuestions: [],
  papers: [], experiments: [], tasks: [], services: [], runs: [], models: [], automations: [], targets: []
};

async function call(dir: string, init?: RequestInit) {
  const response = await fetch(`/api/vault?dir=${encodeURIComponent(dir)}`, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `Vault request failed (${response.status})`);
  return payload;
}

export async function loadVault(dir: string): Promise<{ dir: string; data: VaultSnapshot }> {
  const payload = await call(dir);
  return { dir: payload.dir, data: { ...EMPTY_SNAPSHOT, ...payload.data } };
}

export async function saveVault(dir: string, snapshot: VaultSnapshot): Promise<void> {
  await call(dir, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(snapshot)
  });
}
