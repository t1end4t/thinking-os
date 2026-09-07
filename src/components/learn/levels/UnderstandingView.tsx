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
  Sparkles,
  Cpu,
  GitFork,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';
import { MathView, FormattedMathText } from '../../common/MathView';
import { MathComputationGraph } from '../visual/MathComputationGraph';
import { ConceptMindmapTree } from '../visual/ConceptMindmapTree';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { AssistantContextObject } from '../../../types';

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
  const { addAttachedContext, setIsDockOpen } = useWorkspace();

  // Primary Visual Mode: DAG vs Tree vs Formal Reference
  const [visualViewMode, setVisualViewMode] = useState<'dag' | 'mindmap' | 'formal'>('dag');
  const [showAiTranscriptDrawer, setShowAiTranscriptDrawer] = useState(false);

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

  // Primary formula for the unit (if available from key terms or axioms)
  const primaryFormula =
    unit.remembering.keyTerms[0]?.symbolLatex ||
    unit.remembering.axiomsAndIdentities[0]?.latex ||
    '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V';

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

  const handleSendEntireConceptToAi = () => {
    setIsDockOpen(true);
    const ctx: AssistantContextObject = {
      type: 'artifact',
      id: `unit-${unit.id}`,
      label: unit.title,
      secondaryLabel: `Learning Unit: ${unit.category}`,
      metadata: {
        formula: primaryFormula,
        definition: unit.understanding.formalDefinition.statement,
        preconditions: unit.understanding.formalDefinition.preconditions.join('; '),
        visualMetaphor: unit.understanding.geometricIntuition.visualMetaphor
      }
    };
    addAttachedContext(ctx);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12 w-full">
      {/* Top Level Banner & Visual Mode Selector */}
      <div className="p-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Visual Mathematical Architecture
              </span>
              <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                Cognitive Level 2
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Explore calculations through interactive DAG dataflows, concept mindmap trees, and typeset equations.
            </p>
          </div>
        </div>

        {/* Visual Mode Tabs */}
        <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-rule)] shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setVisualViewMode('dag')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              visualViewMode === 'dag'
                ? 'bg-sky-500 text-white font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Cpu size={13} />
            <span>Computation DAG</span>
          </button>
          <button
            type="button"
            onClick={() => setVisualViewMode('mindmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              visualViewMode === 'mindmap'
                ? 'bg-sky-500 text-white font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <GitFork size={13} />
            <span>Mindmap Tree</span>
          </button>
          <button
            type="button"
            onClick={() => setVisualViewMode('formal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              visualViewMode === 'formal'
                ? 'bg-sky-500 text-white font-semibold shadow-xs'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <BookOpen size={13} />
            <span>Formal Theory</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Visual Computation DAG (Dataflow of Matrices & Tensors) */}
      {visualViewMode === 'dag' && (
        <div className="flex flex-col gap-6">
          <MathComputationGraph unit={unit} />
        </div>
      )}

      {/* VIEW 2: Visual Concept Mindmap Tree */}
      {visualViewMode === 'mindmap' && (
        <div className="flex flex-col gap-6">
          <ConceptMindmapTree unit={unit} />
        </div>
      )}

      {/* VIEW 3: Formal Mathematical Definition & Theory with KaTeX */}
      {visualViewMode === 'formal' && (
        <div className="flex flex-col gap-6">
          {/* Prominent KaTeX Rendered Formula Banner */}
          <div className="p-6 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-rule)] pb-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
                <BookOpen size={15} className="text-sky-500" />
                <span className="font-bold text-[var(--color-ink)]">Formal Mathematical Definition</span>
              </div>
              <button
                type="button"
                onClick={handleSendEntireConceptToAi}
                className="px-3 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white border border-sky-500/30 text-xs font-mono flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Sparkles size={12} />
                <span>Send to AI Assistant</span>
              </button>
            </div>

            {/* Publication-Quality KaTeX Display Formula */}
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] shadow-2xs">
              <MathView
                math={primaryFormula}
                block={true}
                label="Primary Formulation"
                contextId={`primary-${unit.id}`}
              />
            </div>

            {/* Formatted Natural Explanation with inline Math */}
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] text-xs md:text-sm text-[var(--color-ink)] leading-relaxed">
              <FormattedMathText text={unit.understanding.formalDefinition.statement} />
            </div>

            {/* Preconditions & Notation Legend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Preconditions */}
              {unit.understanding.formalDefinition.preconditions.length > 0 && (
                <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                    Mathematical Preconditions & Domain:
                  </span>
                  <ul className="flex flex-col gap-1.5">
                    {unit.understanding.formalDefinition.preconditions.map((p, idx) => (
                      <li key={idx} className="text-xs text-[var(--color-ink)] flex items-start gap-2">
                        <span className="text-sky-500 font-mono mt-0.5">•</span>
                        <FormattedMathText text={p} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notation Legend */}
              <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-2">
                <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider font-semibold">
                  Notation Key:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {unit.understanding.formalDefinition.notationKey.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex items-center gap-2.5"
                    >
                      <span className="shrink-0">
                        <MathView math={item.symbol} block={false} showAiAction={false} />
                      </span>
                      <span className="text-xs text-[var(--color-ink-muted)] leading-snug">
                        {item.meaning}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Geometric & Physical Intuition */}
          <div className="p-6 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-rule)] pb-3">
              <Lightbulb size={15} className="text-amber-500" />
              <span className="font-bold text-[var(--color-ink)]">Geometric & Physical Intuition</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-2">
                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold">
                  Visual Metaphor
                </span>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {unit.understanding.geometricIntuition.visualMetaphor}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-2">
                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                  Physical Interpretation
                </span>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {unit.understanding.geometricIntuition.physicalInterpretation}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-2">
                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                  Core Insight
                </span>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {unit.understanding.geometricIntuition.coreInsight}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE AI CONTEXT & FEYNMAN EXPLAINER DRAWER */}
      <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/15 flex flex-col gap-3">
        <div
          onClick={() => setShowAiTranscriptDrawer(!showAiTranscriptDrawer)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-sky-700 dark:text-sky-400">
              AI Study Assistant Workspace & Feynman Recall
            </span>
            <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300">
              Plain Text & Verification
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-ink-muted)]">
            <span>{showAiTranscriptDrawer ? 'Hide Workspace' : 'Expand Workspace'}</span>
            {showAiTranscriptDrawer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {showAiTranscriptDrawer && (
          <div className="flex flex-col gap-4 pt-3 border-t border-sky-500/20 animate-in fade-in duration-150">
            <div className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs text-[var(--color-ink)]">
              <strong className="font-semibold text-sky-600 dark:text-sky-400">Challenge Prompt: </strong>
              {unit.understanding.feynmanWorkspace.guidingQuestion}
            </div>

            <div className="flex flex-col gap-2">
              <textarea
                value={feynmanDraft}
                onChange={e => setFeynmanDraft(e.target.value)}
                rows={4}
                placeholder="Explain this concept in plain language or test your understanding with the AI assistant..."
                className="w-full p-3 text-xs rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] leading-relaxed focus:outline-none focus:ring-1 focus:ring-sky-500 resize-y"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-ink-muted)] font-mono">
                  {feynmanDraft.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDockOpen(true);
                      const ctx: AssistantContextObject = {
                        type: 'passage',
                        id: `feynman-${unit.id}`,
                        label: `Feynman Explanation: ${unit.title}`,
                        secondaryLabel: 'Learner Draft',
                        metadata: { text: feynmanDraft }
                      };
                      addAttachedContext(ctx);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={12} />
                    <span>Critique with AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFeynman}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Save size={13} />
                    <span>{savedSuccess ? 'Saved!' : 'Save Explanation'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Rubric Verification */}
            <div className="pt-2 border-t border-[var(--color-rule)] flex flex-col gap-2">
              <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
                Self-Verification Rubric Checks:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unit.understanding.feynmanWorkspace.rubricChecks.map((rubric, idx) => {
                  const isChecked = !!checkedRubrics[`${idx}`];
                  return (
                    <div
                      key={rubric.id || idx}
                      onClick={() => toggleRubric(idx)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-sky-500/60 bg-sky-50/40 dark:bg-sky-950/20'
                          : 'border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-sky-600 dark:text-sky-400 shrink-0">
                        {isChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                      <span className="text-xs font-medium text-[var(--color-ink)]">
                        {rubric.prompt}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
