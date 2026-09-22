import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSearch,
  History,
  Layers,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  StopCircle,
  Trash2,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useScouts } from '../../context/useScouts';
import { useLiterature } from '../../context/useLiterature';
import { activeScoutRun } from '../../scoutClient';
import type { ScoutBriefInput, ScoutRun, ScoutRunState } from '../../scoutTypes';
import './scoutMonitor.css';

const STAGE_LABELS: Record<string, string> = {
  queued: 'Formulating search directions',
  retrieving: 'Searching OpenAlex, arXiv & Crossref',
  normalizing: 'Deduplicating candidate papers',
  screening: 'Screening titles and abstracts',
  assembling: 'Synthesizing recommendations',
  cancelling: 'Cancelling run…'
};

const PIPELINE_STEPS = [
  { id: 'queued', label: '1. Plan & Query' },
  { id: 'retrieving', label: '2. Multi-Source Search' },
  { id: 'normalizing', label: '3. Deduplication' },
  { id: 'screening', label: '4. AI Screening' },
  { id: 'assembling', label: '5. Shortlist Assembly' }
] as const;

const PROVIDERS = ['OpenAlex', 'arXiv', 'Crossref'] as const;

function stageStepIndex(stage?: ScoutRunState): number {
  switch (stage) {
    case 'queued': return 0;
    case 'retrieving': return 1;
    case 'normalizing': return 2;
    case 'screening': return 3;
    case 'assembling': return 4;
    case 'completed':
    case 'partial': return 5;
    default: return 0;
  }
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function formatFreshness(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'updated now';
  if (seconds < 60) return `updated ${seconds}s ago`;
  return `updated ${Math.floor(seconds / 60)}m ago`;
}

type BriefDraft = {
  question: string;
  purpose: string;
  directions: string;
  scope: string;
  exclusions: string;
  maxRecommendations: number;
  recencyPolicy: 'recent' | 'mixed' | 'foundational-gap';
};

const defaultDraft: BriefDraft = {
  question: '',
  purpose: '',
  directions: '',
  scope: '',
  exclusions: '',
  maxRecommendations: 5,
  recencyPolicy: 'recent'
};

export function ActiveScoutMonitor({ onSelectReport }: { readonly onSelectReport?: (reportId: string) => void }) {
  const { workspaceDir } = useWorkspace();
  const scouts = useScouts(workspaceDir);
  const literature = useLiterature(workspaceDir);

  const [elapsed, setElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [briefDraft, setBriefDraft] = useState<BriefDraft>(defaultDraft);
  const [validation, setValidation] = useState('');
  const briefDialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Identify active and recent runs
  const activeRuns = useMemo(
    () => (scouts.snapshot?.runs ?? []).filter(run => activeScoutRun(run.state)),
    [scouts.snapshot?.runs]
  );
  const activeRun: ScoutRun | undefined = activeRuns[0];

  const recentRuns = useMemo(
    () => [...(scouts.snapshot?.runs ?? [])]
      .filter(run => !activeScoutRun(run.state))
      .sort((a, b) => b.startedAt - a.startedAt),
    [scouts.snapshot?.runs]
  );
  // Timer for active runs
  useEffect(() => {
    if (!activeRun) {
      setElapsed(0);
      return;
    }
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - activeRun.startedAt) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeRun]);

  const runTitle = useMemo(() => {
    if (!activeRun) return '';
    return 'question' in activeRun.inputSnapshot
      ? activeRun.inputSnapshot.question
      : activeRun.inputSnapshot.name;
  }, [activeRun]);

  const activeStage = activeRun?.activeStage ?? activeRun?.state;
  const currentStep = stageStepIndex(activeStage);
  const providerSummaries = useMemo(() => PROVIDERS.map(provider => {
    const attempts = activeRun?.providerAttempts.filter(attempt => attempt.provider === provider) ?? [];
    const completed = attempts.filter(attempt => attempt.status === 'completed').reduce((total, attempt) => total + attempt.resultCount, 0);
    const failed = attempts.filter(attempt => attempt.status === 'failed');
    const latest = attempts.at(-1);
    return { provider, completed, failed, latest, attempts };
  }), [activeRun?.providerAttempts]);

  const handleCancel = async () => {
    if (!activeRun || scouts.busy) return;
    await scouts.cancelRun(activeRun.id);
  };

  const openBriefDialog = (trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setBriefDraft(defaultDraft);
    setValidation('');
    briefDialog.current?.showModal();
  };

  const handleSaveAndRunBrief = async () => {
    const q = briefDraft.question.trim();
    const p = briefDraft.purpose.trim();
    if (!q || !p) {
      setValidation('Research question and purpose are required.');
      return;
    }

    const lines = (val: string) => val.split('\n').map(l => l.trim()).filter(Boolean);
    const directionsInput = lines(briefDraft.directions);

    // If directions are empty, formulate automatic directions from question
    const searchDirections = directionsInput.length > 0
      ? directionsInput.map(line => {
          const sep = line.indexOf('::');
          return sep < 0 ? { query: line, reason: 'Problem inquiry focus' } : { query: line.slice(0, sep).trim(), reason: line.slice(sep + 2).trim() };
        })
      : [
          { query: q, reason: 'Direct primary inquiry terms' },
          { query: `${q} empirical evaluation`, reason: 'Empirical benchmarks and measurements' }
        ];

    const briefInput: ScoutBriefInput = {
      question: q,
      purpose: p,
      scope: lines(briefDraft.scope),
      exclusions: lines(briefDraft.exclusions),
      constraints: ['Title and abstract screening only'],
      searchDirections,
      screeningCriteria: ['Direct problem relevance', 'Methodological clarity and explicit findings'],
      maxRecommendations: briefDraft.maxRecommendations,
      recencyPolicy: briefDraft.recencyPolicy,
      createdFrom: { kind: 'user', reference: 'Literature survey active monitor' },
      author: 'user'
    };

    const saved = await scouts.saveBrief(undefined, briefInput);
    if (saved) {
      briefDialog.current?.close();
      await scouts.startRun(saved.id, 'brief');
    }
  };

  // 1. If an active run is currently executing
  if (activeRun) {
    return (
      <section className="scout-monitor scout-monitor-active" aria-label="Active scout running telemetry">
        <header className="scout-monitor-running-header">
          <div>
            <div className="scout-monitor-mission-meta">
              <span className="scout-kicker-badge">
                <Loader2 size={11} className="animate-spin" />
                <span>Scout Running · {activeRun.source.kind === 'watch' ? 'Topic Watch' : 'Problem Brief'}</span>
              </span>
              <span className="scout-timer-badge">
                <Clock size={11} />
                <span>{formatElapsed(elapsed)} elapsed</span>
              </span>
            </div>
            <h3 title={runTitle}>“{runTitle}”</h3>
            <p>{STAGE_LABELS[activeStage ?? ''] || activeStage} · {activeRun.inputSnapshot.purpose}</p>
          </div>

          <div className="scout-monitor-actions-row">
            <button
              type="button"
              className="survey-btn text-rose-600 hover:text-rose-700 dark:text-rose-400 border-rose-200 hover:border-rose-300 dark:border-rose-900"
              disabled={scouts.busy !== null}
              onClick={() => void handleCancel()}
              title="Cancel current scouting execution"
            >
              <StopCircle size={13} />
              <span>Cancel run</span>
            </button>
          </div>
        </header>

        {/* Pipeline Stepper */}
        <div className="scout-stepper-track" aria-label="Scouting pipeline progress">
          {PIPELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            return (
              <div
                key={step.id}
                className={`scout-step-item ${isActive ? 'scout-step-active' : ''} ${isCompleted ? 'scout-step-completed' : ''}`}
              >
                <span className="scout-step-icon">
                  {isCompleted ? <CheckCircle2 size={11} /> : isActive ? <Loader2 size={11} className="animate-spin" /> : idx + 1}
                </span>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>

        <div className="scout-current-activity" role="status" aria-live="polite">
          <span className="scout-current-activity-pulse" aria-hidden="true" />
          <div className="scout-current-activity-copy">
            <span className="scout-current-activity-kicker">Now running</span>
            <strong>{activeRun.currentActivity?.label ?? STAGE_LABELS[activeStage ?? ''] ?? activeStage}</strong>
            <span>{activeRun.currentActivity?.detail ?? 'The scout is working on this pipeline stage.'}</span>
          </div>
          <span className="scout-current-activity-freshness">{formatFreshness(activeRun.updatedAt)}</span>
        </div>

        {/* Live Counters Telemetry */}
        <div className="scout-telemetry-grid">
          <div className="scout-metric-cell">
            <span className="scout-metric-label">Retrieved</span>
            <span className="scout-metric-value">{activeRun.counters.retrieved}</span>
            <span className="scout-metric-detail">Works from all sources</span>
          </div>

          <div className="scout-metric-cell">
            <span className="scout-metric-label">Normalized</span>
            <span className="scout-metric-value">{activeRun.counters.normalized}</span>
            <span className="scout-metric-detail">Deduplicated candidates</span>
          </div>

          <div className="scout-metric-cell">
            <span className="scout-metric-label">Screened</span>
            <span className="scout-metric-value">{activeRun.counters.screened}</span>
            <span className="scout-metric-detail">Titles & abstracts assessed</span>
          </div>

          <div className="scout-metric-cell">
            <span className="scout-metric-label">Queries Dispatched</span>
            <span className="scout-metric-value">{activeRun.executedQueries.length}</span>
            <span className="scout-metric-detail">Across OpenAlex & arXiv</span>
          </div>
        </div>

        {/* Provider Attempts & Checkpoint Stream */}
        <div className="scout-live-details">
          <div className="scout-provider-lane">
            <h4>Academic Providers</h4>
            <div className="scout-provider-chips">
              {providerSummaries.map(summary => (
                  <span
                    key={summary.provider}
                    className="scout-provider-chip"
                    data-status={summary.failed.length > 0 ? 'failed' : summary.attempts.length > 0 ? 'completed' : 'pending'}
                    title={summary.failed.map(attempt => attempt.error).filter(Boolean).join('\n') || summary.latest?.query || `${summary.provider} has not started`}
                  >
                    {summary.failed.length > 0 ? (
                      <AlertTriangle size={11} className="text-rose-500" />
                    ) : summary.attempts.length > 0 ? (
                      <CheckCircle2 size={11} className="text-emerald-500" />
                    ) : (
                      <Loader2 size={10} className="animate-spin text-amber-500" />
                    )}
                    <span>{summary.provider}: {summary.failed.length > 0
                      ? summary.failed.some(attempt => attempt.error?.includes('rate-limited')) ? 'rate limited' : `${summary.failed.length} failed`
                      : `${summary.completed} results`}</span>
                  </span>
                ))}
            </div>
          </div>

          <div className="scout-query-lane">
            <h4>Active Search Queries</h4>
            <div className="scout-query-chips">
              {activeRun.executedQueries.length > 0 ? (
                activeRun.executedQueries.slice(0, 2).map((q, idx) => (
                  <span key={idx} className="scout-query-chip" title={q}>
                    <Search size={10} className="text-amber-500 shrink-0" />
                    <span>{q}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-[var(--color-ink-muted)]">Dispatching queries…</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Discovered Papers Feed / Stream during search */}
        <div className="scout-live-feed">
          <div className="scout-live-feed-header">
            <h4>
              <FileSearch size={12} className="text-amber-500" />
              <span>Discovered Papers During Search</span>
              {activeRun.liveCandidates && activeRun.liveCandidates.length > 0 && (
                <span className="scout-feed-count">{activeRun.liveCandidates.length} papers</span>
              )}
            </h4>
            <span className="scout-feed-status">
              {activeRun.liveCandidates && activeRun.liveCandidates.length > 0
                ? 'Processing candidate papers…'
                : 'Querying external academic sources…'}
            </span>
          </div>

          {activeRun.liveCandidates && activeRun.liveCandidates.length > 0 ? (
            <div className="scout-live-candidates-list">
              {activeRun.liveCandidates.map(candidate => {
                const statusLabel =
                  candidate.status === 'recommended' ? 'Recommended' :
                  candidate.status === 'uncertain' ? 'Uncertain' :
                  candidate.status === 'rejected' ? 'Screened (Not Selected)' :
                  candidate.status === 'screening' ? 'Screening…' :
                  'Retrieved';
                const statusClass =
                  candidate.status === 'recommended' ? 'status-recommended' :
                  candidate.status === 'uncertain' ? 'status-uncertain' :
                  candidate.status === 'rejected' ? 'status-rejected' :
                  'status-retrieved';

                return (
                  <div key={candidate.id} className={`scout-live-candidate-item ${statusClass}`}>
                    <div className="scout-live-candidate-main">
                      <span className="scout-live-candidate-title">{candidate.title}</span>
                      <div className="scout-live-candidate-meta">
                        {candidate.year && <span>{candidate.year}</span>}
                        {candidate.authors && <span>{candidate.authors}</span>}
                        {candidate.sources.length > 0 && (
                          <span className="scout-live-candidate-sources">
                            {candidate.sources.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`scout-live-candidate-badge ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="scout-live-feed-empty">
              <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                <Loader2 size={12} className="animate-spin text-amber-500" />
                <span>Harvesting publications from OpenAlex, arXiv, and Crossref. Retrieved papers will populate here instantly.</span>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // 2. Direct search running state
  if (literature.busy) {
    return (
      <section className="scout-monitor scout-monitor-active" aria-label="Direct metadata search active">
        <div className="p-4 flex items-center justify-between gap-4 bg-amber-50/70 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-[var(--color-ink)] m-0">Direct Literature Retrieval In Progress</h3>
              <p className="text-[0.6875rem] text-[var(--color-ink-muted)] m-0 mt-0.5">
                Querying academic metadata sources. Candidates will be cached into the Evidence Inbox.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-amber-700 dark:text-amber-400">Searching…</span>
        </div>
      </section>
    );
  }

  // 3. Idle Engine Status & Quick Launcher
  const totalReports = scouts.snapshot?.reports.length ?? 0;
  const totalWatches = scouts.snapshot?.watches.length ?? 0;
  const activeWatches = scouts.snapshot?.watches.filter(w => w.enabled).length ?? 0;
  const schedulerActive = literature.snapshot?.scheduler.active ?? false;

  return (
    <section className="scout-monitor" aria-label="Scout engine control and status">
      <div className="scout-monitor-idle">
        <div className="scout-monitor-idle-top">
          <div className="scout-monitor-status-cluster">
            <div className="scout-monitor-beacon scout-monitor-beacon-ready" title="Scout engine idle and ready">
              <span className="scout-monitor-beacon-dot" />
              <span className="scout-monitor-beacon-pulse" />
            </div>

            <div className="scout-monitor-title-block">
              <h3>
                <span>Paper Scout Engine Ready</span>
                <span className="text-[var(--color-rule)]">·</span>
                <span className="font-mono text-[0.6875rem] font-normal text-[var(--color-ink-muted)]">
                  Scheduler {schedulerActive ? 'Online' : 'Offline'}
                </span>
              </h3>
              <p>
                {recentRuns.length > 0
                  ? `${recentRuns.length} completed ${recentRuns.length === 1 ? 'run' : 'runs'} · ${totalReports} ${totalReports === 1 ? 'report' : 'reports'} · ${activeWatches}/${totalWatches} watches active`
                  : 'No scout runs yet. Problem scouts return short screened recommendations with evidence.'}
              </p>
            </div>
          </div>

          <div className="scout-monitor-actions-row">
            <button
              type="button"
              className="survey-btn survey-btn-primary"
              onClick={e => openBriefDialog(e.currentTarget)}
            >
              <Sparkles size={12} />
              <span>Scout Research Problem</span>
            </button>

            {totalWatches > 0 && (
              <button
                type="button"
                className="survey-btn"
                disabled={scouts.busy !== null}
                onClick={() => {
                  const firstWatch = scouts.snapshot?.watches.find(w => w.enabled) ?? scouts.snapshot?.watches[0];
                  if (firstWatch) void scouts.startRun(firstWatch.id, 'watch');
                }}
                title="Run the first active topic watch immediately"
              >
                <Play size={11} />
                <span>Run Watch Digest</span>
              </button>
            )}

            {recentRuns.length > 0 && (
              <button
                type="button"
                className="survey-btn"
                onClick={() => setShowHistory(!showHistory)}
                aria-expanded={showHistory}
              >
                <History size={12} />
                <span>Run History ({recentRuns.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Run History */}
        {showHistory && recentRuns.length > 0 && (
          <div className="scout-history-panel animate-in fade-in" aria-label="Recent scout runs">
            <div className="scout-history-list">
              {recentRuns.slice(0, 5).map(run => {
                const title = 'question' in run.inputSnapshot ? run.inputSnapshot.question : run.inputSnapshot.name;
                const completedAt = run.finishedAt || run.updatedAt;
                const sourceExists = run.source.kind === 'watch'
                  ? (scouts.snapshot?.watches ?? []).some(watch => watch.id === run.source.id)
                  : (scouts.snapshot?.briefs ?? []).some(brief => brief.id === run.source.id);
                return (
                  <article key={run.id} className="scout-history-item">
                    <div className="scout-history-item-header">
                      <div className="scout-history-item-heading">
                        <span className="scout-history-item-kicker">{run.source.kind} run</span>
                        <h4>{title}</h4>
                      </div>
                      <span className={`scout-history-state scout-history-state-${run.state}`}>{run.state}</span>
                    </div>

                    <div className="scout-history-metrics" aria-label="Run metrics">
                      <span><strong>{run.counters.screened}</strong> screened</span>
                      <span><strong>{run.executedQueries.length}</strong> queries</span>
                      <time dateTime={new Date(completedAt).toISOString()}>{new Date(completedAt).toLocaleString()}</time>
                    </div>

                    <div className="scout-history-actions">
                      {run.reportId && onSelectReport && (
                        <button
                          type="button"
                          className="survey-btn scout-history-action"
                          onClick={() => onSelectReport(run.reportId!)}
                        >
                          <ExternalLink size={11} />
                          <span>View report</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="survey-btn scout-history-action"
                        disabled={scouts.busy !== null || !sourceExists}
                        onClick={() => void scouts.startRun(run.source.id, run.source.kind)}
                        title={sourceExists
                          ? `Run this ${run.source.kind === 'watch' ? 'topic watch' : 'brief'} again with its saved parameters`
                          : `The source ${run.source.kind === 'watch' ? 'topic watch' : 'brief'} no longer exists`}
                      >
                        <RefreshCw size={11} />
                        <span>Run again</span>
                      </button>

                      <button
                        type="button"
                        className="survey-btn scout-history-action scout-history-action-danger"
                        disabled={scouts.busy !== null}
                        onClick={() => {
                          if (window.confirm('Delete this run and its report? Saved papers and the source brief are kept.')) {
                            void scouts.deleteRun(run.id);
                          }
                        }}
                        title="Remove this run and its report from history"
                      >
                        <Trash2 size={11} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Problem Scout Dialog */}
      <dialog
        ref={briefDialog}
        className="scout-dialog topic-watch-dialog"
        aria-labelledby="scout-brief-dialog-title"
        onClose={() => requestAnimationFrame(() => triggerRef.current?.focus())}
      >
        <form
          method="dialog"
          onSubmit={e => {
            e.preventDefault();
            void handleSaveAndRunBrief();
          }}
        >
          <div className="topic-watch-dialog-heading">
            <h3 id="scout-brief-dialog-title">Launch Problem-Driven Scout</h3>
            <button
              type="button"
              onClick={() => briefDialog.current?.close()}
              aria-label="Close scout dialog"
            >
              <X size={15} />
            </button>
          </div>

          <div className="topic-watch-dialog-body">
            <p className="text-xs text-[var(--color-ink-muted)] m-0">
              Scout runs detached background retrieval across OpenAlex, arXiv, and Crossref, screens titles and abstracts with Gemini, and produces an explained shortlist.
            </p>

            {validation && (
              <p className="scout-report-alert m-0" role="alert">
                {validation}
              </p>
            )}

            <label>
              <span>Research Question (required)</span>
              <input
                type="text"
                required
                value={briefDraft.question}
                onChange={e => setBriefDraft({ ...briefDraft, question: e.target.value })}
                placeholder="e.g. Which TinyML methods reduce transformer memory without losing anomaly-detection recall?"
                autoFocus
              />
            </label>

            <label>
              <span>Purpose & Reading Intent (required)</span>
              <textarea
                required
                rows={2}
                value={briefDraft.purpose}
                onChange={e => setBriefDraft({ ...briefDraft, purpose: e.target.value })}
                placeholder="e.g. Identify measured edge-hardware trade-offs between activation quantization and latency."
              />
            </label>

            <label>
              <span>Search Directions (one query per line, optional reason after “::”)</span>
              <textarea
                rows={3}
                value={briefDraft.directions}
                onChange={e => setBriefDraft({ ...briefDraft, directions: e.target.value })}
                placeholder="TinyML autonomous agents edge inference :: Direct problem intersection&#10;transformer KV cache quantization edge latency :: Quantitative benchmarks"
              />
            </label>

            <div className="topic-watch-fields">
              <label>
                <span>Scope (one per line)</span>
                <textarea
                  rows={2}
                  value={briefDraft.scope}
                  onChange={e => setBriefDraft({ ...briefDraft, scope: e.target.value })}
                  placeholder="TinyML&#10;Edge devices"
                />
              </label>

              <label>
                <span>Exclusions (one per line)</span>
                <textarea
                  rows={2}
                  value={briefDraft.exclusions}
                  onChange={e => setBriefDraft({ ...briefDraft, exclusions: e.target.value })}
                  placeholder="Cloud-only models&#10;Theoretical bounds without code"
                />
              </label>

              <label>
                <span>Max Recommendations</span>
                <select
                value={briefDraft.maxRecommendations}
                onChange={e => setBriefDraft({ ...briefDraft, maxRecommendations: Number(e.target.value) })}
                >
                  <option value={3}>3 papers (Focused)</option>
                  <option value={5}>5 papers (Standard)</option>
                  <option value={8}>8 papers (Broad)</option>
                </select>
              </label>

              <label>
                <span>Publication Recency</span>
                <select
                  value={briefDraft.recencyPolicy}
                  onChange={e => {
                    const value = e.target.value as BriefDraft['recencyPolicy'];
                    setBriefDraft({ ...briefDraft, recencyPolicy: value });
                  }}
                >
                  <option value="recent">Recent (last 2 years)</option>
                  <option value="mixed">Mixed (include foundational work)</option>
                  <option value="foundational-gap">Foundational gap search</option>
                </select>
              </label>
            </div>
          </div>

          <div className="topic-watch-dialog-footer">
            <button
              type="button"
              className="survey-btn"
              onClick={() => briefDialog.current?.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="survey-btn survey-btn-primary"
              disabled={scouts.busy !== null}
            >
              <Sparkles size={12} />
              <span>Launch Scout</span>
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
