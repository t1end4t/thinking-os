import React, { useEffect, useState } from 'react';
import { Check, X, Sparkles, User, MessageSquare, PencilLine } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskItem, TaskPriority, TaskStatus } from '../../productivityTypes';

const STATUS_OPTIONS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'In Review' },
  { id: 'done', title: 'Done' }
];

interface EditorSelection {
  field: 'title' | 'description';
  text: string;
  x: number;
  y: number;
}

export const TaskEditorPanel: React.FC = () => {
  const {
    taskEditor,
    tasks,
    setTasks,
    closeTaskEditor,
    taskDraft,
    setTaskDraft,
    applyAiDraftToEditor,
    setActiveContext,
    addAttachedContext,
    sendAssistantMessage
  } = useWorkspace();

  const editingTask = taskEditor?.taskId ? tasks.find(task => task.id === taskEditor.taskId) ?? null : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tag, setTag] = useState('task');
  const [isAiDrafted, setIsAiDrafted] = useState(false);
  const [editorSelection, setEditorSelection] = useState<EditorSelection | null>(null);

  // Initialize from editing task or default status
  useEffect(() => {
    if (taskDraft) {
      setTitle(taskDraft.title);
      setDescription(taskDraft.description);
      setStatus(taskDraft.status);
      setPriority(taskDraft.priority);
      setTag(taskDraft.tag);
      setIsAiDrafted(true);
    } else if (editingTask) {
      setTitle(editingTask.title ?? '');
      setDescription(editingTask.description ?? '');
      setStatus(editingTask.status ?? taskEditor?.defaultStatus ?? 'todo');
      setPriority(editingTask.priority ?? 'medium');
      setTag(editingTask.tag ?? 'task');
      setIsAiDrafted(editingTask.lastEditedBy === 'model' || editingTask.author === 'model');
    } else {
      setTitle('');
      setDescription('');
      setStatus(taskEditor?.defaultStatus ?? 'todo');
      setPriority('medium');
      setTag('task');
      setIsAiDrafted(false);
    }
  }, [editingTask?.id, taskEditor?.taskId, taskEditor?.defaultStatus, taskDraft]);

  if (!taskEditor) return null;

  const openSelectionTools = (
    event: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: EditorSelection['field'],
    value: string,
    selectAllOnEmpty = false
  ) => {
    const input = event.currentTarget;
    let start = input.selectionStart ?? 0;
    let end = input.selectionEnd ?? 0;

    if (start === end && selectAllOnEmpty && value.trim()) {
      start = 0;
      end = value.length;
      input.setSelectionRange(start, end);
    }

    const text = value.slice(start, end).trim();
    if (!text) {
      setEditorSelection(null);
      return;
    }

    setEditorSelection({
      field,
      text,
      x: Math.min(Math.max(event.clientX, 150), window.innerWidth - 150),
      y: Math.max(event.clientY - 52, 12)
    });
  };

  const handleChatAboutSelection = () => {
    if (!editorSelection) return;
    const contextId = `task-selection-${Date.now()}`;
    const context = {
      type: 'passage' as const,
      id: contextId,
      label: 'Task editor selection',
      secondaryLabel: `“${editorSelection.text.slice(0, 42)}${editorSelection.text.length > 42 ? '…' : ''}”`,
      metadata: { passage: editorSelection.text, field: editorSelection.field }
    };
    addAttachedContext(context);
    setActiveContext(context);
    sendAssistantMessage(contextId, `Discuss this selected task text:\n\n"${editorSelection.text}"`);
    setEditorSelection(null);
  };

  const handleAiEditSelection = () => {
    if (!editorSelection) return;
    applyAiDraftToEditor(`Rewrite this selected task text for clarity and precision: ${editorSelection.text}`);
    setEditorSelection(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    const isAi = isAiDrafted;
    const authorOrigin = isAi ? ('model' as const) : ('user' as const);

    const fields = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      tag: tag.trim() || 'task',
      lastEditedBy: authorOrigin
    };

    if (editingTask) {
      setTasks(current =>
        current.map(task =>
          task.id === editingTask.id
            ? {
                ...task,
                ...fields,
                author: task.author || authorOrigin
              }
            : task
        )
      );
    } else {
      const newTask: TaskItem = {
        id: `task-${Date.now().toString().slice(-4)}`,
        createdAt: 'Just now',
        author: authorOrigin,
        ...fields
      };
      setTasks(current => [newTask, ...current]);
    }
    setTaskDraft(null);
    closeTaskEditor();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="task-editor-form kanban-modal-form"
      id="task-editor-panel"
    >
      <div className="task-editor-meta">
        <div className="flex items-center gap-2 min-w-0">
          {isAiDrafted ? (
            <span
              className="task-origin-badge is-ai"
              title="Content drafted by Assistant. Will save with author: model flag."
            >
              <Sparkles size={12} />
              Assistant draft
            </span>
          ) : (
            <span
              className="task-origin-badge is-human"
              title="Manual human input. Will save with author: user flag."
            >
              <User size={12} />
              Your draft
            </span>
          )}
        </div>

        <span className="task-editor-tip">
          Select text for assistant actions
        </span>
      </div>

      <div className="form-field">
        <label htmlFor="task-title-input">Title <span aria-hidden="true">*</span></label>
        <input
          id="task-title-input"
          type="text"
          required
          autoFocus
          placeholder="What needs to be done?"
          value={title}
          onMouseUp={event => openSelectionTools(event, 'title', title)}
          onContextMenu={event => {
            event.preventDefault();
            openSelectionTools(event, 'title', title, true);
          }}
          onChange={event => {
            setTitle(event.target.value);
          }}
        />
      </div>

      <div className="form-field">
        <label htmlFor="task-desc-input">Description</label>
        <textarea
          id="task-desc-input"
          rows={5}
          placeholder="Add context, constraints, and a clear definition of done."
          value={description}
          onMouseUp={event => openSelectionTools(event, 'description', description)}
          onContextMenu={event => {
            event.preventDefault();
            openSelectionTools(event, 'description', description, true);
          }}
          onChange={event => {
            setDescription(event.target.value);
          }}
        />
      </div>

      <div className="task-editor-grid">
        <div className="form-field">
          <label htmlFor="task-status-select">Status</label>
          <select
            id="task-status-select"
            value={status}
            onChange={event => setStatus(event.target.value as TaskStatus)}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="task-priority-select">Priority</label>
          <select
            id="task-priority-select"
            value={priority}
            onChange={event => setPriority(event.target.value as TaskPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="task-tag-input">Tag</label>
        <input
          id="task-tag-input"
          type="text"
          placeholder="e.g. benchmark"
          value={tag}
          onChange={event => setTag(event.target.value)}
        />
      </div>

      {editingTask && (
        <p className="text-[0.75rem] font-mono text-[var(--color-ink-muted)] flex items-center gap-1.5">
          <span>Original author:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {editingTask.author === 'model' ? 'AI (model)' : 'Human (user)'}
          </span>
          <span>· Last edited by:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {editingTask.lastEditedBy === 'model' ? 'AI (model)' : 'Human (user)'}
          </span>
        </p>
      )}

      <div className="task-editor-actions">
        <button
          type="button"
          className="task-editor-button is-secondary"
          onClick={closeTaskEditor}
        >
          <X size={13} />
          <span>Cancel</span>
        </button>
        <button
          type="submit"
          id="save-task-btn"
          className="task-editor-button is-primary"
          disabled={!title.trim()}
        >
          <Check size={14} />
          <span>{editingTask ? 'Save changes' : 'Create task'}</span>
        </button>
      </div>

      {editorSelection && (
        <div
          id="task-selection-toolbar"
          style={{ left: editorSelection.x, top: editorSelection.y }}
          className="fixed z-60 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-700/70 bg-slate-950/95 p-1 text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={handleChatAboutSelection}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[0.75rem] font-medium hover:bg-white/12"
          >
            <MessageSquare className="h-3.5 w-3.5 text-cyan-300" />
            Chat about this
          </button>
          <div className="h-4 w-px bg-white/20" />
          <button
            type="button"
            onClick={handleAiEditSelection}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[0.75rem] font-medium hover:bg-white/12"
          >
            <PencilLine className="h-3.5 w-3.5 text-violet-300" />
            Edit with AI
          </button>
          <button
            type="button"
            aria-label="Close selection tools"
            onClick={() => setEditorSelection(null)}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/12 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </form>
  );
};
