import { useState, DragEvent } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Tag,
  SlidersHorizontal,
  Clock,
  GripVertical,
  Bot,
  User,
  Target
} from 'lucide-react';
import { TaskItem, TaskStatus, TaskPriority, KanbanColumn } from '../../productivityTypes';
import { setDragObjectData, parseDroppedWorkspaceObject } from '../../utils/dragDrop';
import { useWorkspace } from '../../context/WorkspaceContext';

const COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', description: 'Queued ideas and unassigned work', accentColor: '#94a3b8' },
  { id: 'todo', title: 'To Do', description: 'Ready to be executed next', accentColor: '#64748b' },
  { id: 'in-progress', title: 'In Progress', description: 'Actively running or being drafted', accentColor: '#4f46e5' },
  { id: 'review', title: 'In Review', description: 'Under verification and validation', accentColor: '#f59e0b' },
  { id: 'done', title: 'Done', description: 'Completed and verified', accentColor: '#10b981' }
];

export function formatTaskTimestamp(timeStr: string | number | undefined): string {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  if (!str) return '';

  const lower = str.toLowerCase();
  if (lower === 'just now' || lower.endsWith(' ago')) {
    return str;
  }

  let timestamp: number | null = null;
  if (/^\d{10,14}$/.test(str)) {
    const num = Number(str);
    timestamp = str.length === 10 ? num * 1000 : num;
  } else {
    const isoCandidate = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
    let parsed = Date.parse(isoCandidate);
    if (isNaN(parsed)) {
      parsed = Date.parse(str.replace(/-/g, '/'));
    }
    if (!isNaN(parsed)) {
      timestamp = parsed;
    }
  }

  if (timestamp === null || isNaN(timestamp)) {
    return str;
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  // If created within 45s or slight future drift
  if (diffSec < 45) {
    return 'just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) {
    return diffWeek === 1 ? '1 week ago' : `${diffWeek} weeks ago`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return diffMonth <= 1 ? '1 month ago' : `${diffMonth} months ago`;
  }

  const diffYear = Math.floor(diffDay / 365);
  return diffYear <= 1 ? '1 year ago' : `${diffYear} years ago`;
}


export function KanbanBoard() {
  const { tasks, setTasks, goals, openTaskEditor, taskEditor } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const deleteTask = (id: string) => {
    setTasks(current => current.filter(t => t.id !== id));
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent, task: TaskItem) => {
    setDraggedTaskId(task.id);
    setDragObjectData(e, {
      objectType: 'task',
      id: task.id,
      title: task.title,
      subtitle: `Status: ${task.status}`,
      details: task.description,
      meta: {
        priority: task.priority,
        tag: task.tag,
        status: task.status,
        createdAt: task.createdAt
      }
    });
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDrop = (e: DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const droppedObj = parseDroppedWorkspaceObject(e);
    const taskId = droppedObj?.objectType === 'task' ? droppedObj.id : (e.dataTransfer.getData('text/plain') || draggedTaskId);
    if (taskId) {
      setTasks(current =>
        current.map(task => (task.id === taskId ? { ...task, status: targetStatus, lastEditedBy: 'user' } : task))
      );
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesTag = tagFilter === 'all' || task.tag === tagFilter;
    const matchesGoal = goalFilter === 'all' || (goalFilter === 'unassigned' ? !task.goalId : task.goalId === goalFilter);
    return matchesSearch && matchesPriority && matchesTag && matchesGoal;
  });

  const allTags = Array.from(new Set(tasks.map(t => t.tag))).filter(Boolean);

  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'kanban-badge urgent';
      case 'high':
        return 'kanban-badge high';
      case 'medium':
        return 'kanban-badge medium';
      case 'low':
        return 'kanban-badge low';
      default:
        return 'kanban-badge';
    }
  };

  return (
    <div className="kanban-container" id="kanban-pipeline-view">
      {/* Controls Bar */}
      <div className="kanban-controls-bar" id="kanban-controls">
        <div className="kanban-search-box">
          <Search size={14} className="kanban-search-icon" />
          <input
            id="kanban-search-input"
            type="text"
            placeholder="Filter tasks by name, id, tag, description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              id="clear-search-btn"
              className="kanban-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="kanban-filters-row">
          <div className="kanban-filter-select-wrap">
            <SlidersHorizontal size={13} className="filter-icon" />
            <select
              id="kanban-priority-filter"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {allTags.length > 0 && (
            <div className="kanban-filter-select-wrap">
              <Tag size={13} className="filter-icon" />
              <select
                id="kanban-tag-filter"
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {goals.length > 0 && (
            <div className="kanban-filter-select-wrap">
              <Target size={13} className="filter-icon" />
              <select value={goalFilter} onChange={event => setGoalFilter(event.target.value)} aria-label="Filter by goal">
                <option value="all">All Goals</option>
                <option value="unassigned">Unassigned</option>
                {goals.filter(goal => goal.horizon === 'one-year').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
              </select>
            </div>
          )}

          <button
            id="kanban-add-task-btn"
            className="kanban-primary-add-btn"
            onClick={() => openTaskEditor(undefined, 'todo')}
          >
            <Plus size={14} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="kanban-board-scroll-area" id="kanban-board-grid">
        <div className="kanban-board-columns">
          {COLUMNS.map((column, colIdx) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
            const isOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                id={`kanban-column-${column.id}`}
                className={`kanban-column ${isOver ? 'drag-over' : ''}`}
                onDragOver={e => handleDragOver(e, column.id)}
                onDrop={e => handleDrop(e, column.id)}
              >
                <div className="kanban-column-header">
                  <div className="kanban-column-title-wrap">
                    <span
                      className="kanban-column-dot"
                      style={{ backgroundColor: column.accentColor }}
                    />
                    <h2 className="kanban-column-title">{column.title}</h2>
                    <span className="kanban-column-count">{columnTasks.length}</span>
                  </div>
                  <button
                    id={`add-task-col-${column.id}`}
                    className="kanban-column-add-icon-btn"
                    onClick={() => openTaskEditor(undefined, column.id)}
                    title={`Add task to ${column.title}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="kanban-column-body">
                  {columnTasks.length === 0 ? (
                    <div className="kanban-empty-column-placeholder">
                      <span>No tasks in {column.title.toLowerCase()}</span>
                      <button
                        className="kanban-empty-create-btn"
                        onClick={() => openTaskEditor(undefined, column.id)}
                      >
                        + Create one
                      </button>
                    </div>
                  ) : (
                    columnTasks.map(task => {
                      const isAiOrigin =
                        task.lastEditedBy === 'model' ||
                        task.author === 'model' ||
                        Boolean(task.lastEditedBy?.startsWith('model:'));
                      const goal = goals.find(candidate => candidate.id === task.goalId);

                      return (
                        <div
                          key={task.id}
                          id={`task-card-${task.id}`}
                          className={`kanban-card ${draggedTaskId === task.id ? 'is-dragging' : ''} ${
                            taskEditor?.taskId === task.id ? 'is-selected ring-2 ring-indigo-500/40' : ''
                          } ${isAiOrigin ? 'model-hatched border-l-2 border-indigo-500/80' : ''}`}
                          draggable
                          onDragStart={e => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          title="Drag to move across columns or drop onto Assistant chat"
                        >
                          <div className="kanban-card-top">
                            <div className="kanban-card-id-group">
                              <GripVertical size={13} className="drag-grip" />
                              <span className="kanban-card-id">{task.id}</span>
                            </div>
                            <span className={getPriorityBadgeClass(task.priority)}>
                              {task.priority === 'urgent' && <AlertCircle size={10} />}
                              {task.priority}
                            </span>
                          </div>

                          <h3 className="kanban-card-title">{task.title}</h3>

                          {task.description && (
                            <p className="kanban-card-desc">{task.description}</p>
                          )}

                          {goal && <div className="truncate rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-mono text-[0.6875rem] text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300" title={goal.title}>Goal: {goal.title}</div>}

                          <div className="kanban-card-footer">
                            <div className="kanban-card-meta">
                              <span className="kanban-card-tag">#{task.tag}</span>
                              <span
                                className={`kanban-edit-origin ${isAiOrigin ? 'assistant' : 'human'}`}
                                title={
                                  isAiOrigin
                                    ? 'Created or drafted by AI (model)'
                                    : 'Created or edited by a human (user)'
                                }
                              >
                                {isAiOrigin ? <Bot size={9} /> : <User size={9} />}
                                {isAiOrigin ? 'AI' : 'Human'}
                              </span>
                              <span className="kanban-card-time" title={`Created: ${task.createdAt}`}>
                                <Clock size={10} />
                                <span>{formatTaskTimestamp(task.createdAt)}</span>
                              </span>
                            </div>

                            <div className="kanban-card-actions">
                              <button
                                className="card-action-btn"
                                onClick={() => openTaskEditor(task.id, task.status)}
                                title="Edit task"
                                aria-label="Edit task"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                className="card-action-btn delete"
                                onClick={() => deleteTask(task.id)}
                                title="Delete task"
                                aria-label="Delete task"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
