import { EntityAuthor } from './types';

export type TabId = 'task-pipeline' | 'execution-engine';

export type EngineSubTab = 'services' | 'runs' | 'llm-models' | 'automations' | 'targets' | 'agent-jobs';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tag: string;
  createdAt: string;
  author?: EntityAuthor;
  lastEditedBy?: EntityAuthor;
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  description: string;
  accentColor: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  port: number | null;
  command: string;
  status: 'running' | 'idle' | 'stopped';
  uptime?: string;
  protocol?: string;
  cwd?: string;
  createdAt?: number;
  author?: EntityAuthor;
}

export interface RunItem {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  target: string;
  duration: string;
  resourceLock: string;
  timestamp: string;
  exitCode?: number;
}

export interface LLMModelItem {
  id: string;
  name: string;
  family?: string;
  hash: string;
  quantization: string;
  parameters: string;
  contextLength: string;
  vramRequired: string;
  status: 'loaded' | 'ready' | 'downloading';
  instructFormat?: string;
}

export type ModelItem = LLMModelItem;

export interface AutomationItem {
  id: string;
  name: string;
  trigger: string;
  action: string;
  target: string;
  enabled: boolean;
  lastRun: string;
}

export interface TargetItem {
  id: string;
  name: string;
  kind: 'machine' | 'repo' | 'workspace' | 'container';
  location: string;
  resourceUsage: string;
  status: 'connected' | 'busy' | 'offline';
}

export type WorkspaceObjectType = 'task' | 'service' | 'run' | 'model' | 'automation' | 'target';

export interface WorkspaceObject {
  objectType: WorkspaceObjectType;
  id: string;
  title: string;
  subtitle?: string;
  details?: string;
  meta?: Record<string, string | number | null | boolean | undefined>;
}
