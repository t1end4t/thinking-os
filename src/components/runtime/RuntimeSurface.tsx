import { useState } from 'react';
import { ExecutionEngineView } from './ExecutionEngineView';
import { EngineSubTab } from '../../productivityTypes';
import { useWorkspace } from '../../context/WorkspaceContext';

export function RuntimeSurface() {
  const [currentSubTab, setCurrentSubTab] = useState<EngineSubTab>('services');
  const { services, runs, models, automations, setAutomations, targets } = useWorkspace();

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]">
      <header className="surface-intro">
        <p className="surface-kicker">Execution layer</p>
        <h1>Runtime</h1>
        <p>Inspect services, runs, models, automations, and targets.</p>
      </header>
      <ExecutionEngineView
        currentSubTab={currentSubTab}
        onSubTabChange={setCurrentSubTab}
        services={services}
        runs={runs}
        models={models}
        automations={automations}
        targets={targets}
        onToggleAutomation={id =>
          setAutomations(current =>
            current.map(automation =>
              automation.id === id ? { ...automation, enabled: !automation.enabled } : automation
            )
          )
        }
      />
    </section>
  );
}
