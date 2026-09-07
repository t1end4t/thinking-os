import React, { useState } from 'react';
import {
  BookmarkCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  List,
  Check,
  ArrowRight,
  Repeat
} from 'lucide-react';
import { LearningUnit } from '../../../learnTypes';

interface RememberingViewProps {
  unit: LearningUnit;
  onUpdateProgress: (score: number) => void;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
}

export const RememberingView: React.FC<RememberingViewProps> = ({
  unit,
  onUpdateProgress
}) => {
  const [viewMode, setViewMode] = useState<'flashcards' | 'checklist'>('flashcards');
  const [revealedTerms, setRevealedTerms] = useState<Record<string, boolean>>({});
  const [checkedTerms, setCheckedTerms] = useState<Record<string, boolean>>({});
  const [filterQuery, setFilterQuery] = useState('');

  const toggleReveal = (term: string) => {
    setRevealedTerms(prev => ({ ...prev, [term]: !prev[term] }));
  };

  const toggleCheck = (term: string) => {
    const next = { ...checkedTerms, [term]: !checkedTerms[term] };
    setCheckedTerms(next);
    const total = unit.remembering.keyTerms.length + unit.remembering.axiomsAndIdentities.length;
    const count = Object.values(next).filter(Boolean).length;
    const score = total > 0 ? Math.round((count / total) * 100) : 100;
    onUpdateProgress(score);
  };

  const setRecallRating = (term: string, rating: 'easy' | 'good' | 'hard' | 'again') => {
    const isMastered = rating === 'easy' || rating === 'good';
    const next = { ...checkedTerms, [term]: isMastered };
    setCheckedTerms(next);
    const total = unit.remembering.keyTerms.length + unit.remembering.axiomsAndIdentities.length;
    const count = Object.values(next).filter(Boolean).length;
    const score = total > 0 ? Math.round((count / total) * 100) : 100;
    onUpdateProgress(score);
  };

  const filteredTerms = unit.remembering.keyTerms.filter(
    t =>
      t.term.toLowerCase().includes(filterQuery.toLowerCase()) ||
      t.definition.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (t.symbolLatex && t.symbolLatex.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const totalItems = unit.remembering.keyTerms.length + unit.remembering.axiomsAndIdentities.length;
  const recalledCount = Object.values(checkedTerms).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Visual Level Banner */}
      <div className="p-4 md:p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <BookmarkCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              <span>Level 1: Remembering</span>
              <span className="text-[var(--color-ink-muted)]">•</span>
              <span className="text-[var(--color-ink-muted)]">Recall & Spaced Repetition</span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5 max-w-xl leading-relaxed">
              Test your foundational retention of definitions, variables, and mathematical axioms before higher-level synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <div className="text-right">
            <div className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider">
              Mastery Score
            </div>
            <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {unit.progress.remembering}%
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCheckedTerms({});
              setRevealedTerms({});
              onUpdateProgress(0);
            }}
            className="p-2 rounded-xl border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            title="Reset recall checklist"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Flashcards vs Checklist Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
            <button
              type="button"
              onClick={() => setViewMode('flashcards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'flashcards'
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)] font-bold shadow-xs border border-[var(--color-rule)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Layers size={13} />
              <span>Interactive Flashcards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('checklist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'checklist'
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)] font-bold shadow-xs border border-[var(--color-rule)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <List size={13} />
              <span>Compact Checklist</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filter terms or formulas..."
            className="px-3 py-1.5 text-xs rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] w-60 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <div className="text-xs text-[var(--color-ink-muted)] font-mono shrink-0">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{recalledCount}</span> / {totalItems} Mastered
          </div>
        </div>
      </div>

      {/* Key Terms: Visual Flashcard Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1.5">
            <Sparkles size={14} className="text-sky-500" />
            <span>Key Mathematical Concepts ({filteredTerms.length})</span>
          </h3>
          <span className="text-[0.6875rem] text-[var(--color-ink-muted)] font-mono">
            Click any card to flip and verify your understanding
          </span>
        </div>

        {viewMode === 'flashcards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTerms.map((item, idx) => {
              const isRevealed = revealedTerms[item.term] ?? false;
              const isChecked = checkedTerms[item.term] ?? false;

              return (
                <div
                  key={item.id || idx}
                  className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs relative ${
                    isChecked
                      ? 'border-emerald-500/50 bg-[var(--color-surface)] ring-1 ring-emerald-500/20'
                      : 'border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-sky-500/40'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-[var(--color-rule)]/60 bg-[var(--color-paper)]/40">
                    <div>
                      <span className="text-[0.625rem] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-0.5">
                        Concept 0{idx + 1}
                      </span>
                      <h4 className="font-bold text-sm text-[var(--color-ink)] leading-snug">
                        {item.term}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCheck(item.term)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                      title={isChecked ? 'Mark unmastered' : 'Mark mastered'}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>

                  {/* Card Formula / LaTeX Showcase */}
                  {item.symbolLatex && (
                    <div className="px-4 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-rule)]/50 font-mono text-xs text-sky-600 dark:text-sky-300 overflow-x-auto flex items-center justify-between">
                      <code className="text-[0.8125rem] font-semibold">{item.symbolLatex}</code>
                      <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] uppercase">Formula</span>
                    </div>
                  )}

                  {/* Card Body / Interactive Flip Section */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    {isRevealed ? (
                      <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                        <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                          {item.definition}
                        </p>

                        {item.mnemonic && (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[0.6875rem] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                            <span>
                              <strong>Recall Mnemonic:</strong> {item.mnemonic}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => toggleReveal(item.term)}
                        className="my-auto py-6 px-4 rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper)]/40 hover:bg-[var(--color-paper)] hover:border-sky-500 cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <Eye size={18} className="text-sky-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-[var(--color-ink)]">
                          Click to Flip & Test Recall
                        </span>
                        <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                          Can you state the formal definition and significance?
                        </span>
                      </div>
                    )}

                    {/* Spaced Repetition Rating Buttons */}
                    <div className="pt-2 border-t border-[var(--color-rule)]/60 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => toggleReveal(item.term)}
                        className="text-[0.6875rem] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] flex items-center gap-1 font-mono"
                      >
                        <Repeat size={11} />
                        <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRecallRating(item.term, 'hard')}
                          className="px-2 py-0.5 rounded text-[0.625rem] font-mono border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          Hard
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecallRating(item.term, 'good')}
                          className="px-2 py-0.5 rounded text-[0.625rem] font-mono border border-sky-300 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                        >
                          Good
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecallRating(item.term, 'easy')}
                          className="px-2 py-0.5 rounded text-[0.625rem] font-mono bg-emerald-500 text-white hover:bg-emerald-600 font-bold"
                        >
                          Easy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Checklist Mode */
          <div className="flex flex-col gap-2">
            {filteredTerms.map((item, idx) => {
              const isChecked = checkedTerms[item.term] ?? false;

              return (
                <div
                  key={item.id || idx}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    isChecked
                      ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-[var(--color-rule)] bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.term)}
                      className={`p-1 rounded-lg border transition-colors ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-[var(--color-rule)] text-[var(--color-ink-muted)]'
                      }`}
                    >
                      <Check size={14} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--color-ink)]">
                          {item.term}
                        </span>
                        {item.symbolLatex && (
                          <code className="text-[0.6875rem] font-mono text-sky-600 dark:text-sky-400">
                            {item.symbolLatex}
                          </code>
                        )}
                      </div>
                      <p className="text-[0.6875rem] text-[var(--color-ink-muted)] line-clamp-1 mt-0.5">
                        {item.definition}
                      </p>
                    </div>
                  </div>

                  <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                    {isChecked ? 'Recalled' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Axioms & Fundamental Identities Section */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--color-rule)]">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] flex items-center gap-1.5">
          <BookmarkCheck size={14} className="text-emerald-500" />
          <span>Axioms & Fundamental Identities ({unit.remembering.axiomsAndIdentities.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unit.remembering.axiomsAndIdentities.map((axiom, idx) => {
            const isChecked = checkedTerms[axiom.name] ?? false;
            return (
              <div
                key={axiom.id || idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isChecked
                    ? 'border-emerald-500/50 bg-[var(--color-surface)] ring-1 ring-emerald-500/20'
                    : 'border-[var(--color-rule)] bg-[var(--color-surface)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-xs text-[var(--color-ink)]">{axiom.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleCheck(axiom.name)}
                      className={`p-1 rounded-lg border transition-colors ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-[var(--color-rule)] text-[var(--color-ink-muted)]'
                      }`}
                      title={isChecked ? 'Mark unmastered' : 'Mark mastered'}
                    >
                      <Check size={13} />
                    </button>
                  </div>

                  {/* Math Formula Card */}
                  <div className="p-3 my-2 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] font-mono text-xs text-sky-600 dark:text-sky-300 font-semibold overflow-x-auto shadow-2xs">
                    <code>{axiom.latex || axiom.statement}</code>
                  </div>

                  <p className="text-[0.6875rem] text-[var(--color-ink-muted)] leading-relaxed mt-1">
                    {axiom.significance}
                  </p>
                </div>

                <div className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-rule)]/50">
                  Status: {isChecked ? 'Verified in Memory' : 'Requires Review'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
