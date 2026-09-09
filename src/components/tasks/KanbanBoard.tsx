import { useState, DragEvent, useEffect } from 'react';
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
  Target,
  ArrowRight,
  Star,
  Compass,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Link as LinkIcon
} from 'lucide-react';
import { TaskItem, TaskStatus, TaskPriority, KanbanColumn, GoalItem } from '../../productivityTypes';
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

  if (diffSec < 45) {
    return 'just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin}m ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour}h ago`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    return diffDay === 1 ? '1 day ago' : `${diffDay}d ago`;
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) {
    return diffWeek === 1 ? '1 week ago' : `${diffWeek}w ago`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return diffMonth <= 1 ? '1 month ago' : `${diffMonth}mo ago`;
  }

  const diffYear = Math.floor(diffDay / 365);
  return diffYear <= 1 ? '1 year ago' : `${diffYear}y ago`;
}

interface KanbanBoardProps {
  initialGoalFilter?: string | null;
  onNavigateToDirection?: () => void;
  onNavigateToReview?: () => void;
}

export function KanbanBoard({ initialGoalFilter, onNavigateToDirection, onNavigateToReview }: KanbanBoardProps) {
  const { tasks, setTasks, goals, weeklyReviews, openTaskEditor, taskEditor } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>(initialGoalFilter ?? 'all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [quickAssignTaskId, setQuickAssignTaskId] = useState<string | null>(null);

  // Sync if parent updates initialGoalFilter
  useEffect(() => {
    if (initialGoalFilter !== undefined) {
      setGoalFilter(initialGoalFilter ?? 'all');
    }
  }, [initialGoalFilter]);

  const deleteTask = (id: string) => {
    setTasks(current => current.filter(t => t.id !== id));
  };

  const advanceTaskStatus = (task: TaskItem) => {
    const cycle: Record<TaskStatus, TaskStatus> = {
      backlog: 'todo',
      todo: 'in-progress',
      'in-progress': 'review',
      review: 'done',
      done: 'todo'
    };
    const next = cycle[task.status];
    setTasks(current =>
      current.map(t => (t.id === task.id ? { ...t, status: next, lastEditedBy: 'user' } : t))
    );
  };

  const assignTaskGoal = (taskId: string, targetGoalId: string) => {
    setTasks(current =>
      current.map(t =>
        t.id === taskId ? { ...t, goalId: targetGoalId || undefined, lastEditedBy: 'user' } : t
      )
    );
    setQuickAssignTaskId(null);
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
    const matchesGoal =
      goalFilter === 'all'
        ? true
        : goalFilter === 'unassigned'
        ? !task.goalId
        : task.goalId === goalFilter;

    return matchesSearch && matchesPriority && matchesTag && matchesGoal;
  });

  const allTags = Array.from(new Set(tasks.map(t => t.tag))).filter(Boolean);
  const oneYearGoals = goals.filter(g => g.horizon === 'one-year');
  const currentFocusGoal = oneYearGoals.find(g => g.isCurrentFocus && g.status === 'active');
  const unassignedTasksCount = tasks.filter(t => !t.goalId).length;

  // Selected goal details if filtered
  const selectedGoal = goals.find(g => g.id === goalFilter);
  const selectedGoalTasks = selectedGoal ? tasks.filter(t => t.goalId === selectedGoal.id) : [];
  const selectedGoalDone = selectedGoalTasks.filter(t => t.status === 'done').length;

  // Recent weekly review status
  const latestReview = [...weeklyReviews].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];

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
      {/* Active Focus or Filter Banner */}
      {selectedGoal && (
        <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-white">
              <Target size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Active Milestone Filter:
                </span>
                <span className="font-bold text-[var(--color-ink)]">{selectedGoal.title}</span>
                {selectedGoal.isCurrentFocus && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[0.625rem] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Star size={10} className="fill-amber-500 text-amber-500" />
                    Weekly Focus
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                <span>
                  Progress: {selectedGoalDone}/{selectedGoalTasks.length} done ({selectedGoalTasks.length > 0 ? Math.round((selectedGoalDone / selectedGoalTasks.length) * 100) : 0}%)
                </span>
                {selectedGoal.targetDate && <span>Target: {selectedGoal.targetDate}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToDirection}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300"
            >
              <Compass size={13} />
              View in Direction
            </button>
            <button
              onClick={() => setGoalFilter('all')}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <X size={13} />
              Show All Tasks
            </button>
          </div>
        </div>
      )}

      {goalFilter === 'unassigned' && (
        <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-600 text-white">
              <AlertCircle size={15} />
            </div>
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Displaying {filteredTasks.length} Unassigned Tasks (Strategic Drift)
              </span>
              <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                Tasks without a 6–12 month milestone risk becoming aimless chores. Assign them to a goal or triage in Weekly Review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToReview}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
            >
              <CalendarCheck2 size={13} />
              Triage in Weekly Review
            </button>
            <button
              onClick={() => setGoalFilter('all')}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <X size={13} />
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Goal Quick-Filter Chips Bar */}
      <div className="mx-6 mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="mr-1 flex items-center gap-1 font-mono text-[0.6875rem] uppercase text-[var(--color-ink-muted)]">
          <Target size={12} />
          Milestones:
        </span>

        <button
          onClick={() => setGoalFilter('all')}
          className={`rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] transition-colors ${
            goalFilter === 'all'
              ? 'border-indigo-600 bg-indigo-600 text-white font-bold'
              : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          All ({tasks.length})
        </button>

        {currentFocusGoal && (
          <button
            onClick={() => setGoalFilter(currentFocusGoal.id)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] transition-colors ${
              goalFilter === currentFocusGoal.id
                ? 'border-amber-500 bg-amber-500 text-white font-bold'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            <Star size={11} className={goalFilter === currentFocusGoal.id ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'} />
            Focus: {currentFocusGoal.title.slice(0, 24)}... ({tasks.filter(t => t.goalId === currentFocusGoal.id).length})
          </button>
        )}

        {oneYearGoals
          .filter(g => !g.isCurrentFocus)
          .map(goal => {
            const count = tasks.filter(t => t.goalId === goal.id).length;
            const isSelected = goalFilter === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => setGoalFilter(isSelected ? 'all' : goal.id)}
                className={`rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] transition-colors ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white font-bold'
                    : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
                title={goal.title}
              >
                {goal.title.length > 28 ? `${goal.title.slice(0, 28)}...` : goal.title} ({count})
              </button>
            );
          })}

        {unassignedTasksCount > 0 && (
          <button
            onClick={() => setGoalFilter(goalFilter === 'unassigned' ? 'all' : 'unassigned')}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] transition-colors ${
              goalFilter === 'unassigned'
                ? 'border-amber-600 bg-amber-600 text-white font-bold'
                : 'border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            <AlertCircle size={11} />
            Unassigned Drift ({unassignedTasksCount})
          </button>
        )}
      </div>

      {/* Controls Bar */}
      <div className="kanban-controls-bar" id="kanban-controls">
        <div className="kanban-search-box">
          <Search size={14} className="kanban-search-icon" />
          <input
            id="kanban-search-input"
            type="text"
            placeholder="Search by title, id, tag, description..."
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
                    #{tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Weekly review link button in toolbar */}
          {onNavigateToReview && (
            <button
              onClick={onNavigateToReview}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 font-mono text-xs text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)]"
              title="Open Weekly Review surface to reflect, check alignment, and plan next week"
            >
              <CalendarCheck2 size={13} className="text-[var(--accent-indigo)]" />
              <span>
                {latestReview
                  ? `Review: ${latestReview.status === 'complete' ? 'Completed' : 'Draft'}`
                  : 'Start Review'}
              </span>
            </button>
          )}

          <button
            id="kanban-add-task-btn"
            className="kanban-primary-add-btn"
            onClick={() => openTaskEditor(undefined, 'todo', goalFilter !== 'all' && goalFilter !== 'unassigned' ? goalFilter : undefined)}
          >
            <Plus size={14} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="kanban-board-scroll-area" id="kanban-board-grid">
        <div className="kanban-board-columns">
          {COLUMNS.map(column => {
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
                    onClick={() =>
                      openTaskEditor(
                        undefined,
                        column.id,
                        goalFilter !== 'all' && goalFilter !== 'unassigned' ? goalFilter : undefined
                      )
                    }
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
                        onClick={() =>
                          openTaskEditor(
                            undefined,
                            column.id,
                            goalFilter !== 'all' && goalFilter !== 'unassigned' ? goalFilter : undefined
                          )
                        }
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
                      const isQuickAssigning = quickAssignTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          id={`task-card-${task.id}`}
                          className={`kanban-card group ${draggedTaskId === task.id ? 'is-dragging' : ''} ${
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

                          {/* Connected Goal Milestone Badge */}
                          {goal ? (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setGoalFilter(goal.id);
                              }}
                              className="flex items-center gap-1 truncate rounded border border-indigo-200 bg-indigo-50/90 px-2 py-1 text-left font-mono text-[0.6875rem] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900/80 dark:bg-indigo-950/60 dark:text-indigo-300"
                              title={`Click to filter board by goal: ${goal.title}`}
                            >
                              <Target size={11} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                              <span className="truncate">{goal.title}</span>
                            </button>
                          ) : (
                            <div className="relative">
                              {isQuickAssigning ? (
                                <div className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 space-y-1">
                                  <div className="flex items-center justify-between font-mono text-[0.625rem] text-amber-800 dark:text-amber-200">
                                    <span>Select Milestone</span>
                                    <button
                                      onClick={() => setQuickAssignTaskId(null)}
                                      className="p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                                    {oneYearGoals.map(g => (
                                      <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => {
                                          assignTaskGoal(task.id, g.id);
                                          setQuickAssignTaskId(null);
                                        }}
                                        className="w-full text-left p-1 rounded bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-mono text-[0.6875rem] text-[var(--color-ink)] truncate block"
                                      >
                                        {g.title}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setQuickAssignTaskId(task.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-dashed border-amber-300 bg-amber-50/50 px-2 py-0.5 font-mono text-[0.6875rem] text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-300"
                                  title="Connect this unassigned task to a 6-12 month milestone"
                                >
                                  <LinkIcon size={10} />
                                  <span>+ Link Milestone</span>
                                </button>
                              )}
                            </div>
                          )}

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
                              {/* Quick Advance Button */}
                              <button
                                className="card-action-btn hover:text-indigo-600"
                                onClick={() => advanceTaskStatus(task)}
                                title={`Advance status (currently: ${task.status})`}
                                aria-label="Advance task status"
                              >
                                <ChevronRight size={13} />
                              </button>
                              <button
                                className="card-action-btn"
                                onClick={() => openTaskEditor(task.id, task.status)}
                                title="Edit task details"
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
