import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Experiment, ExperimentArtifact, ExperimentStatus } from '../../types';
import { tildePath } from '../../utils/paths';
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  PlayCircle,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Maximize2
} from 'lucide-react';
import { TabHelpTip } from '../common/TabHelpTip';
import { ArtifactViewerModal } from './ArtifactViewerModal';
import { ArtifactPlotView } from './ArtifactPlotView';

export const ExperimentsSurface: React.FC = () => {
  const {
    experiments,
    claims,
    updateArtifactObservation,
    setActiveContext,
    evidence,
    sourceEvidenceId
  } = useWorkspace();

  const sourceEvidence = evidence.find(item => item.id === sourceEvidenceId && item.origin === 'experiment');
  const sourceExperimentId = sourceEvidence?.experimentId;
  const sourceArtifactId = sourceEvidence?.artifactId;
  useEffect(() => {
    if (!sourceExperimentId) return;
    const target = document.getElementById(sourceArtifactId ? `experiment-artifact-${sourceExperimentId}-${sourceArtifactId}` : `experiment-card-${sourceExperimentId}`);
    target?.scrollIntoView({ block: 'center' });
    target?.focus({ preventScroll: true });
  }, [sourceExperimentId, sourceArtifactId]);

  const [statusFilter, setStatusFilter] = useState<'all' | ExperimentStatus>('all');
  const [selectedArtifact, setSelectedArtifact] = useState<{
    experiment: Experiment;
    artifact: ExperimentArtifact;
  } | null>(null);

  // Filter experiments
  const filteredExperiments = statusFilter === 'all'
    ? experiments
    : experiments.filter(e => e.status === statusFilter);

  // Group experiments by Claim
  const groupedByClaim = claims.map(claim => {
    const claimExperiments = filteredExperiments.filter(e => e.claimId === claim.id);
    return { claim, claimExperiments };
  }).filter(group => group.claimExperiments.length > 0 || statusFilter === 'all');

  const handleOpenArtifact = (experiment: Experiment, artifact: ExperimentArtifact) => {
    setSelectedArtifact({ experiment, artifact });
  };

  const handleSaveObservation = (observation: string) => {
    if (!selectedArtifact) return;
    updateArtifactObservation(
      selectedArtifact.experiment.id,
      selectedArtifact.artifact.id,
      observation
    );
    setSelectedArtifact(prev => prev ? {
      ...prev,
      artifact: { ...prev.artifact, observation }
    } : null);
  };

  const getStatusBadge = (status: ExperimentStatus) => {
    switch (status) {
      case 'planned':
        return (
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[0.75rem] font-mono uppercase flex items-center gap-1.5 font-medium">
            <Clock className="w-3 h-3 text-slate-400" />
            Planned
          </span>
        );
      case 'running':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[0.75rem] font-mono uppercase flex items-center gap-1.5 font-bold">
            <PlayCircle className="w-3 h-3 text-amber-600" />
            Running
          </span>
        );
      case 'done':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[0.75rem] font-mono uppercase flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Done
          </span>
        );
    }
  };

  return (
    <section
      id="experiments-surface"
      className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]"
    >
      {/* Surface Header & Status Filter */}
      <header className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <FlaskConical size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                Experiments Gallery
              </h1>
              <TabHelpTip
                title="Experiments Gallery"
                category="Empirical Validation"
                summary="Claim-centric experimental verification: every artifact, script, and log is pinned to the specific scientific claim it tests."
                tips={[
                  "Filter experiments by status: Planned, Running, or Done.",
                  "Inspect artifacts, benchmark plots, and recorded metrics per experiment.",
                  "Edit qualitative observations to capture what the empirical result proves.",
                  "Ensure all core claims have at least one verified experiment artifact."
                ]}
                placement="bottom"
                variant="inline"
                color="sky"
              />
            </div>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)] hidden sm:block">
              Interactive telemetry, benchmark charts, and claim-centric evidence gallery
            </p>
          </div>
        </div>

        {/* Filter subtabs */}
        <nav aria-label="Experiment Status Filter" className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] shadow-2xs">
          {(['all', 'planned', 'running', 'done'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-[var(--color-surface)] text-sky-700 dark:text-sky-300 font-bold border border-sky-300/60 dark:border-sky-700/60 shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]/60'
              }`}
            >
              {s}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Scrollable Canvas Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
        {groupedByClaim.length === 0 ? (
          <div className="p-12 border border-dashed border-[var(--color-rule)] rounded-xl text-center flex flex-col items-center justify-center gap-2 bg-[var(--color-surface)]">
            <FlaskConical className="w-10 h-10 text-[var(--color-ink-muted)] opacity-50" />
            <h3 className="font-sans font-semibold text-sm text-[var(--color-ink)]">No experiments or claims registered</h3>
            <p className="text-xs text-[var(--color-ink-muted)] max-w-md">
              Create claims in the Map or Survey surface to design experiments and attach empirical artifacts.
            </p>
          </div>
        ) : (
          groupedByClaim.map(({ claim, claimExperiments }) => (
          <div
            key={claim.id}
            id={`experiment-group-${claim.id}`}
            className="border border-[var(--color-rule)] rounded-xl bg-[var(--color-surface)] p-5 md:p-6 flex flex-col gap-5 shadow-2xs"
          >
            {/* Tested Claim Header */}
            <div className="flex items-start justify-between border-b border-[var(--color-rule)] pb-3.5">
              <div className="flex-1">
                <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                  Target Claim Under Test
                </span>
                <h3 className="font-serif text-[1.1875rem] font-semibold text-[var(--color-ink)] leading-snug mt-2">
                  "{claim.text}"
                </h3>
              </div>
              <span className="font-mono text-xs text-[var(--color-ink-muted)] px-3 py-1 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-full font-medium ml-4 shrink-0">
                {claimExperiments.length} Experiment{claimExperiments.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Experiments list under this claim */}
            {claimExperiments.length === 0 ? (
              <div className="p-6 border border-dashed border-[var(--color-rule)] rounded-lg text-center text-xs font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper)]">
                No experiments registered for this claim under current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {claimExperiments.map(exp => (
                  <div
                    key={exp.id}
                    id={`experiment-card-${exp.id}`}
                    tabIndex={-1}
                    className="p-4 md:p-5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-xl flex flex-col gap-3.5"
                  >
                    {/* Experiment Title & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FlaskConical className="w-4 h-4 text-sky-600" />
                        <h4 className="font-sans font-bold text-[0.9688rem] text-[var(--color-ink)]">
                          {exp.title}
                        </h4>
                      </div>
                      {getStatusBadge(exp.status)}
                    </div>

                    {/* Pre-Run Contract Specifications Grid (Gate 7) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-[var(--color-surface)] p-3.5 border border-[var(--color-rule)] rounded-lg text-xs shadow-2xs">
                      <div>
                        <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)] uppercase block font-medium">
                          Target Metric:
                        </span>
                        <span className="font-sans font-semibold text-[var(--color-ink)] mt-0.5 block">
                          {exp.targetMetric}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)] uppercase block font-medium">
                          Baseline:
                        </span>
                        <span className="font-sans text-[var(--color-ink)] mt-0.5 block">
                          {exp.baseline}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)] uppercase block font-medium">
                          Prediction:
                        </span>
                        <span className="font-sans text-[var(--color-ink)] mt-0.5 block">
                          {exp.prediction}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[0.6875rem] text-rose-500 uppercase block font-medium">
                          Failure Condition:
                        </span>
                        <span className="font-sans text-rose-600 dark:text-rose-400 font-medium mt-0.5 block">
                          {exp.failureCondition}
                        </span>
                      </div>
                    </div>

                    {/* Artifacts Gallery */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                          Artifacts & Direct Visualizations ({exp.artifacts.length}):
                        </span>
                      </div>

                      {exp.artifacts.length === 0 ? (
                        <div className="p-3 border border-dashed border-[var(--color-rule)] rounded-lg text-xs font-mono text-[var(--color-ink-muted)] bg-[var(--color-surface)]">
                          No artifacts generated yet. Experiment is in {exp.status} status.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {exp.artifacts.map(art => {
                            if (art.type === 'plot' && art.plotData) {
                              return (
                                <div key={art.id} id={`experiment-artifact-${exp.id}-${art.id}`}>
                                  <ArtifactPlotView
                                    name={art.name}
                                    plotData={art.plotData}
                                    observation={art.observation}
                                    onOpenModal={() => handleOpenArtifact(exp, art)}
                                  />
                                </div>
                              );
                            }

                            if (art.type === 'table' && art.tableData) {
                              const headers = art.tableData.headers || [];
                              const rows = art.tableData.rows || [];
                              return (
                                <div
                                  key={art.id}
                                  id={`experiment-artifact-${exp.id}-${art.id}`}
                                  className="w-full bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl overflow-hidden shadow-2xs flex flex-col"
                                >
                                  <div className="px-4 py-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/50 flex items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                        <FileSpreadsheet size={14} />
                                      </div>
                                      <span className="font-mono text-xs font-bold text-[var(--color-ink)] truncate">
                                        {art.name}
                                      </span>
                                      <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded-full bg-teal-100/70 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-semibold uppercase">
                                        table ({rows.length} rows)
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenArtifact(exp, art)}
                                      className="flex items-center gap-1 text-[0.6875rem] font-mono text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 px-2 py-1 rounded border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                                    >
                                      <Maximize2 size={11} />
                                      <span>Fullscreen / Edit</span>
                                    </button>
                                  </div>

                                  <div className="p-3 overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs font-mono">
                                      <thead>
                                        <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
                                          {headers.map((h, i) => (
                                            <th key={i} className="py-2 px-3 font-semibold text-[var(--color-ink)] whitespace-nowrap">
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((r, ri) => (
                                          <tr key={ri} className="border-b border-[var(--color-rule)]/50 hover:bg-[var(--color-paper)]/30">
                                            {r.map((c, ci) => (
                                              <td key={ci} className="py-1.5 px-3 whitespace-nowrap text-[var(--color-ink)]">
                                                {c}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="p-3 bg-[var(--color-paper)]/60 border-t border-[var(--color-rule)] flex flex-col gap-1.5 text-xs">
                                    {art.tableData.caption && (
                                      <p className="text-[0.75rem] text-[var(--color-ink)] italic pl-2 border-l-2 border-teal-500">
                                        {art.tableData.caption}
                                      </p>
                                    )}
                                    {art.observation && (
                                      <div className="text-[0.75rem] bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                                        <span className="font-bold shrink-0 font-mono">✓ Observed:</span>
                                        <span>{art.observation}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (art.type === 'notes' && art.notesData) {
                              const lines = art.notesData.content.split('\n');
                              return (
                                <div
                                  key={art.id}
                                  id={`experiment-artifact-${exp.id}-${art.id}`}
                                  className="w-full bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl overflow-hidden shadow-2xs flex flex-col"
                                >
                                  <div className="px-4 py-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/50 flex items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                        <FileText size={14} />
                                      </div>
                                      <span className="font-mono text-xs font-bold text-[var(--color-ink)] truncate">
                                        {art.name}
                                      </span>
                                      <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded-full bg-amber-100/70 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold uppercase">
                                        log ({lines.length} lines)
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenArtifact(exp, art)}
                                      className="flex items-center gap-1 text-[0.6875rem] font-mono text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                                    >
                                      <Maximize2 size={11} />
                                      <span>Fullscreen / Edit</span>
                                    </button>
                                  </div>

                                  <div className="p-3 bg-slate-950 text-slate-200 font-mono text-[0.75rem] max-h-56 overflow-y-auto space-y-1">
                                    {lines.map((line, li) => (
                                      <div key={li} className="leading-relaxed font-mono">
                                        <span className="text-slate-600 select-none mr-3 inline-block w-6 text-right text-[0.6875rem]">
                                          {li + 1}
                                        </span>
                                        <span className={line.includes('[INFO]') ? 'text-sky-300' : line.includes('[METRIC]') ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                                          {line}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {art.observation && (
                                    <div className="p-3 bg-[var(--color-paper)]/60 border-t border-[var(--color-rule)]">
                                      <div className="text-[0.75rem] bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                                        <span className="font-bold shrink-0 font-mono">✓ Observed:</span>
                                        <span>{art.observation}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Fallback for images and generic artifacts
                            return (
                              <div
                                key={art.id}
                                id={`experiment-artifact-${exp.id}-${art.id}`}
                                className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2">
                                  {art.type === 'image' && <ImageIcon className="w-4 h-4 text-purple-500" />}
                                  <span className="font-mono text-xs font-semibold text-[var(--color-ink)]">{art.name}</span>
                                  <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded-full bg-[var(--color-paper)] text-[var(--color-ink-muted)] uppercase border border-[var(--color-rule)]">
                                    {art.type}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenArtifact(exp, art)}
                                  className="text-xs font-mono text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                                >
                                  <Maximize2 size={11} /> View Artifact
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )))}
      </div>

      {/* Rich Interactive Artifact Viewer Modal with Direct Plot/Table/Notes/Image & Observation Form */}
      {selectedArtifact && (
        <ArtifactViewerModal
          experiment={selectedArtifact.experiment}
          artifact={selectedArtifact.artifact}
          onClose={() => setSelectedArtifact(null)}
          onSaveObservation={handleSaveObservation}
        />
      )}
    </section>
  );
};
