import React, { useMemo, useState } from 'react';
import { BookOpen, Brain, CheckCircle2, GraduationCap, Layers, MonitorPlay, RotateCcw } from 'lucide-react';
import { CardBlock, COGNITIVE_LEVELS, COGNITIVE_LEVEL_ORDER, LearnSourceKind, LearningUnit } from '../../learnTypes';
import { dueCards, levelCoverage } from '../../utils/learnBlocks';
import { MathView } from '../common/MathView';

export const SOURCE_KIND_LABEL: Record<LearnSourceKind, string> = {
  book: 'Book',
  video: 'Video',
  paper: 'Paper',
  course: 'Course',
  note: 'Note'
};

interface TodayViewProps {
  units: LearningUnit[];
  onOpenBoard: (unitId: string) => void;
  onReviewCard: (unitId: string, blockId: string, recalled: boolean) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ units, onOpenBoard, onReviewCard }) => {
  const due = useMemo(() => dueCards(units), [units]);
  const recentUnits = useMemo(() => [...units].sort((a, b) => b.updatedAt - a.updatedAt), [units]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-5 py-6">
        <section aria-labelledby="learn-review-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-sky-600 dark:text-sky-400" />
            <h2 id="learn-review-heading" className="text-sm font-semibold text-[var(--color-ink)]">Review queue</h2>
            <span className="rounded-full border border-[var(--color-rule)] px-2 py-0.5 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">{due.length} due</span>
          </div>
          {due.length ? (
            <ReviewCard
              key={due[0].card.id}
              unit={due[0].unit}
              card={due[0].card}
              remaining={due.length}
              onReview={recalled => onReviewCard(due[0].unit.id, due[0].card.id, recalled)}
              onOpenBoard={() => onOpenBoard(due[0].unit.id)}
            />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-6 text-sm text-[var(--color-ink-muted)]">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              Nothing due. Open a board and capture what you are reading now.
            </div>
          )}
        </section>

        <section aria-labelledby="learn-boards-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h2 id="learn-boards-heading" className="text-sm font-semibold text-[var(--color-ink)]">Boards</h2>
          </div>
          {recentUnits.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recentUnits.map(unit => <BoardCard key={unit.id} unit={unit} onOpen={() => onOpenBoard(unit.id)} />)}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-rule)] px-4 py-12 text-center">
              <GraduationCap size={28} className="text-[var(--color-ink-muted)]" />
              <p className="text-sm font-medium text-[var(--color-ink)]">No boards yet</p>
              <p className="max-w-sm text-xs text-[var(--color-ink-muted)]">Start one from the book or video you are working through today.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ReviewCard: React.FC<{
  unit: LearningUnit;
  card: CardBlock;
  remaining: number;
  onReview: (recalled: boolean) => void;
  onOpenBoard: () => void;
}> = ({ unit, card, remaining, onReview, onOpenBoard }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-5 shadow-xs">
      <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
        <button type="button" onClick={onOpenBoard} className="underline decoration-dotted hover:text-[var(--color-ink)]">{unit.title}</button>
        {card.locator && <span>· {card.locator}</span>}
        <span className="ml-auto">{remaining} in queue</span>
      </div>
      <p className="mt-3 text-base font-medium leading-relaxed text-[var(--color-ink)]">{card.front || 'This card has no prompt yet.'}</p>
      {card.latex && <div className="mt-3"><MathView math={card.latex} block draggable={false} showAiAction={false} /></div>}
      {revealed ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-4 text-sm leading-relaxed text-[var(--color-ink)]">{card.back || 'No answer recorded.'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setRevealed(false); onReview(false); }} className="rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-700 dark:border-rose-800 dark:text-rose-300">Missed it</button>
            <button type="button" onClick={() => { setRevealed(false); onReview(true); }} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">Recalled it</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]">
          <RotateCcw size={14} /> Show answer
        </button>
      )}
    </div>
  );
};

const BoardCard: React.FC<{ unit: LearningUnit; onOpen: () => void }> = ({ unit, onOpen }) => {
  const coverage = levelCoverage(unit);
  const SourceIcon = unit.source.kind === 'video' ? MonitorPlay : BookOpen;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="h-full w-full rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 text-left transition-colors hover:border-indigo-400"
      >
        <div className="flex items-center gap-1.5 text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
          <SourceIcon size={12} /> {SOURCE_KIND_LABEL[unit.source.kind]}
        </div>
        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-[var(--color-ink)]">{unit.title}</h3>
        <p className="mt-1 truncate text-xs text-[var(--color-ink-muted)]">{unit.source.title}</p>
        <div className="mt-3 flex items-center gap-1" aria-label="Bloom level coverage">
          {COGNITIVE_LEVEL_ORDER.map(level => {
            const meta = COGNITIVE_LEVELS[level];
            const count = coverage[level];
            return (
              <span
                key={level}
                title={`${meta.name}: ${count} block${count === 1 ? '' : 's'}`}
                className={`h-1.5 flex-1 rounded-full ${count ? meta.dotClass : 'bg-[var(--color-rule)]'}`}
              />
            );
          })}
        </div>
        <p className="mt-2 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">{unit.blocks.length} block{unit.blocks.length === 1 ? '' : 's'}</p>
      </button>
    </li>
  );
};
