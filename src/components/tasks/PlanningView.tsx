import { FormEvent, useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { GoalHorizon, GoalItem, GoalStatus } from '../../productivityTypes';
import { useWorkspace } from '../../context/WorkspaceContext';

const HORIZON_LABELS: Record<GoalHorizon, string> = {
  'five-year': '5-year direction',
  'one-year': '6–12 month goal'
};

export function PlanningView() {
  const { goals, setGoals, tasks, setTasks, openTaskEditor } = useWorkspace();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState<GoalHorizon>('one-year');
  const [targetDate, setTargetDate] = useState('');
  const [parentGoalId, setParentGoalId] = useState('');
  const fiveYearGoals = goals.filter(goal => goal.horizon === 'five-year');
  const oneYearGoals = goals.filter(goal => goal.horizon === 'one-year');

  const addGoal = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const goal: GoalItem = {
      id: `goal-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      horizon,
      status: 'active',
      targetDate: targetDate || undefined,
      parentGoalId: horizon === 'one-year' && parentGoalId ? parentGoalId : undefined,
      createdAt: new Date().toISOString(),
      author: 'user',
      lastEditedBy: 'user'
    };
    setGoals(current => [goal, ...current]);
    setTitle('');
    setDescription('');
    setTargetDate('');
  };

  const updateStatus = (id: string, status: GoalStatus) => {
    setGoals(current => current.map(goal => goal.id === id ? { ...goal, status, lastEditedBy: 'user' } : goal));
  };

  const deleteGoal = (id: string) => {
    if (!window.confirm('Delete this goal? Linked tasks will remain but become unassigned.')) return;
    setGoals(current => current
      .filter(goal => goal.id !== id)
      .map(goal => goal.parentGoalId === id ? { ...goal, parentGoalId: undefined } : goal));
    setTasks(current => current.map(task => task.goalId === id ? { ...task, goalId: undefined } : task));
  };

  const renderGoal = (goal: GoalItem) => {
    const linkedTasks = tasks.filter(task => task.goalId === goal.id);
    const completedTasks = linkedTasks.filter(task => task.status === 'done').length;
    const parent = goals.find(candidate => candidate.id === goal.parentGoalId);

    return (
      <article key={goal.id} className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
              <span className="rounded-full border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 py-0.5">{HORIZON_LABELS[goal.horizon]}</span>
              {goal.targetDate && <span className="inline-flex items-center gap-1"><Calendar size={11} />{goal.targetDate}</span>}
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">{goal.title}</h3>
            {goal.description && <p className="mt-1.5 text-xs leading-5 text-[var(--color-ink-muted)]">{goal.description}</p>}
            {parent && <p className="mt-2 font-mono text-[0.6875rem] text-indigo-600 dark:text-indigo-400">Supports: {parent.title}</p>}
          </div>
          <button className="shrink-0 text-[var(--color-ink-muted)] hover:text-red-600" onClick={() => deleteGoal(goal.id)} aria-label={`Delete ${goal.title}`}><Trash2 size={14} /></button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-rule)] pt-3">
          <select className="h-8 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 font-mono text-xs text-[var(--color-ink)]" value={goal.status} onChange={event => updateStatus(goal.id, event.target.value as GoalStatus)} aria-label={`Status for ${goal.title}`}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="achieved">Achieved</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">{completedTasks}/{linkedTasks.length} tasks done</span>
            {goal.horizon === 'one-year' && <button className="kanban-primary-add-btn" onClick={() => openTaskEditor(undefined, 'todo', goal.id)}><Plus size={13} />Task</button>}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-paper)] p-4 sm:p-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
        <form onSubmit={addGoal} className="h-fit rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-4 shadow-sm lg:sticky lg:top-0">
          <h2 className="text-sm font-bold text-[var(--color-ink)]">Add direction</h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-[var(--color-ink-muted)]">Keep it shallow: 5-year direction, 6–12 month goal, then tasks.</p>
          <div className="space-y-3">
            <div className="form-field"><label htmlFor="goal-title">Outcome</label><input id="goal-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="What should be true?" required /></div>
            <div className="form-field"><label htmlFor="goal-description">Why it matters</label><textarea id="goal-description" rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Scope, evidence, or success condition." /></div>
            <div className="task-editor-grid">
              <div className="form-field"><label htmlFor="goal-horizon">Horizon</label><select id="goal-horizon" value={horizon} onChange={event => setHorizon(event.target.value as GoalHorizon)}><option value="one-year">6–12 months</option><option value="five-year">5 years</option></select></div>
              <div className="form-field"><label htmlFor="goal-date">Target date</label><input id="goal-date" type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} /></div>
            </div>
            {horizon === 'one-year' && fiveYearGoals.length > 0 && <div className="form-field"><label htmlFor="goal-parent">Supports</label><select id="goal-parent" value={parentGoalId} onChange={event => setParentGoalId(event.target.value)}><option value="">No 5-year direction</option>{fiveYearGoals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></div>}
            <button className="kanban-primary-add-btn w-full justify-center" type="submit" disabled={!title.trim()}><Plus size={14} />Add goal</button>
          </div>
        </form>

        <div className="space-y-6">
          <GoalSection title="5-year direction" description="Stable direction, not a detailed plan." count={fiveYearGoals.length}>{fiveYearGoals.length ? fiveYearGoals.map(renderGoal) : <EmptyGoal label="No 5-year direction yet." />}</GoalSection>
          <GoalSection title="6–12 month goals" description="Concrete outcomes that own groups of Kanban tasks." count={oneYearGoals.length} grid>{oneYearGoals.length ? oneYearGoals.map(renderGoal) : <EmptyGoal label="No annual goals yet." />}</GoalSection>
        </div>
      </div>
    </div>
  );
}

function GoalSection({ title, description, count, grid = false, children }: { title: string; description: string; count: number; grid?: boolean; children: React.ReactNode }) {
  return <section><div className="mb-3 flex items-baseline justify-between gap-3"><div><h2 className="text-sm font-bold text-[var(--color-ink)]">{title}</h2><p className="mt-1 text-xs text-[var(--color-ink-muted)]">{description}</p></div><span className="font-mono text-xs text-[var(--color-ink-muted)]">{count}</span></div><div className={`grid gap-3 ${grid ? 'md:grid-cols-2' : ''}`}>{children}</div></section>;
}

function EmptyGoal({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] p-8 text-center text-xs text-[var(--color-ink-muted)]">{label}</div>;
}
