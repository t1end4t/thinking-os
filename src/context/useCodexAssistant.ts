import { useEffect, useRef, useState } from 'react';
import type { ThreadEvent } from '@openai/codex-sdk';

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: 'reasoning' | 'command' | 'tool' | 'warning' | 'plan' | 'files';
  label?: string;
  state?: 'running' | 'complete' | 'failed' | 'stopped';
}

export interface AssistantSession {
  id: string;
  title: string;
  messages: ChatEntry[];
  threadId?: string;
  provider?: string;
  model?: string;
}

interface Preferences { fontSize: number; provider: string; model: string }
interface Configuration { model: string; provider: string; providers: { id: string; label: string; baseUrl: string }[] }
interface SessionState { dir: string; selectedId: string; sessions: AssistantSession[] }

const storageKey = (dir: string) => `thinking_os_assistant_sessions_v1:${dir}`;
const preferencesKey = 'thinking_os_assistant_preferences';

export function parseSessions(raw: string | null): { selectedId: string; sessions: AssistantSession[] } {
  if (!raw) return { selectedId: '', sessions: [] };
  const value = JSON.parse(raw);
  if (!value || typeof value.selectedId !== 'string' || !Array.isArray(value.sessions) ||
      !value.sessions.every((session: AssistantSession) => session && typeof session.id === 'string' &&
        typeof session.title === 'string' && Array.isArray(session.messages) &&
        [session.threadId, session.provider, session.model].every(field => field === undefined || typeof field === 'string') &&
        session.messages.every(entry => entry && typeof entry.id === 'string' && typeof entry.content === 'string' &&
          ['user', 'assistant'].includes(entry.role) &&
          (entry.kind === undefined || ['reasoning', 'command', 'tool', 'warning', 'plan', 'files'].includes(entry.kind)) &&
          (entry.label === undefined || typeof entry.label === 'string') &&
          (entry.state === undefined || ['running', 'complete', 'failed', 'stopped'].includes(entry.state))))) {
    throw new Error('Saved conversations could not be read. Existing storage has not been overwritten.');
  }
  return { ...value, selectedId: value.sessions.some((session: AssistantSession) => session.id === value.selectedId) ? value.selectedId : value.sessions[0]?.id || '',
    sessions: value.sessions.map((session: AssistantSession) => ({ ...session, messages: session.messages.map(entry => entry.state === 'running' ? { ...entry, state: 'stopped' } : entry) })) };
}

export function useCodexAssistant(workspaceDir: string) {
  const [state, setState] = useState<SessionState>({ dir: '', selectedId: '', sessions: [] });
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  const [configuration, setConfiguration] = useState<Configuration>({ model: '', provider: '', providers: [] });
  const [configurationError, setConfigurationError] = useState('');
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(preferencesKey) || '{}');
      return { fontSize: Math.min(24, Math.max(11, Number(stored.fontSize) || 14)), provider: typeof stored.provider === 'string' ? stored.provider : '', model: typeof stored.model === 'string' ? stored.model : '' };
    } catch { return { fontSize: 14, provider: '', model: '' }; }
  });
  const request = useRef<AbortController | null>(null);
  const invalidStorage = useRef(false);
  const session = state.sessions.find(entry => entry.id === state.selectedId);

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
      setState({ dir: workspaceDir, selectedId: '', sessions: [] });
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
    const created: AssistantSession = { id: crypto.randomUUID(), title: 'New conversation', messages: [], provider: preferences.provider.trim() || undefined, model: preferences.model.trim() || undefined };
    setState(previous => ({ ...previous, selectedId: created.id, sessions: [created, ...previous.sessions] }));
    setError(null);
    return created;
  }

  function selectSession(id: string) {
    if (request.current) return;
    setState(previous => ({ ...previous, selectedId: id }));
    setError(null);
  }

  async function send(message: string) {
    if (request.current || !message.trim()) return;
    const current = session ?? newConversation();
    if (!current) return;
    const controller = new AbortController();
    request.current = controller;
    const turnId = crypto.randomUUID();
    const update = (change: (previous: AssistantSession) => AssistantSession) => setState(previous => ({
      ...previous, sessions: previous.sessions.map(entry => entry.id === current.id ? change(entry) : entry)
    }));
    const upsert = (entry: ChatEntry) => update(previous => ({ ...previous, messages: previous.messages.some(item => item.id === entry.id)
      ? previous.messages.map(item => item.id === entry.id ? entry : item) : [...previous.messages, entry] }));
    update(previous => ({ ...previous, title: previous.messages.length ? previous.title : message.slice(0, 64), messages: [...previous.messages, { id: turnId, role: 'user', content: message }] }));
    setRunning(true);
    setError(null);
    setStatus('Connecting to Codex…');
    let completed = false;

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
      const response = await fetch('/api/assistant', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agent: 'codex', dir: workspaceDir, conversationId: current.id, threadId: current.threadId, provider: current.provider, model: current.model, message }),
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
      controller.abort();
      if (request.current === controller) {
        update(previous => ({ ...previous, messages: previous.messages.map(entry => entry.id.startsWith(`${turnId}:`) && entry.state === 'running' ? { ...entry, state: completed ? 'complete' : 'stopped' } : entry) }));
        request.current = null;
        setRunning(false);
        setStatus('');
      }
    }
  }

  return { sessions: state.sessions, session, messages: session?.messages ?? [], running, status, error, storageWarning, send, newConversation, selectSession, stop: () => request.current?.abort(), preferences, setPreferences, configuration, configurationError, reloadConfiguration };
}
