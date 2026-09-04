import { KanbanBoard } from './KanbanBoard';

export function TasksSurface() {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]">
      <header className="surface-intro">
        <p className="surface-kicker">Work queue</p>
        <h1>Tasks</h1>
        <p>Move concrete work from backlog to verified completion.</p>
      </header>
      <KanbanBoard />
    </section>
  );
}
