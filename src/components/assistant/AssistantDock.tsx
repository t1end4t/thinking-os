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
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Sliders,
  Type,
  Sun,
  Moon,
  Folder
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

const FONT_SIZE_PRESETS = [12, 13, 14, 15, 16, 17, 18, 20];

export const AssistantDock: React.FC = () => {
  const {
    isDockOpen,
    setIsDockOpen,
    dockWidth,
    setDockWidth,
    taskEditor,
    openTaskEditor,
    closeTaskEditor,
    fontSize,
    setFontSize,
    theme,
    toggleTheme,
    workspaceDir,
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
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState<boolean>(false);
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
        title="Kéo để thay đổi chiều rộng panel"
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[var(--color-ink)]/20 transition-colors z-40 -translate-x-1/2"
      />

      {/* Dock Top Header */}
      <div className="h-12 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-900 dark:text-slate-100 truncate">
            Assistant & Task Studio
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Top Settings Button (Moved to top as requested) */}
          <button
            id="dock-top-settings-btn"
            onClick={() => setShowSettings(prev => !prev)}
            title="Cài đặt hiển thị & Cỡ chữ (Settings)"
            className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
              showSettings
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px]">{fontSize}px</span>
            {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Close Dock Button */}
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

      {/* TOP SETTINGS DRAWER (Tách phần settings lên trên và dùng con số cụ thể) */}
      {showSettings && (
        <div
          id="top-settings-drawer"
          className="p-3.5 border-b border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-3.5 shrink-0 shadow-inner animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
              <Type className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Cài đặt phông chữ (Font Size)</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              {fontSize} px
            </span>
          </div>

          {/* Direct Numeric Value Buttons */}
          <div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Chọn kích thước cụ thể:</span>
              <span className="italic">16px là chuẩn mặc định</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {FONT_SIZE_PRESETS.map(sizeNum => (
                <button
                  key={sizeNum}
                  type="button"
                  onClick={() => setFontSize(sizeNum)}
                  className={`py-1.5 px-2 text-xs font-mono rounded border transition-all ${
                    fontSize === sizeNum
                      ? 'border-indigo-500 bg-indigo-600 text-white font-bold shadow-xs'
                      : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {sizeNum}px
                </button>
              ))}
            </div>
          </div>

          {/* Fine-tuning Slider & Stepper */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFontSize(Math.max(fontSize - 1, 11))}
              className="p-1 rounded border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 px-2"
              title="Giảm 1px"
            >
              -1px
            </button>
            <input
              type="range"
              min="11"
              max="22"
              step="1"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setFontSize(Math.min(fontSize + 1, 24))}
              className="p-1 rounded border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 px-2"
              title="Tăng 1px"
            >
              +1px
            </button>
          </div>

          {/* Live Preview Sample */}
          <div className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-slate-600 dark:text-slate-400 text-[11px] font-mono">
            <span>Xem trước: </span>
            <span style={{ fontSize: `${fontSize}px` }} className="text-slate-900 dark:text-slate-100 font-sans">
              Thinking-OS Workspace ({fontSize}px)
            </span>
          </div>

          {/* Quick theme & workspace meta */}
          <div className="pt-2 border-t border-[var(--color-rule)] flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1 text-slate-500 truncate max-w-[200px]" title={workspaceDir}>
              <Folder className="w-3 h-3 shrink-0" />
              <span className="truncate">{workspaceDir}</span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="px-2 py-1 rounded border border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Moon className="w-3 h-3 text-amber-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MERGED EDIT SECTION (Hợp nhất Edit với Assistant) */}
      {taskEditor && (
        <div className="border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col shrink-0 shadow-xs">
          <div className="px-3.5 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-[var(--color-rule)]/80 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <Pencil className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {taskEditor.taskId ? `Đang sửa task: ${taskEditor.taskId}` : 'Soạn Task mới'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditorCollapsed(prev => !prev)}
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title={isEditorCollapsed ? 'Mở rộng form Editor' : 'Thu gọn form Editor'}
              >
                {isEditorCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              <button
                type="button"
                onClick={closeTaskEditor}
                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Đóng editor"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isEditorCollapsed && <TaskEditorPanel embedded={true} />}
        </div>
      )}

      {/* Active Thread Scope Bar */}
      <div className="px-3.5 py-2 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center justify-between text-[11px] font-mono shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-400 uppercase text-[9px] tracking-wider font-semibold shrink-0">Thread:</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {activeContext?.label || 'Global Graph'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!taskEditor && (
            <button
              onClick={() => openTaskEditor(undefined, 'todo')}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-medium"
              title="Mở Task Editor trong panel này"
            >
              <Plus size={11} />
              <span>Mở Editor</span>
            </button>
          )}

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
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline"
            >
              Reset
            </button>
          )}
        </div>
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
              Kéo thả object vào đây để đính kèm context
            </p>
            <p className="text-[11px] font-sans text-slate-500">
              Hỗ trợ kéo Card Task, Question, Claim, Evidence
            </p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6 gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-400/50" />
            <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assistant & Task Automation
            </p>
            <p className="text-[11px] font-sans text-slate-500 max-w-xs leading-relaxed">
              Bạn có thể chat để:
              <br />
              <strong>1. Tạo task trực tiếp:</strong> &quot;Tạo task trong backlog...&quot;
              <br />
              <strong>2. Soạn thảo cho Editor:</strong> &quot;Viết mô tả tiêu chí cho task này...&quot;
            </p>

            {/* Quick action chips */}
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              <button
                type="button"
                onClick={() => handleQuickPrompt('Tạo task trong backlog: Thiết lập pipeline kiểm thử và benchmark cho GPU kernel')}
                className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-indigo-400 hover:text-indigo-600 text-slate-600 dark:text-slate-300 transition-colors"
              >
                + Tạo task trong backlog (Case 1)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('Gợi ý điền nội dung chi tiết cho Task Editor với kế hoạch và tiêu chí cụ thể')}
                className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-indigo-400 hover:text-indigo-600 text-slate-600 dark:text-slate-300 transition-colors"
              >
                ✨ Gợi ý điền vào Editor (Case 2)
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

                  {/* Structured Action with Direct Interactive Button */}
                  {msg.structuredAction && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hoàn tất tác vụ: {msg.structuredAction.type}
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
                          className="self-start mt-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Pencil size={11} />
                          <span>Mở trong Editor ({createdTaskId})</span>
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

        {/* The Composite Input Container */}
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
                taskEditor
                  ? "Chat để điền text vào Editor (Case 2) hoặc tạo task mới (Case 1)..."
                  : attachedContexts.length > 0
                  ? `Hỏi về ${attachedContexts.length} đối tượng đính kèm... (Enter để gửi)`
                  : "Chat tạo task ('Tạo task...'), gợi ý nội dung, hoặc hỏi đáp..."
              }
              className="w-full p-2.5 pr-10 bg-transparent text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim()}
              title="Gửi tin nhắn (Enter)"
              className="absolute right-2.5 bottom-2.5 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-xs"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer info note with Quick prompt helpers */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
          <span className="truncate">
            Cờ tác giả: <strong>AI (model)</strong> vs <strong>Human (user)</strong>
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 shrink-0">cx/gpt-5.6-sol</span>
        </div>
      </form>
    </aside>
  );
};
