import { useState } from 'react';
import { ExecutionEngineView } from './ExecutionEngineView';
import { EngineSubTab } from '../../productivityTypes';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TabHelpTip } from '../common/TabHelpTip';

export function RuntimeSurface() {
  const [currentSubTab, setCurrentSubTab] = useState<EngineSubTab>('services');
  const { services, runs, models, automations, setAutomations, targets } = useWorkspace();

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]">
      <header className="surface-intro">
        <p className="surface-kicker">Execution layer</p>
        <div className="flex items-center gap-2">
          <h1>Runtime</h1>
          <TabHelpTip
            title="Runtime Engine"
            category="Execution Layer"
            summary="Execution layer for services, batch runs, LLM checkpoints, automations, and compute targets."
            tips={[
              "Switch sub-tabs (Services, Runs, LLM Models, Automations, Targets) to inspect system status.",
              "Drag any service, run, or model card into the Assistant Dock to diagnose issues.",
              "Toggle automated background tasks on and off with a single click.",
              "Monitor compute targets to ensure sufficient GPU/CPU headroom before running workloads."
            ]}
            placement="bottom"
            variant="inline"
          />
        </div>
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
