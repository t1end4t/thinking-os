export interface ServiceProcessStatus {
  id: string;
  unit: string;
  installed: boolean;
  autostart: boolean;
  running: boolean;
  activeState: string;
  subState: string;
  pid: number | null;
  startedAt: string | null;
}

export type ServiceAction = 'start' | 'stop' | 'restart' | 'enable' | 'disable' | 'uninstall';

export interface ModelHardwareStatus {
  gpuName: string | null;
  vramTotalBytes: number;
  vramFreeBytes: number;
  ramTotalBytes: number;
  ramFreeBytes: number;
  vramTotal: string;
  vramFree: string;
  ramTotal: string;
  ramFree: string;
}

export interface LocalModelStatus {
  id: string;
  name: string;
  fileName: string;
  path: string;
  kind: 'model' | 'projector';
  sizeBytes: number;
  size: string;
  quantization: string;
  parameters: string;
  status: 'ready' | 'downloading' | 'starting' | 'running' | 'stopped' | 'failed';
  projectorFileName: string | null;
  fit: null | {
    mode: 'full-gpu' | 'partial-offload' | 'cpu-only' | 'insufficient' | 'unknown';
    label: string;
    detail: string;
    suggestedGpuLayers: number;
    estimatedRequiredBytes: number;
  };
  runtime: null | {
    state: string;
    pid: number | null;
    port: number;
    gpuLayers: number;
    contextLength: number;
    startedAt: string;
    error: string | null;
    logs: string[];
  };
  download: null | {
    state: string;
    receivedBytes: number;
    totalBytes: number;
    error: string | null;
  };
}

export interface ModelRuntimeSnapshot {
  enabled: boolean;
  modelsDir: string;
  llamaServerAvailable: boolean;
  hardware: ModelHardwareStatus;
  models: LocalModelStatus[];
}

export interface ModelDownloadRequest {
  repo: string;
  fileName: string;
  localName?: string;
}

async function call(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `Runtime request failed (${response.status})`);
  return payload;
}

export async function loadServiceStatuses(dir: string): Promise<{ enabled: boolean; services: ServiceProcessStatus[] }> {
  try {
    return await call(`/api/runtime?dir=${encodeURIComponent(dir)}`);
  } catch {
    return { enabled: false, services: [] };
  }
}

export async function controlService(dir: string, id: string, action: ServiceAction): Promise<ServiceProcessStatus> {
  const payload = await call(
    `/api/runtime?dir=${encodeURIComponent(dir)}&id=${encodeURIComponent(id)}&action=${action}`,
    { method: 'POST' }
  );
  if (!payload.enabled) throw new Error('Runtime control is disabled. Restart Thinking OS.');
  return payload.service;
}

export async function loadServiceLogs(dir: string, id: string): Promise<string[]> {
  const payload = await call(`/api/runtime?dir=${encodeURIComponent(dir)}&id=${encodeURIComponent(id)}`);
  if (!payload.enabled) throw new Error('Runtime control is disabled. Restart Thinking OS.');
  return payload.logs ?? [];
}

export async function loadLocalModels(): Promise<ModelRuntimeSnapshot> {
  return call('/api/runtime/models');
}

export async function downloadLocalModel(request: ModelDownloadRequest): Promise<void> {
  await call('/api/runtime/models', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'download', ...request })
  });
}

export async function controlLocalModel(
  fileName: string,
  action: 'run' | 'stop' | 'remove' | 'cancel-download',
  options: { gpuLayers?: number; contextLength?: number; port?: number; projectorFileName?: string | null; force?: boolean } = {}
): Promise<void> {
  await call('/api/runtime/models', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, fileName, ...options })
  });
}

export interface AgentEnvEntry {
  id: string;
  agent: 'claude' | 'codex' | 'shared';
  scope: 'global' | 'project';
  projectId: string | null;
  projectName: string | null;
  category: 'instructions' | 'settings' | 'mcp' | 'skill';
  label: string;
  kind: 'markdown' | 'json' | 'toml';
  path: string;
  exists: boolean;
  sizeBytes: number;
  modifiedAt: string | null;
}

export interface AgentProject {
  id: string;
  name: string;
  path: string;
  addedAt: string;
}

export interface AgentEnvSnapshot {
  home: string;
  projects: AgentProject[];
  entries: AgentEnvEntry[];
}

export async function loadAgentEnv(): Promise<AgentEnvSnapshot> {
  return call('/api/agent-env');
}

export async function loadAgentEnvFile(id: string): Promise<{ entry: AgentEnvEntry; content: string }> {
  return call(`/api/agent-env?id=${encodeURIComponent(id)}`);
}

export async function saveAgentEnvFile(id: string, content: string): Promise<AgentEnvEntry> {
  const payload = await call('/api/agent-env', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, content })
  });
  return payload.entry;
}

export async function createAgentSkill(
  target: 'global' | string,
  agent: 'claude' | 'codex' | 'shared',
  name: string
): Promise<{ entry: AgentEnvEntry; content: string }> {
  return call('/api/agent-env', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'create-skill', target, agent, name })
  });
}

export async function addAgentProject(path: string, name?: string): Promise<AgentProject[]> {
  const payload = await call('/api/agent-env', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'add-project', path, name })
  });
  return payload.projects;
}

export async function removeAgentProject(id: string): Promise<AgentProject[]> {
  const payload = await call('/api/agent-env', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'remove-project', id })
  });
  return payload.projects;
}
