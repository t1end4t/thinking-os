import { useEffect, useRef, useState } from 'react';
import type { ThreadEvent } from '@openai/codex-sdk';

export interface AssistantImage { id: string; name: string }
export type AssistantMode = 'chat' | 'codex';

export function isAssistantImage(value: unknown): value is AssistantImage {
  if (!value || typeof value !== 'object') return false;
  const image = value as AssistantImage;
  return typeof image.id === 'string' && /^[a-f0-9]{64}\.(png|jpg|webp)$/.test(image.id) &&
    typeof image.name === 'string' && Boolean(image.name.trim()) && image.name.length <= 255;
}

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: 'reasoning' | 'command' | 'tool' | 'warning' | 'plan' | 'files';
  label?: string;
  state?: 'running' | 'complete' | 'failed' | 'stopped';
  durationMs?: number;
  images?: AssistantImage[];
}

export interface AssistantSession {
  id: string;
  title: string;
  messages: ChatEntry[];
  threadId?: string;
  provider?: string;
  model?: string;
  mode?: AssistantMode;
}

interface Preferences { fontSize: number; provider: string; model: string; mode: AssistantMode }
interface Configuration { model: string; provider: string; providers: { id: string; label: string; baseUrl: string }[] }
interface SessionState { dir: string; selectedId: string; openIds: string[]; sessions: AssistantSession[] }

const storageKey = (dir: string) => `thinking_os_assistant_sessions_v1:${dir}`;
const preferencesKey = 'thinking_os_assistant_preferences';
const projectsKey = 'thinking_os_assistant_projects_v1';

export function parseProjects(raw: string | null): string[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(dir => typeof dir === 'string' && dir.trim() && !dir.includes('\0'))) {
    throw new Error('Saved projects could not be read. Existing storage has not been overwritten.');
  }
  return [...new Set(value as string[])];
}

export function parseSessions(raw: string | null): { selectedId: string; openIds: string[]; sessions: AssistantSession[] } {
  if (!raw) return { selectedId: '', openIds: [], sessions: [] };
  const value = JSON.parse(raw);
  if (!value || typeof value.selectedId !== 'string' || !Array.isArray(value.sessions) ||
      (value.openIds !== undefined && (!Array.isArray(value.openIds) || !value.openIds.every((id: string) => typeof id === 'string'))) ||
      !value.sessions.every((session: AssistantSession) => session && typeof session.id === 'string' &&
        typeof session.title === 'string' && Array.isArray(session.messages) &&
        (session.mode === undefined || session.mode === 'chat' || session.mode === 'codex') &&
        [session.threadId, session.provider, session.model].every(field => field === undefined || typeof field === 'string') &&
        session.messages.every(entry => entry && typeof entry.id === 'string' && typeof entry.content === 'string' &&
          (entry.images === undefined || (Array.isArray(entry.images) && entry.images.length <= 4 && entry.images.every(isAssistantImage))) &&
          ['user', 'assistant'].includes(entry.role) &&
          (entry.kind === undefined || ['reasoning', 'command', 'tool', 'warning', 'plan', 'files'].includes(entry.kind)) &&
          (entry.label === undefined || typeof entry.label === 'string') &&
          (entry.durationMs === undefined || (typeof entry.durationMs === 'number' && Number.isFinite(entry.durationMs) && entry.durationMs >= 0)) &&
          (entry.state === undefined || ['running', 'complete', 'failed', 'stopped'].includes(entry.state))))) {
    throw new Error('Saved conversations could not be read. Existing storage has not been overwritten.');
  }
  const ids = value.sessions.map((session: AssistantSession) => session.id);
  const openIds = [...new Set<string>(value.openIds === undefined ? ids : value.openIds.filter((id: string) => ids.includes(id)))];
  return { ...value, selectedId: openIds.includes(value.selectedId) ? value.selectedId : openIds[0] || '', openIds,
    sessions: value.sessions.map((session: AssistantSession) => ({ ...session, messages: session.messages.map(entry => entry.state === 'running' ? { ...entry, state: 'stopped' } : entry) })) };
}

export function useCodexAssistant(defaultWorkspaceDir: string, beforeTurn?: (dir: string) => Promise<(() => Promise<void>) | undefined>) {
  const [projectState, setProjectState] = useState(() => {
    try { return { dirs: parseProjects(localStorage.getItem(projectsKey)), error: '' }; }
    catch { return { dirs: [] as string[], error: 'Saved projects could not be read. Existing storage has not been overwritten.' }; }
  });
  const [selectedProject, setSelectedProject] = useState({ workspace: defaultWorkspaceDir, dir: '' });
  const workspaceDir = selectedProject.workspace === defaultWorkspaceDir && projectState.dirs.includes(selectedProject.dir)
    ? selectedProject.dir : defaultWorkspaceDir;
  const projects = [defaultWorkspaceDir, ...projectState.dirs.filter(dir => dir !== defaultWorkspaceDir)];
  const [state, setState] = useState<SessionState>({ dir: '', selectedId: '', openIds: [], sessions: [] });
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  const [configuration, setConfiguration] = useState<Configuration>({ model: '', provider: '', providers: [] });
  const [configurationError, setConfigurationError] = useState('');
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(preferencesKey) || '{}');
      return { fontSize: Math.min(24, Math.max(11, Number(stored.fontSize) || 14)), provider: typeof stored.provider === 'string' ? stored.provider : '', model: typeof stored.model === 'string' ? stored.model : '', mode: stored.mode === 'codex' ? 'codex' : 'chat' };
    } catch { return { fontSize: 14, provider: '', model: '', mode: 'chat' }; }
  });
  const request = useRef<AbortController | null>(null);
  const invalidStorage = useRef(false);
  const session = state.sessions.find(entry => entry.id === state.selectedId);
  const mode = session ? session.mode ?? 'codex' : preferences.mode;

  function setMode(next: AssistantMode) {
    if (request.current || (next !== 'chat' && next !== 'codex')) return;
    setPreferences(previous => ({ ...previous, mode: next }));
    setState(previous => ({ ...previous, sessions: previous.sessions.map(entry => entry.id === previous.selectedId ? { ...entry, mode: next } : entry) }));
  }

  useEffect(() => { setSelectedProject({ workspace: defaultWorkspaceDir, dir: '' }); }, [defaultWorkspaceDir]);

  function selectProject(dir: string) {
    if (request.current || !projects.includes(dir)) return;
    setSelectedProject({ workspace: defaultWorkspaceDir, dir: dir === defaultWorkspaceDir ? '' : dir });
  }

  function saveProjects(dirs: string[]) {
    if (request.current || projectState.error) return false;
    try {
      const validated = parseProjects(JSON.stringify(dirs));
      localStorage.setItem(projectsKey, JSON.stringify(validated));
      setProjectState({ dirs: validated, error: '' });
      return true;
    } catch {
      setError('Projects could not be saved. Existing projects and conversations have been kept.');
      return false;
    }
  }

  function addProject(dir: string) {
    if (!saveProjects(dir === defaultWorkspaceDir ? projectState.dirs : [...projectState.dirs, dir])) return false;
    setSelectedProject({ workspace: defaultWorkspaceDir, dir: dir === defaultWorkspaceDir ? '' : dir });
    return true;
  }

  function removeProject(dir: string) {
    if (dir === defaultWorkspaceDir) return;
    saveProjects(projectState.dirs.filter(entry => entry !== dir));
  }

  async function reloadConfiguration() {
    try {
      const response = await fetch('/api/assistant');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setConfiguration(payload);
      setConfigurationError('');
    } catch (caught) { setConfigurationError(caught instanceof Error ? caught.message : String(caught)); }
  }

  useEffect(() => { void reloadConfiguration(); }, []);

  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setRunning(false);
    setError(null);
    setStorageWarning('');
    invalidStorage.current = false;
    try { setState({ dir: workspaceDir, ...parseSessions(localStorage.getItem(storageKey(workspaceDir))) }); }
    catch (caught) {
      invalidStorage.current = true;
      setState({ dir: workspaceDir, selectedId: '', openIds: [], sessions: [] });
      setStorageWarning(caught instanceof Error ? caught.message : String(caught));
    }
    return () => { request.current?.abort(); request.current = null; };
  }, [workspaceDir]);

  useEffect(() => {
    if (state.dir !== workspaceDir || invalidStorage.current) return;
    try { localStorage.setItem(storageKey(workspaceDir), JSON.stringify(state)); }
    catch { setStorageWarning('Conversation storage is full or unavailable. This chat is only saved in memory.'); }
  }, [state, workspaceDir]);

  useEffect(() => {
    try { localStorage.setItem(preferencesKey, JSON.stringify(preferences)); }
    catch { setStorageWarning('Assistant preferences could not be saved.'); }
  }, [preferences]);

  function newConversation() {
    if (request.current) return;
    if (!crypto.randomUUID) { setError('Open the app on localhost to use the assistant.'); return; }
    const created: AssistantSession = { id: crypto.randomUUID(), title: 'New conversation', messages: [], mode: preferences.mode, provider: preferences.provider.trim() || undefined, model: preferences.model.trim() || undefined };
    setState(previous => ({ ...previous, selectedId: created.id, openIds: [created.id, ...previous.openIds], sessions: [created, ...previous.sessions] }));
    setError(null);
    return created;
  }

  function selectSession(id: string) {
    if (request.current) return;
    setState(previous => previous.sessions.some(entry => entry.id === id)
      ? { ...previous, selectedId: id, openIds: previous.openIds.includes(id) ? previous.openIds : [...previous.openIds, id] } : previous);
    setError(null);
  }

  function closeSession(id: string) {
    if (request.current) return;
    setState(previous => {
      const index = previous.openIds.indexOf(id);
      if (index < 0) return previous;
      const openIds = previous.openIds.filter(entry => entry !== id);
      return { ...previous, openIds, selectedId: previous.selectedId === id ? openIds[Math.min(index, openIds.length - 1)] ?? '' : previous.selectedId };
    });
    setError(null);
  }

  function deleteSession(id: string) {
    if (request.current) return;
    closeSession(id);
    setState(previous => ({ ...previous, sessions: previous.sessions.filter(entry => entry.id !== id) }));
  }

  async function send(message: string, images: AssistantImage[] = []) {
    if (request.current || (!message.trim() && !images.length)) return;
    const current = session ?? newConversation();
    if (!current) return;
    const controller = new AbortController();
    request.current = controller;
    const turnId = crypto.randomUUID();
    const startedAt = performance.now();
    const update = (change: (previous: AssistantSession) => AssistantSession) => setState(previous => ({
      ...previous, sessions: previous.sessions.map(entry => entry.id === current.id ? change(entry) : entry)
    }));
    const upsert = (entry: ChatEntry) => update(previous => ({ ...previous, messages: previous.messages.some(item => item.id === entry.id)
      ? previous.messages.map(item => item.id === entry.id ? entry : item) : [...previous.messages, entry] }));
    update(previous => ({ ...previous, title: previous.messages.length ? previous.title : (message || images[0]?.name || 'Image').slice(0, 64), messages: [...previous.messages, { id: turnId, role: 'user', content: message, state: 'running', ...(images.length ? { images } : {}) }] }));
    setRunning(true);
    setError(null);
    setStatus('Connecting to Codex…');
    let completed = false;
    let afterTurn: (() => Promise<void>) | undefined;

    function receive(event: ThreadEvent) {
      if (request.current !== controller) return;
      if (event.type === 'error') throw new Error(event.message);
      if (event.type === 'turn.failed') throw new Error(event.error.message);
      if (event.type === 'thread.started') update(previous => ({ ...previous, threadId: event.thread_id }));
      if (event.type === 'turn.completed') completed = true;
      if (event.type === 'turn.started') setStatus('Thinking…');
      if (event.type !== 'item.started' && event.type !== 'item.updated' && event.type !== 'item.completed') return;
      const item = event.item;
      const entry: ChatEntry = { id: `${turnId}:${item.id}`, role: 'assistant', content: '', state: event.type === 'item.completed' ? 'complete' : 'running' };
      switch (item.type) {
        case 'agent_message': entry.content = item.text; setStatus('Responding…'); break;
        case 'reasoning': entry.kind = 'reasoning'; entry.label = 'Reasoning summary'; entry.content = item.text; setStatus('Thinking…'); break;
        case 'error': entry.kind = 'warning'; entry.label = 'Provider notice'; entry.content = item.message; break;
        case 'command_execution':
          entry.kind = 'command'; entry.label = item.command; entry.content = item.aggregated_output;
          entry.state = item.status === 'in_progress' ? 'running' : item.status === 'failed' ? 'failed' : 'complete';
          setStatus(item.status === 'in_progress' ? 'Running command…' : 'Thinking…'); break;
        case 'mcp_tool_call':
          entry.kind = 'tool'; entry.label = `${item.server} · ${item.tool}`;
          entry.content = item.error?.message || JSON.stringify(item.result ?? item.arguments, null, 2);
          entry.state = item.status === 'in_progress' ? 'running' : item.status === 'failed' ? 'failed' : 'complete';
          setStatus('Using a tool…'); break;
        case 'web_search': entry.kind = 'tool'; entry.label = 'Web search'; entry.content = item.query; setStatus('Searching…'); break;
        case 'file_change': entry.kind = 'files'; entry.label = 'File changes'; entry.content = item.changes.map(change => `${change.kind}: ${change.path}`).join('\n'); break;
        case 'todo_list': entry.kind = 'plan'; entry.label = 'Plan'; entry.content = item.items.map(todo => `${todo.completed ? '✓' : '○'} ${todo.text}`).join('\n'); break;
      }
      upsert(entry);
    }

    try {
      setStatus('Saving workspace…');
      afterTurn = await beforeTurn?.(workspaceDir);
      if (controller.signal.aborted) throw new Error('Stopped.');
      setStatus('Connecting to Codex…');
      const response = await fetch('/api/assistant', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agent: 'codex', mode: current.mode ?? 'codex', dir: workspaceDir, conversationId: current.id, threadId: current.threadId, provider: current.provider, model: current.model, message, ...(images.length ? { images } : {}) }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error((await response.json()).error || `Assistant request failed (${response.status}).`);
      if (!response.body) throw new Error('The assistant returned no stream.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) if (line.trim()) receive(JSON.parse(line));
        if (done) break;
      }
      if (buffer.trim()) receive(JSON.parse(buffer));
      if (!completed) throw new Error('Disconnected before completion. Try again.');
    } catch (caught) {
      if (request.current === controller) setError(controller.signal.aborted ? 'Stopped.' : caught instanceof Error ? caught.message : String(caught));
    } finally {
      const turnState = completed ? 'complete' : controller.signal.aborted ? 'stopped' : 'failed';
      controller.abort();
      if (afterTurn) {
        setStatus('Refreshing workspace…');
        try { await afterTurn(); }
        catch (caught) { setError(`Workspace refresh failed: ${caught instanceof Error ? caught.message : String(caught)}`); }
      }
      const durationMs = Math.round(performance.now() - startedAt);
      if (request.current === controller) {
        update(previous => ({ ...previous, messages: previous.messages.map(entry => entry.id === turnId
          ? { ...entry, state: turnState, durationMs }
          : entry.id.startsWith(`${turnId}:`) && entry.state === 'running' ? { ...entry, state: completed ? 'complete' : 'stopped' } : entry) }));
        request.current = null;
        setRunning(false);
        setStatus('');
      }
    }
  }

  return { projects, projectDir: workspaceDir, projectWarning: projectState.error, selectProject, addProject, removeProject, sessions: state.sessions, openSessions: state.openIds.map(id => state.sessions.find(entry => entry.id === id)).filter((entry): entry is AssistantSession => Boolean(entry)), session, messages: session?.messages ?? [], running, status, error, storageWarning, send, newConversation, selectSession, closeSession, deleteSession, stop: () => request.current?.abort(), preferences, setPreferences, mode, setMode, configuration, configurationError, reloadConfiguration };
}
