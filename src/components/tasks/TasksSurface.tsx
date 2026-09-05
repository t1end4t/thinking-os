import { KanbanBoard } from './KanbanBoard';
import { TabHelpTip } from '../common/TabHelpTip';

export function TasksSurface() {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]">
      <header className="surface-intro">
        <p className="surface-kicker">Work queue</p>
        <div className="flex items-center gap-2">
          <h1>Tasks</h1>
          <TabHelpTip
            title="Tasks Kanban Board"
            category="Delivery Pipeline"
            summary="Work queue and delivery pipeline for research engineering tasks."
            tips={[
              "Drag task cards across Backlog, In Progress, Review, and Done.",
              "Click any card to inspect details, set priority, or link research claims.",
              "Drag task cards into the Assistant Dock to reference them in conversation.",
              "Click '+ New Task' to capture work items as you make progress."
            ]}
            placement="bottom"
            variant="inline"
          />
        </div>
        <p>Move concrete work from backlog to verified completion.</p>
      </header>
      <KanbanBoard />
    </section>
  );
}
