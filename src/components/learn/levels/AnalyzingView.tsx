import React, { useState } from 'react';
import {
  Layers,
  AlertCircle,
  Split,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Move,
  Bot,
  Zap,
  ArrowRight
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';
import { MathView } from '../../common/MathView';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { AssistantContextObject } from '../../../types';

interface AnalyzingViewProps {
  unit: LearningUnit;
  onUpdateProgress: (score: number) => void;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
}

export const AnalyzingView: React.FC<AnalyzingViewProps> = ({
  unit,
  onUpdateProgress
}) => {
  const { addAttachedContext, setIsDockOpen } = useWorkspace();
  const [selectedComponentIndex, setSelectedComponentIndex] = useState<number>(0);
  const [testedAssumptions, setTestedAssumptions] = useState<Record<string, boolean>>({});

  const toggleTestAssumption = (id: string) => {
    const next = { ...testedAssumptions, [id]: !testedAssumptions[id] };
    setTestedAssumptions(next);

    const total = unit.analyzing.assumptionStressTests.length;
    const testedCount = Object.values(next).filter(Boolean).length;
    const score = total > 0 ? Math.round((testedCount / total) * 100) : 100;
    onUpdateProgress(score);
  };

  const handleAskAiComponent = (comp: typeof unit.analyzing.structuralComponents[0]) => {
    setIsDockOpen(true);
    const ctx: AssistantContextObject = {
      type: 'artifact',
      id: `analyzing-${unit.id}-${comp.component}`,
      label: comp.component,
      secondaryLabel: `Deconstructed Component: ${unit.title}`,
      metadata: {
        formulaSnippet: comp.formulaSnippet,
        mathematicalFunction: comp.mathematicalFunction,
        invariantPreserved: comp.invariantPreserved
      }
    };
    addAttachedContext(ctx);
  };

  const handleAskAiStressTest = (test: typeof unit.analyzing.assumptionStressTests[0]) => {
    setIsDockOpen(true);
    const ctx: AssistantContextObject = {
      type: 'artifact',
      id: `stress-test-${unit.id}-${test.id}`,
      label: test.assumption,
      secondaryLabel: `Failure Mode: ${test.failureMode}`,
      metadata: {
        consequence: test.mathematicalConsequence,
        llmImplication: test.llmResearchImplication
      }
    };
    addAttachedContext(ctx);
  };

  const activeComponent = unit.analyzing.structuralComponents[selectedComponentIndex];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Level Banner */}
      <div className="p-4 md:p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <span>Cognitive Level 4: Analyzing</span>
              <span className="text-[var(--color-ink-muted)]">•</span>
              <span className="text-[var(--color-ink-muted)]">Deconstruction & Stress-Testing</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 max-w-xl leading-relaxed">
              Deconstruct mathematical formulas into sub-operations, test boundary failure modes, and isolate structural invariants.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 self-end md:self-auto">
          <div className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider">
            Analysis Mastery
          </div>
          <div className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
            {unit.progress.analyzing}%
          </div>
        </div>
      </div>

      {/* Structural Component Breakdown */}
      <div className="p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
            <Sparkles size={14} className="text-purple-500" />
            <span>Formula Component Deconstruction ({unit.analyzing.structuralComponents.length})</span>
          </div>
          <span className="text-[0.6875rem] font-mono text-slate-400">
            Click component to inspect mathematical invariants
          </span>
        </div>

        {/* Component Selector Chips */}
        <div className="flex flex-wrap gap-2">
          {unit.analyzing.structuralComponents.map((comp, idx) => (
            <button
              key={comp.id || idx}
              type="button"
              onClick={() => setSelectedComponentIndex(idx)}
              className={`px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 ${
                selectedComponentIndex === idx
                  ? 'bg-purple-600 text-white font-semibold shadow-xs ring-2 ring-purple-400/30'
                  : 'bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] hover:border-purple-400/50'
              }`}
            >
              <code className="px-1.5 py-0.5 rounded bg-black/15 font-bold">
                {comp.formulaSnippet || comp.component}
              </code>
              <span>{comp.component}</span>
            </button>
          ))}
        </div>

        {/* Selected Component Deep Dive */}
        {activeComponent && (
          <div
            draggable={true}
            onDragStart={e => {
              const ctx: AssistantContextObject = {
                type: 'artifact',
                id: `analyzing-${unit.id}-${activeComponent.component}`,
                label: activeComponent.component,
                secondaryLabel: `Deconstructed Component: ${unit.title}`,
                metadata: {
                  formulaSnippet: activeComponent.formulaSnippet,
                  mathematicalFunction: activeComponent.mathematicalFunction,
                  invariantPreserved: activeComponent.invariantPreserved
                }
              };
              e.dataTransfer.setData('application/json', JSON.stringify(ctx));
              e.dataTransfer.setData(
                'text/plain',
                `Deconstructed Component: ${activeComponent.component}\nFormula Snippet: ${activeComponent.formulaSnippet}\nRole: ${activeComponent.mathematicalFunction}\nInvariant: ${activeComponent.invariantPreserved}`
              );
            }}
            className="p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-3.5 animate-fadeIn shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[0.625rem] font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider font-bold">
                  Active Operator
                </span>
                <span className="text-[0.625rem] font-mono text-slate-400 flex items-center gap-1">
                  <Move size={10} className="text-purple-500" />
                  <span>Drag to AI</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAskAiComponent(activeComponent)}
                className="px-2.5 py-1 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-mono flex items-center gap-1.5 hover:bg-purple-100 transition-colors"
              >
                <Sparkles size={12} />
                <span>Ask AI to Explain Role</span>
              </button>
            </div>

            {/* Formula KaTeX Snippet */}
            {activeComponent.formulaSnippet && (
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)]">
                <MathView
                  math={activeComponent.formulaSnippet}
                  block={true}
                  label={activeComponent.component}
                  contextId={`comp-${activeComponent.component}`}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)]">
                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)] block mb-1">
                  Mathematical Function & Operational Role
                </span>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {activeComponent.mathematicalFunction}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-emerald-300/40 dark:border-emerald-800/60">
                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Mathematical Invariant Preserved
                </span>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {activeComponent.invariantPreserved}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assumption Stress Tests */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-purple-500" />
            <span>Boundary Assumption Stress Tests ({unit.analyzing.assumptionStressTests.length})</span>
          </h3>
          <span className="text-xs font-mono text-[var(--color-ink-muted)]">
            {Object.values(testedAssumptions).filter(Boolean).length} / {unit.analyzing.assumptionStressTests.length} tested
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {unit.analyzing.assumptionStressTests.map(test => {
            const isTested = testedAssumptions[test.id] ?? false;

            return (
              <div
                key={test.id}
                draggable={true}
                onDragStart={e => {
                  const ctx: AssistantContextObject = {
                    type: 'artifact',
                    id: `stress-test-${unit.id}-${test.id}`,
                    label: test.assumption,
                    secondaryLabel: `Failure Mode: ${test.failureMode}`,
                    metadata: {
                      consequence: test.mathematicalConsequence,
                      llmImplication: test.llmResearchImplication
                    }
                  };
                  e.dataTransfer.setData('application/json', JSON.stringify(ctx));
                  e.dataTransfer.setData(
                    'text/plain',
                    `Assumption: ${test.assumption}\nFailure Mode: ${test.failureMode}\nConsequence: ${test.mathematicalConsequence}\nLLM Implication: ${test.llmResearchImplication}`
                  );
                }}
                className={`p-4 md:p-5 rounded-2xl border transition-all ${
                  isTested
                    ? 'border-purple-500/60 bg-purple-50/15 dark:bg-purple-950/10'
                    : 'border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-purple-400/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[0.625rem] font-mono font-medium bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                        Assumption
                      </span>
                      <span className="text-[0.625rem] font-mono text-slate-400 flex items-center gap-0.5">
                        <Move size={9} className="text-purple-500" />
                        <span>Drag to AI</span>
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--color-ink)] leading-snug">
                      {test.assumption}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAskAiStressTest(test)}
                      className="p-1.5 rounded-lg border border-[var(--color-rule)] text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                      title="Stress-test this assumption with AI"
                    >
                      <Sparkles size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTestAssumption(test.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
                        isTested
                          ? 'bg-purple-600 text-white font-medium'
                          : 'border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      <span>{isTested ? 'Stress-Tested' : 'Mark Tested'}</span>
                    </button>
                  </div>
                </div>

                {/* Scenario breakdown */}
                <div className="mt-3 pt-3 border-t border-[var(--color-rule)]/60 flex flex-col gap-2.5">
                  <div className="p-3 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                      <AlertCircle size={14} />
                      <span>Failure Mode: {test.failureMode}</span>
                    </div>
                    <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                      {test.mathematicalConsequence}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-500/30 text-xs text-[var(--color-ink)]">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                      LLM Implication:
                    </span>
                    <span className="leading-relaxed">{test.llmResearchImplication}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contrastive Comparison Matrix */}
      {unit.analyzing.contrastiveAnalysis && (
        <div className="p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
            <Split size={14} className="text-purple-500" />
            <span>
              Contrastive Matrix: {unit.analyzing.contrastiveAnalysis.titleA} vs.{' '}
              {unit.analyzing.contrastiveAnalysis.titleB}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
                  <th className="p-3 font-mono font-semibold text-[var(--color-ink)] w-1/4">
                    Dimension
                  </th>
                  <th className="p-3 font-mono font-semibold text-purple-600 dark:text-purple-400 w-1/4">
                    {unit.analyzing.contrastiveAnalysis.titleA}
                  </th>
                  <th className="p-3 font-mono font-semibold text-sky-600 dark:text-sky-400 w-1/4">
                    {unit.analyzing.contrastiveAnalysis.titleB}
                  </th>
                  <th className="p-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 w-1/4">
                    Mathematical Divergence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {unit.analyzing.contrastiveAnalysis.dimensions.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-paper)]/40 transition-colors">
                    <td className="p-3 font-mono font-medium text-[var(--color-ink)]">
                      {row.dimension}
                    </td>
                    <td className="p-3 text-[var(--color-ink)] leading-relaxed">
                      {row.conceptA}
                    </td>
                    <td className="p-3 text-[var(--color-ink)] leading-relaxed">
                      {row.conceptB}
                    </td>
                    <td className="p-3 text-[var(--color-ink)] leading-relaxed font-mono text-[0.6875rem]">
                      {row.mathematicalDivergence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
