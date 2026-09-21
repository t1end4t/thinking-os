import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen, CheckCircle2, ChevronDown, CornerDownLeft, FileText, FlaskConical, HelpCircle,
  Layers, Link as LinkIcon, ListChecks, Loader2, Maximize2, MessageCircle, MessageSquarePlus, Minimize2, Search,
  Sparkles, Square, Terminal, TriangleAlert, X, Paperclip, History, Trash2, ImagePlus, Pencil, Bot
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AssistantContextObject } from '../../types';
import { MarkdownPreview } from '../runtime/MarkdownPreview';
import { CopyButton } from '../runtime/CopyButton';
import { isAssistantImage, type AssistantImage, type AssistantTurnContext, type ChatEntry } from '../../context/useCodexAssistant';
import { AssistantProjects } from './AssistantProjects';
import { AssistantModeMenu } from './AssistantModeMenu';
import { AssistantScoutCard } from './AssistantScoutCard';
import { SampleAgentRunDemo } from './SampleAgentRunDemo';
import { useScouts } from '../../context/useScouts';
import './assistant.css';

const ContextIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-3 h-3' }) => {
  if (type === 'node') return <HelpCircle className={className} />;
  if (type === 'link') return <LinkIcon className={className} />;
  if (type === 'passage') return <BookOpen className={className} />;
  if (type === 'artifact') return <FlaskConical className={className} />;
  if (type === 'survey') return <Layers className={className} />;
  return <FileText className={className} />;
};

function turnContext(context: AssistantContextObject): AssistantTurnContext {
  const metadata = context.metadata;
  const sourceId = [metadata?.sourceId, metadata?.nodeId, metadata?.linkId, metadata?.paperId, metadata?.taskId, metadata?.unitId]
    .find((value): value is string => typeof value === 'string' && Boolean(value.trim()));
  const excerpt = [metadata?.excerpt, metadata?.passage, metadata?.latex]
    .find((value): value is string => typeof value === 'string' && Boolean(value.trim()));
  return {
    type: context.type,
    id: context.id,
    label: context.label,
    ...(context.secondaryLabel ? { secondaryLabel: context.secondaryLabel } : {}),
    ...(sourceId ? { sourceId } : {}),
    ...(typeof metadata?.nodeType === 'string' ? { kind: metadata.nodeType } : {}),
    ...(excerpt ? { excerpt: excerpt.slice(0, 4_000) } : {})
  };
}

export function shellCommand(command: string): string {
  const text = command.trim();
  const wrapped = /^(?:\S*\/)?(?:ba|z|k)?sh\b\s+(?:-\S+\s+)*(?:-[lic]*c[lic]*)\s+(['"])([\s\S]*)\1\s*$/.exec(text);
  return (wrapped ? wrapped[2] : text).trim();
}

export function shellSummary(command: string): string {
  const inner = shellCommand(command);
  const firstLine = inner.split('\n')[0].trim();
  const collapsed = firstLine.replace(/\s+/g, ' ');
  const multiple = /\n/.test(inner) || /[;&|]/.test(inner);
  const truncated = collapsed.length > 64 ? `${collapsed.slice(0, 63)}…` : collapsed;
  return multiple && !truncated.endsWith('…') ? `${truncated} …` : truncated || command.trim();
}

const ActivityIcon: React.FC<{ kind: ChatEntry['kind'] }> = ({ kind }) => {
  const className = 'w-3 h-3 shrink-0';
  if (kind === 'command') return <Terminal className={className} />;
  if (kind === 'tool') return <Search className={className} />;
  if (kind === 'plan') return <ListChecks className={className} />;
  if (kind === 'files') return <FileText className={className} />;
  if (kind === 'warning') return <TriangleAlert className={className} />;
  return <Sparkles className={className} />;
};

const ActivityEntry: React.FC<{ entry: ChatEntry }> = ({ entry }) => {
  const [open, setOpen] = useState(false);
  const failed = entry.state === 'failed';
  const content = entry.content.trim();
  const shell = entry.kind === 'command';
  const summary = shell ? shellSummary(entry.label ?? '') : entry.label;
  const expandable = shell || Boolean(content);
  const status = entry.state === 'complete' ? 'Success' : entry.state === 'running' ? 'Running…'
    : entry.state === 'stopped' ? 'Stopped' : failed ? 'Failed' : '';
  if (entry.kind === 'warning') return (
    <div className="assistant-activity-entry flex items-start gap-1.5 text-[0.75rem]">
      <TriangleAlert className="w-3 h-3 shrink-0 mt-0.5" aria-hidden />
      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{content || entry.label}</p>
    </div>
  );
  return (
    <div className={`assistant-activity-entry min-w-0 text-[0.75rem] ${failed ? 'text-rose-600 dark:text-rose-300' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        disabled={!expandable}
        className="w-full flex items-center gap-1.5 py-1.5 text-left text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:cursor-default"
      >
        <ActivityIcon kind={entry.kind} />
        <span className="truncate flex-1" title={entry.label}>{shell ? `${entry.state === 'running' ? 'Running' : 'Ran'} ${summary}` : summary}</span>
        {!shell && entry.state && <span className="assistant-activity-state">{entry.state === 'running' ? 'in progress' : entry.state}</span>}
        {expandable && <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && content && !shell && (
        <pre className="font-mono px-2.5 pb-2 pt-0.5 max-h-56 overflow-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[var(--color-ink)]">{content}</pre>
      )}
      {open && shell && (
        <div className="assistant-activity-shell">
          <pre className="assistant-activity-shell-command"><span aria-hidden>$ </span>{shellCommand(entry.label ?? '')}</pre>
          {content && <pre className="assistant-activity-shell-output">{content}</pre>}
          {status && <p className="assistant-activity-shell-status">
            {entry.state === 'complete' && <CheckCircle2 className="w-3 h-3" aria-hidden />}
            {failed && <TriangleAlert className="w-3 h-3" aria-hidden />}
            {status}
          </p>}
        </div>
      )}
    </div>
  );
};

const ActivityGroup: React.FC<{ entries: ChatEntry[]; prompt?: ChatEntry; mode: 'chat' | 'codex' }> = ({ entries, prompt, mode }) => {
  const visibleEntries = mode === 'chat' ? entries.filter(entry => !entry.kind || entry.kind === 'warning') : entries;
  if (!visibleEntries.length) return null;
  const label = prompt?.state === 'running' ? (mode === 'chat' ? 'Thinking' : 'View steps')
    : prompt?.state === 'stopped' ? 'Stopped'
    : prompt?.state === 'failed' ? 'Failed'
    : prompt?.durationMs === undefined ? (mode === 'chat' ? 'Thought process' : 'View steps')
      : `${mode === 'chat' ? 'Thought' : 'Worked'} for ${Math.max(1, Math.round(prompt.durationMs / 1000))}s`;
  return (
    <details open={prompt?.state === 'running'} className="assistant-activity-group text-[0.75rem] text-[var(--color-ink-muted)]">
      <summary>
        {label}<ChevronDown className="w-3 h-3" aria-hidden />
      </summary>
      <div className="flex min-w-0 flex-col gap-4 pt-4">
        {visibleEntries.map(entry => entry.kind
          ? <ActivityEntry key={entry.id} entry={entry} />
          : <MarkdownPreview key={entry.id} content={entry.content} className="assistant-markdown" />
        )}
      </div>
    </details>
  );
};

export const AssistantDock: React.FC = () => {
  const {
    isDockOpen, setIsDockOpen, dockWidth, setDockWidth, dockPosition, workspaceDir, workspaceLoading,
    attachedContexts, addAttachedContext, removeAttachedContext, clearAttachedContexts, activeContext, codexAssistant, openScoutReport
  } = useWorkspace();
  const {
    sessions, openSessions, session, messages, running, status, error, storageWarning,
    send, newConversation, selectSession, closeSession, deleteSession, stop, preferences, projectDir, mode, setMode
  } = codexAssistant;
  const scouts = useScouts(projectDir);

  const [input, setInput] = useState('');
  const [images, setImages] = useState<AssistantImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const imageRequest = useRef<AbortController | null>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [resizing, setResizing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState('');
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const followTranscript = useRef(true);
  const tabs = useRef<HTMLDivElement>(null);
  const historyDialog = useRef<HTMLDialogElement>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [showSampleCard, setShowSampleCard] = useState(true);

  useEffect(() => { tabs.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [session?.id]);

  useEffect(() => { if (followTranscript.current) transcriptEnd.current?.scrollIntoView({ block: 'nearest' }); }, [messages, status, isDockOpen]);
  useEffect(() => { followTranscript.current = true; setInput(''); transcriptEnd.current?.scrollIntoView({ block: 'nearest' }); }, [session?.id]);
  useEffect(() => { if (messages.some(entry => entry.scout)) void scouts.refresh(); }, [messages, scouts.refresh]);
  useEffect(() => { setInput(''); historyDialog.current?.close(); }, [workspaceDir, projectDir]);
  useEffect(() => {
    imageRequest.current?.abort();
    imageRequest.current = null;
    setImages([]);
    setUploading(false);
    setAttachmentError('');
    return () => { imageRequest.current?.abort(); };
  }, [session?.id, projectDir]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!resizing) return;
    const move = (event: MouseEvent) => {
      const rail = 4 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      const width = dockPosition === 'left' ? event.clientX - rail : window.innerWidth - event.clientX;
      setDockWidth(Math.min(Math.max(width, 320), window.innerWidth - rail));
    };
    const finish = () => setResizing(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', finish);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', finish);
    };
  }, [resizing, dockPosition, setDockWidth]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const contexts = mode === 'chat' ? attachedContexts.map(turnContext) : [];
    if ((!input.trim() && !images.length && !contexts.length) || running || uploading || workspaceLoading) return;
    followTranscript.current = true;
    void send(input.trim(), images, contexts);
    setInput('');
    setImages([]);
    setAttachmentError('');
    if (contexts.length) clearAttachedContexts();
  }

  function editQuestion(prompt: ChatEntry) {
    if (running || uploading) return;
    if ((input.trim() || images.length) && !window.confirm('Replace your current draft with this question? Saved conversation history stays unchanged.')) return;
    setInput(prompt.content);
    setImages(prompt.images ?? []);
    setAttachmentError('');
    setToast('Question copied into the composer. Sending creates a new message.');
    composer.current?.focus();
  }

  async function attachImages(files: File[]) {
    if (!files.length || running || workspaceLoading || imageRequest.current) return;
    const validation = images.length + files.length > 4 ? 'Attach up to 4 images per message.'
      : files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) ? 'Use PNG, JPEG, or WebP images.'
      : files.some(file => !file.size || file.size > 5 * 1024 * 1024) ? 'Images must be non-empty and 5 MiB or smaller.' : '';
    setAttachmentError(validation);
    if (validation) return;
    const controller = new AbortController();
    imageRequest.current = controller;
    setUploading(true);
    try {
      for (const file of files) {
        const response = await fetch('/api/assistant/images', {
          method: 'POST', headers: { 'content-type': file.type }, body: file, signal: controller.signal
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not upload image. Try again.');
        const image = { id: payload.id, name: (file.name || 'Clipboard image').slice(0, 255) };
        if (!isAssistantImage(image)) throw new Error('The server returned an invalid image. Try again.');
        if (controller.signal.aborted) return;
        setImages(previous => previous.some(entry => entry.id === image.id) ? previous : [...previous, image]);
      }
    } catch (caught) {
      if (!controller.signal.aborted) setAttachmentError(caught instanceof Error ? caught.message : 'Could not upload image. Try again.');
    } finally {
      if (imageRequest.current === controller) { imageRequest.current = null; setUploading(false); }
    }
  }

  function removeConversation(id: string, title: string) {
    if (running || !window.confirm(`Delete conversation “${title}”? This removes its saved chat history and cannot be undone.`)) return;
    deleteSession(id);
    requestAnimationFrame(() => {
      if (historyDialog.current?.open) historyDialog.current.querySelector('input')?.focus();
      else tabs.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    });
  }

  function closeTab(id: string) {
    closeSession(id);
    requestAnimationFrame(() => tabs.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
  }

  function navigateTabs(event: React.KeyboardEvent<HTMLDivElement>) {
    if (running || !(event.target instanceof HTMLElement) || event.target.getAttribute('role') !== 'tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length
      : event.key === 'ArrowLeft' ? (index - 1 + buttons.length) % buttons.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    buttons[next].click();
    buttons[next].focus();
  }

  function drop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length) { void attachImages(Array.from(event.dataTransfer.files)); return; }
    const payload = event.dataTransfer.getData('application/json');
    if (payload) {
      try {
        const parsed: AssistantContextObject = JSON.parse(payload);
        if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string' || !parsed.id.trim() || typeof parsed.label !== 'string' || !parsed.label.trim() || typeof parsed.type !== 'string') throw new Error('Invalid attachment');
        if (mode === 'codex') {
          if (running) { setToast('Wait for the current turn to finish before attaching.'); return; }
          setMode('chat');
        }
        addAttachedContext(parsed);
        setToast(mode === 'codex' ? `Switched to Chat and attached ${parsed.label}` : `Attached ${parsed.label}`);
        return;
      } catch { setToast('Could not attach this item.'); }
    }
    const text = event.dataTransfer.getData('text/plain');
    if (!text) return;
    if (mode === 'codex') { setToast('Switch to Chat to attach app objects.'); return; }
    addAttachedContext({ type: 'passage', id: `drop-${Date.now()}`, label: `${text.slice(0, 40)}${text.length > 40 ? '…' : ''}`, secondaryLabel: 'Dropped selection' });
    setToast('Attached snippet');
  }

  if (!isDockOpen) return null;
  const iconButton = 'p-1.5 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors';
  const turns: { id: string; prompt?: ChatEntry; entries: ChatEntry[]; reply?: ChatEntry }[] = [];
  for (const entry of messages) {
    if (entry.role === 'user') turns.push({ id: entry.id, prompt: entry, entries: [] });
    else {
      if (!turns.length) turns.push({ id: entry.id, entries: [] });
      turns[turns.length - 1].entries.push(entry);
    }
  }
  for (const turn of turns) {
    if (!turn.prompt?.state || turn.prompt.state === 'complete') turn.reply = turn.entries.filter(entry => !entry.kind).at(-1);
  }

  return (
    <aside
      id="instrument-assistant-dock"
      aria-label="Assistant"
      style={{ width: isFullScreen ? '100vw' : `min(${dockWidth}px, calc(100vw - 4rem))`, '--assistant-font-size': `${preferences.fontSize}px` } as React.CSSProperties}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; if (!dragOver) setDragOver(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false); }}
      onDrop={drop}
      className={`assistant-dock flex flex-col min-w-0 bg-[var(--color-surface)] text-[var(--color-ink)] ${isFullScreen ? 'fixed inset-0 z-[60] h-screen w-screen' : `relative z-30 h-full shrink-0 ${dockPosition === 'left' ? 'border-r' : 'border-l'} border-[var(--color-rule)]`} ${dragOver ? 'ring-2 ring-[var(--accent-indigo)]/40' : ''}`}
    >
      {!isFullScreen && (
        <div
          onMouseDown={event => { event.preventDefault(); setResizing(true); }}
          title="Drag to resize panel"
          className={`absolute top-0 bottom-0 w-2 cursor-ew-resize z-40 hover:bg-[var(--accent-indigo)]/30 ${dockPosition === 'left' ? 'right-0' : 'left-0'}`}
        />
      )}

      {toast && (
        <div className="absolute top-12 left-3 right-3 z-50 flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-2.5 py-2 text-[0.75rem] text-[var(--color-surface)] shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      <header className="assistant-dock-header flex items-center gap-1 border-b border-[var(--color-rule)] px-2 py-1.5">
        <AssistantProjects key={workspaceDir} />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSampleCard(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1 text-[0.6875rem] rounded border transition-colors ${
              showSampleCard
                ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)] font-semibold'
                : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
            title="Toggle Agent Run Card Sample Preview"
            aria-pressed={showSampleCard}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Sample Card</span>
          </button>
          <button type="button" className={iconButton} onClick={() => { setHistorySearch(''); historyDialog.current?.showModal(); historyDialog.current?.querySelector('input')?.focus(); }} aria-label="Browse conversations" aria-haspopup="dialog" title="Browse conversations"><History className="w-3.5 h-3.5" /></button>
          <button type="button" className={iconButton} onClick={() => newConversation()} disabled={running} aria-label="New conversation" title="New conversation"><MessageSquarePlus className="w-3.5 h-3.5" /></button>
          <button type="button" className={iconButton} onClick={() => setIsFullScreen(current => !current)} aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'} aria-pressed={isFullScreen} title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button type="button" id="assistant-dock-close-btn" className={iconButton} onClick={() => setIsDockOpen(false)} aria-label="Close Assistant Panel"><X className="w-4 h-4" /></button>
        </div>
      </header>

      <dialog ref={historyDialog} aria-labelledby="assistant-history-title" className="assistant-history">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-rule)] p-3">
          <h2 id="assistant-history-title" className="text-xs font-semibold">Conversations</h2>
          <button type="button" className={iconButton} aria-label="Close conversations" onClick={() => historyDialog.current?.close()}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <input aria-label="Search conversations" placeholder="Search conversations…" value={historySearch} onChange={event => setHistorySearch(event.target.value)} className="w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs" />
          <button type="button" disabled={running} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.75rem] hover:bg-[var(--accent-indigo-soft)]" onClick={() => { newConversation(); historyDialog.current?.close(); }}><MessageSquarePlus className="w-4 h-4" />New conversation</button>
        </div>
        <div className="min-h-0 overflow-y-auto px-3 pb-3">
          {sessions.filter(entry => entry.title.toLocaleLowerCase().includes(historySearch.trim().toLocaleLowerCase())).map(entry => (
            <div key={entry.id} className={`flex items-center gap-1 rounded-md ${entry.id === session?.id ? 'bg-[var(--accent-indigo-soft)]' : ''}`}>
              <button type="button" disabled={running} aria-label={`Open conversation: ${entry.title}`} aria-current={entry.id === session?.id ? 'true' : undefined} className="min-w-0 flex-1 rounded-md px-2 py-2 text-left text-xs hover:bg-[var(--accent-indigo-soft)]" onClick={() => { selectSession(entry.id); historyDialog.current?.close(); }}><span className="block break-words">{entry.title}</span></button>
              <button type="button" disabled={running} className={iconButton} aria-label={`Delete conversation: ${entry.title}`} onClick={() => removeConversation(entry.id, entry.title)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {!sessions.some(entry => entry.title.toLocaleLowerCase().includes(historySearch.trim().toLocaleLowerCase())) && <p className="px-2 py-3 text-[0.75rem] text-[var(--color-ink-muted)]">{sessions.length ? 'No matching conversations.' : 'No saved conversations yet.'}</p>}
        </div>
      </dialog>

      <div className="border-b border-[var(--color-rule)] px-2 py-1 text-[0.6875rem] text-[var(--color-ink-muted)]">
        <div ref={tabs} role="tablist" aria-label="Conversations" className="assistant-conversation-tabs" onKeyDown={navigateTabs}>
          {openSessions.map(entry => (
            <div key={entry.id} role="presentation" className="assistant-conversation-tab">
              <button type="button" role="tab" id={`assistant-tab-${entry.id}`} aria-controls="assistant-conversation-panel" aria-selected={entry.id === session?.id} tabIndex={entry.id === session?.id ? 0 : -1} disabled={running} title={entry.title} onClick={() => selectSession(entry.id)}>{entry.title}</button>
              <button type="button" className="assistant-conversation-close" disabled={running} aria-label={`Close conversation: ${entry.title}`} title="Close conversation (history is kept)" onClick={() => closeTab(entry.id)}><X className="w-3 h-3" aria-hidden /></button>
            </div>
          ))}
          {!openSessions.length && <button type="button" role="tab" id="assistant-tab-new" aria-controls="assistant-conversation-panel" aria-selected="true" onClick={() => newConversation()}>New conversation</button>}
        </div>
      </div>

      <div id="assistant-conversation-panel" role="tabpanel" aria-labelledby={`assistant-tab-${session?.id ?? 'new'}`} className="flex min-h-0 flex-1 flex-col">
      <div id="assistant-transcript-list" role="log" aria-label="Assistant conversation" onScroll={event => { const target = event.currentTarget; followTranscript.current = target.scrollHeight - target.scrollTop - target.clientHeight < 64; }} className={`assistant-transcript relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 select-text ${isFullScreen ? 'assistant-fullscreen-gutters' : ''}`}>
        {dragOver && (
          <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--accent-indigo)] bg-[var(--color-surface)]/90 p-6 text-center">
            <Sparkles className="w-6 h-6 text-[var(--accent-indigo)]" aria-hidden />
            <p className="text-xs font-semibold text-[var(--color-ink)]">Drop images or research context</p>
          </div>
        )}

        {showSampleCard && (
          <SampleAgentRunDemo
            onClose={() => setShowSampleCard(false)}
            onOpenFullReportModal={report => openScoutReport(report.id)}
          />
        )}

        {!messages.length && (
          <div className="my-auto shrink-0 py-6 text-center text-[var(--color-ink-muted)]">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)]"><Sparkles className="w-5 h-5" /></div>
            <p className="mb-1 text-xs font-semibold text-[var(--color-ink)]">Start a conversation</p>
            <p className="mx-auto max-w-[260px] text-[0.8125rem] leading-relaxed">{mode === 'chat' ? 'Think with your vault, test ideas, and update research objects.' : 'Inspect files, make changes, and check the result.'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!showSampleCard && (
                <button type="button" onClick={() => setShowSampleCard(true)} className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] px-2.5 py-1.5 text-[0.75rem] font-semibold text-[var(--accent-indigo)] hover:bg-[var(--accent-indigo)] hover:text-white transition-colors">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Test Agent Run Card Sample</span>
                </button>
              )}
              <button type="button" onClick={() => setInput(mode === 'chat' ? 'Review my current research and identify the most important open question.' : 'Explore this folder and explain how it is organized.')} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-[0.75rem] hover:text-[var(--color-ink)]">{mode === 'chat' ? 'Find the open question' : 'Explore this folder'}</button>
              <button type="button" onClick={() => setInput(mode === 'chat' ? 'Help me decide the smallest useful next step.' : 'Help me plan a task. Ask what I want to accomplish first.')} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-[0.75rem] hover:text-[var(--color-ink)]">{mode === 'chat' ? 'Choose next step' : 'Plan a task'}</button>
            </div>
            <p className="mt-4 text-[0.6875rem]">{mode === 'chat' ? 'Drop an object here. Chat searches its vault record before responding.' : 'Codex receives your prompt unchanged.'}</p>
          </div>
        )}

        {turns.map(turn => (
          <React.Fragment key={turn.id}>
            {turn.prompt && <div className="flex flex-col items-end gap-1">
              <span className="px-1 text-[0.6875rem] text-[var(--color-ink-muted)]">You</span>
              {turn.prompt.images?.length ? <div className="assistant-images" aria-label="Sent images">
                {turn.prompt.images.map(image => <a key={image.id} href={`/api/assistant/images/${image.id}`} target="_blank" rel="noopener noreferrer" title={`Open ${image.name}`}>
                  <img src={`/api/assistant/images/${image.id}`} alt={image.name} loading="lazy" />
                </a>)}
              </div> : null}
              {turn.prompt.contexts?.length ? <div className="assistant-images" aria-label="Sent context">
                {turn.prompt.contexts.map(context => <div key={`${context.type}:${context.id}`} className="assistant-context-card" title={context.secondaryLabel ? `${context.label} · ${context.secondaryLabel}` : context.label}>
                  <ContextIcon type={context.type} className="w-3.5 h-3.5 shrink-0 text-[var(--accent-indigo)]" />
                  <span className="assistant-context-card-label">{context.label}</span>
                  {context.secondaryLabel && <span className="assistant-context-card-meta">{context.secondaryLabel}</span>}
                </div>)}
              </div> : null}
              {turn.prompt.content && <p className="assistant-user-message max-w-[92%] whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl rounded-tr-xs px-3 py-2 text-xs leading-relaxed">{turn.prompt.content}</p>}
              <div className="flex items-center gap-1">
                <CopyButton value={turn.prompt.content} label="Copy question" />
                <button type="button" aria-label="Edit question" title="Edit a copy of this question" disabled={running || uploading} className={iconButton} onClick={() => editQuestion(turn.prompt!)}><Pencil className="w-3.5 h-3.5" /></button>
              </div>
            </div>}
            <ActivityGroup entries={turn.entries.filter(entry => entry !== turn.reply && entry.kind !== 'scout')} prompt={turn.prompt} mode={mode} />
            {turn.entries.filter(entry => (entry.kind === 'scout' && entry.scout) || Boolean(entry.agentRun?.briefId)).map(entry => {
              const briefId = entry.scout?.briefId || entry.agentRun?.briefId;
              const brief = scouts.snapshot?.briefs.find(item => item.id === briefId);
              if (!brief) return <p key={entry.id} className="text-[0.75rem] text-[var(--color-ink-muted)]">Loading agent run card…</p>;
              const run = [...(scouts.snapshot?.runs ?? [])].filter(item => item.source.kind === 'brief' && item.source.id === brief.id).sort((first, second) => second.startedAt - first.startedAt)[0];
              const report = run?.reportId ? scouts.snapshot?.reports.find(item => item.id === run.reportId) : undefined;
              return <AssistantScoutCard key={entry.id} brief={brief} run={run} report={report} busy={scouts.busy !== null}
                agentTitle={entry.agentRun?.title || 'Literature Scout Agent'}
                onSave={input => scouts.saveBrief(brief.id, input)} onRun={() => scouts.startRun(brief.id)}
                onCancel={() => run ? scouts.cancelRun(run.id) : Promise.resolve(false)} onOpenReport={() => report && openScoutReport(report.id)} />;
            })}
            {turn.reply && (
              <div className="w-full min-w-0 px-1 [&_*]:break-words [&_*]:[overflow-wrap:anywhere]">
                <MarkdownPreview content={turn.reply.content} className="assistant-markdown" />
                <div className="mt-2"><CopyButton value={turn.reply.content} label="Copy response" /></div>
              </div>
            )}
          </React.Fragment>
        ))}

        {running && status !== 'Responding…' && (
          <div role="status" className="flex items-center gap-1.5 px-1 text-[0.6875rem] text-[var(--color-ink-muted)]">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            <span className="truncate" title={status}>{status || 'Waiting for response…'}</span>
          </div>
        )}
        <div ref={transcriptEnd} hidden={!messages.length && !running} />
      </div>

      {(error || storageWarning) && (
        <div role="alert" className="border-t border-[var(--color-rule)] px-3 py-2 text-[0.75rem] break-words text-[var(--color-ink)]">
          {error || storageWarning}
        </div>
      )}

      <form onSubmit={submit} className={`flex flex-col gap-2 border-t border-[var(--color-rule)] p-3 ${isFullScreen ? 'assistant-fullscreen-gutters' : ''}`}>
        {(images.length > 0 || attachedContexts.length > 0) && <div className="assistant-images" aria-label="Attachments">
          {images.map(image => <div key={image.id} className="relative">
            <img src={`/api/assistant/images/${image.id}`} alt={image.name} />
            <button type="button" className="absolute right-0 top-0 rounded bg-[var(--color-surface)] p-1" aria-label={`Remove image ${image.name}`} onClick={() => setImages(previous => previous.filter(entry => entry.id !== image.id))}><X className="w-3 h-3" /></button>
          </div>)}
          {attachedContexts.map(context => (
            <div key={context.id} className="assistant-context-card" title={context.secondaryLabel ? `${context.label} · ${context.secondaryLabel}` : context.label}>
              <ContextIcon type={context.type} className="w-3.5 h-3.5 shrink-0 text-[var(--accent-indigo)]" />
              <span className="assistant-context-card-label">{context.label}</span>
              {context.secondaryLabel && <span className="assistant-context-card-meta">{context.secondaryLabel}</span>}
              <button type="button" onClick={() => removeAttachedContext(context.id)} aria-label={`Remove ${context.label}`} className="assistant-context-card-remove"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>}
        {uploading && <p role="status" className="text-[0.75rem] text-[var(--color-ink-muted)]">Uploading images…</p>}
        {attachmentError && <p role="alert" className="text-[0.75rem] text-[var(--color-ink)]">{attachmentError}</p>}

        <div className="relative overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] focus-within:border-[var(--accent-indigo)]">
          <textarea
            ref={composer}
            aria-label="Message the assistant"
            rows={2}
            value={input}
            onChange={event => setInput(event.target.value)}
            onPaste={event => {
              const files = Array.from(event.clipboardData.files);
              if (files.length) { event.preventDefault(); void attachImages(files); }
            }}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event); }}
            placeholder={mode === 'chat' ? 'Ask about your research, or describe a change (Enter to send)' : 'What should change? (Enter to send)'}
            className="w-full resize-none bg-transparent p-2.5 pr-10 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none"
          />
          {running ? (
            <button type="button" onClick={stop} title="Stop" aria-label="Stop" className="absolute bottom-2 right-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-1.5 text-[var(--color-ink)]"><Square className="w-3.5 h-3.5" /></button>
          ) : (
            <button type="submit" disabled={(!input.trim() && !images.length && !(mode === 'chat' && attachedContexts.length)) || uploading || workspaceLoading} title="Send message (Enter)" aria-label="Send message" className="absolute bottom-2 right-2 rounded-lg bg-[var(--accent-indigo)] p-1.5 text-white disabled:opacity-40"><CornerDownLeft className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] text-[var(--color-ink-muted)]">
          <div className="flex items-center">
          <input ref={imagePicker} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" aria-label="Choose images" disabled={running || uploading || workspaceLoading} onChange={event => { void attachImages(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
          <button type="button" className={iconButton} disabled={running || uploading || workspaceLoading} aria-label="Attach images" title="Attach images (PNG, JPEG, WebP; 5 MiB each)" onClick={() => imagePicker.current?.click()}><ImagePlus className="w-3.5 h-3.5" /></button>
          <button type="button" className={iconButton} disabled={mode === 'codex' || !activeContext || activeContext.type === 'graph'} aria-label="Attach current selection" title={mode === 'chat' ? 'Attach current selection' : 'Switch to Chat to attach app objects'} onClick={() => { if (activeContext) addAttachedContext(activeContext); }}><Paperclip className="w-3.5 h-3.5" /></button>
          <AssistantModeMenu onSelect={nextMode => { if (nextMode === 'codex') clearAttachedContexts(); }} />
          </div>
          <span>Enter to send · Shift+Enter for newline</span>
        </div>
      </form>
      </div>
    </aside>
  );
};
