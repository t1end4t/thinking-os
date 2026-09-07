import React, { useState } from 'react';
import {
  Layers,
  AlertCircle,
  Split,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';

interface AnalyzingViewProps {
  unit: LearningUnit;
  onUpdateProgress: (score: number) => void;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
}

export const AnalyzingView: React.FC<AnalyzingViewProps> = ({
  unit,
  onUpdateProgress
}) => {
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

  const activeComponent = unit.analyzing.structuralComponents[selectedComponentIndex];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Level Banner */}
      <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            <Layers size={15} />
            <span>Cognitive Level 4: Analyzing</span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Deconstructing formulas into fundamental mathematical parts, stress-testing boundary assumptions, and comparing structural variants.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-[var(--color-ink-muted)]">Analysis Mastery</div>
          <div className="text-base font-mono font-bold text-purple-600 dark:text-purple-400">
            {unit.progress.analyzing}%
          </div>
        </div>
      </div>

      {/* Structural Component Breakdown */}
      <div className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
          <Sparkles size={14} className="text-purple-500" />
          <span>Formula Component Deconstruction</span>
        </div>

        {/* Component Selector Chips */}
        <div className="flex flex-wrap gap-2">
          {unit.analyzing.structuralComponents.map((comp, idx) => (
            <button
              key={comp.id || idx}
              type="button"
              onClick={() => setSelectedComponentIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                selectedComponentIndex === idx
                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                  : 'bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] hover:bg-[var(--color-rule)]/20'
              }`}
            >
              <code>{comp.formulaSnippet || comp.component}</code>
              <span>{comp.component}</span>
            </button>
          ))}
        </div>

        {/* Selected Component Deep Dive */}
        {activeComponent && (
          <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <code className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)]">
                  {activeComponent.formulaSnippet}
                </code>
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                  {activeComponent.component}
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)]">
                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)] block mb-1">
                  Mathematical Function & Role
                </span>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {activeComponent.mathematicalFunction}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-emerald-200 dark:border-emerald-950">
                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Invariant Preserved
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
            <span>Assumption Stress Tests ({unit.analyzing.assumptionStressTests.length})</span>
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
                className={`p-4 rounded-xl border transition-all ${
                  isTested
                    ? 'border-purple-500/60 bg-purple-50/15 dark:bg-purple-950/10'
                    : 'border-[var(--color-rule)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[0.6875rem] font-mono font-medium bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                        Assumption
                      </span>
                      <h4 className="text-xs md:text-sm font-semibold text-[var(--color-ink)]">
                        {test.assumption}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTestAssumption(test.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors shrink-0 ${
                      isTested
                        ? 'bg-purple-600 text-white'
                        : 'border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>{isTested ? 'Stress-Tested' : 'Mark Tested'}</span>
                  </button>
                </div>

                {/* Scenario breakdown */}
                <div className="mt-3 pt-3 border-t border-[var(--color-rule)]/60 flex flex-col gap-2.5">
                  <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                      <AlertCircle size={14} />
                      <span>Failure Mode: {test.failureMode}</span>
                    </div>
                    <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                      {test.mathematicalConsequence}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-500/30 text-xs text-[var(--color-ink)]">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                      LLM Research Implication:
                    </span>
                    <span>{test.llmResearchImplication}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contrastive Comparison Matrix */}
      {unit.analyzing.contrastiveAnalysis && (
        <div className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4">
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
                    Comparison Dimension
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
