import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AssistantContextObject } from '../../types';
import {
  X,
  Sparkles,
  Bot,
  CornerDownLeft,
  RotateCcw,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  HelpCircle,
  ShieldAlert,
  BookOpen,
  FlaskConical,
  Layers,
  ArrowDownCircle,
  AlertCircle
  ,Pencil
  ,Settings
} from 'lucide-react';
import { TaskEditorPanel } from '../shell/TaskEditorPanel';

const ContextIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-3 h-3' }) => {
  switch (type) {
    case 'node':
      return <HelpCircle className={className} />;
    case 'link':
      return <LinkIcon className={className} />;
    case 'passage':
    case 'paper':
      return <BookOpen className={className} />;
    case 'artifact':
      return <FlaskConical className={className} />;
    case 'survey':
      return <Layers className={className} />;
    default:
      return <FileText className={className} />;
  }
};

export const AssistantDock: React.FC = () => {
  const {
    isDockOpen,
    setIsDockOpen,
    dockWidth,
    setDockWidth,
    rightPanelView,
    setRightPanelView,
    taskEditor,
    fontSize,
    setFontSize,
    activeContext,
    setActiveContext,
    attachedContexts,
    addAttachedContext,
    removeAttachedContext,
    clearAttachedContexts,
    threads,
    sendAssistantMessage,
    links
  } = useWorkspace();

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Get active thread
  const contextKey = activeContext ? activeContext.id : 'global-graph';
  const messages = threads[contextKey] || [];

  // Find if any attached context is an uncommitted link
  const uncommittedLink = attachedContexts
    .filter(c => c.type === 'link')
    .map(c => links.find(l => l.id === c.id || l.id === c.metadata?.linkId))
    .find(l => l && (!l.userReason || !l.userReason.trim()));

  // Auto-scroll transcript on new message
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle Resize by dragging left edge
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const minW = 320;
      const maxW = Math.floor(window.innerWidth * 0.55);
      setDockWidth(Math.min(Math.max(newWidth, minW), maxW));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setDockWidth]);

  // Drag & Drop handlers on Assistant Dock
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only deactivate if leaving the dock container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const rawJson = e.dataTransfer.getData('application/json');
      if (rawJson) {
        const parsed: AssistantContextObject = JSON.parse(rawJson);
        addAttachedContext(parsed);
        return;
      }
    } catch {
      // fallback to plain text
    }

    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      addAttachedContext({
        type: 'passage',
        id: `drop-${Date.now()}`,
        label: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
        secondaryLabel: 'Dropped selection'
      });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendAssistantMessage(contextKey, inputMessage.trim(), attachedContexts);
    setInputMessage('');
  };

  if (!isDockOpen) return null;

  return (
    <aside
      id="instrument-assistant-dock"
      style={{ width: `${dockWidth}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative h-full border-l border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col shrink-0 select-none z-30 transition-all duration-75 ${
        isDragOver ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
      }`}
    >
      {/* Resizing Handle on Left Edge */}
      <div
        onMouseDown={handleMouseDownResize}
        title="Drag to resize dock"
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[var(--color-ink)]/20 transition-colors z-40 -translate-x-1/2"
      />

      {/* Dock Top Header */}
      <div className="h-12 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {rightPanelView === 'assistant' ? (
            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          ) : rightPanelView === 'task-editor' ? (
            <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          ) : (
            <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900 dark:text-slate-100 truncate">
            {rightPanelView === 'assistant' ? 'Assistant' : rightPanelView === 'task-editor' ? 'Task editor' : 'Settings'}
          </span>
        </div>

        <button
          id="assistant-dock-close-btn"
          onClick={() => setIsDockOpen(false)}
          title="Close Assistant Dock (Ctrl/Cmd+J)"
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] p-1.5 gap-1 shrink-0">
        <button
          onClick={() => setRightPanelView('assistant')}
          className={`right-panel-tab ${rightPanelView === 'assistant' ? 'active' : ''}`}
        >
          <Bot className="w-3.5 h-3.5" /> Assistant
        </button>
        <button
          onClick={() => taskEditor && setRightPanelView('task-editor')}
          disabled={!taskEditor}
          className={`right-panel-tab ${rightPanelView === 'task-editor' ? 'active' : ''}`}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={() => setRightPanelView('settings')}
          className={`right-panel-tab ${rightPanelView === 'settings' ? 'active' : ''}`}
        >
          <Settings className="w-3.5 h-3.5" /> Settings
        </button>
      </div>

      {rightPanelView === 'assistant' ? (
        <>

      {/* Active Thread Scope Bar */}
      <div className="px-3.5 py-2 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center justify-between text-[11px] font-mono shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-400 uppercase text-[9px] tracking-wider font-semibold shrink-0">Thread:</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {activeContext?.label || 'Global Graph'}
          </span>
        </div>
        {activeContext?.type !== 'graph' && (
          <button
            onClick={() =>
              setActiveContext({
                type: 'graph',
                id: 'global-graph',
                label: 'Global Graph',
                secondaryLabel: 'Argument tree'
              })
            }
            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 font-medium"
          >
            Reset
          </button>
        )}
      </div>

      {/* Transcript Area (Isolated Per Context) */}
      <div
        id="assistant-transcript-list"
        className="relative flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[var(--color-surface)] font-mono text-xs select-text"
      >
        {/* Visual Drop Overlay indicator when dragging over dock */}
        {isDragOver && (
          <div className="absolute inset-2 z-20 rounded-xl border-2 border-dashed border-indigo-500 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-6 text-center pointer-events-none animate-in fade-in duration-150">
            <ArrowDownCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
            <p className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
              Drop here to attach context
            </p>
            <p className="text-[11px] font-sans text-slate-500">
              Attached chips will appear above the message input
            </p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6 gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-400/50" />
            <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              Drag and drop objects here to inspect
            </p>
            <p className="text-[11px] font-sans text-slate-500 max-w-xs leading-relaxed">
              You can drag and drop any Question, Claim, Evidence, or Link into this dock to test reasoning.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isModel = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${
                  isModel ? 'items-start' : 'items-end'
                }`}
              >
                {/* Author tag */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1 font-mono">
                  {isModel ? (
                    <>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        [cx/gpt-5.6-sol]
                      </span>
                      <span>•</span>
                      <span>model</span>
                    </>
                  ) : (
                    <span className="font-medium">user</span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3 rounded-2xl max-w-[92%] leading-relaxed shadow-xs ${
                    isModel
                      ? msg.isRefusal
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-tl-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                      : 'bg-indigo-600 text-white rounded-tr-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-mono text-[12px]">
                    {msg.content}
                  </p>

                  {/* Structured Action with Confirmation and Undo link */}
                  {msg.structuredAction && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Operation executed: {msg.structuredAction.type}
                      </span>
                      {msg.structuredAction.undoAvailable && (
                        <button
                          onClick={() => alert('Undo: Previous relation state restored.')}
                          className="font-mono underline text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-0.5"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Undo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Input Box Area with Context Attachment Row (ChatGPT / Claude web style) */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2 shrink-0"
      >
        {/* Warning if any attached link has no user reason */}
        {uncommittedLink && (
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-start gap-1.5 text-[10px] font-mono text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
            <span>
              Link [<strong>{uncommittedLink.id}</strong>] has no <em>user_reason</em>. Assistant refuses to inspect uncommitted reasoning links.
            </span>
          </div>
        )}

        {/* The Composite Input Container (Cards above textarea, Claude/ChatGPT pattern) */}
        <div className="border border-slate-200 dark:border-slate-700/90 rounded-xl bg-white dark:bg-slate-900 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
          
          {/* Attached Context Chips Bar (Above Textarea with X button) */}
          {attachedContexts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
              {attachedContexts.map(ctx => (
                <div
                  key={ctx.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-mono shadow-2xs group"
                >
                  <ContextIcon type={ctx.type} className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span
                    className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]"
                    title={ctx.label}
                  >
                    {ctx.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachedContext(ctx.id)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-0.5"
                    title="Remove context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {attachedContexts.length > 1 && (
                <button
                  type="button"
                  onClick={clearAttachedContexts}
                  className="text-[10px] font-mono text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline px-1 ml-auto"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Textarea Input and Send Button */}
          <div className="relative flex items-center">
            <textarea
              rows={2}
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={
                attachedContexts.length > 0
                  ? `Ask about ${attachedContexts.length} attached context(s)... (Press Enter)`
                  : "Type a prompt or drag objects here..."
              }
              className="w-full p-2.5 pr-10 bg-transparent text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim()}
              title="Send (Enter)"
              className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-xs"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer info note */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
          <span>Drag node / link into dock</span>
          <span className="text-indigo-600 dark:text-indigo-400">cx/gpt-5.6-sol</span>
        </div>
      </form>
        </>
      ) : rightPanelView === 'task-editor' ? (
        <TaskEditorPanel />
      ) : (
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5" id="settings-panel">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">Appearance</p>
            <h2 className="mt-1 text-sm font-semibold text-[var(--color-ink)]">Font size</h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Applied across the workspace and saved on this device.</p>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Font size">
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                role="radio"
                aria-checked={fontSize === size}
                className={`rounded-lg border px-3 py-3 font-mono capitalize transition-colors ${
                  fontSize === size
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                    : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                } ${size === 'small' ? 'text-[10px]' : size === 'medium' ? 'text-xs' : 'text-sm'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
