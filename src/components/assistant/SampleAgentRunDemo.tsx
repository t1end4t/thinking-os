import React, { useState } from 'react';
import { Bot, RefreshCw, X, Sparkles, CheckCircle2, Play, Eye } from 'lucide-react';
import { AgentRunCard } from './AgentRunCard';
import type {
  ScoutBrief,
  ScoutBriefInput,
  ScoutRun,
  ScoutReport,
  ScoutCandidate
} from '../../scoutTypes';

const INITIAL_SAMPLE_BRIEF: ScoutBrief = {
  id: 'sample-brief-edge-ai',
  question: 'What are the current memory and compute bottlenecks in on-device continual learning on ARM Cortex-M microcontrollers?',
  purpose: 'Ground the hardware resource model for our tiny edge continual adaptation experiments.',
  scope: [
    'ARM Cortex-M4 / M7 / M33 microcontrollers',
    'On-device parameter updates and backpropagation',
    'SRAM constraints <= 512KB'
  ],
  exclusions: [
    'Cloud-tethered split computing',
    'Inference-only quantization without learning',
    'Pure simulation without MCU deployment'
  ],
  constraints: [
    'Empirical SRAM and flash footprints reported',
    'Published or preprinted between 2022 and 2026'
  ],
  searchDirections: [
    {
      query: 'TinyML on-device continual learning memory footprint',
      reason: 'Target memory-constrained MCU training papers'
    },
    {
      query: 'backpropagation on microcontrollers SRAM peak',
      reason: 'Assess peak memory during backward pass'
    },
    {
      query: 'quantization-aware edge transfer learning Cortex-M',
      reason: 'Search for practical quantized adaptation implementations'
    }
  ],
  screeningCriteria: [
    'Must evaluate on actual microcontroller hardware or cycle-accurate emulator',
    'Must state SRAM and Flash peak usage during update step',
    'Must specify batch size and compute budget'
  ],
  maxRecommendations: 3,
  createdFrom: { kind: 'assistant', reference: 'Literature Scout initialization' },
  author: 'user',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 1800000
};

const SAMPLE_RECOMMENDATIONS: ScoutCandidate[] = [
  {
    id: 'cand-1',
    title: 'On-Device Continual Learning via Sparse Subnetwork Updates on Microcontrollers',
    authors: 'Lin, J., Chen, W., Zhang, Y., Han, S.',
    year: 2024,
    abstract: 'Training on microcontrollers is bottlenecked by SRAM rather than compute. We propose memory-efficient sparse backpropagation achieving on-device adaptation within 256KB SRAM.',
    identities: [{ kind: 'arxiv', value: '2402.08911', source: 'arXiv', canonical: true }],
    matchingQueries: ['TinyML on-device continual learning memory footprint'],
    sources: ['arXiv', 'OpenAlex'],
    provenance: [{ provider: 'arXiv', lane: 'arxiv', query: 'TinyML on-device continual learning', retrievedAt: Date.now() - 10000 }],
    metadataConflicts: [],
    relevance: 'direct',
    qualityConfidence: 'high',
    limitations: ['Evaluated predominantly on vision classification tasks.'],
    outcome: 'recommend',
    recommendationReason: 'Directly reports SRAM usage down to 184KB during backward pass on STM32H7.',
    assessmentState: 'screened'
  },
  {
    id: 'cand-2',
    title: 'Micro-Backprop: Efficient Gradient Computation for Edge MCUs with Fixed-Point Arithmetic',
    authors: 'Pellegrini, L., Graffieti, G., Maltoni, D.',
    year: 2023,
    abstract: 'Investigates quantized integer arithmetic during backward propagation on Cortex-M7 with 320KB RAM, showing 4.2x memory reduction compared to standard float32 updates.',
    identities: [{ kind: 'doi', value: '10.1145/3583740', source: 'Crossref', canonical: true }],
    matchingQueries: ['backpropagation on microcontrollers SRAM peak'],
    sources: ['Crossref'],
    provenance: [{ provider: 'Crossref', lane: 'crossref', query: 'Micro-Backprop Cortex-M7', retrievedAt: Date.now() - 10000 }],
    metadataConflicts: [],
    relevance: 'direct',
    qualityConfidence: 'high',
    limitations: ['Requires offline calibration of activation quantization scales.'],
    outcome: 'recommend',
    recommendationReason: 'Provides exact Flash and SRAM peak telemetry across different layer depths.',
    assessmentState: 'screened'
  },
  {
    id: 'cand-3',
    title: 'Benchmarking Memory and Latency Overheads of On-Device Few-Shot Adaptation on Cortex-M33',
    authors: 'Venkatesh, A., Mercer, K., Zhao, R.',
    year: 2024,
    abstract: 'Comprehensive benchmark of 8 edge adaptation techniques on ARM Cortex-M33 devices equipped with 128KB-512KB SRAM.',
    identities: [{ kind: 'arxiv', value: '2405.12004', source: 'arXiv', canonical: true }],
    matchingQueries: ['quantization-aware edge transfer learning Cortex-M'],
    sources: ['arXiv'],
    provenance: [{ provider: 'arXiv', lane: 'arxiv', query: 'Benchmarking edge adaptation Cortex-M33', retrievedAt: Date.now() - 10000 }],
    metadataConflicts: [],
    relevance: 'supporting',
    qualityConfidence: 'medium',
    limitations: ['Focuses on few-shot adaptation rather than unbounded streaming continual learning.'],
    outcome: 'recommend',
    recommendationReason: 'Provides standardized memory ceiling benchmarks across 5 hardware boards.',
    assessmentState: 'screened'
  }
];

const SAMPLE_REPORT: ScoutReport = {
  id: 'sample-report-edge-ai',
  source: { kind: 'brief', id: INITIAL_SAMPLE_BRIEF.id },
  inputSnapshot: INITIAL_SAMPLE_BRIEF,
  status: 'completed',
  summary: 'Screened 38 candidates across arXiv, OpenAlex, and Crossref. 3 top papers empirical validate on-device learning within <= 320KB SRAM constraints on ARM Cortex-M microcontrollers.',
  sources: ['arXiv', 'OpenAlex', 'Crossref'],
  executedQueries: [
    'TinyML on-device continual learning memory footprint',
    'backpropagation on microcontrollers SRAM peak',
    'quantization-aware edge transfer learning Cortex-M'
  ],
  recommendations: SAMPLE_RECOMMENDATIONS,
  uncertain: [
    {
      id: 'cand-4',
      title: 'Federated Edge Learning with Asynchronous Parameter Updates',
      authors: 'Gao, H., et al.',
      year: 2023,
      abstract: 'Explores asynchronous updates across edge nodes, but relies on Linux gateway boards (Raspberry Pi).',
      identities: [{ kind: 'openalex', value: 'W4288190', source: 'OpenAlex' }],
      matchingQueries: ['quantization-aware edge transfer learning Cortex-M'],
      sources: ['OpenAlex'],
      provenance: [{ provider: 'OpenAlex', lane: 'openalex', query: 'Federated Edge Learning', retrievedAt: Date.now() - 10000 }],
      metadataConflicts: [],
      relevance: 'background',
      qualityConfidence: 'low',
      limitations: ['Uses gateway class processors (ARM Cortex-A) rather than microcontrollers.'],
      outcome: 'uncertain',
      assessmentState: 'screened'
    }
  ],
  rejectionCounts: { 'exceeds-sram': 14, 'inference-only': 16, 'pure-simulation': 5 },
  limitations: ['Hardware availability limits empirical verification beyond Cortex-M series.'],
  screening: { model: 'gemini-3.8-flash', instructionsVersion: 'scout-v2.1' },
  createdAt: Date.now() - 600000
};

type DemoMode = 'draft' | 'running' | 'completed';

export interface SampleAgentRunDemoProps {
  readonly onClose: () => void;
  readonly onOpenFullReportModal?: (report: ScoutReport) => void;
}

export function SampleAgentRunDemo({ onClose, onOpenFullReportModal }: SampleAgentRunDemoProps) {
  const [brief, setBrief] = useState<ScoutBrief>(INITIAL_SAMPLE_BRIEF);
  const [mode, setMode] = useState<DemoMode>('draft');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Derive mock run & report based on active demo mode
  const run: ScoutRun | undefined = mode === 'draft'
    ? undefined
    : mode === 'running'
      ? {
          id: 'sample-run-active',
          source: { kind: 'brief', id: brief.id },
          inputSnapshot: brief,
          state: 'screening',
          activeStage: 'screening',
          executedQueries: brief.searchDirections.map(d => d.query),
          providerAttempts: [
            { provider: 'arXiv', lane: 'arxiv', query: brief.searchDirections[0]?.query || '', status: 'completed', attempts: 1, resultCount: 16, startedAt: Date.now() - 15000, completedAt: Date.now() - 12000, truncated: false },
            { provider: 'OpenAlex', lane: 'openalex', query: brief.searchDirections[1]?.query || '', status: 'completed', attempts: 1, resultCount: 22, startedAt: Date.now() - 12000, completedAt: Date.now() - 8000, truncated: false }
          ],
          counters: {
            retrieved: 38,
            normalized: 32,
            screened: 18
          },
          checkpoints: ['queries_generated', 'retrieval_complete', 'screening_in_progress'],
          startedAt: Date.now() - 25000,
          updatedAt: Date.now() - 2000
        }
      : {
          id: 'sample-run-completed',
          source: { kind: 'brief', id: brief.id },
          inputSnapshot: brief,
          state: 'completed',
          executedQueries: brief.searchDirections.map(d => d.query),
          providerAttempts: [],
          counters: {
            retrieved: 38,
            normalized: 32,
            screened: 32
          },
          checkpoints: ['queries_generated', 'retrieval_complete', 'screening_complete', 'assembled'],
          startedAt: Date.now() - 90000,
          updatedAt: Date.now() - 10000,
          finishedAt: Date.now() - 10000,
          reportId: SAMPLE_REPORT.id
        };

  const report: ScoutReport | undefined = mode === 'completed'
    ? { ...SAMPLE_REPORT, inputSnapshot: brief }
    : undefined;

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSave = async (input: ScoutBriefInput): Promise<boolean> => {
    setBrief(prev => ({
      ...prev,
      ...input,
      updatedAt: Date.now()
    }));
    showToast('Saved brief parameters successfully!');
    return true;
  };

  const handleRun = async (): Promise<boolean> => {
    setMode('running');
    showToast('Autonomous Scout Agent run initiated!');
    return true;
  };

  const handleCancel = async (): Promise<boolean> => {
    setMode('draft');
    showToast('Agent run cancelled.');
    return true;
  };

  const handleOpenReport = () => {
    if (onOpenFullReportModal && report) {
      onOpenFullReportModal(report);
    } else {
      setReportModalOpen(true);
    }
  };

  const resetSample = () => {
    setBrief(INITIAL_SAMPLE_BRIEF);
    setMode('draft');
    showToast('Sample card reset to initial state.');
  };

  return (
    <div className="sample-agent-run-container my-2 flex flex-col gap-2 rounded-xl border border-[var(--accent-indigo)]/50 bg-[var(--color-surface)] p-3 shadow-md">
      {/* Test Bar / State Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent-indigo)] text-white">
            <Bot size={12} />
          </span>
          <strong className="text-xs font-semibold text-[var(--color-ink)]">
            Agent Run Card Preview (Test Sample)
          </strong>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={resetSample}
            title="Reset sample brief to default"
            className="flex items-center gap-1 rounded px-1.5 py-1 text-[0.6875rem] text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <RefreshCw size={11} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Hide test sample"
            aria-label="Hide test sample"
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* State Switcher Chips */}
      <div className="flex items-center gap-1.5 text-[0.6875rem]">
        <span className="text-[var(--color-ink-muted)] font-mono">Test State:</span>
        <button
          type="button"
          onClick={() => setMode('draft')}
          className={`rounded-md px-2 py-0.5 font-mono text-[0.6875rem] transition-colors ${
            mode === 'draft'
              ? 'bg-[var(--accent-indigo)] text-white font-medium'
              : 'border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          1. Draft / Config
        </button>
        <button
          type="button"
          onClick={() => setMode('running')}
          className={`rounded-md px-2 py-0.5 font-mono text-[0.6875rem] transition-colors ${
            mode === 'running'
              ? 'bg-[var(--accent-indigo)] text-white font-medium'
              : 'border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          2. Active Run (Telemetry)
        </button>
        <button
          type="button"
          onClick={() => setMode('completed')}
          className={`rounded-md px-2 py-0.5 font-mono text-[0.6875rem] transition-colors ${
            mode === 'completed'
              ? 'bg-emerald-600 text-white font-medium'
              : 'border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          3. Completed (Report)
        </button>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-1 rounded bg-[var(--accent-indigo-soft)] px-2 py-1 text-[0.72rem] text-[var(--accent-indigo)]">
          <Sparkles size={11} className="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Render the AgentRunCard */}
      <AgentRunCard
        brief={brief}
        run={run}
        report={report}
        busy={false}
        agentKind="scout"
        agentTitle="Literature Scout Agent"
        onSave={handleSave}
        onRun={handleRun}
        onCancel={handleCancel}
        onOpenReport={handleOpenReport}
      />

      {/* Embedded Full Report Modal for Sample Preview */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                  Scout Report Deliverable
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-[var(--color-ink)] flex flex-col gap-3">
              <p className="font-medium text-[var(--color-ink-muted)]">
                {SAMPLE_REPORT.summary}
              </p>

              <div>
                <h4 className="font-semibold text-[var(--color-ink)] mb-1">Recommended Candidates:</h4>
                <div className="flex flex-col gap-2">
                  {SAMPLE_RECOMMENDATIONS.map(rec => (
                    <div key={rec.id} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <strong className="text-[0.8rem] text-[var(--color-ink)]">{rec.title}</strong>
                        <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">{rec.year}</span>
                      </div>
                      <p className="text-[0.72rem] text-[var(--color-ink-muted)] mt-0.5">{rec.authors}</p>
                      <p className="mt-1.5 text-[0.75rem] italic text-[var(--color-ink)]">{rec.abstract}</p>
                      <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-rule)] pt-1.5 text-[0.6875rem] text-emerald-700 dark:text-emerald-400">
                        <span>Why recommended: {rec.recommendationReason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {SAMPLE_REPORT.limitations[0] && (
                <div className="rounded border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-2 text-[0.72rem] text-amber-800 dark:text-amber-300">
                  <strong>Limitation:</strong> {SAMPLE_REPORT.limitations[0]}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-[var(--color-rule)] pt-3">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-lg bg-[var(--accent-indigo)] px-3 py-1.5 text-xs font-medium text-white"
              >
                Done reviewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
