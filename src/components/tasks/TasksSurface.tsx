import { KanbanBoard } from './KanbanBoard';
import { TabHelpTip } from '../common/TabHelpTip';
import { ListChecks } from 'lucide-react';

export function TasksSurface() {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]">
      <header className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ListChecks size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                Tasks & Pipeline
              </h1>
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
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)] hidden sm:block">
              Move concrete research engineering tasks from backlog to verified completion
            </p>
          </div>
        </div>
      </header>
      <KanbanBoard />
    </section>
  );
}
