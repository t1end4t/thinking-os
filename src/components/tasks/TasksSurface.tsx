import { useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { PlanningView } from './PlanningView';
import { WeeklyReviewView } from './WeeklyReviewView';
import { TabHelpTip } from '../common/TabHelpTip';
import { CalendarCheck2, Columns3, Compass, ListChecks, Target, Star, AlertCircle, Sparkles } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

type TasksView = 'direction' | 'pipeline' | 'reviews';

export function TasksSurface() {
  const [view, setView] = useState<TasksView>('pipeline');
  const [activeGoalFilter, setActiveGoalFilter] = useState<string | null>(null);
  const { goals, tasks, weeklyReviews } = useWorkspace();

  const oneYearGoals = goals.filter(g => g.horizon === 'one-year');
  const fiveYearGoals = goals.filter(g => g.horizon === 'five-year');
  const currentFocusGoal = oneYearGoals.find(g => g.isCurrentFocus && g.status === 'active');

  const inFlightTasks = tasks.filter(t => t.status === 'in-progress' || t.status === 'todo');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const unassignedTasks = tasks.filter(t => !t.goalId);
  const alignmentPercent = tasks.length > 0 ? Math.round(((tasks.length - unassignedTasks.length) / tasks.length) * 100) : 100;

  const latestReview = [...weeklyReviews].sort((a, b) => b.weekOf.localeCompare(a.weekOf))[0];

  const handleNavigate = (targetView: TasksView, goalId?: string) => {
    setView(targetView);
    if (goalId !== undefined) {
      setActiveGoalFilter(goalId);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]" id="tasks-pipeline-surface">
      {/* Surface Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-5 py-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
            <ListChecks size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-[var(--color-ink)]">
                Research Execution & Direction
              </h1>
              <TabHelpTip
                title="Unified Execution Flow"
                category="Workflow Architecture"
                summary="An integrated human-centric system connecting strategic direction, daily kanban delivery, and weekly reviews."
                tips={[
                  "Direction: Define 5-year North Stars and 6-12 month concrete milestones.",
                  "Pipeline: Execute tasks daily, tracked by milestone with quick status advance.",
                  "Weekly Review: Celebrate completed tasks, eliminate drift, and commit to next week's focus.",
                  "All three views share live state and cross-navigate seamlessly."
                ]}
                placement="bottom"
                variant="inline"
              />
            </div>
            <p className="hidden text-[0.6875rem] text-[var(--color-ink-muted)] sm:block">
              Direction (Where) → Pipeline (What) → Weekly Review (Why & Next)
            </p>
          </div>
        </div>

        {/* Live Flow Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {currentFocusGoal && (
            <button
              onClick={() => handleNavigate('pipeline', currentFocusGoal.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-[0.6875rem] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              title="Active weekly focus milestone. Click to view on Kanban."
            >
              <Star size={11} className="fill-amber-500 text-amber-500" />
              <span className="max-w-[140px] truncate">{currentFocusGoal.title}</span>
            </button>
          )}

          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1 font-mono text-[0.6875rem] text-[var(--color-ink)]">
              <span className="text-[var(--color-ink-muted)]">Velocity: </span>
              <strong>{doneTasks.length}</strong>/{tasks.length} done
            </span>

            {unassignedTasks.length > 0 ? (
              <button
                onClick={() => handleNavigate('reviews')}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-mono text-[0.6875rem] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                title="Click to triage unassigned drift tasks in Weekly Review"
              >
                <AlertCircle size={11} />
                <span>{unassignedTasks.length} drift</span>
              </button>
            ) : (
              <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 font-mono text-[0.6875rem] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                100% aligned
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Surface Navigation Tabs */}
      <nav
        className="flex shrink-0 items-center justify-between border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-4 py-2"
        aria-label="Tasks workspace views"
      >
        <div className="flex items-center gap-1.5">
          <ViewTab
            active={view === 'direction'}
            onClick={() => handleNavigate('direction')}
            icon={<Compass size={14} />}
            label="Direction"
            badge={`${oneYearGoals.length + fiveYearGoals.length}`}
          />
          <ViewTab
            active={view === 'pipeline'}
            onClick={() => handleNavigate('pipeline')}
            icon={<Columns3 size={14} />}
            label="Pipeline"
            badge={`${inFlightTasks.length} active`}
          />
          <ViewTab
            active={view === 'reviews'}
            onClick={() => handleNavigate('reviews')}
            icon={<CalendarCheck2 size={14} />}
            label="Weekly Review"
            badge={latestReview?.status === 'complete' ? 'Completed' : 'Draft / Due'}
            badgeColor={latestReview?.status === 'complete' ? 'emerald' : 'amber'}
          />
        </div>

        <div className="hidden font-mono text-[0.6875rem] text-[var(--color-ink-muted)] md:block">
          {view === 'direction' && '5-year North Stars & 6–12 month milestones'}
          {view === 'pipeline' && 'Kanban delivery queue grouped by status'}
          {view === 'reviews' && 'Cadence review, reflection memo & next commitments'}
        </div>
      </nav>

      {/* Surface Body Views */}
      {view === 'direction' && (
        <PlanningView
          onNavigateToPipeline={goalId => handleNavigate('pipeline', goalId)}
          onNavigateToReview={() => handleNavigate('reviews')}
        />
      )}
      {view === 'pipeline' && (
        <KanbanBoard
          initialGoalFilter={activeGoalFilter}
          onNavigateToDirection={() => handleNavigate('direction')}
          onNavigateToReview={() => handleNavigate('reviews')}
        />
      )}
      {view === 'reviews' && (
        <WeeklyReviewView
          onNavigateToPipeline={goalId => handleNavigate('pipeline', goalId)}
          onNavigateToDirection={() => handleNavigate('direction')}
        />
      )}
    </section>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  label,
  badge,
  badgeColor = 'default'
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: 'default' | 'emerald' | 'amber';
}) {
  const badgeClasses = {
    default: 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 font-mono text-xs transition-colors ${
        active
          ? 'border-indigo-300 bg-indigo-50 font-semibold text-indigo-700 shadow-2xs dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
          : 'border-transparent text-[var(--color-ink-muted)] hover:border-[var(--color-rule)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`rounded px-1.5 py-0.2 font-mono text-[0.625rem] ${badgeClasses[badgeColor]}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
