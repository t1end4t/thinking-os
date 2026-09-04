import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskItem, TaskPriority, TaskStatus } from '../../productivityTypes';

const STATUS_OPTIONS: { id: TaskStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'In Review' },
  { id: 'done', title: 'Done' }
];

export const TaskEditorPanel: React.FC = () => {
  const { taskEditor, tasks, setTasks, closeTaskEditor } = useWorkspace();
  const editingTask = taskEditor?.taskId ? tasks.find(task => task.id === taskEditor.taskId) ?? null : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tag, setTag] = useState('task');

  useEffect(() => {
    setTitle(editingTask?.title ?? '');
    setDescription(editingTask?.description ?? '');
    setStatus(editingTask?.status ?? taskEditor?.defaultStatus ?? 'todo');
    setPriority(editingTask?.priority ?? 'medium');
    setTag(editingTask?.tag ?? 'task');
  }, [editingTask?.id, taskEditor?.taskId, taskEditor?.defaultStatus]);

  if (!taskEditor) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    const fields = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      tag: tag.trim() || 'task',
      lastEditedBy: 'user' as const
    };

    if (editingTask) {
      setTasks(current => current.map(task => (task.id === editingTask.id ? { ...task, ...fields } : task)));
    } else {
      const newTask: TaskItem = {
        id: `task-${Date.now().toString().slice(-4)}`,
        createdAt: 'Just now',
        author: 'user',
        ...fields
      };
      setTasks(current => [newTask, ...current]);
    }
    closeTaskEditor();
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto kanban-modal-form" id="task-editor-panel">
      <div className="form-field">
        <label htmlFor="task-title-input">Task Title *</label>
        <input
          id="task-title-input"
          type="text"
          required
          autoFocus
          placeholder="e.g. Profile kernel latency for quantized weights"
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="task-desc-input">Description</label>
        <textarea
          id="task-desc-input"
          rows={5}
          placeholder="Detailed execution criteria, flags, or notes..."
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="task-status-select">Status / Column</label>
          <select id="task-status-select" value={status} onChange={event => setStatus(event.target.value as TaskStatus)}>
            {STATUS_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>{option.title}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="task-priority-select">Priority</label>
          <select id="task-priority-select" value={priority} onChange={event => setPriority(event.target.value as TaskPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="task-tag-input">Tag / Category</label>
        <input
          id="task-tag-input"
          type="text"
          placeholder="service, runner, model, runtime..."
          value={tag}
          onChange={event => setTag(event.target.value)}
        />
      </div>

      {editingTask && (
        <p className="text-[10px] font-mono text-[var(--color-ink-muted)]">
          Created by {editingTask.author === 'user' ? 'human' : editingTask.author ?? 'human'} · last edited by{' '}
          {editingTask.lastEditedBy === 'user' ? 'human' : editingTask.lastEditedBy ?? 'human'}
        </p>
      )}

      <div className="kanban-modal-footer">
        <button type="button" className="kanban-modal-cancel-btn" onClick={closeTaskEditor}>
          <X size={13} />
          Cancel
        </button>
        <button type="submit" id="save-task-btn" className="kanban-modal-save-btn" disabled={!title.trim()}>
          <Check size={14} />
          <span>{editingTask ? 'Update Task' : 'Add to Board'}</span>
        </button>
      </div>
    </form>
  );
};
