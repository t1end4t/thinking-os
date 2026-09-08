import React, { useEffect, useRef, useState } from 'react';
import {
  Bot, BookOpen, CheckCircle2, ChevronDown, CornerDownLeft, FileText, FlaskConical, HelpCircle,
  Layers, Link as LinkIcon, ListChecks, Loader2, Maximize2, MessageSquarePlus, Minimize2, Search,
  Sparkles, Square, Terminal, TriangleAlert, X, Paperclip
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AssistantContextObject } from '../../types';
import { MarkdownPreview } from '../runtime/MarkdownPreview';
import type { ChatEntry } from '../../context/useCodexAssistant';
import './assistant.css';

const ContextIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-3 h-3' }) => {
  if (type === 'node') return <HelpCircle className={className} />;
  if (type === 'link') return <LinkIcon className={className} />;
  if (type === 'passage') return <BookOpen className={className} />;
  if (type === 'artifact') return <FlaskConical className={className} />;
  if (type === 'survey') return <Layers className={className} />;
  return <FileText className={className} />;
};

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
  return (
    <div className={`rounded-lg border text-[0.75rem] font-mono ${failed ? 'border-rose-300/70 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30' : 'border-[var(--color-rule)] bg-[var(--color-paper)]/60'}`}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        disabled={!entry.content.trim()}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:cursor-default"
      >
        {entry.state === 'running'
          ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" aria-hidden />
          : <ActivityIcon kind={entry.kind} />}
        <span className="truncate flex-1">{entry.label}</span>
        {entry.state && entry.kind !== 'warning' && <span className="assistant-activity-state">{entry.state === 'running' ? 'in progress' : entry.state}</span>}
        {entry.content.trim() && <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && entry.content.trim() && (
        <pre className="px-2.5 pb-2 pt-0.5 max-h-56 overflow-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[var(--color-ink)]">{entry.content}</pre>
      )}
    </div>
  );
};

export const AssistantDock: React.FC = () => {
  const {
    isDockOpen, setIsDockOpen, dockWidth, setDockWidth, dockPosition, workspaceDir, workspaceLoading,
    attachedContexts, addAttachedContext, removeAttachedContext, clearAttachedContexts, activeContext, codexAssistant
  } = useWorkspace();
  const {
    sessions, session, messages, running, status, error, storageWarning,
    send, newConversation, selectSession, stop, preferences, configuration
  } = codexAssistant;

  const [input, setInput] = useState('');
  const [resizing, setResizing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState('');
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const followTranscript = useRef(true);

  useEffect(() => { if (followTranscript.current) transcriptEnd.current?.scrollIntoView({ block: 'nearest' }); }, [messages, status, isDockOpen]);
  useEffect(() => { followTranscript.current = true; setInput(''); transcriptEnd.current?.scrollIntoView({ block: 'nearest' }); }, [session?.id]);
  useEffect(() => { setInput(''); }, [workspaceDir]);
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
    if (!input.trim() || running || workspaceLoading) return;
    followTranscript.current = true;
    void send(input.trim());
    setInput('');
  }

  function drop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const payload = event.dataTransfer.getData('application/json');
    if (payload) {
      try {
        const parsed: AssistantContextObject = JSON.parse(payload);
        if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string' || !parsed.id.trim() || typeof parsed.label !== 'string' || !parsed.label.trim() || typeof parsed.type !== 'string') throw new Error('Invalid attachment');
        addAttachedContext(parsed);
        setToast(`Attached ${parsed.label}`);
        return;
      } catch { setToast('Could not attach this item.'); }
    }
    const text = event.dataTransfer.getData('text/plain');
    if (!text) return;
    addAttachedContext({ type: 'passage', id: `drop-${Date.now()}`, label: `${text.slice(0, 40)}${text.length > 40 ? '…' : ''}`, secondaryLabel: 'Dropped selection' });
    setToast('Attached snippet');
  }

  if (!isDockOpen) return null;
  const iconButton = 'p-1.5 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors';
  const activeModel = (session ? session.model : preferences.model) || configuration.model;
  const activeProviderId = (session ? session.provider : preferences.provider) || configuration.provider;
  const activeProvider = configuration.providers.find(entry => entry.id === activeProviderId);

  return (
    <aside
      id="instrument-assistant-dock"
      aria-label="Assistant"
      style={{ width: `min(${dockWidth}px, calc(100vw - 4rem))`, '--assistant-font-size': `${preferences.fontSize}px` } as React.CSSProperties}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; if (!dragOver) setDragOver(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false); }}
      onDrop={drop}
      className={`assistant-dock relative h-full flex flex-col shrink-0 min-w-0 z-30 bg-[var(--color-surface)] text-[var(--color-ink)] ${dockPosition === 'left' ? 'border-r' : 'border-l'} border-[var(--color-rule)] ${dragOver ? 'ring-2 ring-[var(--accent-indigo)]/40' : ''}`}
    >
      <div
        onMouseDown={event => { event.preventDefault(); setResizing(true); }}
        title="Drag to resize panel"
        className={`absolute top-0 bottom-0 w-2 cursor-ew-resize z-40 hover:bg-[var(--accent-indigo)]/30 ${dockPosition === 'left' ? 'right-0' : 'left-0'}`}
      />

      {toast && (
        <div className="absolute top-12 left-3 right-3 z-50 flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-2.5 py-2 font-mono text-[0.75rem] text-[var(--color-surface)] shadow-lg">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      <header className="assistant-dock-header flex items-center justify-between gap-2 border-b border-[var(--color-rule)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="w-4 h-4 shrink-0 text-[var(--accent-indigo)]" aria-hidden />
          <span className="truncate font-sans text-xs font-semibold">Assistant</span>
        </div>
        <div className="flex shrink-0 items-center">
          <button type="button" className={iconButton} onClick={() => newConversation()} disabled={running} aria-label="New conversation" title="New conversation"><MessageSquarePlus className="w-3.5 h-3.5" /></button>
          <button type="button" className={iconButton} onClick={() => setDockWidth(dockWidth > 420 ? 360 : 580)} aria-label={dockWidth > 420 ? 'Narrow assistant panel' : 'Expand assistant panel'}>
            {dockWidth > 420 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button type="button" id="assistant-dock-close-btn" className={iconButton} onClick={() => setIsDockOpen(false)} aria-label="Close Assistant Panel"><X className="w-4 h-4" /></button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
        <label className="flex w-full min-w-0 items-center gap-1.5">
          <span className="shrink-0">Chat</span>
          <select
            aria-label="Conversation"
            value={session?.id ?? ''}
            onChange={event => selectSession(event.target.value)}
            disabled={running || !sessions.length}
            className="min-w-0 flex-1 truncate rounded border border-[var(--color-rule)] bg-[var(--color-surface)] px-1.5 py-1 text-[var(--color-ink)]"
          >
            {!sessions.length && <option value="">New conversation</option>}
            {sessions.map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
          </select>
        </label>
        <span className="w-full truncate" title={`Codex · ${activeProvider?.label || activeProviderId || 'default provider'}${activeModel ? ` · ${activeModel}` : ''}`}>
          Codex · {activeProvider?.label || activeProviderId || 'default'}{activeModel ? ` · ${activeModel}` : ''}
        </span>
      </div>

      <div className="border-b border-[var(--color-rule)] px-3 py-1.5 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
        <span className="block truncate" title={workspaceDir}>Read-only · {workspaceDir}</span>
      </div>

      <div id="assistant-transcript-list" role="log" aria-label="Assistant conversation" onScroll={event => { const target = event.currentTarget; followTranscript.current = target.scrollHeight - target.scrollTop - target.clientHeight < 64; }} className="assistant-transcript relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 select-text">
        {dragOver && (
          <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--accent-indigo)] bg-[var(--color-surface)]/90 p-6 text-center">
            <Sparkles className="w-6 h-6 text-[var(--accent-indigo)]" aria-hidden />
            <p className="font-mono text-xs font-semibold text-[var(--color-ink)]">Drop to attach context</p>
          </div>
        )}

        {!messages.length && (
          <div className="py-6 text-center text-[var(--color-ink-muted)]">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)]"><Sparkles className="w-5 h-5" /></div>
            <p className="mb-1 text-xs font-semibold text-[var(--color-ink)]">Start a conversation</p>
            <p className="mx-auto max-w-[260px] text-[0.8125rem] leading-relaxed">Ask a question, inspect files, or work through an idea.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setInput('Explore this folder and explain how it is organized.')} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-[0.75rem] hover:text-[var(--color-ink)]">Explore this folder</button>
              <button type="button" onClick={() => setInput('Help me plan a task. Ask what I want to accomplish first.')} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-[0.75rem] hover:text-[var(--color-ink)]">Plan a task</button>
            </div>
            <p className="mt-4 text-[0.6875rem]">Drop objects here for reference. Only typed messages are sent.</p>
          </div>
        )}

        {messages.map(entry => entry.kind ? (
          <ActivityEntry key={entry.id} entry={entry} />
        ) : (
          <div key={entry.id} className={`flex flex-col gap-1 ${entry.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="px-1 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">{entry.role === 'user' ? 'You' : 'Assistant'}</span>
            {entry.role === 'user' ? (
              <p className="assistant-user-message max-w-[92%] whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl rounded-tr-xs px-3 py-2 text-xs leading-relaxed">{entry.content}</p>
            ) : (
              <div className="w-full min-w-0 rounded-2xl rounded-tl-xs border border-[var(--color-rule)] bg-[var(--color-paper)]/40 px-3 py-2 [&_*]:break-words [&_*]:[overflow-wrap:anywhere]">
                <MarkdownPreview content={entry.content} className="assistant-markdown" />
              </div>
            )}
          </div>
        ))}

        {running && (
          <div role="status" className="flex items-center gap-1.5 px-1 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            <span className="truncate" title={status}>{status || 'Working…'}</span>
          </div>
        )}
        <div ref={transcriptEnd} />
      </div>

      {(error || storageWarning) && (
        <div role="alert" className="border-t border-[var(--color-rule)] px-3 py-2 text-[0.75rem] break-words text-[var(--color-ink)]">
          {error || storageWarning}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-[var(--color-rule)] p-3">
        {attachedContexts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]/60 p-2">
            {attachedContexts.map(context => (
              <span key={context.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[0.75rem]">
                <ContextIcon type={context.type} className="w-3 h-3 shrink-0 text-[var(--accent-indigo)]" />
                <span className="truncate" title={context.label}>{context.label}</span>
                <button type="button" onClick={() => removeAttachedContext(context.id)} aria-label={`Remove ${context.label}`} className="rounded p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-missing)]"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {attachedContexts.length > 1 && (
              <button type="button" onClick={clearAttachedContexts} className="ml-auto px-1 font-mono text-[0.6875rem] text-[var(--color-ink-muted)] hover:text-[var(--color-missing)] hover:underline">Clear all</button>
            )}
            <p className="w-full font-mono text-[0.625rem] text-[var(--color-ink-muted)]">Reference only — attachments are not sent yet.</p>
          </div>
        )}

        <div className="relative overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] focus-within:border-[var(--accent-indigo)]">
          <textarea
            aria-label="Message the assistant"
            rows={2}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event); }}
            placeholder="Ask the assistant… (Enter to send)"
            className="w-full resize-none bg-transparent p-2.5 pr-10 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none"
          />
          {running ? (
            <button type="button" onClick={stop} title="Stop" aria-label="Stop" className="absolute bottom-2 right-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-1.5 text-[var(--color-ink)]"><Square className="w-3.5 h-3.5" /></button>
          ) : (
            <button type="submit" disabled={!input.trim() || workspaceLoading} title="Send message (Enter)" aria-label="Send message" className="absolute bottom-2 right-2 rounded-lg bg-[var(--accent-indigo)] p-1.5 text-white disabled:opacity-40"><CornerDownLeft className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
          <button type="button" className={iconButton} disabled={!activeContext || activeContext.type === 'graph'} aria-label="Attach current selection" title="Attach current selection (reference only)" onClick={() => { if (activeContext) addAttachedContext(activeContext); }}><Paperclip className="w-3.5 h-3.5" /></button>
          <span>Enter to send · Shift+Enter for newline</span>
        </div>
      </form>
    </aside>
  );
};
