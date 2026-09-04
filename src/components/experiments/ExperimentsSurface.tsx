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
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono uppercase flex items-center gap-1.5 font-medium">
            <Clock className="w-3 h-3 text-slate-400" />
            Planned
          </span>
        );
      case 'running':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-mono uppercase flex items-center gap-1.5 font-bold">
            <PlayCircle className="w-3 h-3 text-amber-600" />
            Running
          </span>
        );
      case 'done':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono uppercase flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Done
          </span>
        );
    }
  };

  return (
    <div
      id="experiments-surface"
      className="flex-1 h-full overflow-y-auto bg-[var(--color-surface)] p-8 flex flex-col gap-8"
    >
      {/* Header & Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-sm uppercase tracking-widest font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-sky-600" />
              Experiments Gallery
            </h1>
            <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 border border-sky-200/60 dark:border-sky-800/60 rounded-full font-semibold">
              Claim-Centric Layout
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Artifacts are grouped under the claim they test, making ungrounded experiments immediately visible.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-full p-1 self-start shadow-2xs">
          {(['all', 'planned', 'running', 'done'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-mono uppercase transition-all duration-200 ${
                statusFilter === s
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Claim-Centric Experiment Groups */}
      <div className="flex flex-col gap-8">
        {groupedByClaim.map(({ claim, claimExperiments }) => (
          <div
            key={claim.id}
            id={`experiment-group-${claim.id}`}
            className="border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-6 flex flex-col gap-6 shadow-sm"
          >
            {/* Tested Claim Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                  Target Claim Under Test
                </span>
                <h3 className="font-serif text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-snug mt-2">
                  "{claim.text}"
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-full font-medium ml-4 shrink-0">
                {claimExperiments.length} Experiment{claimExperiments.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Experiments list under this claim */}
            {claimExperiments.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs font-mono text-slate-400">
                No experiments registered for this claim under current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {claimExperiments.map(exp => (
                  <div
                    key={exp.id}
                    id={`experiment-card-${exp.id}`}
                    className="p-5 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 rounded-xl flex flex-col gap-4"
                  >
                    {/* Experiment Title & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FlaskConical className="w-4 h-4 text-sky-600" />
                        <h4 className="font-sans font-bold text-[14px] text-slate-900 dark:text-slate-100">
                          {exp.title}
                        </h4>
                      </div>
                      {getStatusBadge(exp.status)}
                    </div>

                    {/* Pre-Run Contract Specifications Grid (Gate 7) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3.5 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs shadow-2xs">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 uppercase block font-medium">
                          Target Metric:
                        </span>
                        <span className="font-sans font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                          {exp.targetMetric}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 uppercase block font-medium">
                          Baseline:
                        </span>
                        <span className="font-sans text-slate-700 dark:text-slate-300 mt-0.5 block">
                          {exp.baseline}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 uppercase block font-medium">
                          Prediction:
                        </span>
                        <span className="font-sans text-slate-700 dark:text-slate-300 mt-0.5 block">
                          {exp.prediction}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-rose-500 uppercase block font-medium">
                          Failure Condition:
                        </span>
                        <span className="font-sans text-rose-600 dark:text-rose-400 font-medium mt-0.5 block">
                          {exp.failureCondition}
                        </span>
                      </div>
                    </div>

                    {/* Artifacts Gallery */}
                    <div className="flex flex-col gap-2.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Artifacts ({exp.artifacts.length}):
                      </span>

                      {exp.artifacts.length === 0 ? (
                        <div className="p-3.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-400">
                          No artifacts generated yet. Experiment is in {exp.status} status.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {exp.artifacts.map(art => (
                            <div
                              key={art.id}
                              onClick={() => handleOpenArtifact(exp, art)}
                              className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col justify-between gap-2.5 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-xs cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-2">
                                {art.type === 'plot' && <FileBarChart className="w-4 h-4 text-indigo-500" />}
                                {art.type === 'table' && <FileSpreadsheet className="w-4 h-4 text-teal-500" />}
                                {art.type === 'notes' && <FileText className="w-4 h-4 text-amber-500" />}
                                <span className="font-mono text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                                  {art.name}
                                </span>
                              </div>

                              <div className="flex flex-col text-[10px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 gap-0.5">
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
        ))}
      </div>

      {/* Artifact Overlay with Required "What did this show?" Field */}
      {selectedArtifact && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Artifact Observation
              </span>
              <h3 className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {selectedArtifact.artifact.name} ({selectedArtifact.artifact.type})
              </h3>
            </div>

            <div className="flex flex-col gap-1 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <span className="font-mono text-[10px] text-slate-500">
                Locator Path: {selectedArtifact.artifact.path}
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                SHA-256 Hash: {selectedArtifact.artifact.contentHash}
              </span>
            </div>

            {/* Required "What did this show?" field */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[11px] uppercase text-slate-900 dark:text-slate-100 font-bold">
                  What did this show? (Required for Done status):
                </label>
                <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/50">
                  Authored by: user
                </span>
              </div>
              <textarea
                rows={3}
                value={observationText}
                onChange={e => setObservationText(e.target.value)}
                placeholder="State clearly what physical or computational result was obtained from this artifact..."
                className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-serif text-[14px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {saveSuccess && (
              <span className="font-mono text-xs text-emerald-600 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Observation recorded.
              </span>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedArtifact(null)}
                className="px-3.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSaveObservation}
                disabled={!observationText.trim()}
                className="px-4 py-1.5 font-mono text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-full font-medium transition-colors disabled:opacity-40 shadow-xs"
              >
                Save Observation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
