import { DragEvent, useState, useMemo } from 'react';
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
  Layers
} from 'lucide-react';
import {
  EngineSubTab,
  ServiceItem,
  RunItem,
  LLMModelItem,
  AutomationItem,
  TargetItem,
  WorkspaceObject
} from '../../productivityTypes';
import { setDragObjectData } from '../../utils/dragDrop';

interface ExecutionEngineViewProps {
  currentSubTab: EngineSubTab;
  onSubTabChange: (tab: EngineSubTab) => void;
  services: ServiceItem[];
  runs: RunItem[];
  models: LLMModelItem[];
  automations: AutomationItem[];
  targets: TargetItem[];
  onToggleAutomation?: (id: string) => void;
}

export function ExecutionEngineView({
  currentSubTab,
  onSubTabChange,
  services,
  runs,
  models,
  automations,
  targets,
  onToggleAutomation
}: ExecutionEngineViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
    'llm-models': models.length,
    automations: automations.length,
    targets: targets.length
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      const matchesSearch =
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (srv.protocol && srv.protocol.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || srv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

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
    return models.filter(mdl => {
      const matchesSearch =
        mdl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mdl.family && mdl.family.toLowerCase().includes(searchQuery.toLowerCase())) ||
        mdl.quantization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mdl.hash.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || mdl.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [models, searchQuery, statusFilter]);

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
      <div className="engine-subnav-bar">
        <div className="engine-subtabs-group" role="tablist" aria-label="Execution Engine sections">
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
            aria-selected={currentSubTab === 'runs'}
            className={`engine-subtab-btn ${currentSubTab === 'runs' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('runs')}
            id="engine-tab-runs"
          >
            <Play size={14} />
            <span>Runs</span>
            <span className="engine-subtab-badge">{counts.runs}</span>
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
            aria-selected={currentSubTab === 'automations'}
            className={`engine-subtab-btn ${currentSubTab === 'automations' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('automations')}
            id="engine-tab-automations"
          >
            <Repeat2 size={15} />
            <span>Automations</span>
            <span className="engine-subtab-badge">{counts.automations}</span>
          </button>

          <button
            role="tab"
            aria-selected={currentSubTab === 'targets'}
            className={`engine-subtab-btn ${currentSubTab === 'targets' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('targets')}
            id="engine-tab-targets"
          >
            <Target size={15} />
            <span>Targets</span>
            <span className="engine-subtab-badge">{counts.targets}</span>
          </button>
        </div>

        {/* Quick Search in Sub-bar */}
        <div className="engine-filter-group">
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

      {/* Sub-tab description and drag affordance banner */}
      <div className="engine-view-header-strip">
        <div className="drag-hint-banner m-0">
          <span className="drag-hint-pill">Tip</span>
          <span>
            Drag any {currentSubTab === 'llm-models' ? 'LLM model' : currentSubTab.slice(0, -1)} card
            directly onto the <strong>Assistant chat</strong> to inspect locks, query weights, or run diagnostics.
          </span>
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
                className={`engine-status-pill ${statusFilter === 'idle' ? 'active' : ''}`}
                onClick={() => setStatusFilter('idle')}
              >
                Idle
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
                className={`engine-status-pill ${statusFilter === 'loaded' ? 'active' : ''}`}
                onClick={() => setStatusFilter('loaded')}
              >
                Loaded in VRAM
              </button>
              <button
                className={`engine-status-pill ${statusFilter === 'ready' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ready')}
              >
                Ready on Disk
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
      </div>

      {/* Main Grid Views for Each Section */}
      <div className="engine-content-scroll">
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
                        <span className={`status-pill ${srv.status}`}>{srv.status}</span>
                      </div>
                    </div>

                    <div className="object-meta-row">
                      {srv.protocol && <span><strong>Protocol:</strong> {srv.protocol}</span>}
                      {srv.uptime && <span><strong>Uptime:</strong> {srv.uptime}</span>}
                    </div>

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
                      <span className="drag-chip-hint">⠿ Drag to chat</span>
                      <div className="action-buttons-group">
                        {srv.port && (
                          <span className="footer-link">
                            <Terminal size={11} />
                            curl http://localhost:{srv.port}
                          </span>
                        )}
                      </div>
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
              <div className="engine-empty-results">No LLM models found matching filters.</div>
            ) : (
              filteredModels.map(mdl => {
                const isDragging = draggedId === mdl.id;
                const objData: WorkspaceObject = {
                  objectType: 'model',
                  id: mdl.id,
                  title: mdl.name,
                  subtitle: mdl.family || mdl.quantization,
                  details: `Params: ${mdl.parameters} · Context: ${mdl.contextLength} · VRAM: ${mdl.vramRequired}`,
                  meta: {
                    family: mdl.family,
                    hash: mdl.hash,
                    quantization: mdl.quantization,
                    parameters: mdl.parameters,
                    contextLength: mdl.contextLength,
                    vram: mdl.vramRequired,
                    status: mdl.status,
                    instructFormat: mdl.instructFormat
                  }
                };

                return (
                  <div
                    key={mdl.id}
                    id={`llm-model-${mdl.id}`}
                    className={`object-card model-card ${isDragging ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, objData)}
                    onDragEnd={handleDragEnd}
                    title="Drag onto Assistant chat"
                  >
                    <div className="object-card-header">
                      <div className="object-title-group">
                        <GripVertical size={14} className="drag-grip" />
                        <Cpu size={16} className="object-type-icon model" />
                        <div className="object-title-text flex-col items-start gap-0.5">
                          <strong className="object-name" title={mdl.name}>{mdl.name}</strong>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {mdl.family && <span className="llm-family-badge">{mdl.family}</span>}
                            <span className="object-sub-tag font-mono">{mdl.quantization}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`status-pill ${mdl.status}`}>
                        {mdl.status === 'loaded' && <span className="pulse-dot" />}
                        {mdl.status === 'loaded' ? 'In VRAM' : mdl.status}
                      </span>
                    </div>

                    <div className="object-spec-grid">
                      <div className="spec-item">
                        <span className="spec-label">Parameters</span>
                        <span className="spec-value">{mdl.parameters}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Context Window</span>
                        <span className="spec-value">{mdl.contextLength}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">VRAM Footprint</span>
                        <span className="spec-value">{mdl.vramRequired}</span>
                      </div>
                    </div>

                    <div className="model-hash-row">
                      <span className="hash-label">Weight Hash:</span>
                      <code className="hash-code">{mdl.hash}</code>
                    </div>

                    {mdl.instructFormat && (
                      <div className="llm-prompt-row">
                        <span className="hash-label">Template:</span>
                        <span className="font-mono text-[0.75rem] text-[var(--accent)]">{mdl.instructFormat}</span>
                      </div>
                    )}

                    <div className="object-card-footer">
                      <span className="drag-chip-hint">⠿ Drag to chat</span>
                      <span className="footer-status-text">
                        {mdl.status === 'loaded' ? 'Active local inference weights' : 'Cached in local weights registry'}
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
    </div>
  );
}
