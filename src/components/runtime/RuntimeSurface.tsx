import { useCallback, useEffect, useState } from 'react';
import { ExecutionEngineView } from './ExecutionEngineView';
import { EngineSubTab } from '../../productivityTypes';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TabHelpTip } from '../common/TabHelpTip';
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
  const { workspaceDir, services, addService, updateService, deleteService, runs, automations, setAutomations, targets } = useWorkspace();
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
      <header className="surface-intro">
        <p className="surface-kicker">Execution layer</p>
        <div className="flex items-center gap-2">
          <h1>Runtime</h1>
          <TabHelpTip
            title="Runtime Engine"
            category="Execution Layer"
            summary="Execution layer for services, LLM checkpoints, and agent jobs."
            tips={[
              "Switch sub-tabs to inspect services, LLM models, or agent jobs.",
              "Drag any service or model card into the Assistant Dock to diagnose issues."
            ]}
            placement="bottom"
            variant="inline"
          />
        </div>
        <p>Inspect services, models, and agent jobs.</p>
        {runtimeError && <p className="runtime-error" role="alert">{runtimeError}</p>}
      </header>
      <ExecutionEngineView
        currentSubTab={currentSubTab}
        onSubTabChange={setCurrentSubTab}
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
