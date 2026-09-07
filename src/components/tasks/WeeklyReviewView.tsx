import { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  Check,
  Plus,
  RotateCcw,
  Save,
  Target,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Star,
  Compass,
  FileText,
  Eye,
  Edit3,
  Layers,
  ChevronRight,
  ListTodo,
  Trophy,
  HelpCircle
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskItem, TaskStatus, WeeklyReviewItem } from '../../productivityTypes';

interface WeeklyReviewViewProps {
  onNavigateToPipeline?: (goalId?: string) => void;
  onNavigateToDirection?: () => void;
}

type ReviewTab = 'harvest' | 'alignment' | 'planning' | 'notes';

export function WeeklyReviewView({ onNavigateToPipeline, onNavigateToDirection }: WeeklyReviewViewProps) {
  const { weeklyReviews, setWeeklyReviews, goals, setGoals, tasks, setTasks, openTaskEditor } = useWorkspace();

  // Helper to calculate current week's Monday date string (YYYY-MM-DD)
  const currentWeekMonday = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  }, []);

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (weeklyReviews.length > 0) {
      const sorted = [...weeklyReviews].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
      return sorted[0].id;
    }
    return '';
  });

  const [activeTab, setActiveTab] = useState<ReviewTab>('harvest');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskGoalId, setNewTaskGoalId] = useState('');

  const selectedReview = weeklyReviews.find(r => r.id === selectedId) ?? null;

  // Form local state for notes
  const [localNotes, setLocalNotes] = useState<string>('');

  // Sync notes when selected review changes
  useMemo(() => {
    if (selectedReview) {
      setLocalNotes(selectedReview.notes);
    }
  }, [selectedReview?.id]);

  // Tasks statistics
  const doneTasks = tasks.filter(t => t.status === 'done');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const inReviewTasks = tasks.filter(t => t.status === 'review');
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const backlogTasks = tasks.filter(t => t.status === 'backlog');
  const unassignedTasks = tasks.filter(t => !t.goalId);

  // Goals
  const oneYearGoals = goals.filter(g => g.horizon === 'one-year');
  const currentFocusGoal = oneYearGoals.find(g => g.isCurrentFocus && g.status === 'active');

  const startNewReview = () => {
    const existing = weeklyReviews.find(r => r.weekOf === currentWeekMonday);
    if (existing) {
      setSelectedId(existing.id);
      setActiveTab('harvest');
      return;
    }

    const newReview: WeeklyReviewItem = {
      id: `review-${currentWeekMonday}`,
      title: `Week of ${currentWeekMonday}`,
      weekOf: currentWeekMonday,
      status: 'draft',
      createdAt: new Date().toISOString(),
      focusGoalIds: currentFocusGoal ? [currentFocusGoal.id] : [],
      completedTaskIds: doneTasks.map(t => t.id),
      notes: generateInitialReviewTemplate(doneTasks, oneYearGoals, currentFocusGoal, inProgressTasks, backlogTasks),
      author: 'user',
      lastEditedBy: 'user'
    };

    setWeeklyReviews(current => [newReview, ...current]);
    setSelectedId(newReview.id);
    setLocalNotes(newReview.notes);
    setActiveTab('harvest');
  };

  const saveReview = (markComplete = false) => {
    if (!selectedReview) return;
    const updated: WeeklyReviewItem = {
      ...selectedReview,
      notes: localNotes,
      status: markComplete ? 'complete' : 'draft',
      completedAt: markComplete ? new Date().toISOString() : selectedReview.completedAt,
      lastEditedBy: 'user'
    };

    setWeeklyReviews(current => current.map(r => (r.id === updated.id ? updated : r)));
  };

  const reopenReview = () => {
    if (!selectedReview) return;
    const updated: WeeklyReviewItem = {
      ...selectedReview,
      status: 'draft',
      lastEditedBy: 'user'
    };
    setWeeklyReviews(current => current.map(r => (r.id === updated.id ? updated : r)));
  };

  // Move task status inline
  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(current =>
      current.map(t => (t.id === taskId ? { ...t, status: newStatus, lastEditedBy: 'user' } : t))
    );
  };

  // Assign unassigned task to goal
  const assignTaskGoal = (taskId: string, goalId: string) => {
    setTasks(current =>
      current.map(t => (t.id === taskId ? { ...t, goalId: goalId || undefined, lastEditedBy: 'user' } : t))
    );
  };

  // Toggle goal focus
  const toggleGoalFocus = (goalId: string) => {
    setGoals(current =>
      current.map(g => (g.id === goalId ? { ...g, isCurrentFocus: !g.isCurrentFocus, lastEditedBy: 'user' } : g))
    );
  };

  // Create next week commitment task
  const createCommitmentTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `task-${Date.now().toString(36)}`,
      title: newTaskTitle.trim(),
      description: 'Created during Weekly Review for upcoming cycle.',
      status: 'todo',
      priority: 'high',
      tag: 'commitment',
      goalId: newTaskGoalId || currentFocusGoal?.id || undefined,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      author: 'user',
      lastEditedBy: 'user'
    };

    setTasks(current => [newTask, ...current]);
    setNewTaskTitle('');
  };

  // Auto-generate comprehensive review draft from live data
  const handleAutoSynthesize = () => {
    const synthesized = generateInitialReviewTemplate(
      doneTasks,
      oneYearGoals,
      currentFocusGoal,
      inProgressTasks,
      backlogTasks
    );
    setLocalNotes(synthesized);
    setActiveTab('notes');
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-paper)] p-4 sm:p-6" id="weekly-review-view">
      {/* Top Alignment & Review Philosophy Banner */}
      <div className="mx-auto mb-6 max-w-6xl rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-ink)]">Weekly Alignment & Review Ritual</h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                The bridge between daily Kanban execution and 6–12 month milestones: celebrate wins, eliminate drift, and commit to next week.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={startNewReview}
              className="kanban-primary-add-btn h-8"
              title="Start or open review for the current week"
            >
              <Plus size={14} />
              <span>Review Week of {currentWeekMonday}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,2.15fr)]">
        {/* Left Sidebar: Cadence Stats & Review Archive */}
        <aside className="space-y-4">
          {/* Quick Health Stats */}
          <div className="grid grid-cols-2 gap-2">
            <ReviewMetricCard
              label="Completed"
              value={doneTasks.length}
              sublabel="tasks verified"
              color="emerald"
            />
            <ReviewMetricCard
              label="In Flight"
              value={inProgressTasks.length + inReviewTasks.length}
              sublabel="active / review"
              color="indigo"
            />
            <ReviewMetricCard
              label="Milestones"
              value={oneYearGoals.filter(g => g.status === 'active').length}
              sublabel="active targets"
              color="slate"
            />
            <ReviewMetricCard
              label="Drift"
              value={unassignedTasks.length}
              sublabel="unassigned tasks"
              color={unassignedTasks.length > 0 ? 'amber' : 'emerald'}
              warning={unassignedTasks.length > 0}
            />
          </div>

          {/* Review History */}
          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-3.5 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between border-b border-[var(--color-rule)] pb-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">
                Review Archive
              </h3>
              <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                {weeklyReviews.length} total
              </span>
            </div>

            <div className="space-y-1.5">
              {weeklyReviews.length === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--color-ink-muted)]">No reviews yet.</p>
              ) : (
                [...weeklyReviews]
                  .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
                  .map(review => {
                    const isSelected = selectedId === review.id;
                    const isComplete = review.status === 'complete';
                    return (
                      <button
                        key={review.id}
                        onClick={() => {
                          setSelectedId(review.id);
                          setLocalNotes(review.notes);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 shadow-xs dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
                            : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-slate-400'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <CalendarCheck2 size={12} className={isComplete ? 'text-emerald-600' : 'text-amber-600'} />
                            <span>{review.title}</span>
                          </div>
                          <div className="mt-0.5 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                            Week of {review.weekOf}
                          </div>
                        </div>

                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[0.625rem] font-bold uppercase ${
                            isComplete
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {review.status}
                        </span>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </aside>

        {/* Main Review Workspace */}
        <main className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-sm">
          {selectedReview ? (
            <div>
              {/* Header */}
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-ink)]">{selectedReview.title}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[0.6875rem] font-bold uppercase ${
                        selectedReview.status === 'complete'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {selectedReview.status === 'complete' ? '✓ Completed' : 'Draft In Progress'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[var(--color-ink-muted)]">
                    Cycle Week: {selectedReview.weekOf}
                    {selectedReview.completedAt && ` · Signed off ${new Date(selectedReview.completedAt).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAutoSynthesize}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-mono text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
                    title="Synthesize completed tasks, active milestones, and next week plan into markdown notes"
                  >
                    <Sparkles size={13} />
                    Auto-Synthesize Notes
                  </button>

                  {selectedReview.status === 'complete' ? (
                    <button className="task-editor-button is-secondary h-8 px-3 text-xs" onClick={reopenReview}>
                      <RotateCcw size={13} />
                      Reopen Review
                    </button>
                  ) : (
                    <>
                      <button
                        className="task-editor-button is-secondary h-8 px-3 text-xs"
                        onClick={() => saveReview(false)}
                      >
                        <Save size={13} />
                        Save Draft
                      </button>
                      <button
                        className="task-editor-button is-primary h-8 px-3 text-xs"
                        onClick={() => saveReview(true)}
                      >
                        <Check size={13} />
                        Complete Review
                      </button>
                    </>
                  )}
                </div>
              </header>

              {/* Multi-Step Review Navigation Tabs */}
              <nav className="flex items-center gap-1 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2 text-xs">
                <ReviewStepTab
                  label="1. Work Harvest"
                  sublabel={`${doneTasks.length} done`}
                  isActive={activeTab === 'harvest'}
                  onClick={() => setActiveTab('harvest')}
                  icon={<Trophy size={14} />}
                />
                <ReviewStepTab
                  label="2. Direction & Drift"
                  sublabel={unassignedTasks.length > 0 ? `${unassignedTasks.length} drift` : 'Aligned'}
                  isActive={activeTab === 'alignment'}
                  onClick={() => setActiveTab('alignment')}
                  hasWarning={unassignedTasks.length > 0}
                  icon={<Target size={14} />}
                />
                <ReviewStepTab
                  label="3. Next Commitments"
                  sublabel={`${todoTasks.length} queued`}
                  isActive={activeTab === 'planning'}
                  onClick={() => setActiveTab('planning')}
                  icon={<ListTodo size={14} />}
                />
                <ReviewStepTab
                  label="4. Review Journal"
                  sublabel="Markdown"
                  isActive={activeTab === 'notes'}
                  onClick={() => setActiveTab('notes')}
                  icon={<FileText size={14} />}
                />
              </nav>

              {/* Tab Content Panes */}
              <div className="p-4 sm:p-5">
                {/* TAB 1: WORK HARVEST */}
                {activeTab === 'harvest' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">
                        🏆 Completed Deliverables from the Pipeline
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        Review verified outcomes to record wins and inspect which strategic milestones progressed.
                      </p>

                      <div className="mt-3 space-y-2">
                        {doneTasks.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-[var(--color-rule)] p-6 text-center text-xs text-[var(--color-ink-muted)]">
                            No tasks in Done yet. Advance verified tasks on the Kanban Pipeline!
                          </div>
                        ) : (
                          doneTasks.map(task => {
                            const goal = goals.find(g => g.id === task.goalId);
                            return (
                              <div
                                key={task.id}
                                className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs dark:border-emerald-950 dark:bg-emerald-950/20"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                                    <span className="font-bold text-[var(--color-ink)]">{task.title}</span>
                                    <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                                      #{task.tag}
                                    </span>
                                  </div>
                                  {task.description && (
                                    <p className="mt-1 pl-6 text-xs text-[var(--color-ink-muted)]">{task.description}</p>
                                  )}
                                  <div className="mt-2 flex items-center gap-3 pl-6 font-mono text-[0.6875rem]">
                                    {goal ? (
                                      <span className="text-indigo-700 dark:text-indigo-300">
                                        Advanced Milestone: {goal.title}
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 dark:text-amber-400">
                                        ⚠️ Completed without goal linkage (Drift)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => updateTaskStatus(task.id, 'todo')}
                                  className="rounded border border-[var(--color-rule)] bg-white px-2 py-1 font-mono text-[0.625rem] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] dark:bg-slate-900"
                                  title="Reopen task in Todo"
                                >
                                  Reopen
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* In-Flight Work */}
                    <div className="border-t border-[var(--color-rule)] pt-5">
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">
                        ⏳ In-Flight & Verification Queue ({inProgressTasks.length + inReviewTasks.length})
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        Inspect active tasks to detect friction points, lingering PRs, or blocked experiment runs.
                      </p>

                      <div className="mt-3 space-y-2">
                        {[...inProgressTasks, ...inReviewTasks].map(task => {
                          const goal = goals.find(g => g.id === task.goalId);
                          return (
                            <div
                              key={task.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-3 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded px-1.5 py-0.5 font-mono text-[0.625rem] font-bold uppercase ${
                                      task.status === 'in-progress'
                                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}
                                  >
                                    {task.status}
                                  </span>
                                  <span className="font-bold text-[var(--color-ink)]">{task.title}</span>
                                </div>
                                {task.description && (
                                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{task.description}</p>
                                )}
                                {goal && (
                                  <div className="mt-1.5 font-mono text-[0.6875rem] text-indigo-600 dark:text-indigo-400">
                                    Milestone: {goal.title}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'done')}
                                  className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 font-mono text-[0.6875rem] font-semibold text-white hover:bg-emerald-700"
                                  title="Mark verified done"
                                >
                                  <Check size={11} />
                                  Done
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setActiveTab('alignment')}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        <span>Continue to Step 2: Direction & Drift</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: DIRECTION & DRIFT ALIGNMENT */}
                {activeTab === 'alignment' && (
                  <div className="space-y-6">
                    {/* Active Milestones Progress */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--color-ink)]">
                            🎯 6–12 Month Milestone Health
                          </h3>
                          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                            Confirm that active work directly moves these strategic outcomes forward.
                          </p>
                        </div>
                        {onNavigateToDirection && (
                          <button
                            onClick={onNavigateToDirection}
                            className="inline-flex items-center gap-1 font-mono text-xs text-indigo-600 hover:underline"
                          >
                            <Compass size={12} />
                            Direction Surface
                          </button>
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {oneYearGoals.map(goal => {
                          const linked = tasks.filter(t => t.goalId === goal.id);
                          const done = linked.filter(t => t.status === 'done').length;
                          const pct = linked.length > 0 ? Math.round((done / linked.length) * 100) : 0;

                          return (
                            <div
                              key={goal.id}
                              className={`rounded-xl border p-3.5 ${
                                goal.isCurrentFocus
                                  ? 'border-amber-400 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                                  : 'border-[var(--color-rule)] bg-[var(--color-surface)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-[var(--color-ink)]">{goal.title}</h4>
                                <button
                                  onClick={() => toggleGoalFocus(goal.id)}
                                  className={`rounded p-1 ${
                                    goal.isCurrentFocus
                                      ? 'text-amber-600'
                                      : 'text-[var(--color-ink-muted)] hover:text-amber-500'
                                  }`}
                                  title="Toggle as next week's primary focus"
                                >
                                  <Star size={14} className={goal.isCurrentFocus ? 'fill-amber-500' : ''} />
                                </button>
                              </div>

                              <div className="mt-2.5 space-y-1">
                                <div className="flex items-center justify-between font-mono text-[0.6875rem]">
                                  <span>
                                    {done}/{linked.length} tasks ({pct}%)
                                  </span>
                                  {goal.isCurrentFocus && (
                                    <span className="font-bold text-amber-800 dark:text-amber-300">
                                      ★ Current Weekly Focus
                                    </span>
                                  )}
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                  <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Drift Triage (Unassigned Tasks) */}
                    <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
                        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          Strategic Drift Triage ({unassignedTasks.length} unassigned tasks)
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/80">
                        In human-centric research, unassigned tasks indicate disconnected busywork. Assign them to an active milestone now or delete them if unneeded.
                      </p>

                      <div className="mt-3 space-y-2">
                        {unassignedTasks.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-center text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                            ✓ Perfect Alignment: All tasks in the pipeline are anchored to active milestones!
                          </div>
                        ) : (
                          unassignedTasks.map(task => (
                            <div
                              key={task.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white p-2.5 text-xs shadow-xs dark:border-amber-900/80 dark:bg-slate-900"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                                  {task.id}
                                </span>{' '}
                                <span className="font-bold text-[var(--color-ink)]">{task.title}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <select
                                  className="h-7 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 font-mono text-[0.6875rem] text-[var(--color-ink)]"
                                  onChange={e => assignTaskGoal(task.id, e.target.value)}
                                  defaultValue=""
                                  aria-label="Assign to milestone"
                                >
                                  <option value="" disabled>
                                    Assign to milestone...
                                  </option>
                                  {oneYearGoals.map(g => (
                                    <option key={g.id} value={g.id}>
                                      {g.title}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() =>
                                    setTasks(current => current.filter(t => t.id !== task.id))
                                  }
                                  className="p-1 text-[var(--color-ink-muted)] hover:text-red-600"
                                  title="Discard task"
                                >
                                  Discard
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setActiveTab('harvest')}
                        className="font-mono text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                      >
                        ← Back to Work Harvest
                      </button>
                      <button
                        onClick={() => setActiveTab('planning')}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        <span>Continue to Step 3: Next Commitments</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: NEXT WEEK COMMITMENTS */}
                {activeTab === 'planning' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">
                        🎯 Commitments for the Upcoming Cycle
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        Define 3–5 high-leverage tasks for the coming week and promote them into your active pipeline.
                      </p>

                      {/* Current Week Focus Highlight */}
                      {currentFocusGoal && (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40">
                          <div className="flex items-center gap-2">
                            <Star size={15} className="fill-indigo-600 text-indigo-600" />
                            <div>
                              <span className="font-mono text-[0.6875rem] uppercase font-bold text-indigo-700 dark:text-indigo-300">
                                Target Milestone:
                              </span>{' '}
                              <span className="font-bold text-[var(--color-ink)]">{currentFocusGoal.title}</span>
                            </div>
                          </div>
                          {onNavigateToPipeline && (
                            <button
                              onClick={() => onNavigateToPipeline(currentFocusGoal.id)}
                              className="font-mono text-xs text-indigo-700 underline dark:text-indigo-300"
                            >
                              View in Pipeline
                            </button>
                          )}
                        </div>
                      )}

                      {/* Add new commitment */}
                      <form onSubmit={createCommitmentTask} className="mt-4 flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          placeholder="Add concrete deliverable for next week..."
                          className="min-w-[240px] flex-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] outline-none focus:border-indigo-500"
                        />
                        <select
                          value={newTaskGoalId}
                          onChange={e => setNewTaskGoalId(e.target.value)}
                          className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-2 font-mono text-xs text-[var(--color-ink)]"
                          aria-label="Target Goal"
                        >
                          <option value="">
                            {currentFocusGoal ? `Default: ${currentFocusGoal.title}` : 'Select Milestone...'}
                          </option>
                          {oneYearGoals.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.title}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="kanban-primary-add-btn h-9 px-3">
                          <Plus size={14} />
                          <span>Commit to To Do</span>
                        </button>
                      </form>
                    </div>

                    {/* Active Todo queue */}
                    <div className="border-t border-[var(--color-rule)] pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                        Queued for Execution in To Do ({todoTasks.length})
                      </h4>
                      <div className="mt-2.5 space-y-2">
                        {todoTasks.map(task => {
                          const goal = goals.find(g => g.id === task.goalId);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-2.5 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-[var(--color-ink)]">{task.title}</span>
                                {goal && (
                                  <span className="ml-2 font-mono text-[0.6875rem] text-indigo-600 dark:text-indigo-400">
                                    ↳ {goal.title}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => updateTaskStatus(task.id, 'in-progress')}
                                className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 font-mono text-[0.6875rem] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                              >
                                Start Now →
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pull from Backlog */}
                    {backlogTasks.length > 0 && (
                      <div className="border-t border-[var(--color-rule)] pt-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                          Pull from Queued Backlog ({backlogTasks.length})
                        </h4>
                        <div className="mt-2.5 space-y-2">
                          {backlogTasks.slice(0, 5).map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--color-rule)] bg-[var(--color-paper)] p-2.5 text-xs"
                            >
                              <span className="truncate text-[var(--color-ink)]">{task.title}</span>
                              <button
                                onClick={() => updateTaskStatus(task.id, 'todo')}
                                className="shrink-0 rounded border border-[var(--color-rule)] bg-white px-2 py-1 font-mono text-[0.6875rem] hover:bg-slate-100 dark:bg-slate-800"
                              >
                                + Commit to To Do
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setActiveTab('alignment')}
                        className="font-mono text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                      >
                        ← Back to Direction & Drift
                      </button>
                      <button
                        onClick={() => setActiveTab('notes')}
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        <span>Continue to Step 4: Review Journal</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: REVIEW JOURNAL (SYNTHESIS & NOTES) */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-ink)]">
                          ✍️ Synthesis Journal & Reflections
                        </h3>
                        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                          Document research lessons, kernel benchmarks, blockers, and next priorities.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPreviewMode(!isPreviewMode)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                        >
                          {isPreviewMode ? <Edit3 size={12} /> : <Eye size={12} />}
                          <span>{isPreviewMode ? 'Edit Notes' : 'Preview Document'}</span>
                        </button>
                      </div>
                    </div>

                    {isPreviewMode ? (
                      <div className="min-h-[440px] rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-6 font-sans text-xs leading-relaxed text-[var(--color-ink)]">
                        <SimpleMarkdownViewer markdown={localNotes} />
                      </div>
                    ) : (
                      <textarea
                        id="weekly-review-notes"
                        className="min-h-[440px] w-full resize-y rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 font-mono text-xs leading-6 text-[var(--color-ink)] outline-none focus:border-indigo-500"
                        value={localNotes}
                        onChange={event => setLocalNotes(event.target.value)}
                        placeholder="Write your reflections or click 'Auto-Synthesize Notes' above..."
                      />
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-rule)] pt-3">
                      <button
                        onClick={() => setActiveTab('planning')}
                        className="font-mono text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                      >
                        ← Back to Commitments
                      </button>

                      <div className="flex items-center gap-2">
                        {selectedReview.status === 'complete' ? (
                          <button
                            className="task-editor-button is-secondary h-8 px-3 text-xs"
                            onClick={reopenReview}
                          >
                            <RotateCcw size={13} />
                            Reopen
                          </button>
                        ) : (
                          <>
                            <button
                              className="task-editor-button is-secondary h-8 px-3 text-xs"
                              onClick={() => saveReview(false)}
                            >
                              <Save size={13} />
                              Save Draft
                            </button>
                            <button
                              className="task-editor-button is-primary h-8 px-3 text-xs"
                              onClick={() => saveReview(true)}
                            >
                              <Check size={14} />
                              Complete & Lock Review
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[520px] place-items-center p-8 text-center">
              <div>
                <CalendarCheck2 className="mx-auto mb-3 text-[var(--color-ink-muted)]" size={36} />
                <h2 className="text-base font-bold text-[var(--color-ink)]">No Weekly Review Selected</h2>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  Start this week's review to reflect on completed tasks, calibrate 6–12 month milestones, and select next priorities.
                </p>
                <button onClick={startNewReview} className="kanban-primary-add-btn mx-auto mt-4">
                  <Plus size={14} />
                  <span>Start Review for Week of {currentWeekMonday}</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ReviewMetricCard({
  label,
  value,
  sublabel,
  color = 'slate',
  warning = false
}: {
  label: string;
  value: number;
  sublabel: string;
  color?: 'emerald' | 'indigo' | 'slate' | 'amber';
  warning?: boolean;
}) {
  const colorMap = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    indigo: 'text-indigo-700 dark:text-indigo-300',
    slate: 'text-[var(--color-ink)]',
    amber: 'text-amber-700 dark:text-amber-300'
  };

  return (
    <div
      className={`rounded-xl border p-3 ${
        warning
          ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
          : 'border-[var(--color-rule)] bg-[var(--color-surface)]'
      }`}
    >
      <div className={`text-xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="font-mono text-[0.6875rem] font-semibold text-[var(--color-ink)]">{label}</div>
      <div className="font-mono text-[0.625rem] text-[var(--color-ink-muted)]">{sublabel}</div>
    </div>
  );
}

function ReviewStepTab({
  label,
  sublabel,
  isActive,
  onClick,
  hasWarning = false,
  icon
}: {
  label: string;
  sublabel: string;
  isActive: boolean;
  onClick: () => void;
  hasWarning?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
        isActive
          ? 'border-indigo-600 bg-[var(--color-surface)] text-indigo-700 font-bold shadow-xs dark:border-indigo-800 dark:text-indigo-300'
          : 'border-transparent text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]'
      }`}
    >
      {icon}
      <div className="text-left">
        <div className="text-xs">{label}</div>
        <div
          className={`font-mono text-[0.625rem] ${
            hasWarning ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          {sublabel}
        </div>
      </div>
    </button>
  );
}

function generateInitialReviewTemplate(
  doneTasks: TaskItem[],
  goals: any[],
  currentFocusGoal: any,
  inProgressTasks: TaskItem[],
  backlogTasks: TaskItem[]
): string {
  const completedBullets =
    doneTasks.length > 0
      ? doneTasks.map(t => `- **${t.title}** (${t.id}): completed and verified.`).join('\n')
      : '- [None recorded this cycle]';

  const milestoneProgress = goals
    .map(g => `- **${g.title}**: horizon = ${g.horizon}, status = ${g.status}`)
    .join('\n');

  const focusTitle = currentFocusGoal ? currentFocusGoal.title : '[Select target milestone]';

  const inProgressBullets =
    inProgressTasks.length > 0
      ? inProgressTasks.map(t => `- **${t.title}**: currently in ${t.status}.`).join('\n')
      : '- [No lingering blockers]';

  return `## 🏆 Completed Deliverables & Wins
${completedBullets}

## 🔬 Scientific Evidence & Research Insights
- Document verified measurements, benchmark findings, or literature claims extracted this week.
- Note any rejected hypotheses or falsified conditions.

## ⚠️ Friction Points, Blockers & Technical Debt
${inProgressBullets}
- Track lingering PRs, compute resource bottlenecks, or drift from long-term North Stars.

## 🎯 Strategic Focus & Commitments for Next Cycle
- **Primary Milestone**: ${focusTitle}
- Prioritize high-leverage deliverables in To Do:
${backlogTasks.slice(0, 3).map(t => `  - [ ] ${t.title}`).join('\n') || '  - [ ] Add 2-3 specific commitments'}`;
}

function SimpleMarkdownViewer({ markdown }: { markdown: string }) {
  if (!markdown.trim()) {
    return <p className="text-[var(--color-ink-muted)]">No notes written yet.</p>;
  }

  const lines = markdown.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="mt-4 border-b border-[var(--color-rule)] pb-1 text-sm font-bold text-[var(--color-ink)]">
              {line.replace('## ', '')}
            </h3>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <div key={idx} className="ml-4 flex items-start gap-1.5 text-xs text-[var(--color-ink)]">
              <span className="text-indigo-600 dark:text-indigo-400">•</span>
              <span>{line.replace('- ', '')}</span>
            </div>
          );
        }
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }
        return (
          <p key={idx} className="text-xs text-[var(--color-ink-muted)]">
            {line}
          </p>
        );
      })}
    </div>
  );
}
