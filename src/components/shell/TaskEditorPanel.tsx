import React, { useEffect, useState } from 'react';
import { Check, X, Sparkles, User, Bot, RefreshCw } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskItem, TaskPriority, TaskStatus } from '../../productivityTypes';

const STATUS_OPTIONS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'In Review' },
  { id: 'done', title: 'Done' }
];

interface TaskEditorPanelProps {
  embedded?: boolean;
}

export const TaskEditorPanel: React.FC<TaskEditorPanelProps> = ({ embedded = false }) => {
  const {
    taskEditor,
    tasks,
    setTasks,
    closeTaskEditor,
    taskDraft,
    setTaskDraft,
    applyAiDraftToEditor
  } = useWorkspace();

  const editingTask = taskEditor?.taskId ? tasks.find(task => task.id === taskEditor.taskId) ?? null : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tag, setTag] = useState('task');
  const [isAiDrafted, setIsAiDrafted] = useState(false);

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

  const handleAiSuggest = () => {
    applyAiDraftToEditor(title ? `Chi tiết hóa task: ${title}` : undefined);
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
      className={`flex flex-col bg-[var(--color-surface)] ${
        embedded
          ? 'border-b border-[var(--color-rule)] p-3.5 gap-3 max-h-[50vh] overflow-y-auto'
          : 'flex-1 min-h-0 overflow-y-auto kanban-modal-form'
      }`}
      id="task-editor-panel"
    >
      {/* Header bar with Mode and Provenance flag */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
            {editingTask ? `Edit Task [${editingTask.id}]` : 'Create Task'}
          </span>
          {isAiDrafted ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
              title="Content drafted by Assistant. Will save with author: model flag."
            >
              <Sparkles size={10} className="text-indigo-500 animate-pulse" />
              AI Drafted
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              title="Manual human input. Will save with author: user flag."
            >
              <User size={10} />
              Human Edit
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAiSuggest}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
          title="Assistant fills or enriches task description and details"
        >
          <Sparkles size={12} />
          <span>AI Auto-fill</span>
        </button>
      </div>

      <div className="form-field">
        <div className="flex items-center justify-between">
          <label htmlFor="task-title-input" className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
            Task Title *
          </label>
        </div>
        <input
          id="task-title-input"
          type="text"
          required
          autoFocus={!embedded}
          placeholder="e.g. Build neural kernel benchmark pipeline"
          value={title}
          onChange={event => {
            setTitle(event.target.value);
          }}
          className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono rounded border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="form-field">
        <div className="flex items-center justify-between">
          <label htmlFor="task-desc-input" className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
            Description / Execution Criteria
          </label>
        </div>
        <textarea
          id="task-desc-input"
          rows={embedded ? 3 : 5}
          placeholder="Execution criteria, notes, or ask assistant in chat below to draft this..."
          value={description}
          onChange={event => {
            setDescription(event.target.value);
          }}
          className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono rounded border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="form-field">
          <label htmlFor="task-status-select" className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
            Status / Column
          </label>
          <select
            id="task-status-select"
            value={status}
            onChange={event => setStatus(event.target.value as TaskStatus)}
            className="w-full mt-1 px-2 py-1.5 text-xs font-mono rounded border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="task-priority-select" className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
            Priority
          </label>
          <select
            id="task-priority-select"
            value={priority}
            onChange={event => setPriority(event.target.value as TaskPriority)}
            className="w-full mt-1 px-2 py-1.5 text-xs font-mono rounded border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="task-tag-input" className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
          Tag / Category
        </label>
        <input
          id="task-tag-input"
          type="text"
          placeholder="service, runner, model, runtime, backlog..."
          value={tag}
          onChange={event => setTag(event.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 text-xs font-mono rounded border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none"
        />
      </div>

      {editingTask && (
        <p className="text-[10px] font-mono text-[var(--color-ink-muted)] flex items-center gap-1.5">
          <span>Tác giả ban đầu:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {editingTask.author === 'model' ? 'AI (model)' : 'Human (user)'}
          </span>
          <span>· Sửa lần cuối:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {editingTask.lastEditedBy === 'model' ? 'AI (model)' : 'Human (user)'}
          </span>
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-rule)]/60">
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-mono rounded border border-[var(--color-rule)] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors"
          onClick={closeTaskEditor}
        >
          <X size={13} />
          <span>Hủy (Cancel)</span>
        </button>
        <button
          type="submit"
          id="save-task-btn"
          className="px-3 py-1.5 text-xs font-mono rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow-xs"
          disabled={!title.trim()}
        >
          <Check size={14} />
          <span>{editingTask ? 'Lưu cập nhật' : 'Lưu vào Board'}</span>
        </button>
      </div>
    </form>
  );
};
