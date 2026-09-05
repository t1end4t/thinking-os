import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Experiment, ExperimentArtifact, ExperimentStatus } from '../../types';
import {
  FlaskConical,
  CheckCircle2,
  Clock,
  PlayCircle,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { TabHelpTip } from '../common/TabHelpTip';

export const ExperimentsSurface: React.FC = () => {
  const {
    experiments,
    claims,
    updateArtifactObservation,
    setActiveContext
  } = useWorkspace();

  const [statusFilter, setStatusFilter] = useState<'all' | ExperimentStatus>('all');
  const [selectedArtifact, setSelectedArtifact] = useState<{
    experiment: Experiment;
    artifact: ExperimentArtifact;
  } | null>(null);
  const [observationText, setObservationText] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

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
    setObservationText(artifact.observation || '');
    setSaveSuccess(false);
  };

  const handleSaveObservation = () => {
    if (!selectedArtifact) return;
    updateArtifactObservation(
      selectedArtifact.experiment.id,
      selectedArtifact.artifact.id,
      observationText
    );
    setSaveSuccess(true);
    setTimeout(() => {
      setSelectedArtifact(null);
      setSaveSuccess(false);
    }, 400);
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
      {/* Surface Header & Status Filter with unified surface-intro */}
      <header className="surface-intro">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="surface-kicker flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <FlaskConical className="w-3.5 h-3.5" />
              Claim-Centric Verification
            </p>
            <div className="flex items-center gap-2">
              <h1>Experiments Gallery</h1>
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
              />
            </div>
            <p>
              Artifacts are grouped under the claim they test, making ungrounded experiments immediately visible.
            </p>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-full p-1 self-start md:self-auto shadow-2xs">
            {(['all', 'planned', 'running', 'done'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-mono uppercase transition-all duration-200 ${
                  statusFilter === s
                    ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-2xs'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
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
                    <div className="flex flex-col gap-2">
                      <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                        Artifacts ({exp.artifacts.length}):
                      </span>

                      {exp.artifacts.length === 0 ? (
                        <div className="p-3 border border-dashed border-[var(--color-rule)] rounded-lg text-xs font-mono text-[var(--color-ink-muted)] bg-[var(--color-surface)]">
                          No artifacts generated yet. Experiment is in {exp.status} status.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {exp.artifacts.map(art => (
                            <div
                              key={art.id}
                              onClick={() => handleOpenArtifact(exp, art)}
                              className="p-3 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-lg flex flex-col justify-between gap-2.5 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-2xs cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-2">
                                {art.type === 'plot' && <FileBarChart className="w-4 h-4 text-indigo-500" />}
                                {art.type === 'table' && <FileSpreadsheet className="w-4 h-4 text-teal-500" />}
                                {art.type === 'notes' && <FileText className="w-4 h-4 text-amber-500" />}
                                <span className="font-mono text-xs font-semibold truncate text-[var(--color-ink)]">
                                  {art.name}
                                </span>
                              </div>

                              <div className="flex flex-col text-[0.6875rem] font-mono text-[var(--color-ink-muted)] border-t border-[var(--color-rule)] pt-2 gap-0.5">
                                <span className="truncate">Hash: {art.contentHash.slice(0, 10)}...</span>
                                <span className={art.observation ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                                  {art.observation ? 'Observed ✓' : 'Observation required'}
                                </span>
                              </div>
                            </div>
                          ))}
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

      {/* Artifact Overlay with Required "What did this show?" Field */}
      {selectedArtifact && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-rule)] max-w-lg w-full p-6 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="border-b border-[var(--color-rule)] pb-3">
              <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                Artifact Observation
              </span>
              <h3 className="font-mono text-sm font-bold text-[var(--color-ink)] mt-1">
                {selectedArtifact.artifact.name} ({selectedArtifact.artifact.type})
              </h3>
            </div>

            <div className="flex flex-col gap-1 text-xs bg-[var(--color-paper)] p-3 rounded-lg border border-[var(--color-rule)]">
              <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                Locator Path: {selectedArtifact.artifact.path}
              </span>
              <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                SHA-256 Hash: {selectedArtifact.artifact.contentHash}
              </span>
            </div>

            {/* Required "What did this show?" field */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[0.75rem] uppercase text-[var(--color-ink)] font-bold">
                  What did this show? (Required for Done status):
                </label>
                <span className="font-mono text-[0.6875rem] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                  Authored by: user
                </span>
              </div>
              <textarea
                rows={3}
                value={observationText}
                onChange={e => setObservationText(e.target.value)}
                placeholder="State clearly what physical or computational result was obtained from this artifact..."
                className="p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg font-serif text-[0.9375rem] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {saveSuccess && (
              <span className="font-mono text-xs text-emerald-600 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Observation recorded.
              </span>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-rule)]">
              <button
                onClick={() => setSelectedArtifact(null)}
                className="px-3.5 py-1.5 font-mono text-xs border border-[var(--color-rule)] text-[var(--color-ink)] rounded-full hover:bg-[var(--color-paper)] transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveObservation}
                disabled={!observationText.trim()}
                className="px-4 py-1.5 font-mono text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-full font-medium transition-colors disabled:opacity-40 shadow-2xs"
              >
                Save Observation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
