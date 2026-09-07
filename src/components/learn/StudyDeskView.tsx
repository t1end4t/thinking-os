import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Lightbulb,
  Wrench,
  Network,
  ShieldAlert,
  Sparkles,
  BookMarked,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Play,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Sliders,
  SlidersHorizontal,
  BookmarkCheck,
  Layers,
  Edit3,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import {
  LearningUnit,
  CognitiveLevelId,
  COGNITIVE_LEVELS,
  FlashcardItem,
  AxiomIdentity,
  DerivationStep
} from '../../learnTypes';
import { MathView } from '../common/MathView';
import { useWorkspace } from '../../context/WorkspaceContext';

interface StudyDeskViewProps {
  unit: LearningUnit;
  onUpdateUnit: (updates: Partial<LearningUnit>) => void;
  onUpdateLevelProgress: (level: CognitiveLevelId, score: number) => void;
  onOpenEditModal: (unit: LearningUnit) => void;
  onDeleteUnit: (id: string) => void;
  onPromoteToClaim: (conjecture: string) => void;
  onPromoteToQuestion: (title: string, tags: string[]) => void;
  onPromoteToTask: (title: string, desc: string) => void;
}

export const StudyDeskView: React.FC<StudyDeskViewProps> = ({
  unit,
  onUpdateUnit,
  onUpdateLevelProgress,
  onOpenEditModal,
  onDeleteUnit,
  onPromoteToClaim,
  onPromoteToQuestion,
  onPromoteToTask
}) => {
  const { setActiveSurface, setIsDockOpen, addAttachedContext } = useWorkspace();

  // Selected level filter: 'all' or specific level
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'all' | CognitiveLevelId>('all');

  // Flashcard reveal states
  const [revealedFlashcards, setRevealedFlashcards] = useState<Record<string, boolean>>({});

  // Code copy feedback state
  const [codeCopied, setCodeCopied] = useState(false);

  // Live parameter sandbox values
  const [sandboxTemp, setSandboxTemp] = useState(1.0);
  const [sandboxDim, setSandboxDim] = useState(64);

  // Personal study notes local state
  const [showNotesPanel, setShowNotesPanel] = useState(true);
  const [notesText, setNotesText] = useState(unit.studyNotes || '');
  const [notesSaved, setNotesSaved] = useState(false);

  // Conjecture draft state
  const [conjectureDraft, setConjectureDraft] = useState(
    unit.creating?.conjectureDraft || ''
  );
  const [promotionStatus, setPromotionStatus] = useState<string | null>(null);

  // Spot-the-flaw verdict state
  const [selectedFlawVerdict, setSelectedFlawVerdict] = useState<string | null>(null);
  const [showFlawAnswer, setShowFlawAnswer] = useState(false);

  // Computed interactive sandbox outputs
  const sandboxComputed = useMemo(() => {
    // Simulate logits for a sequence of 3 tokens
    const baseLogits = [2.4, 1.1, -0.5];
    const scaledLogits = baseLogits.map(z => (z / Math.sqrt(sandboxDim)) / Math.max(0.01, sandboxTemp));
    const maxLogit = Math.max(...scaledLogits);
    const exps = scaledLogits.map(z => Math.exp(z - maxLogit));
    const sumExp = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(e => e / sumExp);
    const entropy = -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log2(p) : 0), 0);

    return {
      probs,
      entropy: entropy.toFixed(2),
      maxProb: Math.max(...probs).toFixed(2),
      varScale: Math.sqrt(sandboxDim).toFixed(2)
    };
  }, [sandboxTemp, sandboxDim]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSaveNotes = () => {
    onUpdateUnit({ studyNotes: notesText });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleInsertNoteTemplate = (title: string, body: string) => {
    const updated = notesText ? `${notesText}\n\n### ${title}\n${body}` : `### ${title}\n${body}`;
    setNotesText(updated);
    onUpdateUnit({ studyNotes: updated });
  };

  const handleRateFlashcard = (id: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
    const nextKeyTerms = unit.remembering.keyTerms.map(t =>
      t.id === id ? { ...t, recallRating: rating, lastReviewedAt: Date.now() } : t
    );
    const easyCount = nextKeyTerms.filter(t => t.recallRating === 'easy' || t.recallRating === 'good').length;
    const progressScore = Math.round((easyCount / Math.max(1, nextKeyTerms.length)) * 100);

    onUpdateUnit({
      remembering: {
        ...unit.remembering,
        keyTerms: nextKeyTerms,
        masteryPercent: progressScore
      }
    });
    onUpdateLevelProgress('remembering', progressScore);
  };

  const handlePromoteConjecture = (type: 'claim' | 'question' | 'task') => {
    const text = conjectureDraft.trim() || `${unit.title} hypothesis: Testing parameter scaling boundary`;
    if (type === 'claim') {
      onPromoteToClaim(text);
      setPromotionStatus('Promoted to Claim in Argument Map!');
    } else if (type === 'question') {
      onPromoteToQuestion(`How does ${unit.title} scale under high dimensions?`, unit.tags);
      setPromotionStatus('Promoted to Research Question!');
    } else if (type === 'task') {
      onPromoteToTask(`Empirical test for ${unit.title}`, `Implement toy prototype and benchmark failure modes.`);
      setPromotionStatus('Created Task on Kanban Board!');
    }
    setTimeout(() => setPromotionStatus(null), 3500);
  };

  // Helper to get cognitive level completion
  const getLevelScore = (level: CognitiveLevelId) => unit.progress[level] || 0;

  return (
    <div id="study-desk-view-root" className="flex-1 flex flex-col overflow-y-auto w-full h-full bg-[var(--color-surface)]">
      {/* 1. TOP BOOK & TOPIC CITATION BANNER */}
      <header className="px-6 py-4 border-b border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-3 shrink-0 shadow-2xs">
        {/* Source Hierarchy Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
              <BookOpen size={12} />
              <span>{unit.book || 'Textbook Source'}</span>
            </span>
            {unit.chapter && (
              <>
                <span className="text-[var(--color-ink-muted)]">/</span>
                <span className="text-[var(--color-ink-muted)] font-medium">{unit.chapter}</span>
              </>
            )}
            {unit.section && (
              <>
                <span className="text-[var(--color-ink-muted)]">/</span>
                <span className="text-[var(--color-ink)] font-bold">{unit.section}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotesPanel(!showNotesPanel)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border ${
                showNotesPanel
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                  : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border-[var(--color-rule)]'
              }`}
              title="Toggle reading notes & scratchpad"
            >
              <FileText size={13} />
              <span>Notes</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenEditModal(unit)}
              className="p-1.5 rounded-lg border border-[var(--color-rule)] hover:bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-xs transition-colors"
              title="Edit topic metadata"
            >
              <Edit3 size={13} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${unit.title}" from curriculum?`)) {
                  onDeleteUnit(unit.id);
                }
              }}
              className="p-1.5 rounded-lg border border-[var(--color-rule)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[var(--color-ink-muted)] hover:text-rose-500 text-xs transition-colors"
              title="Delete topic"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Topic Title & Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-ink)] tracking-tight">
              {unit.title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1 max-w-3xl leading-relaxed">
              {unit.description}
            </p>
          </div>

          {/* Tags & Difficulty */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start md:self-center">
            <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink)]">
              {unit.category}
            </span>
            <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
              {unit.difficulty}
            </span>
          </div>
        </div>

        {/* 2. KEY FORMULA CARD (Hero Anchor) */}
        {unit.keyFormulaLatex && (
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                Core Equation:
              </span>
              <div className="text-sm font-serif">
                <MathView math={unit.keyFormulaLatex} block={false} showAiAction={false} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsDockOpen(true);
                addAttachedContext({
                  type: 'artifact',
                  id: `formula-${unit.id}`,
                  label: `Formula: ${unit.title}`,
                  metadata: { formula: unit.keyFormulaLatex || '' }
                });
              }}
              className="text-[0.6875rem] font-mono text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 self-end sm:self-auto"
            >
              <span>Ask Assistant about Formula</span>
              <ArrowRight size={11} />
            </button>
          </div>
        )}

        {/* 3. COGNITIVE MASTERY PROGRESSION BAR (Bloom's 6 Levels) */}
        <div className="pt-2 border-t border-[var(--color-rule)] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--color-ink-muted)] font-semibold flex items-center gap-1.5">
              <Layers size={13} className="text-emerald-600" />
              <span>Cognitive Mastery Ladder (Bloom's Taxonomy)</span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {Math.round(
                Object.values(unit.progress).reduce((a, b) => a + b, 0) / 6
              )}% Overall Rigor
            </span>
          </div>

          {/* 6 Level Clickable Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
            {(['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'] as CognitiveLevelId[]).map(
              lvl => {
                const meta = COGNITIVE_LEVELS[lvl];
                const score = getLevelScore(lvl);
                const isCurrentFilter = selectedLevelFilter === lvl;
                const isCompleted = score >= 70;

                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevelFilter(selectedLevelFilter === lvl ? 'all' : lvl)}
                    className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      isCurrentFilter
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-500/20 shadow-xs'
                        : isCompleted
                        ? 'border-emerald-200 dark:border-emerald-800 bg-[var(--color-paper)] hover:border-emerald-300'
                        : 'border-[var(--color-rule)] bg-[var(--color-surface)]/50 hover:bg-[var(--color-paper)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[0.625rem] font-mono font-bold text-[var(--color-ink-muted)]">
                        L{meta.levelNumber}
                      </span>
                      {isCompleted ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)]">
                          {score}%
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[var(--color-ink)] truncate">
                      {meta.name}
                    </span>
                    <div className="w-full h-1 rounded-full bg-[var(--color-rule)] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY: COGNITIVE RIGOR DESK + INTEGRATED NOTES */}
      <div className="flex-1 flex overflow-hidden w-full h-full">
        {/* Left/Center: The Cognitive Rigor Flow */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col gap-8 max-w-4xl mx-auto w-full">
          {/* Level Filter Banner if single level filtered */}
          {selectedLevelFilter !== 'all' && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  Focusing on Level {COGNITIVE_LEVELS[selectedLevelFilter].levelNumber}: {COGNITIVE_LEVELS[selectedLevelFilter].name}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)]">•</span>
                <span className="text-xs text-[var(--color-ink-muted)] italic">
                  {COGNITIVE_LEVELS[selectedLevelFilter].promptQuestion}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('all')}
                className="text-xs font-mono text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                Show All 6 Levels
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* LEVEL 1: REMEMBER (Recall basic facts, terms, symbols)      */}
          {/* ============================================================ */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'remembering') && (
            <section
              id="level-1-remember"
              className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 sm:p-6 flex flex-col gap-4 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-800 flex items-center justify-center shrink-0">
                    <BookMarked size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase">
                        Level 1 · Remember
                      </span>
                      <span className="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                        Active Recall & Definitions
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Recall basic facts, mathematical notations, and core identities without consulting notes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allRev = Object.keys(revealedFlashcards).length === unit.remembering.keyTerms.length;
                      const next: Record<string, boolean> = {};
                      if (!allRev) {
                        unit.remembering.keyTerms.forEach(t => (next[t.id] = true));
                      }
                      setRevealedFlashcards(next);
                    }}
                    className="text-xs font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] px-2.5 py-1 rounded-lg border border-[var(--color-rule)]"
                  >
                    Toggle Definitions
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateLevelProgress('remembering', 100)}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-xs font-mono font-semibold"
                  >
                    Mark Solid (100%)
                  </button>
                </div>
              </div>

              {/* Terms & Flashcards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unit.remembering.keyTerms.map(item => {
                  const isRevealed = !!revealedFlashcards[item.id];
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/40 hover:bg-[var(--color-surface)]/70 flex flex-col justify-between gap-2.5 transition-colors"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--color-ink)]">
                            {item.term}
                          </span>
                          {item.recallRating && (
                            <span className="text-[0.625rem] font-mono px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200">
                              {item.recallRating}
                            </span>
                          )}
                        </div>

                        {item.symbolLatex && (
                          <div className="py-1">
                            <MathView math={item.symbolLatex} block={false} showAiAction={false} />
                          </div>
                        )}

                        {/* Definition Reveal Block */}
                        <div className="mt-1">
                          {isRevealed ? (
                            <p className="text-xs text-[var(--color-ink)] leading-relaxed bg-[var(--color-paper)] p-2 rounded-lg border border-[var(--color-rule)]">
                              {item.definition}
                              {item.mnemonic && (
                                <span className="block text-[0.6875rem] text-sky-600 dark:text-sky-400 mt-1 italic">
                                  💡 Mnemonic: {item.mnemonic}
                                </span>
                              )}
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRevealedFlashcards(prev => ({ ...prev, [item.id]: true }))}
                              className="w-full py-2 text-center text-xs font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)]/70 border border-dashed border-[var(--color-rule)] rounded-lg"
                            >
                              Tap to test your recall & reveal definition
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Recall rating buttons */}
                      {isRevealed && (
                        <div className="pt-2 border-t border-[var(--color-rule)] flex items-center justify-between gap-1 text-[0.625rem] font-mono">
                          <span className="text-[var(--color-ink-muted)]">Recall grade:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRateFlashcard(item.id, 'hard')}
                              className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            >
                              Hard
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRateFlashcard(item.id, 'good')}
                              className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              Good
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRateFlashcard(item.id, 'easy')}
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            >
                              Easy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Axioms & Core Identities */}
              {unit.remembering.axiomsAndIdentities.length > 0 && (
                <div className="mt-2 pt-3 border-t border-[var(--color-rule)] flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Fundamental Axioms & Identities
                  </span>
                  <div className="flex flex-col gap-2">
                    {unit.remembering.axiomsAndIdentities.map(ax => (
                      <div key={ax.id} className="p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)]">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--color-ink)]">{ax.name}</span>
                        </div>
                        <div className="my-1.5">
                          <MathView math={ax.latex} block={false} showAiAction={false} />
                        </div>
                        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                          {ax.statement}
                        </p>
                        {ax.significance && (
                          <p className="text-[0.6875rem] text-sky-700 dark:text-sky-300 mt-1 font-mono">
                            ⚡ {ax.significance}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* LEVEL 2: UNDERSTAND (Feynman intuition, geometric metaphors) */}
          {/* ============================================================ */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'understanding') && (
            <section
              id="level-2-understand"
              className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 sm:p-6 flex flex-col gap-4 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <Lightbulb size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Level 2 · Understand
                      </span>
                      <span className="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                        Intuition & Feynman Explanation
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Demonstrate comprehension: explain concepts in plain language without hiding behind jargon.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateLevelProgress('understanding', 100)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-mono font-semibold"
                >
                  Mark Understood (100%)
                </button>
              </div>

              {/* Feynman Plain-Language Explanation */}
              {unit.understanding.feynmanWorkspace && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    <Lightbulb size={14} className="text-emerald-600" />
                    <span>Feynman Mental Model: {unit.understanding.feynmanWorkspace.guidingQuestion}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed italic pl-1 border-l-2 border-emerald-400">
                    "{unit.understanding.feynmanWorkspace.learnerExplanation}"
                  </p>
                </div>
              )}

              {/* Geometric & Physical Metaphor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/40 flex flex-col gap-1.5">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase text-[var(--color-ink-muted)]">
                    📐 Geometric Metaphor
                  </span>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                    {unit.understanding.geometricIntuition.visualMetaphor}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/40 flex flex-col gap-1.5">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase text-[var(--color-ink-muted)]">
                    ⚡ Physical Interpretation
                  </span>
                  <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                    {unit.understanding.geometricIntuition.physicalInterpretation}
                  </p>
                </div>
              </div>

              {/* Concept Component Breakdown */}
              {unit.understanding.conceptDecomposition.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Mechanistic Decomposition
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {unit.understanding.conceptDecomposition.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-1">
                        <span className="text-xs font-bold text-[var(--color-ink)]">{c.part}</span>
                        <p className="text-[0.6875rem] text-[var(--color-ink-muted)] leading-relaxed">
                          Role: {c.role}
                        </p>
                        <p className="text-[0.6875rem] text-rose-600 dark:text-rose-400 mt-0.5">
                          If removed: {c.impactIfMissing}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* LEVEL 3: APPLY (Minimal toy code, numerical derivations)     */}
          {/* ============================================================ */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'applying') && (
            <section
              id="level-3-apply"
              className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 sm:p-6 flex flex-col gap-4 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center justify-center shrink-0">
                    <Wrench size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Level 3 · Apply
                      </span>
                      <span className="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                        Minimal Code & Concrete Calculations
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Use knowledge in new situations: write minimal executable code or calculate concrete numbers.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateLevelProgress('applying', 100)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-mono font-semibold"
                >
                  Mark Applied (100%)
                </button>
              </div>

              {/* Minimal Toy Code Block */}
              {unit.toyCodeSnippet && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                      Minimal Executable Implementation (Toy Model)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(unit.toyCodeSnippet || '')}
                      className="px-2 py-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-xs font-mono flex items-center gap-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    >
                      {codeCopied ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-xs overflow-x-auto leading-relaxed border border-neutral-800">
                    <code>{unit.toyCodeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Interactive Live Parameter Playground */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sliders size={14} className="text-amber-600" />
                    <span>Live Numerical Playground: Softmax Scaling & Dimension</span>
                  </span>
                  <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                    Try adjusting parameters
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slider 1: Temperature */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Temperature (τ):</span>
                      <span className="font-bold text-amber-600">{sandboxTemp.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={sandboxTemp}
                      onChange={e => setSandboxTemp(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <span className="text-[0.625rem] text-[var(--color-ink-muted)]">
                      Low temp = sharp peak; High temp = uniform distribution
                    </span>
                  </div>

                  {/* Slider 2: Key dimension */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Key Dimension (dk):</span>
                      <span className="font-bold text-amber-600">{sandboxDim} (√dk = {sandboxComputed.varScale})</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="256"
                      step="16"
                      value={sandboxDim}
                      onChange={e => setSandboxDim(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <span className="text-[0.625rem] text-[var(--color-ink-muted)]">
                      Larger dimension requires scaling to prevent gradient saturation
                    </span>
                  </div>
                </div>

                {/* Computed Output Live Visualizer */}
                <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[0.6875rem] font-mono">
                    <span className="text-[var(--color-ink-muted)]">Computed Attention Weights:</span>
                    <span className="text-amber-600 font-bold">Entropy: {sandboxComputed.entropy} bits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sandboxComputed.probs.map((p, idx) => (
                      <div key={idx} className="flex-1 flex flex-col gap-1">
                        <div className="w-full h-10 bg-[var(--color-surface)] rounded overflow-hidden flex items-end">
                          <div
                            className="w-full bg-amber-500 transition-all duration-150"
                            style={{ height: `${p * 100}%` }}
                          />
                        </div>
                        <span className="text-[0.625rem] font-mono text-center text-[var(--color-ink-muted)]">
                          Token {idx + 1}: {(p * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Derivation */}
              {unit.applying.workedDerivations.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Step-by-Step Mathematical Derivation
                  </span>
                  {unit.applying.workedDerivations.map(d => (
                    <div key={d.id} className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2.5">
                      <span className="text-xs font-bold text-[var(--color-ink)]">{d.title}</span>
                      <p className="text-xs text-[var(--color-ink-muted)]">{d.problemStatement}</p>
                      <div className="flex flex-col gap-2 pl-2 border-l-2 border-amber-300 dark:border-amber-700">
                        {d.steps.map(step => (
                          <div key={step.stepIndex} className="text-xs flex flex-col gap-0.5">
                            <span className="font-mono text-[0.6875rem] text-amber-600 dark:text-amber-400 font-semibold">
                              Step {step.stepIndex}: {step.label}
                            </span>
                            <MathView math={step.mathExpression} block={false} showAiAction={false} />
                            <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">{step.justification}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-[var(--color-rule)]">
                        Result: {d.conclusion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* LEVEL 4: ANALYZE (Failure modes, stress-tests, comparison)   */}
          {/* ============================================================ */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'analyzing') && (
            <section
              id="level-4-analyze"
              className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 sm:p-6 flex flex-col gap-4 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center shrink-0">
                    <Network size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        Level 4 · Analyze
                      </span>
                      <span className="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                        Assumptions & Failure Modes
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Break down information to understand relationships, find boundary conditions, and stress-test assumptions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateLevelProgress('analyzing', 100)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-xs font-mono font-semibold"
                >
                  Mark Analyzed (100%)
                </button>
              </div>

              {/* Assumption Stress Tests & Failure Modes */}
              {unit.analyzing.assumptionStressTests.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Boundary Stress-Tests (Where Does The Math Break?)
                  </span>
                  <div className="flex flex-col gap-2">
                    {unit.analyzing.assumptionStressTests.map(test => (
                      <div
                        key={test.id}
                        className="p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/40 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--color-ink)]">
                            Assumption: {test.assumption}
                          </span>
                          <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200">
                            Failure Mode
                          </span>
                        </div>
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                          ⚠️ {test.failureMode}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                          Mathematical impact: {test.mathematicalConsequence}
                        </p>
                        {test.llmResearchImplication && (
                          <p className="text-[0.6875rem] font-mono text-indigo-700 dark:text-indigo-300 mt-1">
                            🔬 Practical Research Implication: {test.llmResearchImplication}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contrastive Analysis Table */}
              {unit.analyzing.contrastiveAnalysis.dimensions.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-rule)]">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Contrastive Matrix: {unit.analyzing.contrastiveAnalysis.titleA} vs {unit.analyzing.contrastiveAnalysis.titleB}
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-rule)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--color-surface)] border-b border-[var(--color-rule)] font-mono text-[0.6875rem]">
                        <tr>
                          <th className="p-2.5 font-bold text-[var(--color-ink)]">Dimension</th>
                          <th className="p-2.5 font-bold text-emerald-700 dark:text-emerald-400">
                            {unit.analyzing.contrastiveAnalysis.titleA}
                          </th>
                          <th className="p-2.5 font-bold text-sky-700 dark:text-sky-400">
                            {unit.analyzing.contrastiveAnalysis.titleB}
                          </th>
                          <th className="p-2.5 font-bold text-[var(--color-ink-muted)]">Divergence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-rule)]">
                        {unit.analyzing.contrastiveAnalysis.dimensions.map((row, i) => (
                          <tr key={i} className="hover:bg-[var(--color-surface)]/50">
                            <td className="p-2.5 font-medium text-[var(--color-ink)]">{row.dimension}</td>
                            <td className="p-2.5 text-[var(--color-ink)]">{row.conceptA}</td>
                            <td className="p-2.5 text-[var(--color-ink)]">{row.conceptB}</td>
                            <td className="p-2.5 text-indigo-700 dark:text-indigo-300 font-mono text-[0.6875rem]">
                              {row.mathematicalDivergence}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* LEVEL 5: EVALUATE (Trade-offs, spot the flaw, judgments)     */}
          {/* ============================================================ */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'evaluating') && (
            <section
              id="level-5-evaluate"
              className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 sm:p-6 flex flex-col gap-4 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center justify-center shrink-0">
                    <ShieldAlert size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase">
                        Level 5 · Evaluate
                      </span>
                      <span className="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                        Trade-offs & Mathematical Auditing
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Make judgments based on criteria and standards: critique claims, evaluate trade-offs, and detect flaws.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateLevelProgress('evaluating', 100)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-mono font-semibold"
                >
                  Mark Evaluated (100%)
                </button>
              </div>

              {/* Architectural Trade-offs Ledger */}
              {unit.evaluating.tradeoffMatrix.criteria.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Trade-off Ledger: {unit.evaluating.tradeoffMatrix.approachAName} vs {unit.evaluating.tradeoffMatrix.approachBName}
                  </span>
                  <div className="flex flex-col gap-2">
                    {unit.evaluating.tradeoffMatrix.criteria.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)]/30 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--color-ink)]">{t.criterion}</span>
                          <span className="text-[0.6875rem] font-mono font-semibold text-rose-600 dark:text-rose-400">
                            Verdict: {t.verdict}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--color-ink-muted)] mt-1">
                          <div>• {unit.evaluating.tradeoffMatrix.approachAName}: {t.approachA}</div>
                          <div>• {unit.evaluating.tradeoffMatrix.approachBName}: {t.approachB}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spot-the-Flaw Challenge */}
              {unit.evaluating.critiqueChallenges.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-rose-600" />
                      <span>Spot-The-Flaw Audit: {unit.evaluating.critiqueChallenges[0].title}</span>
                    </span>
                    <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                      Critical Rigor Exercise
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-ink)] italic bg-[var(--color-paper)] p-3 rounded-lg border border-[var(--color-rule)]">
                    "{unit.evaluating.critiqueChallenges[0].allegedClaim}"
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                      Which mathematical flaw invalidates this reasoning?
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {unit.evaluating.critiqueChallenges[0].verdictOptions.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedFlawVerdict(opt.id);
                            setShowFlawAnswer(true);
                          }}
                          className={`text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                            selectedFlawVerdict === opt.id
                              ? opt.isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-400 text-emerald-900 dark:text-emerald-100 font-semibold'
                                : 'bg-rose-50 dark:bg-rose-950 border-rose-400 text-rose-900 dark:text-rose-100'
                              : 'bg-[var(--color-paper)] border-[var(--color-rule)] hover:bg-[var(--color-surface)] text-[var(--color-ink)]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {showFlawAnswer && opt.isCorrect && (
                            <span className="text-[0.625rem] font-mono font-bold text-emerald-600">✓ Correct</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showFlawAnswer && (
                    <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-emerald-300 dark:border-emerald-800 text-xs leading-relaxed text-[var(--color-ink)]">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                        Rigorous Explanation:
                      </span>
                      {unit.evaluating.critiqueChallenges[0].hiddenFlawExplanation}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* LEVEL 6: CREATE (Synthesize, form hypotheses, Bridge to OS)  */}
          {/* ============================================================ */}
          {(selectedLevelFilter === 'all' || selectedLevelFilter === 'creating') && (
            <section
              id="level-6-create"
              className="rounded-2xl border border-purple-300 dark:border-purple-800/80 bg-[var(--color-paper)] p-5 sm:p-6 flex flex-col gap-4 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-800 flex items-center justify-center shrink-0">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase">
                        Level 6 · Create
                      </span>
                      <span className="text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-bold">
                        Bridge to Thinking OS Research
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                      Integrate knowledge to form new ideas: draft falsifiable hypotheses and promote them to your research map.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateLevelProgress('creating', 100)}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-mono font-semibold"
                >
                  Mark Mastered (100%)
                </button>
              </div>

              {/* Research Conjecture Formulation Studio */}
              <div className="flex flex-col gap-2">
                <label htmlFor="conjecture-draft-input" className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-600" />
                  <span>Formulate Your Research Hypothesis or Architectural Variant:</span>
                </label>
                <textarea
                  id="conjecture-draft-input"
                  rows={3}
                  value={conjectureDraft}
                  onChange={e => {
                    setConjectureDraft(e.target.value);
                    onUpdateUnit({
                      creating: {
                        ...unit.creating,
                        conjectureDraft: e.target.value
                      }
                    });
                  }}
                  placeholder="e.g., Replacing softmax with a bounded polynomial activation in autoregressive decoders preserves expressivity while bounding initial token entropy sinks to O(1)..."
                  className="w-full p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              {/* Thinking OS 1-Click Research Promotion Buttons */}
              <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                    Promote this learning discovery directly into Thinking OS:
                  </span>
                  <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Creates linked records in the Argument Map, Literature Questions, or Tasks.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePromoteConjecture('claim')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>Promote to Claim</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePromoteConjecture('question')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-paper)] border border-purple-300 dark:border-purple-700 hover:border-purple-500 text-xs font-medium text-purple-700 dark:text-purple-300 shadow-2xs transition-colors"
                  >
                    <span>Promote to Question</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePromoteConjecture('task')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-paper)] border border-purple-300 dark:border-purple-700 hover:border-purple-500 text-xs font-medium text-purple-700 dark:text-purple-300 shadow-2xs transition-colors"
                  >
                    <span>Create Task</span>
                  </button>
                </div>
              </div>

              {/* Status toast */}
              {promotionStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-xs font-mono text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>{promotionStatus}</span>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL: INTEGRATED STUDY NOTES & SCRATCHPAD             */}
        {/* ============================================================ */}
        {showNotesPanel && (
          <aside
            id="study-notes-scratchpad-panel"
            className="w-80 sm:w-96 shrink-0 border-l border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col overflow-hidden select-none"
          >
            <div className="p-3 border-b border-[var(--color-rule)] flex items-center justify-between gap-2 bg-[var(--color-paper)] shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold text-[var(--color-ink)]">Reading Scratchpad</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex items-center gap-1 shadow-2xs transition-colors"
                >
                  {notesSaved ? <Check size={12} /> : null}
                  <span>{notesSaved ? 'Saved' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotesPanel(false)}
                  className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  title="Hide Scratchpad"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Templates Bar */}
            <div className="p-2 border-b border-[var(--color-rule)] bg-[var(--color-surface)]/50 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] uppercase shrink-0">
                Insert:
              </span>
              <button
                type="button"
                onClick={() =>
                  handleInsertNoteTemplate(
                    'Key Takeaways from Simon Prince',
                    '- **Main Takeaway**: ...\n- **Critical Equation**: $$\n...\n$$\n- **Core Intuition**: ...'
                  )
                }
                className="px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[0.625rem] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shrink-0"
              >
                + Book Summary
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertNoteTemplate(
                    'Open Question / Doubt',
                    '- Does this hold when $L \\to \\infty$?\n- Check empirical validation on MATH-500'
                  )
                }
                className="px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[0.625rem] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] shrink-0"
              >
                + Open Doubt
              </button>
            </div>

            {/* Scratchpad Textarea */}
            <div className="flex-1 p-3 flex flex-col">
              <textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                placeholder="Write your personal reading notes, textbook quotes, mathematical scratchpad, and insights here..."
                className="w-full h-full p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono resize-none leading-relaxed"
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
