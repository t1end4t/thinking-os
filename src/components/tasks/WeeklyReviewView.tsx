import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Check, RotateCcw, Save } from 'lucide-react';
import { WeeklyReviewItem } from '../../productivityTypes';
import { useWorkspace } from '../../context/WorkspaceContext';

function currentWeekOf() {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const calendarDay = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${calendarDay}`;
}

const REVIEW_TEMPLATE = `## Wins\n\n- \n\n## Evidence and lessons\n\n- \n\n## Blockers or drift\n\n- \n\n## Next week's focus\n\n- `;

export function WeeklyReviewView() {
  const { weeklyReviews, setWeeklyReviews, goals, tasks } = useWorkspace();
  const weekOf = currentWeekOf();
  const currentReview = weeklyReviews.find(review => review.weekOf === weekOf);
  const [selectedId, setSelectedId] = useState<string | null>(currentReview?.id ?? weeklyReviews[0]?.id ?? null);
  const selectedReview = weeklyReviews.find(review => review.id === selectedId) ?? null;
  const [notes, setNotes] = useState(selectedReview?.notes ?? REVIEW_TEMPLATE);

  useEffect(() => setNotes(selectedReview?.notes ?? REVIEW_TEMPLATE), [selectedReview?.id]);

  const stats = useMemo(() => ({
    activeGoals: goals.filter(goal => goal.status === 'active').length,
    unassignedTasks: tasks.filter(task => task.status !== 'done' && !task.goalId).length,
    inProgress: tasks.filter(task => task.status === 'in-progress').length,
    inReview: tasks.filter(task => task.status === 'review').length
  }), [goals, tasks]);

  const startCurrentReview = () => {
    if (currentReview) return setSelectedId(currentReview.id);
    const review: WeeklyReviewItem = {
      id: `weekly-review-${weekOf}`,
      title: `Week of ${weekOf}`,
      weekOf,
      notes: REVIEW_TEMPLATE,
      status: 'draft',
      createdAt: new Date().toISOString(),
      author: 'user',
      lastEditedBy: 'user'
    };
    setWeeklyReviews(current => [review, ...current]);
    setSelectedId(review.id);
  };

  const saveReview = (complete = false) => {
    if (!selectedReview) return;
    setWeeklyReviews(current => current.map(review => review.id === selectedReview.id ? {
      ...review,
      notes,
      status: complete ? 'complete' : review.status,
      completedAt: complete ? new Date().toISOString() : review.completedAt,
      lastEditedBy: 'user'
    } : review));
  };

  const reopenReview = () => {
    if (!selectedReview) return;
    setWeeklyReviews(current => current.map(review => review.id === selectedReview.id ? { ...review, status: 'draft', completedAt: undefined, lastEditedBy: 'user' } : review));
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-paper)] p-4 sm:p-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <button className="kanban-primary-add-btn w-full justify-center" onClick={startCurrentReview}><CalendarCheck2 size={14} />{currentReview ? 'Open this week' : 'Start weekly review'}</button>
          <div className="grid grid-cols-2 gap-2">
            <ReviewStat label="Active goals" value={stats.activeGoals} />
            <ReviewStat label="Unassigned" value={stats.unassignedTasks} warning={stats.unassignedTasks > 0} />
            <ReviewStat label="In progress" value={stats.inProgress} />
            <ReviewStat label="In review" value={stats.inReview} />
          </div>
          <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-3">
            <h2 className="mb-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Review history</h2>
            <div className="space-y-1">
              {weeklyReviews.length === 0 && <p className="py-4 text-center text-xs text-[var(--color-ink-muted)]">No reviews yet.</p>}
              {[...weeklyReviews].sort((a, b) => b.weekOf.localeCompare(a.weekOf)).map(review => <button key={review.id} onClick={() => setSelectedId(review.id)} className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs ${selectedId === review.id ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)]' : 'text-[var(--color-ink)] hover:bg-[var(--color-paper)]'}`}><span>{review.weekOf}</span><span className="font-mono text-[0.625rem] uppercase">{review.status}</span></button>)}
            </div>
          </div>
        </aside>

        <section className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-sm">
          {selectedReview ? <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] px-4 py-3">
              <div><h2 className="text-sm font-bold text-[var(--color-ink)]">{selectedReview.title}</h2><p className="mt-0.5 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">Review direction, evidence, workload, then choose next focus.</p></div>
              <span className={`rounded-full px-2 py-1 font-mono text-[0.6875rem] uppercase ${selectedReview.status === 'complete' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>{selectedReview.status}</span>
            </header>
            <div className="p-4">
              <label htmlFor="weekly-review-notes" className="mb-2 block text-xs font-semibold text-[var(--color-ink)]">Review notes</label>
              <textarea id="weekly-review-notes" className="min-h-[420px] w-full resize-y rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 font-mono text-xs leading-6 text-[var(--color-ink)] outline-none focus:border-[var(--accent-indigo)]" value={notes} onChange={event => setNotes(event.target.value)} />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {selectedReview.status === 'complete' ? <button className="task-editor-button is-secondary" onClick={reopenReview}><RotateCcw size={13} />Reopen</button> : <button className="task-editor-button is-secondary" onClick={() => saveReview(false)}><Save size={13} />Save draft</button>}
                {selectedReview.status === 'draft' && <button className="task-editor-button is-primary" onClick={() => saveReview(true)}><Check size={14} />Complete review</button>}
              </div>
            </div>
          </> : <div className="grid min-h-[520px] place-items-center p-8 text-center"><div><CalendarCheck2 className="mx-auto mb-3 text-[var(--color-ink-muted)]" size={28} /><h2 className="text-sm font-bold text-[var(--color-ink)]">No weekly review selected</h2><p className="mt-2 max-w-sm text-xs leading-5 text-[var(--color-ink-muted)]">Start this week's review to inspect goal alignment, capture lessons, and choose the next focus.</p></div></div>}
        </section>
      </div>
    </div>
  );
}

function ReviewStat({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-lg border p-3 ${warning ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40' : 'border-[var(--color-rule)] bg-[var(--color-surface)]'}`}><div className="text-lg font-bold text-[var(--color-ink)]">{value}</div><div className="font-mono text-[0.625rem] uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</div></div>;
}
