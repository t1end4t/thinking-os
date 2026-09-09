import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Target,
  Compass,
  ArrowRight,
  Star,
  ChevronDown,
  ChevronUp,
  Calendar,
  Edit2,
  Check
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { GoalHorizon, GoalItem, GoalStatus, TaskItem, TaskStatus } from '../../productivityTypes';

interface PlanningViewProps {
  onNavigateToPipeline?: (goalId: string) => void;
  onNavigateToReview?: () => void;
}

export function PlanningView({ onNavigateToPipeline }: PlanningViewProps) {
  const { goals, setGoals, tasks, openTaskEditor, setTasks } = useWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState<GoalHorizon>('one-year');
  const [targetDate, setTargetDate] = useState('');
  const [parentGoalId, setParentGoalId] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');

  const fiveYearGoals = goals.filter(goal => goal.horizon === 'five-year');
  const oneYearGoals = goals.filter(goal => goal.horizon === 'one-year');

  const addGoal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    const newGoal: GoalItem = {
      id: `goal-${Date.now().toString(36)}`,
      title: title.trim(),
      description: description.trim(),
      horizon,
      status: 'active',
      targetDate: targetDate || undefined,
      parentGoalId: horizon === 'one-year' && parentGoalId ? parentGoalId : undefined,
      isCurrentFocus: false,
      createdAt: new Date().toISOString(),
      author: 'user',
      lastEditedBy: 'user'
    };

    setGoals(current => [...current, newGoal]);
    setTitle('');
    setDescription('');
    setTargetDate('');
    setParentGoalId('');
  };

  const updateStatus = (goalId: string, status: GoalStatus) => {
    setGoals(current =>
      current.map(goal => (goal.id === goalId ? { ...goal, status, lastEditedBy: 'user' } : goal))
    );
  };

  const toggleFocus = (goalId: string) => {
    setGoals(current =>
      current.map(goal => {
        if (goal.id === goalId) {
          return { ...goal, isCurrentFocus: !goal.isCurrentFocus, lastEditedBy: 'user' };
        }
        // If turning this on, keep single focus or multi? Having 1 clear focus is best for human clarity
        return goal;
      })
    );
  };

  const startEditGoal = (goal: GoalItem) => {
    setEditingGoalId(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description);
    setEditTargetDate(goal.targetDate || '');
  };

  const saveEditGoal = (goalId: string) => {
    setGoals(current =>
      current.map(goal =>
        goal.id === goalId
          ? {
              ...goal,
              title: editTitle.trim() || goal.title,
              description: editDescription.trim(),
              targetDate: editTargetDate || undefined,
              lastEditedBy: 'user'
            }
          : goal
      )
    );
    setEditingGoalId(null);
  };

  const deleteGoal = (id: string) => {
    if (!window.confirm('Delete this goal? Linked tasks will become unassigned.')) return;
    setGoals(current => current.filter(goal => goal.id !== id));
    // Detach goalId from linked tasks
    setTasks(current =>
      current.map(t => (t.goalId === id ? { ...t, goalId: undefined, lastEditedBy: 'user' } : t))
    );
  };

  const advanceTaskStatus = (task: TaskItem) => {
    const cycle: Record<TaskStatus, TaskStatus> = {
      backlog: 'todo',
      todo: 'in-progress',
      'in-progress': 'review',
      review: 'done',
      done: 'backlog'
    };
    const nextStatus = cycle[task.status];
    setTasks(current =>
      current.map(t => (t.id === task.id ? { ...t, status: nextStatus, lastEditedBy: 'user' } : t))
    );
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'in-progress':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'review':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'todo':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800';
    }
  };

  const renderGoal = (goal: GoalItem) => {
    const linkedTasks = tasks.filter(task => task.goalId === goal.id);
    const doneCount = linkedTasks.filter(t => t.status === 'done').length;
    const inProgressCount = linkedTasks.filter(t => t.status === 'in-progress').length;
    const inReviewCount = linkedTasks.filter(t => t.status === 'review').length;
    const todoCount = linkedTasks.filter(t => t.status === 'todo').length;
    const backlogCount = linkedTasks.filter(t => t.status === 'backlog').length;

    const percentDone = linkedTasks.length > 0 ? Math.round((doneCount / linkedTasks.length) * 100) : 0;
    const parent = goal.parentGoalId ? goals.find(candidate => candidate.id === goal.parentGoalId) : null;
    const isExpanded = expandedGoalId === goal.id;
    const isEditing = editingGoalId === goal.id;

    return (
      <article
        key={goal.id}
        id={`goal-card-${goal.id}`}
        className={`rounded-xl border bg-[var(--color-surface)] p-4 transition-all shadow-sm ${
          goal.isCurrentFocus
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'border-[var(--color-rule)] hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        {/* Top bar of goal card */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-[var(--color-ink)]">
                {goal.horizon === 'five-year' ? '5-Year Vision' : '6–12 Month Milestone'}
              </span>

              {goal.isCurrentFocus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[0.6875rem] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <Star size={11} className="fill-amber-500 text-amber-500" />
                  This Week's Focus
                </span>
              )}

              {goal.targetDate && (
                <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                  <Calendar size={11} />
                  {goal.targetDate}
                </span>
              )}

              {parent && (
                <span className="truncate font-mono text-[0.6875rem] text-[var(--accent-indigo)]" title={`Supports: ${parent.title}`}>
                  ↳ {parent.title}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  className="w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-1 font-sans text-sm font-bold text-[var(--color-ink)]"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                />
                <textarea
                  className="w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-1 font-sans text-xs text-[var(--color-ink)]"
                  rows={2}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-1 font-mono text-xs text-[var(--color-ink)]"
                    value={editTargetDate}
                    onChange={e => setEditTargetDate(e.target.value)}
                  />
                  <button
                    className="rounded bg-indigo-600 px-2 py-1 font-mono text-xs text-white hover:bg-indigo-700"
                    onClick={() => saveEditGoal(goal.id)}
                  >
                    Save
                  </button>
                  <button
                    className="rounded border border-[var(--color-rule)] px-2 py-1 font-mono text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)]"
                    onClick={() => setEditingGoalId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="mt-2 text-sm font-bold leading-tight text-[var(--color-ink)]">{goal.title}</h3>
                {goal.description && (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">{goal.description}</p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                onClick={() => startEditGoal(goal)}
                title="Edit goal"
                aria-label="Edit goal"
              >
                <Edit2 size={13} />
              </button>
            )}
            <button
              className="p-1 text-[var(--color-ink-muted)] hover:text-red-600"
              onClick={() => deleteGoal(goal.id)}
              aria-label={`Delete ${goal.title}`}
              title="Delete goal"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Multi-segment Progress Bar for 1-year goals */}
        {goal.horizon === 'one-year' && (
          <div className="mt-3.5 space-y-1.5 border-t border-[var(--color-rule)] pt-3">
            <div className="flex items-center justify-between font-mono text-[0.6875rem]">
              <span className="font-semibold text-[var(--color-ink)]">
                {doneCount}/{linkedTasks.length} tasks completed ({percentDone}%)
              </span>
              <div className="flex items-center gap-2 text-[var(--color-ink-muted)]">
                {inProgressCount > 0 && <span className="text-indigo-600 dark:text-indigo-400">{inProgressCount} active</span>}
                {inReviewCount > 0 && <span className="text-amber-600 dark:text-amber-400">{inReviewCount} review</span>}
                {todoCount > 0 && <span>{todoCount} todo</span>}
                {backlogCount > 0 && <span>{backlogCount} backlog</span>}
              </div>
            </div>

            {/* Segmented bar */}
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              {linkedTasks.length === 0 ? (
                <div className="h-full w-full bg-slate-200 dark:bg-slate-800" />
              ) : (
                <>
                  <div style={{ width: `${(doneCount / linkedTasks.length) * 100}%` }} className="h-full bg-emerald-500" title={`Done: ${doneCount}`} />
                  <div style={{ width: `${(inReviewCount / linkedTasks.length) * 100}%` }} className="h-full bg-amber-500" title={`In Review: ${inReviewCount}`} />
                  <div style={{ width: `${(inProgressCount / linkedTasks.length) * 100}%` }} className="h-full bg-indigo-500" title={`In Progress: ${inProgressCount}`} />
                  <div style={{ width: `${(todoCount / linkedTasks.length) * 100}%` }} className="h-full bg-slate-400" title={`To Do: ${todoCount}`} />
                  <div style={{ width: `${(backlogCount / linkedTasks.length) * 100}%` }} className="h-full bg-slate-300 dark:bg-slate-600" title={`Backlog: ${backlogCount}`} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Controls and Links */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-rule)] pt-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[var(--color-rule)] p-0.5 bg-[var(--color-paper)]">
              {(['active', 'paused', 'achieved'] as const).map(st => {
                const isSelected = goal.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateStatus(goal.id, st)}
                    className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono capitalize transition-all ${
                      isSelected
                        ? 'bg-[var(--color-surface)] text-[var(--color-ink)] font-bold shadow-2xs'
                        : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>

            {goal.horizon === 'one-year' && (
              <button
                className={`inline-flex h-7 items-center gap-1 rounded border px-2 font-mono text-[0.6875rem] transition-colors ${
                  goal.isCurrentFocus
                    ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                    : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
                onClick={() => toggleFocus(goal.id)}
                title={goal.isCurrentFocus ? 'Remove from weekly focus' : 'Set as primary focus for this week'}
              >
                <Star size={12} className={goal.isCurrentFocus ? 'fill-amber-500 text-amber-500' : ''} />
                {goal.isCurrentFocus ? 'Focus active' : 'Set as focus'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {goal.horizon === 'one-year' && (
              <>
                <button
                  className="inline-flex h-7 items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2.5 font-mono text-[0.6875rem] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
                  onClick={() => onNavigateToPipeline?.(goal.id)}
                  title="View this goal and its tasks on the Kanban Pipeline"
                >
                  <ArrowRight size={12} />
                  Open in Pipeline
                </button>

                <button
                  className="kanban-primary-add-btn h-7 px-2 text-[0.6875rem]"
                  onClick={() => openTaskEditor(undefined, 'todo', goal.id)}
                  title="Add new task assigned to this goal"
                >
                  <Plus size={12} />
                  Task
                </button>
              </>
            )}

            {linkedTasks.length > 0 && (
              <button
                className="inline-flex h-7 items-center gap-1 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 font-mono text-[0.6875rem] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                title="Toggle linked tasks list"
              >
                <span>{linkedTasks.length}</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div>

        {/* Expandable tasks drawer */}
        {isExpanded && linkedTasks.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-2.5">
            <div className="flex items-center justify-between font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
              <span>Linked tasks in pipeline:</span>
              <span className="text-[0.625rem]">Click status to advance</span>
            </div>
            {linkedTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 rounded border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs transition-colors hover:border-indigo-300"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer truncate font-medium text-[var(--color-ink)] hover:text-indigo-600"
                  onClick={() => openTaskEditor(task.id, task.status)}
                  title="Edit task in panel"
                >
                  <span className="mr-1.5 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">{task.id}</span>
                  {task.title}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => advanceTaskStatus(task)}
                    className={`rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase font-semibold transition-transform active:scale-95 ${getStatusBadge(
                      task.status
                    )}`}
                    title="Click to cycle status"
                  >
                    {task.status}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-paper)] p-4 sm:p-6" id="planning-direction-view">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.55fr)]">
        {/* Form: Add Direction or Milestone */}
        <form
          onSubmit={addGoal}
          className="h-fit rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-4 shadow-sm lg:sticky lg:top-4"
        >
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[var(--accent-indigo)]" />
            <h2 className="text-sm font-bold text-[var(--color-ink)]">Define Direction / Milestone</h2>
          </div>
          <p className="mb-4 mt-1 text-xs leading-5 text-[var(--color-ink-muted)]">
            A healthy research pipeline maintains 1–2 five-year North Stars, and 2–4 annual milestones.
          </p>

          <div className="space-y-3.5">
            <div className="form-field">
              <label htmlFor="goal-title">Key Outcome</label>
              <input
                id="goal-title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="e.g. Submit reproducible long-context paper"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="goal-description">Scope & Falsifiable Conditions</label>
              <textarea
                id="goal-description"
                rows={3}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="What observable evidence, benchmark, or artifact determines success?"
              />
            </div>

            <div className="form-field">
              <label id="goal-horizon-label">Horizon</label>
              <div role="radiogroup" aria-labelledby="goal-horizon-label" className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: 'one-year' as const, label: '6–12 Months', sub: 'Actionable Milestone' },
                  { id: 'five-year' as const, label: '5 Years', sub: 'North Star Vision' }
                ].map(item => {
                  const isSelected = horizon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setHorizon(item.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] shadow-xs'
                          : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      <div className="font-mono text-xs font-bold text-[var(--color-ink)]">{item.label}</div>
                      <div className="text-[0.6875rem] text-[var(--color-ink-muted)]">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="goal-date">Target Date</label>
              <input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={event => setTargetDate(event.target.value)}
              />
            </div>

            {horizon === 'one-year' && fiveYearGoals.length > 0 && (
              <div className="form-field">
                <label id="goal-parent-label">Anchor to 5-Year Vision</label>
                <div role="radiogroup" aria-labelledby="goal-parent-label" className="space-y-1 pt-1 max-h-36 overflow-y-auto pr-1">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!parentGoalId}
                    onClick={() => setParentGoalId('')}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                      !parentGoalId
                        ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-medium text-[var(--color-ink)]'
                        : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <span>No parent vision (Independent)</span>
                    {!parentGoalId && <Check size={13} className="text-[var(--accent-indigo)]" />}
                  </button>
                  {fiveYearGoals.map(g => {
                    const isSelected = parentGoalId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setParentGoalId(g.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                          isSelected
                            ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-medium text-[var(--color-ink)]'
                            : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        <span className="truncate">{g.title}</span>
                        {isSelected && <Check size={13} className="text-[var(--accent-indigo)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              className="kanban-primary-add-btn w-full justify-center"
              type="submit"
              disabled={!title.trim()}
            >
              <Plus size={14} />
              <span>Create Goal Milestone</span>
            </button>
          </div>
        </form>

        {/* Goals Directory */}
        <div className="space-y-6">
          <GoalSection
            title="5-Year Strategic Horizons (North Stars)"
            description="The enduring research questions and overarching program goals."
            count={fiveYearGoals.length}
            icon={<Compass size={15} className="text-indigo-600 dark:text-indigo-400" />}
          >
            {fiveYearGoals.length ? (
              fiveYearGoals.map(renderGoal)
            ) : (
              <EmptyGoal label="No 5-year North Stars defined yet. Create one to anchor your research trajectory." />
            )}
          </GoalSection>

          <GoalSection
            title="6–12 Month Concrete Milestones"
            description="Executable goals that group daily Kanban pipeline tasks and define weekly review focus."
            count={oneYearGoals.length}
            icon={<Target size={15} className="text-emerald-600 dark:text-emerald-400" />}
            grid
          >
            {oneYearGoals.length ? (
              oneYearGoals.map(renderGoal)
            ) : (
              <EmptyGoal label="No annual milestones yet. Break down your 5-year direction into concrete 6-12 month targets." />
            )}
          </GoalSection>
        </div>
      </div>
    </div>
  );
}

function GoalSection({
  title,
  description,
  count,
  grid = false,
  icon,
  children
}: {
  title: string;
  description: string;
  count: number;
  grid?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] pb-2">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-bold text-[var(--color-ink)]">{title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{description}</p>
        </div>
        <span className="font-mono text-xs font-semibold text-[var(--color-ink-muted)]">{count}</span>
      </div>
      <div className={`grid gap-3.5 ${grid ? 'md:grid-cols-2' : ''}`}>{children}</div>
    </section>
  );
}

function EmptyGoal({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] p-8 text-center text-xs leading-5 text-[var(--color-ink-muted)]">
      {label}
    </div>
  );
}
