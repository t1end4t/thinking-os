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
  AlertCircle,
  Pencil,
  Plus
} from 'lucide-react';

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
    taskEditor,
    openTaskEditor,
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
      const minW = 340;
      const maxW = Math.floor(window.innerWidth * 0.65);
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

  const handleQuickPrompt = (promptText: string) => {
    setInputMessage(promptText);
  };

  if (!isDockOpen) return null;

  return (
    <aside
      id="instrument-assistant-dock"
      style={{ width: `min(${dockWidth}px, 100vw)` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`assistant-dock relative h-full border-l border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col shrink-0 select-none z-30 ${
        isDragOver ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
      }`}
    >
      {/* Resizing Handle on Left Edge */}
      <div
        onMouseDown={handleMouseDownResize}
        title="Drag to resize panel"
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[var(--color-ink)]/20 transition-colors z-40 -translate-x-1/2"
      />

      {/* Dock Top Header */}
      <div className="assistant-dock-header">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="assistant-dock-title">
            Assistant
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            id="assistant-dock-close-btn"
            onClick={() => setIsDockOpen(false)}
            title="Close Dock"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Thread Scope Bar */}
      <div className="assistant-thread-bar">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="assistant-thread-label">Conversation</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {activeContext?.label || 'Global Graph'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
              className="text-[0.75rem] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Transcript Area (Isolated Per Context) */}
      <div
        id="assistant-transcript-list"
        className="assistant-transcript relative flex-1 overflow-y-auto flex flex-col select-text"
      >
        {/* Visual Drop Overlay indicator when dragging over dock */}
        {isDragOver && (
          <div className="absolute inset-2 z-20 rounded-xl border-2 border-dashed border-indigo-500 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-6 text-center pointer-events-none animate-in fade-in duration-150">
            <ArrowDownCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
            <p className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
              Drop an object here to attach context
            </p>
            <p className="text-[0.8125rem] font-sans text-slate-500">
              Supports Task Cards, Questions, Claims, and Evidence
            </p>
          </div>
        )}

        {messages.length === 0 ? (
          taskEditor ? (
            <div className="assistant-empty-state is-compact">
              <div className="assistant-empty-icon"><Sparkles size={18} /></div>
              <div>
                <p className="assistant-empty-title">Need help drafting?</p>
                <p className="assistant-empty-copy">Ask below for clearer task details.</p>
              </div>
            </div>
          ) : (
            <div className="assistant-empty-state">
              <div className="assistant-empty-icon"><Sparkles size={18} /></div>
              <p className="assistant-empty-title">Plan the work</p>
              <p className="assistant-empty-copy">
                Describe the outcome. The assistant can create a task or draft the details.
              </p>

              <div className="assistant-quick-actions">
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('Create a task in backlog: Set up a test and benchmark pipeline for the GPU kernel')}
                  className="assistant-quick-action"
                >
                  <Plus size={15} />
                  <span><strong>Create a task</strong><small>Add it directly to the backlog</small></span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPrompt('Draft detailed Task Editor content with a concrete plan and acceptance criteria')}
                  className="assistant-quick-action"
                >
                  <Pencil size={15} />
                  <span><strong>Draft this task</strong><small>Fill in clear execution criteria</small></span>
                </button>
              </div>
            </div>
          )
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
                <div className="flex items-center gap-1.5 text-[0.75rem] text-slate-400 px-1 font-mono">
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
                  <p className="assistant-message-copy whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  {/* Structured Action with Direct Interactive Button */}
                  {msg.structuredAction && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 text-[0.75rem]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Action completed: {msg.structuredAction.type}
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

                      {/* Interactive Button to Open Created Task in Editor */}
                      {createdTaskId && (
                        <button
                          type="button"
                          onClick={() => openTaskEditor(createdTaskId)}
                          className="self-start mt-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[0.8125rem] font-semibold flex items-center gap-1 transition-colors"
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

      {/* Input Box Area with Context Attachment Row */}
      <form
        onSubmit={handleSend}
        className="assistant-composer"
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

        {/* The Composite Input Container */}
        <div className="border border-slate-200 dark:border-slate-700/90 rounded-xl bg-white dark:bg-slate-900 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
          
          {/* Attached Context Chips Bar (Above Textarea with X button) */}
          {attachedContexts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
              {attachedContexts.map(ctx => (
                <div
                  key={ctx.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[0.8125rem] font-mono shadow-2xs group"
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
                  className="text-[0.75rem] font-mono text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:underline px-1 ml-auto"
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
                taskEditor
                  ? 'Ask the assistant to draft this task…'
                  : attachedContexts.length > 0
                  ? `Ask about ${attachedContexts.length} attached object(s)... (Enter to send)`
                  : 'Ask a question or create a task…'
              }
              className="assistant-composer-input"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim()}
              title="Send message (Enter)"
              className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-xs"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer info note with Quick prompt helpers */}
        <div className="assistant-composer-hint">
          Enter to send · Shift+Enter for a new line
        </div>
      </form>
    </aside>
  );
};
