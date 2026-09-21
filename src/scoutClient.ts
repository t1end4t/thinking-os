import type { ScoutBrief, ScoutBriefInput, ScoutDecision, ScoutDismissalReason, ScoutReport, ScoutRun, ScoutRunState, ScoutSnapshot } from './scoutTypes';
import { parseScoutReport, parseScoutSnapshot } from './scoutReportParsers';
import { parseBrief, parseRun } from './scoutValueParsers';
import { record } from './scoutValueParsers';

export type ScoutMutation =
  | {
      readonly action: 'decide-candidate';
      readonly reportId: string;
      readonly candidateId: string;
      readonly decision: Extract<ScoutDecision, 'saved' | 'dismissed'>;
      readonly paperId?: string;
      readonly reason?: ScoutDismissalReason;
      readonly note?: string;
    }
  | { readonly action: 'request-inspection'; readonly reportId: string; readonly candidateId: string };

export type ScoutControlAction = ScoutMutation['action'] | 'save-brief' | 'start-run' | 'cancel-run';

async function request(dir: string, signal: AbortSignal, mutation?: ScoutMutation): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/scouts?${new URLSearchParams({ dir })}`, {
    method: mutation ? 'POST' : 'GET',
    signal,
    ...(mutation ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mutation) } : {})
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = record(payload, 'error response').error;
    throw new Error(typeof error === 'string' ? error : `Scout request failed (${response.status}).`);
  }
  return record(payload, 'response');
}

async function controlRequest(dir: string, signal: AbortSignal, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/scouts?${new URLSearchParams({ dir })}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = record(payload, 'error response').error;
    throw new Error(typeof error === 'string' ? error : `Scout request failed (${response.status}).`);
  }
  return record(payload, 'response');
}

export async function loadScouts(dir: string, signal: AbortSignal): Promise<ScoutSnapshot> {
  return parseScoutSnapshot(await request(dir, signal));
}

export async function mutateScout(dir: string, mutation: ScoutMutation, signal: AbortSignal): Promise<ScoutReport> {
  return parseScoutReport((await request(dir, signal, mutation)).report);
}

export async function saveScoutBriefRequest(dir: string, id: string, brief: ScoutBriefInput, signal: AbortSignal): Promise<ScoutBrief> {
  return parseBrief((await controlRequest(dir, signal, { action: 'save-brief', id, brief })).brief);
}

export async function startScoutRunRequest(dir: string, id: string, signal: AbortSignal): Promise<ScoutRun> {
  return parseRun((await controlRequest(dir, signal, { action: 'start-run', id })).run);
}

export async function cancelScoutRunRequest(dir: string, id: string, signal: AbortSignal): Promise<ScoutRun> {
  return parseRun((await controlRequest(dir, signal, { action: 'cancel-run', id })).run);
}

export function activeScoutRun(state: ScoutRunState): boolean {
  return !['completed', 'partial', 'failed', 'cancelled', 'interrupted'].includes(state);
}
