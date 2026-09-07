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
  Maximize2,
  Minimize2,
  Pencil,
  ArrowLeftRight
} from 'lucide-react';

const ContextIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-3 h-3' }) => {
  switch (type) {
    case 'node':
      return <HelpCircle className={className} />;
    case 'link':
      return <LinkIcon className={className} />;
    case 'passage':
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
    dockPosition,
    toggleDockPosition,
    openTaskEditor,
    activeContext,
    setActiveContext,
    attachedContexts,
    addAttachedContext,
    removeAttachedContext,
    clearAttachedContexts,
    threads,
    sendAssistantMessage,
    clearThread,
    links
  } = useWorkspace();

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      const minW = 320;
      const maxW = Math.floor(window.innerWidth * 0.75);
      const newWidth = dockPosition === 'left' ? e.clientX - 48 : window.innerWidth - e.clientX;
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
        showToast(`Attached ${parsed.label}`);
        return;
      }
    } catch {
      // fallback to plain text
    }

    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      const newCtx: AssistantContextObject = {
        type: 'passage',
        id: `drop-${Date.now()}`,
        label: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
        secondaryLabel: 'Dropped selection'
      };
      addAttachedContext(newCtx);
      showToast(`Attached snippet`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendAssistantMessage(contextKey, inputMessage.trim(), attachedContexts);
    setInputMessage('');
  };

  const handleQuickPrompt = (promptText: string) => {
    setInputMessage(promptText);
  };

  const toggleExpandDock = () => {
    setDockWidth(dockWidth > 420 ? 360 : 580);
  };

  if (!isDockOpen) return null;

  return (
    <aside
      id="instrument-assistant-dock"
      style={{ width: `min(${dockWidth}px, 100vw)` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`assistant-dock relative h-full ${
        dockPosition === 'left' ? 'border-r' : 'border-l'
      } border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col shrink-0 select-none z-30 ${
        isDragOver ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
      }`}
    >
      {/* Resizing Handle on appropriate edge */}
      <div
        onMouseDown={handleMouseDownResize}
        title="Drag to resize panel"
        className={`absolute ${
          dockPosition === 'left' ? 'right-0 translate-x-1' : 'left-0 -translate-x-1'
        } top-0 bottom-0 w-2 cursor-ew-resize hover:bg-indigo-500/40 transition-colors z-40`}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-12 left-4 right-4 z-50 p-2.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-mono shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="flex items-center gap-1.5 font-medium truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
            {toastMessage}
          </span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white dark:hover:text-slate-900 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dock Top Header */}
      <div className="assistant-dock-header flex items-center justify-between border-b border-[var(--color-rule)] px-3.5 py-2.5 bg-[var(--color-surface)]">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-sans font-semibold text-xs text-[var(--color-ink)]">
            Assistant Dock
          </span>
          <span className="px-1.5 py-0.2 rounded text-[0.6875rem] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {dockPosition === 'left' ? 'Left' : 'Right'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleDockPosition}
            title={dockPosition === 'left' ? 'Move Dock to Right side' : 'Move Dock to Left side'}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleExpandDock}
            title={dockWidth > 420 ? 'Standard width (360px)' : 'Expand width (580px)'}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {dockWidth > 420 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            id="assistant-dock-close-btn"
            onClick={() => setIsDockOpen(false)}
            title="Close Assistant Panel"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Thread Scope Bar */}
      <div className="assistant-thread-bar flex items-center justify-between px-3.5 py-1.5 border-b border-[var(--color-rule)] bg-[var(--color-paper)] text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-400 font-mono text-[0.6875rem]">Scope:</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate font-mono text-[0.75rem]">
            {activeContext?.label || 'Global Graph'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeContext?.type !== 'graph' && (
            <button
              type="button"
              onClick={() =>
                setActiveContext({
                  type: 'graph',
                  id: 'global-graph',
                  label: 'Global Graph',
                  secondaryLabel: 'Argument tree'
                })
              }
              className="text-[0.6875rem] font-mono text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
            >
              Reset Scope
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              clearThread(contextKey);
              showToast('Conversation thread cleared');
            }}
            title="Clear messages in this context"
            className="text-[0.6875rem] font-mono text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-0.5"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Transcript Area */}
      <div
        id="assistant-transcript-list"
        className="assistant-transcript relative flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 select-text"
      >
        {/* Visual Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-2 z-20 rounded-xl border-2 border-dashed border-indigo-500 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-6 text-center pointer-events-none animate-in fade-in duration-150">
            <ArrowDownCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
            <p className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
              Drop object here to attach context
            </p>
            <p className="text-[0.8125rem] font-sans text-slate-500">
              Supports Cards, Questions, Claims, Evidence, and Papers
            </p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <Sparkles size={20} />
            </div>
            <p className="font-semibold text-xs text-[var(--color-ink)] mb-1">
              Ready for Reasoning & Discussion
            </p>
            <p className="text-[0.8125rem] text-[var(--color-ink-muted)] max-w-[260px] leading-relaxed mb-4">
              Ask me to evaluate reasoning links, check empirical metrics, or discuss literature citations.
            </p>
            <div className="flex flex-col gap-1.5 w-full">
              <button
                type="button"
                onClick={() => handleQuickPrompt('Check relation between question q1 and claim c1')}
                className="w-full text-left p-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-mono transition-colors"
              >
                Check relation q1--c1
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('What empirical evidence supports sink token persistence?')}
                className="w-full text-left p-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-mono transition-colors"
              >
                Evidence supporting sink tokens...
              </button>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isModel = msg.role === 'assistant';
            const isCreatedTaskAction = msg.structuredAction?.type?.startsWith('create_task:');
            const createdTaskId = isCreatedTaskAction ? msg.structuredAction?.type.split(':')[1] : null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${
                  isModel ? 'items-start' : 'items-end'
                }`}
              >
                {/* Author tag */}
                <div className="flex items-center gap-1.5 text-[0.6875rem] text-slate-400 px-1 font-mono">
                  {isModel ? (
                    <>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        [cx/gpt-5.6-sol]
                      </span>
                      <span>•</span>
                      <span>model</span>
                    </>
                  ) : (
                    <span className="font-medium text-slate-600 dark:text-slate-300">user</span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3 rounded-2xl max-w-[92%] leading-relaxed shadow-xs text-xs ${
                    isModel
                      ? msg.isRefusal
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-tl-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                      : 'bg-indigo-600 text-white rounded-tr-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-normal font-sans">
                    {msg.content}
                  </p>

                  {/* Structured Action with Interactive Button */}
                  {msg.structuredAction && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 text-[0.75rem]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold text-[0.6875rem]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Action: {msg.structuredAction.type}
                        </span>
                        {msg.structuredAction.undoAvailable && (
                          <button
                            type="button"
                            onClick={() => showToast('Undo: Previous state restored.')}
                            className="font-mono underline text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-0.5 text-[0.6875rem]"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            Undo
                          </button>
                        )}
                      </div>

                      {createdTaskId && (
                        <button
                          type="button"
                          onClick={() => openTaskEditor(createdTaskId)}
                          className="self-start mt-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[0.75rem] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Pencil size={11} />
                          <span>Open in Editor ({createdTaskId})</span>
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

      {/* Input Composer Form */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-2 shrink-0"
      >
        {/* Warning if any attached link has no user reason */}
        {uncommittedLink && (
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-start gap-1.5 text-[0.75rem] font-mono text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
            <span>
              Link [<strong>{uncommittedLink.id}</strong>] has no <em>user_reason</em>. Assistant refuses to inspect uncommitted reasoning links.
            </span>
          </div>
        )}

        {/* Attached Context Chips Bar */}
        {attachedContexts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg">
            {attachedContexts.map(ctx => (
              <div
                key={ctx.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[0.75rem] font-mono shadow-2xs group"
              >
                <ContextIcon type={ctx.type} className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span
                  className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]"
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
                className="text-[0.6875rem] font-mono text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline px-1 ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Quick AI Learning Actions Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[0.6875rem] font-mono">
          <button
            type="button"
            onClick={() => setInputMessage('Explain the geometric intuition and why this formula holds.')}
            className="px-2 py-0.5 rounded-full border border-sky-300/60 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 shrink-0 transition-colors"
          >
            📐 Intuition
          </button>
          <button
            type="button"
            onClick={() => setInputMessage('Show the step-by-step mathematical derivation of this.')}
            className="px-2 py-0.5 rounded-full border border-indigo-300/60 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 shrink-0 transition-colors"
          >
            ⚡ Derivation
          </button>
          <button
            type="button"
            onClick={() => setInputMessage('What are the numerical edge cases or failure modes for this?')}
            className="px-2 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 shrink-0 transition-colors"
          >
            ⚠️ Stress-Test
          </button>
          <button
            type="button"
            onClick={() => setInputMessage('Write a clean Python / PyTorch verification test demonstrating this concept.')}
            className="px-2 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 shrink-0 transition-colors"
          >
            🧪 Python Test
          </button>
        </div>

        {/* Composer Input Box */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all relative">
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
                ? `Ask about ${attachedContexts.length} attached context(s)... (Enter to send)`
                : 'Ask a question or discuss literature… (Enter to send)'
            }
            className="w-full p-2.5 pr-10 text-xs bg-transparent text-[var(--color-ink)] placeholder:text-slate-400 focus:outline-none resize-none"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim()}
            title="Send message (Enter)"
            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-xs"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[0.6875rem] text-slate-400 font-mono text-center">
          Enter to send · Shift+Enter for newline
        </div>
      </form>
    </aside>
  );
};
