import { useCallback, useEffect, useState } from 'react';
import { ExecutionEngineView } from './ExecutionEngineView';
import { EngineSubTab } from '../../productivityTypes';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TabHelpTip } from '../common/TabHelpTip';
import { Cpu, ServerCog, Bot, Settings2 } from 'lucide-react';
import { setAssistantContextData } from '../../utils/dragDrop';
import type { AssistantContextObject } from '../../types';
import {
  LocalModelStatus,
  ModelDownloadRequest,
  ModelHardwareStatus,
  ServiceAction,
  ServiceProcessStatus,
  controlLocalModel,
  controlService,
  downloadLocalModel,
  loadLocalModels,
  loadServiceLogs,
  loadServiceStatuses
} from '../../runtimeClient';

export function RuntimeSurface() {
  const [currentSubTab, setCurrentSubTab] = useState<EngineSubTab>('services');
  const { workspaceDir, services, addService, updateService, deleteService, runs, automations, setAutomations, targets, setActiveContext } = useWorkspace();
  const [processes, setProcesses] = useState<Record<string, ServiceProcessStatus>>({});
  const [execEnabled, setExecEnabled] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[] | null>(null);
  const [logsServiceId, setLogsServiceId] = useState<string | null>(null);
  const [localModels, setLocalModels] = useState<LocalModelStatus[]>([]);
  const [modelsDir, setModelsDir] = useState('~/LOCAL-AI-MODELS');
  const [modelHardware, setModelHardware] = useState<ModelHardwareStatus | null>(null);
  const [llamaServerAvailable, setLlamaServerAvailable] = useState(false);
  const [busyModelId, setBusyModelId] = useState<string | null>(null);
  const [environmentContext, setEnvironmentContext] = useState<AssistantContextObject | null>(null);

  const summarize = (lines: string[]) => lines.join('\n').slice(0, 4_000);

  const tabContext = (tab: 'services' | 'llm-models' | 'agent-environment'): AssistantContextObject => {
    if (tab === 'services') return {
      type: 'runtime',
      id: 'tab:runtime-engine',
      label: 'Runtime Engine tab',
      secondaryLabel: `${services.length} configured service${services.length === 1 ? '' : 's'}`,
      metadata: {
        excerpt: summarize([
          `Workspace: ${workspaceDir}`,
          `Runtime execution: ${execEnabled ? 'enabled' : 'disabled'}`,
          ...services.map(service => {
            const process = processes[service.id];
            return `[${process?.activeState ?? service.status}] ${service.name} — ${service.command}${service.port ? ` — port ${service.port}` : ''}`;
          })
        ])
      }
    };
    if (tab === 'llm-models') return {
      type: 'model',
      id: 'tab:llm-models',
      label: 'LLM Models tab',
      secondaryLabel: `${localModels.length} local model${localModels.length === 1 ? '' : 's'}`,
      metadata: {
        excerpt: summarize([
          `Models directory: ${modelsDir}`,
          `llama-server: ${llamaServerAvailable ? 'available' : 'unavailable'}`,
          ...(modelHardware ? [`GPU: ${modelHardware.gpuName ?? 'none'} · VRAM ${modelHardware.vramFree}/${modelHardware.vramTotal} free`] : []),
          ...localModels.map(model => `[${model.status}] ${model.name} — ${model.quantization || 'unknown quantization'} — ${model.size}`)
        ])
      }
    };
    return environmentContext ?? {
      type: 'environment',
      id: 'tab:agent-environment',
      label: 'Environment tab',
      secondaryLabel: 'Agent instructions, settings, MCP, skills, and templates',
      metadata: {
        excerpt: 'No environment file is selected yet. Open this tab and select an instruction or configuration file before asking the assistant to edit it.'
      }
    };
  };

  const selectContextTab = (tab: 'services' | 'llm-models' | 'agent-environment') => {
    setCurrentSubTab(tab);
    setActiveContext(tabContext(tab));
  };

  useEffect(() => {
    if (currentSubTab === 'agent-environment') setActiveContext(tabContext('agent-environment'));
  }, [currentSubTab, environmentContext, setActiveContext]);

  const refresh = useCallback(async () => {
    const { enabled, services: statuses } = await loadServiceStatuses(workspaceDir);
    setExecEnabled(enabled);
    setProcesses(Object.fromEntries(statuses.map(status => [status.id, status])));
  }, [workspaceDir]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const refreshModels = useCallback(async () => {
    const snapshot = await loadLocalModels();
    setLocalModels(snapshot.models);
    setModelsDir(snapshot.modelsDir);
    setModelHardware(snapshot.hardware);
    setLlamaServerAvailable(snapshot.llamaServerAvailable);
  }, []);

  useEffect(() => {
    if (currentSubTab !== 'llm-models') return;
    void refreshModels().catch(error => setRuntimeError(String(error instanceof Error ? error.message : error)));
    const timer = window.setInterval(() => {
      void refreshModels().catch(error => setRuntimeError(String(error instanceof Error ? error.message : error)));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [currentSubTab, refreshModels]);

  const handleServiceAction = useCallback(async (id: string, action: ServiceAction) => {
    setRuntimeError(null);
    setBusyServiceId(id);
    try {
      const status = await controlService(workspaceDir, id, action);
      setProcesses(current => ({ ...current, [id]: status }));
      if (action === 'uninstall') deleteService(id);
    } catch (error) {
      setRuntimeError(String(error instanceof Error ? error.message : error));
    } finally {
      setBusyServiceId(null);
    }
  }, [workspaceDir, deleteService]);

  const handleShowLogs = useCallback(async (id: string) => {
    setRuntimeError(null);
    setLogsServiceId(id);
    setLogs(null);
    try {
      setLogs(await loadServiceLogs(workspaceDir, id));
    } catch (error) {
      setRuntimeError(String(error instanceof Error ? error.message : error));
      setLogsServiceId(null);
    }
  }, [workspaceDir]);

  useEffect(() => {
    if (!logsServiceId) return;
    const timer = window.setInterval(() => {
      void loadServiceLogs(workspaceDir, logsServiceId)
        .then(setLogs)
        .catch(error => setRuntimeError(String(error instanceof Error ? error.message : error)));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [logsServiceId, workspaceDir]);

  const handleModelAction = useCallback(async (
    model: LocalModelStatus,
    action: 'run' | 'stop' | 'remove' | 'cancel-download'
  ) => {
    setRuntimeError(null);
    setBusyModelId(model.id);
    try {
      await controlLocalModel(model.fileName, action, action === 'run' ? {
        gpuLayers: model.fit?.suggestedGpuLayers,
        contextLength: 32768,
        projectorFileName: model.projectorFileName
      } : {});
      await refreshModels();
    } catch (error) {
      setRuntimeError(String(error instanceof Error ? error.message : error));
    } finally {
      setBusyModelId(null);
    }
  }, [refreshModels]);

  const handleModelDownload = useCallback(async (request: ModelDownloadRequest) => {
    setRuntimeError(null);
    try {
      await downloadLocalModel(request);
      await refreshModels();
    } catch (error) {
      setRuntimeError(String(error instanceof Error ? error.message : error));
      throw error;
    }
  }, [refreshModels]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]">
      {/* Surface Header with Sub-tab Navigation */}
      <header className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <Cpu size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                Runtime Engine
              </h1>
              <TabHelpTip
                title="Runtime Engine"
                category="Execution Layer"
                summary="Execution layer for services, LLM checkpoints, agent jobs, and agent configuration."
                tips={[
                  "Switch sub-tabs to inspect services, LLM models, agent jobs, or the Agent Environment.",
                  "Drag any service or model card into the Assistant Dock to diagnose issues."
                ]}
                placement="bottom"
                variant="inline"
                color="violet"
              />
            </div>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)] hidden sm:block">
              Execution layer for services, local LLMs, agent jobs, and environment configuration
            </p>
          </div>
        </div>

        {/* Runtime Subtabs Switcher */}
        <nav aria-label="Runtime Engine Subtabs" className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] shadow-2xs overflow-x-auto max-w-full">
          <button
            type="button"
            draggable
            onDragStart={event => setAssistantContextData(event, tabContext('services'))}
            onClick={() => selectContextTab('services')}
            title="Open Runtime Engine. Drag into the assistant to attach its current snapshot."
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              currentSubTab === 'services'
                ? 'bg-[var(--color-surface)] text-violet-700 dark:text-violet-300 border border-violet-300/60 dark:border-violet-700/60 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]/60'
            }`}
          >
            <ServerCog size={13} />
            <span>Services</span>
            <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-[var(--color-rule)]/40 font-mono">
              {services.length}
            </span>
          </button>
          <button
            type="button"
            draggable
            onDragStart={event => setAssistantContextData(event, tabContext('llm-models'))}
            onClick={() => selectContextTab('llm-models')}
            title="Open LLM Models. Drag into the assistant to attach its current snapshot."
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              currentSubTab === 'llm-models'
                ? 'bg-[var(--color-surface)] text-violet-700 dark:text-violet-300 border border-violet-300/60 dark:border-violet-700/60 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]/60'
            }`}
          >
            <Cpu size={13} />
            <span>LLM Models</span>
            <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-[var(--color-rule)]/40 font-mono">
              {localModels.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentSubTab('agent-jobs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              currentSubTab === 'agent-jobs'
                ? 'bg-[var(--color-surface)] text-violet-700 dark:text-violet-300 border border-violet-300/60 dark:border-violet-700/60 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]/60'
            }`}
          >
            <Bot size={13} />
            <span>Agent Jobs</span>
            <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-[var(--color-rule)]/40 font-mono">
              {runs.length}
            </span>
          </button>
          <button
            type="button"
            draggable
            onDragStart={event => setAssistantContextData(event, tabContext('agent-environment'))}
            onClick={() => selectContextTab('agent-environment')}
            title="Open Environment. Drag into the assistant to attach the selected file."
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
              currentSubTab === 'agent-environment'
                ? 'bg-[var(--color-surface)] text-violet-700 dark:text-violet-300 border border-violet-300/60 dark:border-violet-700/60 font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]/60'
            }`}
          >
            <Settings2 size={13} />
            <span>Environment</span>
          </button>
        </nav>
      </header>
      {runtimeError && <div className="px-5 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-mono" role="alert">{runtimeError}</div>}
      <ExecutionEngineView
        currentSubTab={currentSubTab}
        onSubTabChange={setCurrentSubTab}
        hideSubnavTabs={true}
        services={services}
        onAddService={addService}
        onUpdateService={updateService}
        processes={processes}
        execEnabled={execEnabled}
        busyServiceId={busyServiceId}
        onServiceAction={handleServiceAction}
        onShowLogs={handleShowLogs}
        logs={logs}
        logsServiceId={logsServiceId}
        onCloseLogs={() => setLogsServiceId(null)}
        runs={runs}
        localModels={localModels}
        modelsDir={modelsDir}
        modelHardware={modelHardware}
        llamaServerAvailable={llamaServerAvailable}
        busyModelId={busyModelId}
        onRefreshModels={refreshModels}
        onModelAction={handleModelAction}
        onModelDownload={handleModelDownload}
        automations={automations}
        targets={targets}
        onEnvironmentContextChange={setEnvironmentContext}
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
