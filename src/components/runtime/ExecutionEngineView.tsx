import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  GripVertical,
  Play,
  Clock,
  Lock,
  Cpu,
  ServerCog,
  Repeat2,
  Target,
  Terminal,
  Copy,
  Check,
  Power,
  Search,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Plus,
  X,
  Square,
  Pencil,
  Trash2,
  ScrollText,
  RefreshCw,
  Eraser,
  Bot,
  Download,
  HardDrive,
  Settings2
} from 'lucide-react';
import {
  EngineSubTab,
  ServiceItem,
  RunItem,
  AutomationItem,
  TargetItem,
  WorkspaceObject
} from '../../productivityTypes';
import { setDragObjectData } from '../../utils/dragDrop';
import {
  LocalModelStatus,
  ModelDownloadRequest,
  ModelHardwareStatus,
  ServiceAction,
  ServiceProcessStatus
} from '../../runtimeClient';
import { AgentEnvironmentView } from './AgentEnvironmentView';

interface ExecutionEngineViewProps {
  currentSubTab: EngineSubTab;
  onSubTabChange: (tab: EngineSubTab) => void;
  hideSubnavTabs?: boolean;
  services: ServiceItem[];
  onAddService: (service: Omit<ServiceItem, 'id' | 'createdAt' | 'author' | 'uptime'>) => void;
  onUpdateService: (id: string, changes: Partial<Omit<ServiceItem, 'id' | 'createdAt' | 'author'>>) => void;
  processes: Record<string, ServiceProcessStatus>;
  execEnabled: boolean;
  busyServiceId: string | null;
  onServiceAction: (id: string, action: ServiceAction) => void;
  onShowLogs: (id: string) => void;
  logs: string[] | null;
  logsServiceId: string | null;
  onCloseLogs: () => void;
  runs: RunItem[];
  localModels: LocalModelStatus[];
  modelsDir: string;
  modelHardware: ModelHardwareStatus | null;
  llamaServerAvailable: boolean;
  busyModelId: string | null;
  onRefreshModels: () => Promise<void>;
  onModelAction: (model: LocalModelStatus, action: 'run' | 'stop' | 'remove' | 'cancel-download') => void;
  onModelDownload: (request: ModelDownloadRequest) => Promise<void>;
  automations: AutomationItem[];
  targets: TargetItem[];
  onToggleAutomation?: (id: string) => void;
}

export function ExecutionEngineView({
  currentSubTab,
  onSubTabChange,
  hideSubnavTabs = false,
  services,
  onAddService,
  onUpdateService,
  processes,
  execEnabled,
  busyServiceId,
  onServiceAction,
  onShowLogs,
  logs,
  logsServiceId,
  onCloseLogs,
  runs,
  localModels,
  modelsDir,
  modelHardware,
  llamaServerAvailable,
  busyModelId,
  onRefreshModels,
  onModelAction,
  onModelDownload,
  automations,
  targets,
  onToggleAutomation
}: ExecutionEngineViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceCommand, setServiceCommand] = useState('');
  const [servicePort, setServicePort] = useState('');
  const [serviceProtocol, setServiceProtocol] = useState('');
  const [serviceCwd, setServiceCwd] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [logFloor, setLogFloor] = useState(0);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [modelRepo, setModelRepo] = useState('');
  const [modelFileName, setModelFileName] = useState('');
  const [modelLocalName, setModelLocalName] = useState('');
  const [isSubmittingDownload, setIsSubmittingDownload] = useState(false);
  const serviceNameRef = useRef<HTMLInputElement>(null);
  const modelRepoRef = useRef<HTMLInputElement>(null);

  // ponytail: clearing only hides lines already fetched; journalctl keeps them. Add `journalctl --rotate --vacuum-time` if real deletion is needed.
  useEffect(() => setLogFloor(0), [logsServiceId]);
  const visibleLogs = logs ? logs.slice(Math.min(logFloor, logs.length)) : null;

  useEffect(() => {
    if (!isAddingService && !isAddingModel && !logsServiceId) return;
    if (isAddingService) serviceNameRef.current?.focus();
    if (isAddingModel) modelRepoRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (logsServiceId) onCloseLogs();
      else if (isAddingModel) setIsAddingModel(false);
      else setIsAddingService(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isAddingModel, isAddingService, logsServiceId, onCloseLogs]);

  const resetServiceForm = () => {
    setServiceName('');
    setServiceCommand('');
    setServicePort('');
    setServiceProtocol('');
    setServiceCwd('');
    setEditingServiceId(null);
  };

  const openAddService = () => {
    resetServiceForm();
    setIsAddingService(true);
  };

  const openEditService = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    setServiceName(service.name);
    setServiceCommand(service.command);
    setServicePort(service.port === null ? '' : String(service.port));
    setServiceProtocol(service.protocol ?? '');
    setServiceCwd(service.cwd ?? '');
    setIsAddingService(true);
  };

  const handleAddService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const port = servicePort.trim() ? Number(servicePort) : null;
    if (!serviceName.trim() || !serviceCommand.trim() || (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535))) return;
    const values = {
      name: serviceName.trim(),
      command: serviceCommand.trim(),
      port,
      protocol: serviceProtocol.trim() || undefined,
      cwd: serviceCwd.trim() || undefined
    };
    if (editingServiceId) onUpdateService(editingServiceId, values);
    else onAddService({ ...values, status: 'stopped' });
    resetServiceForm();
    setIsAddingService(false);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleModelDownload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modelRepo.trim() || !modelFileName.trim()) return;
    setIsSubmittingDownload(true);
    try {
      await onModelDownload({
        repo: modelRepo.trim(),
        fileName: modelFileName.trim(),
        localName: modelLocalName.trim() || undefined
      });
      setModelRepo('');
      setModelFileName('');
      setModelLocalName('');
      setIsAddingModel(false);
    } catch {
      return;
    } finally {
      setIsSubmittingDownload(false);
    }
  };

  const handleDragStart = (e: DragEvent, obj: WorkspaceObject) => {
    setDraggedId(obj.id);
    setDragObjectData(e, obj);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // Sub-tab item counts
  const counts = {
    services: services.length,
    runs: runs.length,
    'llm-models': localModels.length,
    automations: automations.length,
    targets: targets.length,
    'agent-jobs': 0,
    'agent-environment': 0
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      const matchesSearch =
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (srv.protocol && srv.protocol.toLowerCase().includes(searchQuery.toLowerCase()));
      const liveStatus = execEnabled ? (processes[srv.id]?.running ? 'running' : 'stopped') : srv.status;
      const matchesStatus = statusFilter === 'all' || liveStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter, execEnabled, processes]);

  // Filtered Runs
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      const matchesSearch =
        run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.resourceLock.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [runs, searchQuery, statusFilter]);

  // Filtered LLM Models
  const filteredModels = useMemo(() => {
    return localModels.filter(model => {
      const matchesSearch =
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.quantization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.parameters.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || model.status === statusFilter || (statusFilter === 'running' && model.status === 'starting');
      return matchesSearch && matchesStatus;
    });
  }, [localModels, searchQuery, statusFilter]);

  // Filtered Automations
  const filteredAutomations = useMemo(() => {
    return automations.filter(auto => {
      const matchesSearch =
        auto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auto.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auto.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auto.target.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && auto.enabled) ||
        (statusFilter === 'paused' && !auto.enabled);
      return matchesSearch && matchesStatus;
    });
  }, [automations, searchQuery, statusFilter]);

  // Filtered Targets
  const filteredTargets = useMemo(() => {
    return targets.filter(tgt => {
      const matchesSearch =
        tgt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tgt.kind.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tgt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tgt.resourceUsage.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || tgt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [targets, searchQuery, statusFilter]);

  // Reset filter when switching sub-tab
  const handleTabSwitch = (newTab: EngineSubTab) => {
    onSubTabChange(newTab);
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="execution-engine-view" id="execution-engine-root">
      {/* Sub-tab Navigation Header */}
      {!hideSubnavTabs ? (
        <div className="engine-subnav-bar">
          <div className="engine-subtabs-group" role="tablist" aria-label="Execution Engine sections">
            <button
              role="tab"
              aria-selected={currentSubTab === 'agent-environment'}
              className={`engine-subtab-btn ${currentSubTab === 'agent-environment' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('agent-environment')}
              id="engine-tab-agent-environment"
            >
              <Settings2 size={15} />
              <span>Agent Environment</span>
            </button>

            <button
              role="tab"
              aria-selected={currentSubTab === 'services'}
              className={`engine-subtab-btn ${currentSubTab === 'services' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('services')}
              id="engine-tab-services"
            >
              <ServerCog size={15} />
              <span>Services</span>
              <span className="engine-subtab-badge">{counts.services}</span>
            </button>

            <button
              role="tab"
              aria-selected={currentSubTab === 'llm-models'}
              className={`engine-subtab-btn ${currentSubTab === 'llm-models' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('llm-models')}
              id="engine-tab-llm-models"
            >
              <Cpu size={15} />
              <span>LLM Models</span>
              <span className="engine-subtab-badge">{counts['llm-models']}</span>
            </button>

            <button
              role="tab"
              aria-selected={currentSubTab === 'agent-jobs'}
              className={`engine-subtab-btn ${currentSubTab === 'agent-jobs' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('agent-jobs')}
              id="engine-tab-agent-jobs"
            >
              <Bot size={15} />
              <span>Agent Jobs</span>
              <span className="engine-subtab-badge">{counts['agent-jobs']}</span>
            </button>
          </div>

          {/* Quick Search in Sub-bar */}
          {!['agent-jobs', 'agent-environment'].includes(currentSubTab) && <div className="engine-filter-group">
            {currentSubTab === 'services' && (
              <button className="engine-add-btn" onClick={openAddService}>
                <Plus size={13} />
                Add service
              </button>
            )}
            {currentSubTab === 'llm-models' && (
              <>
                <button className="engine-add-btn" onClick={() => setIsAddingModel(true)}>
                  <Download size={13} />
                  Download
                </button>
                <button className="service-control-btn" onClick={() => void onRefreshModels()} title="Rescan model directory">
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </>
            )}
            <div className="engine-search-box">
              <Search size={13} className="engine-search-icon" />
              <input
                type="text"
                placeholder={`Filter ${
                  currentSubTab === 'llm-models' ? 'LLM models' : currentSubTab
                }...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="engine-search-input"
              />
              {searchQuery && (
                <button
                  className="engine-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>}
        </div>
      ) : !['agent-jobs', 'agent-environment'].includes(currentSubTab) ? (
        <div className="engine-subnav-bar !justify-end px-5 py-2">
          <div className="engine-filter-group">
            {currentSubTab === 'services' && (
              <button className="engine-add-btn" onClick={openAddService}>
                <Plus size={13} />
                Add service
              </button>
            )}
            {currentSubTab === 'llm-models' && (
              <>
                <button className="engine-add-btn" onClick={() => setIsAddingModel(true)}>
                  <Download size={13} />
                  Download
                </button>
                <button className="service-control-btn" onClick={() => void onRefreshModels()} title="Rescan model directory">
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </>
            )}
            <div className="engine-search-box">
              <Search size={13} className="engine-search-icon" />
              <input
                type="text"
                placeholder={`Filter ${
                  currentSubTab === 'llm-models' ? 'LLM models' : currentSubTab
                }...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="engine-search-input"
              />
              {searchQuery && (
                <button
                  className="engine-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Sub-tab description and drag affordance banner */}
      {!['agent-jobs', 'agent-environment'].includes(currentSubTab) && <div className="engine-view-header-strip">
        <div className={`drag-hint-banner m-0 ${currentSubTab === 'llm-models' ? 'model-runtime-summary' : ''}`}>
          <span className="drag-hint-pill">Tip</span>
          {currentSubTab === 'llm-models' ? (
            <span>
              <strong>{modelsDir}</strong> · {modelHardware?.gpuName ?? 'No NVIDIA GPU'}
              {modelHardware ? ` · VRAM ${modelHardware.vramFree} free · RAM ${modelHardware.ramFree} free` : ''}
              {!llamaServerAvailable ? ' · llama-server unavailable' : ''}
            </span>
          ) : (
            <span>
              Drag any {currentSubTab.slice(0, -1)} card directly onto the <strong>Assistant chat</strong> to inspect locks, query weights, or run diagnostics.
            </span>
          )}
        </div>

        {/* Status quick toggles */}
        <div className="engine-status-pills">
          <button
            className={`engine-status-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          {currentSubTab === 'services' && (
            <>
              <button
                className={`engine-status-pill ${statusFilter === 'running' ? 'active' : ''}`}
                onClick={() => setStatusFilter('running')}
              >
                Running
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'stopped' ? 'active' : ''}`}
                onClick={() => setStatusFilter('stopped')}
              >
                Stopped
              </button>
            </>
          )}
          {currentSubTab === 'runs' && (
            <>
              <button
                className={`engine-status-pill ${statusFilter === 'running' ? 'active' : ''}`}
                onClick={() => setStatusFilter('running')}
              >
                Running
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'failed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('failed')}
              >
                Failed
              </button>
            </>
          )}
          {currentSubTab === 'llm-models' && (
            <>
              <button
                className={`engine-status-pill ${statusFilter === 'running' ? 'active' : ''}`}
                onClick={() => setStatusFilter('running')}
              >
                Running
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'ready' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ready')}
              >
                Ready on Disk
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'downloading' ? 'active' : ''}`}
                onClick={() => setStatusFilter('downloading')}
              >
                Downloading
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'failed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('failed')}
              >
                Failed
              </button>
            </>
          )}
          {currentSubTab === 'automations' && (
            <>
              <button
                className={`engine-status-pill ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'paused' ? 'active' : ''}`}
                onClick={() => setStatusFilter('paused')}
              >
                Paused
              </button>
            </>
          )}
          {currentSubTab === 'targets' && (
            <>
              <button
                className={`engine-status-pill ${statusFilter === 'connected' ? 'active' : ''}`}
                onClick={() => setStatusFilter('connected')}
              >
                Connected
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'busy' ? 'active' : ''}`}
                onClick={() => setStatusFilter('busy')}
              >
                Busy
              </button>
            </>
          )}
        </div>
      </div>}

      {/* Main Grid Views for Each Section */}
      <div className={`engine-content-scroll ${currentSubTab === 'agent-environment' ? 'agent-env-scroll' : ''}`}>
        {currentSubTab === 'agent-environment' && <AgentEnvironmentView />}
        {currentSubTab === 'agent-jobs' && (
          <div className="objects-grid" id="agent-jobs-grid">
            <div className="engine-empty-results">No agent jobs yet.</div>
          </div>
        )}

        {/* SERVICES SECTION */}
        {currentSubTab === 'services' && (
          <div className="objects-grid" id="services-grid">
            {filteredServices.length === 0 ? (
              <div className="engine-empty-results">No services found matching filters.</div>
            ) : (
              filteredServices.map(srv => {
                const isDragging = draggedId === srv.id;
                const objData: WorkspaceObject = {
                  objectType: 'service',
                  id: srv.id,
                  title: srv.name,
                  subtitle: srv.port ? `Port :${srv.port}` : 'UNIX Daemon',
                  details: srv.command,
                  meta: {
                    port: srv.port,
                    status: srv.status,
                    uptime: srv.uptime,
                    protocol: srv.protocol
                  }
                };

                return (
                  <div
                    key={srv.id}
                    id={`service-${srv.id}`}
                    className={`object-card service-card ${isDragging ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, objData)}
                    onDragEnd={handleDragEnd}
                    title="Drag onto Assistant chat"
                  >
                    <div className="object-card-header">
                      <div className="object-title-group">
                        <GripVertical size={14} className="drag-grip" />
                        <ServerCog size={16} className="object-type-icon" />
                        <div className="object-title-text">
                          <strong className="object-name" title={srv.name}>{srv.name}</strong>
                          {srv.port && <span className="object-sub-tag">:{srv.port}</span>}
                        </div>
                      </div>
                      <div className="object-header-actions">
                        <span className={`status-pill ${execEnabled ? (processes[srv.id]?.running ? 'running' : 'stopped') : srv.status}`}>
                          {execEnabled ? (processes[srv.id]?.running ? 'running' : 'stopped') : srv.status}
                        </span>
                        <div className="service-card-tools">
                          <button onClick={() => openEditService(srv)} title="Edit service" aria-label={`Edit ${srv.name}`}>
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete ${srv.name}? This stops it and removes its autostart unit.`)) {
                                onServiceAction(srv.id, 'uninstall');
                              }
                            }}
                            title="Delete service"
                            aria-label={`Delete ${srv.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="object-meta-row">
                      {srv.protocol && <span><strong>Protocol:</strong> {srv.protocol}</span>}
                      {!execEnabled && srv.uptime && <span><strong>Uptime:</strong> {srv.uptime}</span>}
                    </div>

                    {execEnabled && (
                      <div className="service-control-row">
                        <span className={`status-pill ${processes[srv.id]?.running ? 'running' : 'stopped'}`}>
                          {processes[srv.id]?.installed
                            ? `${processes[srv.id]?.activeState}${processes[srv.id]?.pid ? ` · pid ${processes[srv.id]?.pid}` : ''}`
                            : 'no unit installed'}
                        </span>
                        <div className="action-buttons-group">
                          <button
                            className="service-control-btn"
                            onClick={() => onServiceAction(srv.id, 'start')}
                            disabled={busyServiceId === srv.id || processes[srv.id]?.running}
                          >
                            <Play size={12} /> Start
                          </button>
                          <button
                            className="service-control-btn"
                            onClick={() => onServiceAction(srv.id, 'stop')}
                            disabled={busyServiceId === srv.id || !processes[srv.id]?.running}
                          >
                            <Square size={12} /> Stop
                          </button>
                          <button
                            className={`service-control-btn ${processes[srv.id]?.autostart ? 'is-enabled' : ''}`}
                            onClick={() => onServiceAction(srv.id, processes[srv.id]?.autostart ? 'disable' : 'enable')}
                            disabled={busyServiceId === srv.id}
                          >
                            <Power size={12} /> Autostart {processes[srv.id]?.autostart ? 'on' : 'off'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="code-block-wrap">
                      <code>{srv.command}</code>
                      <button
                        className="copy-btn"
                        onClick={() => copyText(srv.command, srv.id)}
                        title="Copy command"
                        aria-label="Copy command"
                      >
                        {copiedId === srv.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>

                    <div className="object-card-footer">
                      {execEnabled && (
                        <button
                          className="service-control-btn service-footer-logs"
                          onClick={() => onShowLogs(srv.id)}
                          disabled={busyServiceId === srv.id || !processes[srv.id]?.installed}
                        >
                          <ScrollText size={12} /> View logs
                        </button>
                      )}
                      {srv.port && (
                        <a
                          className="footer-link is-link"
                          href={`http://localhost:${srv.port}`}
                          target="_blank"
                          rel="noreferrer"
                          title={`Open http://localhost:${srv.port}`}
                        >
                          <Terminal size={11} />
                          localhost:{srv.port}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* RUNS SECTION */}
        {currentSubTab === 'runs' && (
          <div className="objects-grid" id="runs-grid">
            {filteredRuns.length === 0 ? (
              <div className="engine-empty-results">No execution runs found matching filters.</div>
            ) : (
              filteredRuns.map(run => {
                const isDragging = draggedId === run.id;
                const objData: WorkspaceObject = {
                  objectType: 'run',
                  id: run.id,
                  title: run.name,
                  subtitle: `Target: ${run.target}`,
                  details: `Duration: ${run.duration} · Lock: ${run.resourceLock}`,
                  meta: {
                    target: run.target,
                    status: run.status,
                    duration: run.duration,
                    lock: run.resourceLock,
                    exitCode: run.exitCode ?? null
                  }
                };

                return (
                  <div
                    key={run.id}
                    id={`run-${run.id}`}
                    className={`object-card run-card ${isDragging ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, objData)}
                    onDragEnd={handleDragEnd}
                    title="Drag onto Assistant chat"
                  >
                    <div className="object-card-header">
                      <div className="object-title-group">
                        <GripVertical size={14} className="drag-grip" />
                        <Play size={15} className="object-type-icon run" />
                        <div className="object-title-text">
                          <strong className="object-name" title={run.name}>{run.name}</strong>
                          <span className="object-sub-tag font-mono">{run.id}</span>
                        </div>
                      </div>
                      <span className={`status-pill ${run.status}`}>
                        {run.status === 'running' && <span className="pulse-dot" />}
                        {run.status}
                      </span>
                    </div>

                    <div className="object-meta-row">
                      <span><strong>Target:</strong> {run.target}</span>
                      <span><Clock size={11} /> {run.duration}</span>
                      <span>{run.timestamp}</span>
                    </div>

                    <div className="lock-indicator-row">
                      <Lock size={12} className="lock-icon" />
                      <span className="lock-text">{run.resourceLock}</span>
                      {run.exitCode !== undefined && (
                        <span className={`exit-code-pill ${run.exitCode === 0 ? 'success' : 'fail'}`}>
                          code {run.exitCode}
                        </span>
                      )}
                    </div>

                    <div className="object-card-footer">
                      <span className="drag-chip-hint">⠿ Drag to chat</span>
                      <span className="footer-status-text">
                        {run.status === 'running' ? 'Active execution thread' : 'Execution finalized'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* LLM MODELS SECTION */}
        {currentSubTab === 'llm-models' && (
          <div className="objects-grid" id="llm-models-grid">
            {filteredModels.length === 0 ? (
              <div className="engine-empty-results">
                No GGUF files found in <code>{modelsDir}</code>. Download one or copy it into the directory, then refresh.
              </div>
            ) : (
              filteredModels.map(model => {
                const isDragging = draggedId === model.id;
                const isBusy = busyModelId === model.id;
                const isRunning = model.status === 'running' || model.status === 'starting';
                const downloadPercent = model.download?.totalBytes
                  ? Math.min(100, Math.round(model.download.receivedBytes / model.download.totalBytes * 100))
                  : null;
                const objData: WorkspaceObject = {
                  objectType: 'model',
                  id: model.id,
                  title: model.name,
                  subtitle: `${model.parameters} · ${model.quantization}`,
                  details: `${model.size} · ${model.fit?.label ?? 'Projector asset'} · ${model.path}`,
                  meta: {
                    fileName: model.fileName,
                    path: model.path,
                    quantization: model.quantization,
                    parameters: model.parameters,
                    size: model.size,
                    status: model.status,
                    fit: model.fit?.label,
                    endpoint: model.runtime ? `http://127.0.0.1:${model.runtime.port}` : undefined
                  }
                };

                return (
                  <div
                    key={model.id}
                    id={`llm-model-${model.id}`}
                    className={`object-card model-card ${isDragging ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, objData)}
                    onDragEnd={handleDragEnd}
                    title="Drag onto Assistant chat"
                  >
                    <div className="object-card-header">
                      <div className="object-title-group">
                        <GripVertical size={14} className="drag-grip" />
                        {model.kind === 'projector'
                          ? <HardDrive size={16} className="object-type-icon model" />
                          : <Cpu size={16} className="object-type-icon model" />}
                        <div className="object-title-text flex-col items-start gap-0.5">
                          <strong className="object-name" title={model.fileName}>{model.name}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="llm-family-badge">{model.kind}</span>
                            <span className="object-sub-tag font-mono">{model.quantization}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`status-pill ${model.status}`}>
                        {isRunning && <span className="pulse-dot" />}
                        {model.status}
                      </span>
                    </div>

                    <div className="object-spec-grid">
                      <div className="spec-item">
                        <span className="spec-label">File size</span>
                        <span className="spec-value">{model.size}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Parameters</span>
                        <span className="spec-value">{model.parameters}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">GPU layers</span>
                        <span className="spec-value">{model.runtime?.gpuLayers ?? model.fit?.suggestedGpuLayers ?? '—'}</span>
                      </div>
                    </div>

                    <div className="model-hash-row">
                      <span className="hash-label">File:</span>
                      <code className="hash-code" title={model.path}>{model.fileName}</code>
                      <button className="model-copy-path" onClick={() => copyText(model.path, `path-${model.id}`)} title="Copy path" aria-label={`Copy path for ${model.name}`}>
                        {copiedId === `path-${model.id}` ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>

                    {model.fit && (
                      <div className={`model-fit-row ${model.fit.mode}`} title="Estimate includes weight size plus coarse runtime overhead; KV cache varies with context.">
                        <strong>{model.fit.label}</strong>
                        <span>{model.fit.detail}</span>
                      </div>
                    )}

                    {model.download && (
                      <div className="model-download-row">
                        <div className="model-download-track"><span style={{ width: `${downloadPercent ?? 8}%` }} /></div>
                        <span>{downloadPercent === null ? model.size : `${downloadPercent}%`}</span>
                      </div>
                    )}

                    {model.runtime && (
                      <div className="llm-prompt-row">
                        <span className="hash-label">Endpoint:</span>
                        <code className="hash-code">http://127.0.0.1:{model.runtime.port}</code>
                        <span className="hash-label">ctx {model.runtime.contextLength}</span>
                      </div>
                    )}

                    {(model.runtime?.error || model.download?.error) && (
                      <p className="model-runtime-error">{model.runtime?.error ?? model.download?.error}</p>
                    )}

                    <div className="model-control-row">
                      {model.status === 'downloading' ? (
                        <button className="service-control-btn" disabled={isBusy} onClick={() => onModelAction(model, 'cancel-download')}>
                          <Square size={12} /> Cancel
                        </button>
                      ) : model.kind === 'model' && isRunning ? (
                        <button className="service-control-btn" disabled={isBusy} onClick={() => onModelAction(model, 'stop')}>
                          <Square size={12} /> Stop
                        </button>
                      ) : model.kind === 'model' ? (
                        <button
                          className="service-control-btn is-enabled"
                          disabled={isBusy || !llamaServerAvailable || model.fit?.mode === 'insufficient'}
                          onClick={() => onModelAction(model, 'run')}
                          title={model.fit?.mode === 'insufficient' ? 'Free RAM/VRAM before starting this model.' : 'Start llama-server on the next free port.'}
                        >
                          <Play size={12} /> Run
                        </button>
                      ) : <span className="footer-status-text">Attached automatically to matching multimodal models.</span>}
                      <button
                        className="service-control-btn model-remove-btn"
                        disabled={isBusy || model.status === 'downloading'}
                        onClick={() => {
                          if (window.confirm(`Remove ${model.fileName} from disk?`)) onModelAction(model, 'remove');
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>

                    <div className="object-card-footer">
                      <span className="drag-chip-hint">⠿ Drag to chat</span>
                      <span className="footer-status-text">
                        {model.projectorFileName ? `Projector: ${model.projectorFileName}` : model.path}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* AUTOMATIONS SECTION */}
        {currentSubTab === 'automations' && (
          <div className="objects-grid" id="automations-grid">
            {filteredAutomations.length === 0 ? (
              <div className="engine-empty-results">No automations found matching filters.</div>
            ) : (
              filteredAutomations.map(auto => {
                const isDragging = draggedId === auto.id;
                const objData: WorkspaceObject = {
                  objectType: 'automation',
                  id: auto.id,
                  title: auto.name,
                  subtitle: `Trigger: ${auto.trigger}`,
                  details: `Action: ${auto.action} → ${auto.target}`,
                  meta: {
                    trigger: auto.trigger,
                    action: auto.action,
                    target: auto.target,
                    enabled: auto.enabled,
                    lastRun: auto.lastRun
                  }
                };

                return (
                  <div
                    key={auto.id}
                    id={`automation-${auto.id}`}
                    className={`object-card auto-card ${isDragging ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, objData)}
                    onDragEnd={handleDragEnd}
                    title="Drag onto Assistant chat"
                  >
                    <div className="object-card-header">
                      <div className="object-title-group">
                        <GripVertical size={14} className="drag-grip" />
                        <Repeat2 size={16} className="object-type-icon automation" />
                        <div className="object-title-text">
                          <strong className="object-name" title={auto.name}>{auto.name}</strong>
                          <span className="object-sub-tag font-mono">{auto.id}</span>
                        </div>
                      </div>
                      <button
                        className={`toggle-switch-btn ${auto.enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => onToggleAutomation && onToggleAutomation(auto.id)}
                        title={auto.enabled ? 'Disable automation' : 'Enable automation'}
                      >
                        <Power size={11} />
                        <span>{auto.enabled ? 'Active' : 'Paused'}</span>
                      </button>
                    </div>

                    <div className="auto-pipeline-flow">
                      <div className="flow-step">
                        <span className="flow-label">Trigger</span>
                        <code className="flow-code">{auto.trigger}</code>
                      </div>
                      <div className="flow-arrow">→</div>
                      <div className="flow-step">
                        <span className="flow-label">Action</span>
                        <code className="flow-code">{auto.action}</code>
                      </div>
                    </div>

                    <div className="object-meta-row">
                      <span><strong>Target:</strong> {auto.target}</span>
                      <span><strong>Last run:</strong> {auto.lastRun}</span>
                    </div>

                    <div className="object-card-footer">
                      <span className="drag-chip-hint">⠿ Drag to chat</span>
                      <span className="footer-status-text">Continuous event listener</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TARGETS SECTION */}
        {currentSubTab === 'targets' && (
          <div className="objects-grid" id="targets-grid">
            {filteredTargets.length === 0 ? (
              <div className="engine-empty-results">No targets found matching filters.</div>
            ) : (
              filteredTargets.map(tgt => {
                const isDragging = draggedId === tgt.id;
                const objData: WorkspaceObject = {
                  objectType: 'target',
                  id: tgt.id,
                  title: tgt.name,
                  subtitle: `Kind: ${tgt.kind}`,
                  details: `${tgt.location} · ${tgt.resourceUsage}`,
                  meta: {
                    kind: tgt.kind,
                    location: tgt.location,
                    usage: tgt.resourceUsage,
                    status: tgt.status
                  }
                };

                return (
                  <div
                    key={tgt.id}
                    id={`target-${tgt.id}`}
                    className={`object-card target-card ${isDragging ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, objData)}
                    onDragEnd={handleDragEnd}
                    title="Drag onto Assistant chat"
                  >
                    <div className="object-card-header">
                      <div className="object-title-group">
                        <GripVertical size={14} className="drag-grip" />
                        <Target size={16} className="object-type-icon target" />
                        <div className="object-title-text">
                          <strong className="object-name" title={tgt.name}>{tgt.name}</strong>
                          <span className="object-sub-tag font-mono">{tgt.kind}</span>
                        </div>
                      </div>
                      <span className={`status-pill ${tgt.status}`}>{tgt.status}</span>
                    </div>

                    <div className="code-block-wrap">
                      <code>{tgt.location}</code>
                    </div>

                    <div className="target-usage-box">
                      <span className="usage-label">Resource Telemetry:</span>
                      <span className="usage-text">{tgt.resourceUsage}</span>
                    </div>

                    <div className="object-card-footer">
                      <span className="drag-chip-hint">⠿ Drag to chat</span>
                      <span className="footer-status-text">Can hold resource locks</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {isAddingService && (
        <div className="kanban-modal-backdrop" onMouseDown={() => setIsAddingService(false)}>
          <div
            className="kanban-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-service-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="kanban-modal-header">
              <h2 id="add-service-title" className="kanban-modal-heading">
                {editingServiceId ? 'Edit service command' : 'Add service command'}
              </h2>
              <button className="engine-dialog-close" onClick={() => setIsAddingService(false)} aria-label="Close add service dialog">
                <X size={16} />
              </button>
            </div>
            <form className="kanban-modal-form" onSubmit={handleAddService}>
              <div className="form-field">
                <label htmlFor="service-name">Name</label>
                <input ref={serviceNameRef} id="service-name" value={serviceName} onChange={event => setServiceName(event.target.value)} placeholder="9router" required />
              </div>
              <div className="form-field">
                <label htmlFor="service-command">Command</label>
                <textarea id="service-command" value={serviceCommand} onChange={event => setServiceCommand(event.target.value)} placeholder="docker run ..." rows={5} required />
              </div>
              <div className="task-editor-grid">
                <div className="form-field">
                  <label htmlFor="service-port">Port (optional)</label>
                  <input id="service-port" type="number" min="1" max="65535" value={servicePort} onChange={event => setServicePort(event.target.value)} placeholder="8787" />
                </div>
                <div className="form-field">
                  <label htmlFor="service-protocol">Protocol (optional)</label>
                  <input id="service-protocol" value={serviceProtocol} onChange={event => setServiceProtocol(event.target.value)} placeholder="HTTP/REST" />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="service-cwd">Working directory (optional)</label>
                <input id="service-cwd" value={serviceCwd} onChange={event => setServiceCwd(event.target.value)} placeholder="~/code/my-project" />
              </div>
              <p className="task-editor-tip">
                {editingServiceId
                  ? 'Changes apply the next time the service starts.'
                  : 'Start installs a persistent systemd user service. Autostart runs it after login.'}
              </p>
              <div className="task-editor-actions">
                <button type="button" className="task-editor-button is-secondary" onClick={() => setIsAddingService(false)}>Cancel</button>
                <button type="submit" className="task-editor-button is-primary" disabled={!serviceName.trim() || !serviceCommand.trim()}>
                  {editingServiceId ? 'Save changes' : 'Add service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingModel && (
        <div className="kanban-modal-backdrop" onMouseDown={() => !isSubmittingDownload && setIsAddingModel(false)}>
          <div
            className="kanban-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-model-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="kanban-modal-header">
              <h2 id="download-model-title" className="kanban-modal-heading">Download GGUF model</h2>
              <button className="engine-dialog-close" disabled={isSubmittingDownload} onClick={() => setIsAddingModel(false)} aria-label="Close model download dialog">
                <X size={16} />
              </button>
            </div>
            <form className="kanban-modal-form" onSubmit={handleModelDownload}>
              <div className="form-field">
                <label htmlFor="model-repo">Hugging Face repository</label>
                <input ref={modelRepoRef} id="model-repo" value={modelRepo} onChange={event => setModelRepo(event.target.value)} placeholder="unsloth/Qwen3.6-35B-A3B-GGUF" pattern="[A-Za-z0-9._-]+/[A-Za-z0-9._-]+" required />
              </div>
              <div className="form-field">
                <label htmlFor="model-file-name">Repository filename</label>
                <input id="model-file-name" value={modelFileName} onChange={event => setModelFileName(event.target.value)} placeholder="Qwen3.6-35B-A3B-UD-Q4_K_M.gguf" required />
              </div>
              <div className="form-field">
                <label htmlFor="model-local-name">Local filename (optional)</label>
                <input id="model-local-name" value={modelLocalName} onChange={event => setModelLocalName(event.target.value)} placeholder="Defaults to repository filename" pattern="[A-Za-z0-9._+()-]+\.[Gg][Gg][Uu][Ff]" />
              </div>
              <p className="task-editor-tip">
                Saves into <code>{modelsDir}</code>. Private or gated repositories use the server process <code>HF_TOKEN</code> environment variable.
              </p>
              <div className="task-editor-actions">
                <button type="button" className="task-editor-button is-secondary" disabled={isSubmittingDownload} onClick={() => setIsAddingModel(false)}>Cancel</button>
                <button type="submit" className="task-editor-button is-primary" disabled={isSubmittingDownload || !modelRepo.trim() || !modelFileName.trim()}>
                  {isSubmittingDownload ? 'Starting…' : 'Download'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {logsServiceId && (
        <div className="kanban-modal-backdrop" onMouseDown={onCloseLogs}>
          <div
            className="kanban-modal-panel runtime-log-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-logs-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="kanban-modal-header runtime-log-header">
              <div className="runtime-log-title">
                <h2 id="service-logs-title" className="kanban-modal-heading">Service logs</h2>
                <span className="runtime-log-unit">{logsServiceId}</span>
                <span className="runtime-log-count">{visibleLogs ? `${visibleLogs.length} lines` : 'loading'}</span>
              </div>
              <div className="runtime-log-actions">
                <button
                  className="runtime-log-action"
                  onClick={() => setLogFloor(logs?.length ?? 0)}
                  disabled={!visibleLogs?.length}
                  title="Clear view"
                  aria-label="Clear log view"
                >
                  <Eraser size={14} />
                  Clear
                </button>
                <button
                  className="runtime-log-action"
                  onClick={() => onShowLogs(logsServiceId)}
                  title="Refresh"
                  aria-label="Refresh logs"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button className="engine-dialog-close" onClick={onCloseLogs} title="Close" aria-label="Close service logs">
                  <X size={16} />
                </button>
              </div>
            </div>
            <pre className="runtime-log-viewer">
              {visibleLogs === null ? 'Loading logs…' : visibleLogs.length ? visibleLogs.join('\n') : 'No logs yet.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
