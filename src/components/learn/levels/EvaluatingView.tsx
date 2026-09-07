import React, { useState } from 'react';
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';

interface EvaluatingViewProps {
  unit: LearningUnit;
  onUpdateProgress: (score: number) => void;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
}

export const EvaluatingView: React.FC<EvaluatingViewProps> = ({
  unit,
  onUpdateProgress,
  onUpdateUnit
}) => {
  const [selectedVerdicts, setSelectedVerdicts] = useState<Record<string, string>>({});
  const [revealedAnalyses, setRevealedAnalyses] = useState<Record<string, boolean>>({});

  const handleSelectVerdict = (challengeId: string, optionId: string) => {
    const next = { ...selectedVerdicts, [challengeId]: optionId };
    setSelectedVerdicts(next);
    setRevealedAnalyses(prev => ({ ...prev, [challengeId]: true }));

    const total = unit.evaluating.critiqueChallenges.length;
    const answeredCount = Object.keys(next).length;
    const score = total > 0 ? Math.round((answeredCount / total) * 100) : 100;
    onUpdateProgress(score);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Level Banner */}
      <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            <Scale size={15} />
            <span>Cognitive Level 5: Evaluating</span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Making rigorous judgments on research claims, detecting hidden mathematical flaws or domain mismatches, and weighing multi-variable tradeoffs.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-[var(--color-ink-muted)]">Evaluation Score</div>
          <div className="text-base font-mono font-bold text-rose-600 dark:text-rose-400">
            {unit.progress.evaluating}%
          </div>
        </div>
      </div>

      {/* Research Critique Challenges */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1.5">
            <Sparkles size={14} className="text-rose-500" />
            <span>Empirical & Theoretical Critique Challenges ({unit.evaluating.critiqueChallenges.length})</span>
          </h3>
          <span className="text-xs font-mono text-[var(--color-ink-muted)]">
            {Object.keys(selectedVerdicts).length} / {unit.evaluating.critiqueChallenges.length} evaluated
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {unit.evaluating.critiqueChallenges.map((challenge, idx) => {
            const selectedOptionId = selectedVerdicts[challenge.id];
            const isAnalysisRevealed = revealedAnalyses[challenge.id] || !!selectedOptionId;

            return (
              <div
                key={challenge.id || idx}
                className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4"
              >
                {/* Header Claim */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
                      Critique Challenge #{idx + 1}: {challenge.title}
                    </span>
                    <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                      Flaw Archetype: {challenge.hiddenFlawType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-[var(--color-ink)] leading-snug">
                    "{challenge.allegedClaim}"
                  </h4>

                  {challenge.presentedDerivation && (
                    <div className="p-3 my-1 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] overflow-x-auto text-xs font-mono text-[var(--color-ink)]">
                      {challenge.presentedDerivation}
                    </div>
                  )}

                  {challenge.guidedQuestions && challenge.guidedQuestions.length > 0 && (
                    <ul className="flex flex-col gap-1 mt-1 pl-4 list-disc text-xs text-[var(--color-ink-muted)]">
                      {challenge.guidedQuestions.map((gq, qIdx) => (
                        <li key={qIdx}>{gq}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Verdict Options */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-rule)]/60">
                  <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                    Select your mathematical evaluation verdict:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {challenge.verdictOptions.map(opt => {
                      const isChosen = selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectVerdict(challenge.id, opt.id)}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all flex items-center justify-between ${
                            isChosen
                              ? opt.isCorrect
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-rose-600 text-white border-rose-600'
                              : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-rule)]/20'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isChosen && (
                            <span>{opt.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Analysis Outcome */}
                {isAnalysisRevealed && (
                  <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] flex flex-col gap-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        Formal Mathematical Diagnostic:
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                      {challenge.hiddenFlawExplanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Dimensional Tradeoff Matrix */}
      {unit.evaluating.tradeoffMatrix && (
        <div className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
            <Scale size={14} className="text-rose-500" />
            <span>
              Multi-Criteria Tradeoff Analysis: {unit.evaluating.tradeoffMatrix.approachAName} vs.{' '}
              {unit.evaluating.tradeoffMatrix.approachBName}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-rule)] bg-[var(--color-paper)]">
                  <th className="p-3 font-mono font-semibold text-[var(--color-ink)] w-1/4">
                    Evaluation Criterion
                  </th>
                  <th className="p-3 font-mono font-semibold text-rose-600 dark:text-rose-400 w-1/3">
                    {unit.evaluating.tradeoffMatrix.approachAName}
                  </th>
                  <th className="p-3 font-mono font-semibold text-sky-600 dark:text-sky-400 w-1/3">
                    {unit.evaluating.tradeoffMatrix.approachBName}
                  </th>
                  <th className="p-3 font-mono font-semibold text-[var(--color-ink-muted)] w-1/6">
                    Tradeoff Verdict
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {unit.evaluating.tradeoffMatrix.criteria.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-paper)]/40 transition-colors">
                    <td className="p-3 font-mono font-medium text-[var(--color-ink)]">
                      {c.criterion}
                    </td>
                    <td className="p-3 text-[var(--color-ink)] leading-relaxed">
                      {c.approachA}
                    </td>
                    <td className="p-3 text-[var(--color-ink)] leading-relaxed">
                      {c.approachB}
                    </td>
                    <td className="p-3 text-[var(--color-ink-muted)] font-mono text-[0.6875rem]">
                      {c.verdict}
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
