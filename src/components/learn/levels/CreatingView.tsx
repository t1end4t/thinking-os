import React, { useState } from 'react';
import {
  Sparkles,
  GitFork,
  HelpCircle,
  ListChecks,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';

interface CreatingViewProps {
  unit: LearningUnit;
  onUpdateProgress: (score: number) => void;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
  onPromoteToClaim: (conjectureText: string) => { claimId: string };
  onPromoteToQuestion: (title: string, tags: string[]) => { questionId: string };
  onPromoteToTask: (title: string, description: string) => { taskId: string };
  onNavigateToSurface?: (surface: 'map' | 'survey' | 'tasks') => void;
}

export const CreatingView: React.FC<CreatingViewProps> = ({
  unit,
  onUpdateProgress,
  onUpdateUnit,
  onPromoteToClaim,
  onPromoteToQuestion,
  onPromoteToTask,
  onNavigateToSurface
}) => {
  const [conjectureDraft, setConjectureDraft] = useState(unit.creating.conjectureDraft || '');
  const [premises, setPremises] = useState<string[]>(unit.creating.mathematicalPremises || []);
  const [newPremise, setNewPremise] = useState('');
  const [mechanism, setMechanism] = useState(unit.creating.proposedMechanism || '');
  const [falsification, setFalsification] = useState(unit.creating.falsificationCriteria || '');
  const [savedStatus, setSavedStatus] = useState(false);
  const [promotionFeedback, setPromotionFeedback] = useState<string | null>(null);

  const calculateScore = (
    cText: string,
    pList: string[],
    mech: string,
    fals: string
  ) => {
    let score = 0;
    if (cText.trim().length > 20) score += 35;
    if (pList.length > 0) score += 25;
    if (mech.trim().length > 20) score += 20;
    if (fals.trim().length > 20) score += 20;
    return Math.min(100, score);
  };

  const handleSaveCreating = () => {
    const score = calculateScore(conjectureDraft, premises, mechanism, falsification);
    onUpdateProgress(score);

    onUpdateUnit({
      creating: {
        ...unit.creating,
        conjectureDraft,
        mathematicalPremises: premises,
        proposedMechanism: mechanism,
        falsificationCriteria: falsification
      }
    });

    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleAddPremise = () => {
    if (!newPremise.trim()) return;
    const updated = [...premises, newPremise.trim()];
    setPremises(updated);
    setNewPremise('');
    const score = calculateScore(conjectureDraft, updated, mechanism, falsification);
    onUpdateProgress(score);
  };

  const handleRemovePremise = (index: number) => {
    const updated = premises.filter((_, i) => i !== index);
    setPremises(updated);
    const score = calculateScore(conjectureDraft, updated, mechanism, falsification);
    onUpdateProgress(score);
  };

  const handlePromoteClaim = () => {
    if (!conjectureDraft.trim()) {
      setPromotionFeedback('Please write your conjecture statement first.');
      return;
    }
    const { claimId } = onPromoteToClaim(conjectureDraft.trim());
    setPromotionFeedback(`Successfully created Claim ${claimId} in the Argument Map!`);
    handleSaveCreating();
  };

  const handlePromoteQuestion = () => {
    if (!conjectureDraft.trim()) {
      setPromotionFeedback('Please write your conjecture statement first.');
      return;
    }
    const title = `How does ${conjectureDraft.slice(0, 60)}...?`;
    const { questionId } = onPromoteToQuestion(title, [...unit.tags, 'learn-conjecture']);
    setPromotionFeedback(`Successfully created Question ${questionId}!`);
    handleSaveCreating();
  };

  const handlePromoteTask = () => {
    if (!conjectureDraft.trim()) {
      setPromotionFeedback('Please write your conjecture statement first.');
      return;
    }
    const title = `Empirically test conjecture: ${conjectureDraft.slice(0, 50)}...`;
    const description = `Conjecture: ${conjectureDraft}\n\nPremises:\n${premises.map(p => `• ${p}`).join('\n')}\n\nProposed Mechanism:\n${mechanism}\n\nFalsification Criteria:\n${falsification}`;
    const { taskId } = onPromoteToTask(title, description);
    setPromotionFeedback(`Successfully created Task ${taskId} in the Kanban backlog!`);
    handleSaveCreating();
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Level Banner */}
      <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Sparkles size={15} />
            <span>Cognitive Level 6: Creating</span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Synthesizing mathematical principles to formulate novel hypotheses, architectural modifications, and testable research conjectures.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-mono text-[var(--color-ink-muted)]">Creation Score</div>
          <div className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {unit.progress.creating}%
          </div>
        </div>
      </div>

      {/* Novel Ideas / Open Sparks */}
      {unit.creating.novelIdeasInspiration.length > 0 && (
        <div className="p-5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
            <Lightbulb size={14} className="text-amber-500" />
            <span>Inspiration & Open Questions in LLM Mathematics</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {unit.creating.novelIdeasInspiration.map((idea, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (!conjectureDraft) {
                    setConjectureDraft(`Conjecture: ${idea}`);
                  }
                }}
                className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-indigo-500/50 cursor-pointer transition-all text-xs text-[var(--color-ink)] leading-relaxed flex flex-col justify-between gap-2"
              >
                <span>{idea}</span>
                <span className="text-[0.6875rem] font-mono text-indigo-600 dark:text-indigo-400 self-end">
                  Click to adapt →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Conjecture Workspace */}
      <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-50/10 dark:bg-indigo-950/10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-semibold">
              Conjecture Studio: Formulate Your Original Research Hypothesis
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSaveCreating}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <Save size={13} />
            <span>{savedStatus ? 'Saved!' : 'Save Conjecture'}</span>
          </button>
        </div>

        {/* Prompt guidance */}
        <div className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)]">
          <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">Challenge: </strong>
          {unit.creating.conjecturePrompt}
        </div>

        {/* Conjecture Statement */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
            <span>1. Formal Conjecture / Hypothesis Statement</span>
            <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={conjectureDraft}
            onChange={e => setConjectureDraft(e.target.value)}
            rows={3}
            placeholder="State your mathematical hypothesis precisely (e.g. 'For any autoregressive LLM, allocating an explicit sink attention bias reduces perplexity drift by at least 40% under sequence lengths L > 16k without context window retraining')..."
            className="w-full p-3 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />
        </div>

        {/* Mathematical Premises */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-semibold text-[var(--color-ink)]">
            2. Underlying Mathematical Premises & Assumptions ({premises.length})
          </label>
          <div className="flex flex-col gap-2">
            {premises.map((p, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-500 font-semibold">P{idx + 1}:</span>
                  <span className="text-[var(--color-ink)]">{p}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePremise(idx)}
                  className="text-[var(--color-ink-muted)] hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={newPremise}
                onChange={e => setNewPremise(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPremise()}
                placeholder="Add a premise (e.g., 'Softmax normalization causes non-zero mass accumulation on position 0')..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddPremise}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)] text-xs font-medium flex items-center gap-1 text-[var(--color-ink)]"
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Proposed Mechanism */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-semibold text-[var(--color-ink)]">
            3. Proposed Causal Mechanism (Why does this work?)
          </label>
          <textarea
            value={mechanism}
            onChange={e => setMechanism(e.target.value)}
            rows={3}
            placeholder="Explain the causal mathematical mechanism connecting your premises to the proposed outcome..."
            className="w-full p-3 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />
        </div>

        {/* Falsification Criteria */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono font-semibold text-[var(--color-ink)]">
            4. Falsification & Empirical Test Boundary (How would we prove this wrong?)
          </label>
          <textarea
            value={falsification}
            onChange={e => setFalsification(e.target.value)}
            rows={2}
            placeholder="Specify exact condition under which this conjecture is falsified..."
            className="w-full p-3 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />
        </div>

        {/* Promotion Feedback */}
        {promotionFeedback && (
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-mono text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
            <span>{promotionFeedback}</span>
            <button
              type="button"
              onClick={() => setPromotionFeedback(null)}
              className="text-xs underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Promotion to Thinking OS Research Pipeline */}
        <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-ink)]">
              Promote to Thinking OS Research Pipeline
            </span>
            <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
              Connects Learning to Scientific Work
            </span>
          </div>

          <p className="text-xs text-[var(--color-ink-muted)]">
            Bridge your theoretical learning directly into your research epistemic tree:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handlePromoteClaim}
              className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 flex flex-col gap-1.5 transition-all text-left group"
            >
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                <div className="flex items-center gap-1.5">
                  <GitFork size={14} />
                  <span>Promote to Claim</span>
                </div>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-[0.7188rem] text-[var(--color-ink-muted)] leading-snug">
                Inserts a Claim node in the Argument Map requiring evidence linkage.
              </span>
            </button>

            <button
              type="button"
              onClick={handlePromoteQuestion}
              className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 flex flex-col gap-1.5 transition-all text-left group"
            >
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  <span>Promote to Question</span>
                </div>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-[0.7188rem] text-[var(--color-ink-muted)] leading-snug">
                Creates a top-level Question in the research graph with math tags.
              </span>
            </button>

            <button
              type="button"
              onClick={handlePromoteTask}
              className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-rose-500 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 flex flex-col gap-1.5 transition-all text-left group"
            >
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                <div className="flex items-center gap-1.5">
                  <ListChecks size={14} />
                  <span>Promote to Task</span>
                </div>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-[0.7188rem] text-[var(--color-ink-muted)] leading-snug">
                Generates a Kanban delivery card with full experiment criteria.
              </span>
            </button>
          </div>

          {/* Existing Promotion Badges */}
          {(unit.creating.promotedClaimId || unit.creating.promotedQuestionId || unit.creating.linkedTaskId) && (
            <div className="pt-2 border-t border-[var(--color-rule)]/60 flex flex-wrap gap-2 text-xs font-mono">
              {unit.creating.promotedClaimId && (
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <GitFork size={11} />
                  <span>Claim: {unit.creating.promotedClaimId}</span>
                </span>
              )}
              {unit.creating.promotedQuestionId && (
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <HelpCircle size={11} />
                  <span>Question: {unit.creating.promotedQuestionId}</span>
                </span>
              )}
              {unit.creating.linkedTaskId && (
                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                  <ListChecks size={11} />
                  <span>Task: {unit.creating.linkedTaskId}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
