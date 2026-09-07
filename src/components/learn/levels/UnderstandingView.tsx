import React, { useState } from 'react';
import {
  Compass,
  Lightbulb,
  CheckSquare,
  Square,
  BookOpen,
  ArrowRight,
  Eye,
  Save,
  Sparkles
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';

interface UnderstandingViewProps {
  unit: LearningUnit;
  onUpdateProgress: (score: number) => void;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
}

export const UnderstandingView: React.FC<UnderstandingViewProps> = ({
  unit,
  onUpdateProgress,
  onUpdateUnit
}) => {
  const [feynmanDraft, setFeynmanDraft] = useState(
    unit.understanding.feynmanWorkspace.learnerExplanation || ''
  );
  const [checkedRubrics, setCheckedRubrics] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    unit.understanding.feynmanWorkspace.rubricChecks.forEach((r, i) => {
      map[`${i}`] = r.verified || false;
    });
    return map;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleRubric = (index: number) => {
    const key = `${index}`;
    const next = { ...checkedRubrics, [key]: !checkedRubrics[key] };
    setCheckedRubrics(next);

    const total = unit.understanding.feynmanWorkspace.rubricChecks.length;
    const passedCount = Object.values(next).filter(Boolean).length;
    const hasExplanation = feynmanDraft.trim().length > 30;
    const baseScore = hasExplanation ? 40 : 10;
    const rubricScore = total > 0 ? (passedCount / total) * 60 : 60;
    const totalScore = Math.min(100, Math.round(baseScore + rubricScore));

    onUpdateProgress(totalScore);

    // Persist rubric states into unit
    const updatedChecks = unit.understanding.feynmanWorkspace.rubricChecks.map((c, i) => ({
      ...c,
      verified: !!next[`${i}`]
    }));

    onUpdateUnit({
      understanding: {
        ...unit.understanding,
        feynmanWorkspace: {
          ...unit.understanding.feynmanWorkspace,
          rubricChecks: updatedChecks
        }
      }
    });
  };

  const handleSaveFeynman = () => {
    onUpdateUnit({
      understanding: {
        ...unit.understanding,
        feynmanWorkspace: {
          ...unit.understanding.feynmanWorkspace,
          learnerExplanation: feynmanDraft
        }
      }
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    const total = unit.understanding.feynmanWorkspace.rubricChecks.length;
    const passedCount = Object.values(checkedRubrics).filter(Boolean).length;
    const hasExplanation = feynmanDraft.trim().length > 30;
    const baseScore = hasExplanation ? 40 : 10;
    const rubricScore = total > 0 ? (passedCount / total) * 60 : 60;
    onUpdateProgress(Math.min(100, Math.round(baseScore + rubricScore)));
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Level Banner */}
      <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            <Compass size={15} />
            <span>Cognitive Level 2: Understanding</span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Explaining mathematical concepts in your own words, grasping geometric intuitions, and translating between formal notation and mental models.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-[var(--color-ink-muted)]">Understanding Score</div>
          <div className="text-base font-mono font-bold text-sky-600 dark:text-sky-400">
            {unit.progress.understanding}%
          </div>
        </div>
      </div>

      {/* Formal Definition & Notation Box */}
      <div className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
          <BookOpen size={14} className="text-sky-500" />
          <span>Formal Mathematical Definition</span>
        </div>

        <div className="p-4 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] overflow-x-auto">
          <code className="text-xs md:text-sm font-mono text-[var(--color-ink)] font-semibold leading-relaxed">
            {unit.understanding.formalDefinition.statement}
          </code>
        </div>

        {/* Preconditions */}
        {unit.understanding.formalDefinition.preconditions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.7188rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider">
              Mathematical Preconditions & Domain:
            </span>
            <ul className="flex flex-col gap-1">
              {unit.understanding.formalDefinition.preconditions.map((p, idx) => (
                <li key={idx} className="text-xs text-[var(--color-ink)] flex items-start gap-2">
                  <span className="text-sky-500 font-mono mt-0.5">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notation Key */}
        <div className="pt-3 border-t border-[var(--color-rule)]/60">
          <span className="text-[0.7188rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider block mb-2">
            Notation Legend:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unit.understanding.formalDefinition.notationKey.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex items-start gap-2"
              >
                <code className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-rule)] shrink-0">
                  {item.symbol}
                </code>
                <span className="text-xs text-[var(--color-ink)] leading-snug">{item.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geometric & Physical Intuition */}
      <div className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
          <Lightbulb size={14} className="text-amber-500" />
          <span>Geometric & Physical Intuition</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2">
            <span className="text-[0.7188rem] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold">
              Visual Metaphor
            </span>
            <p className="text-xs text-[var(--color-ink)] leading-relaxed">
              {unit.understanding.geometricIntuition.visualMetaphor}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2">
            <span className="text-[0.7188rem] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
              Physical Interpretation
            </span>
            <p className="text-xs text-[var(--color-ink)] leading-relaxed">
              {unit.understanding.geometricIntuition.physicalInterpretation}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2">
            <span className="text-[0.7188rem] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
              Core Insight
            </span>
            <p className="text-xs text-[var(--color-ink)] leading-relaxed">
              {unit.understanding.geometricIntuition.coreInsight}
            </p>
          </div>
        </div>
      </div>

      {/* Concept Decomposition Chain */}
      {unit.understanding.conceptDecomposition.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1.5">
            <Sparkles size={14} className="text-sky-500" />
            <span>Concept Decomposition & Cognitive Flow</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {unit.understanding.conceptDecomposition.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[0.7188rem] font-mono font-bold text-sky-600 dark:text-sky-400">
                      Component 0{idx + 1}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[var(--color-ink)] mb-1">
                    {step.part}
                  </h4>
                  <p className="text-[0.7188rem] text-[var(--color-ink-muted)] leading-relaxed mb-1.5">
                    {step.role}
                  </p>
                  <p className="text-[0.6875rem] text-rose-600 dark:text-rose-400 font-mono">
                    Impact if absent: {step.impactIfMissing}
                  </p>
                </div>
                {idx < unit.understanding.conceptDecomposition.length - 1 && (
                  <div className="hidden lg:flex items-center justify-end text-[var(--color-ink-muted)]">
                    <ArrowRight size={12} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feynman Technique Explainer Workspace */}
      <div className="p-5 rounded-xl border border-sky-500/40 bg-sky-50/10 dark:bg-sky-950/10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-sky-700 dark:text-sky-400 font-semibold">
              The Feynman Technique: Explain in Plain Language
            </h3>
          </div>
          <span className="text-xs text-[var(--color-ink-muted)] font-mono">
            Active Recall & Synthesis
          </span>
        </div>

        <div className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)]">
          <strong className="font-semibold text-sky-600 dark:text-sky-400">Challenge Prompt: </strong>
          {unit.understanding.feynmanWorkspace.guidingQuestion}
        </div>

        <div className="flex flex-col gap-2">
          <textarea
            value={feynmanDraft}
            onChange={e => setFeynmanDraft(e.target.value)}
            rows={5}
            placeholder="Write your explanation here as if teaching a bright peer who understands calculus and linear algebra, without hiding behind buzzwords..."
            className="w-full p-3 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] leading-relaxed focus:outline-none focus:ring-1 focus:ring-sky-500 resize-y"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-ink-muted)] font-mono">
              {feynmanDraft.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              type="button"
              onClick={handleSaveFeynman}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Save size={13} />
              <span>{savedSuccess ? 'Saved!' : 'Save Explanation'}</span>
            </button>
          </div>
        </div>

        {/* Rubric Verification Checklist */}
        <div className="pt-3 border-t border-[var(--color-rule)] flex flex-col gap-2">
          <span className="text-[0.7188rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
            Self-Verification Rubric Checks (click to verify your explanation covers these):
          </span>
          <div className="flex flex-col gap-2">
            {unit.understanding.feynmanWorkspace.rubricChecks.map((rubric, idx) => {
              const isChecked = !!checkedRubrics[`${idx}`];
              return (
                <div
                  key={rubric.id || idx}
                  onClick={() => toggleRubric(idx)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                    isChecked
                      ? 'border-sky-500/60 bg-sky-50/40 dark:bg-sky-950/20'
                      : 'border-[var(--color-rule)] bg-[var(--color-surface)] hover:bg-[var(--color-paper)]'
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 text-sky-600 dark:text-sky-400 shrink-0"
                  >
                    {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[var(--color-ink)]">
                      {rubric.prompt}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
