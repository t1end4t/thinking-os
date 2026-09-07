import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Library,
  Plus,
  Search,
  MonitorPlay,
  Trash2,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  CardBlock,
  COGNITIVE_LEVELS,
  COGNITIVE_LEVEL_ORDER,
  CognitiveLevelId,
  GraphBlock,
  ImageBlock,
  LearnBlock,
  LearnBlockKind,
  LearnSource,
  LearnSourceKind,
  LearningUnit,
  NoteBlock,
  TableBlock,
  TreeBlock
} from '../../learnTypes';
import { levelCoverage } from '../../utils/learnBlocks';
import { BLOCK_META, VisualBlock } from './VisualBlock';
import { SOURCE_KIND_LABEL, TodayView } from './TodayView';

const LEVEL_RECIPES: Record<CognitiveLevelId, { instruction: string; blockKinds: LearnBlockKind[] }> = {
  remembering: { instruction: 'Hide the source. Capture exact terms, facts, formulas, and labels you need to retrieve.', blockKinds: ['card', 'image', 'table'] },
  understanding: { instruction: 'Translate the idea into a picture of parts, causes, and consequences. Use your own words.', blockKinds: ['tree', 'image', 'note'] },
  applying: { instruction: 'Work one small example. Show inputs, transformations, and output.', blockKinds: ['table', 'graph', 'note'] },
  analyzing: { instruction: 'Separate the mechanism. Map dependencies, contrasts, assumptions, and failure paths.', blockKinds: ['graph', 'tree', 'table'] },
  evaluating: { instruction: 'Choose explicit criteria. Compare alternatives and record where the claim stops holding.', blockKinds: ['table', 'note', 'graph'] },
  creating: { instruction: 'Recombine what you learned into a design, hypothesis, experiment, explanation, or question.', blockKinds: ['graph', 'note', 'image'] }
};

export const LearnSurface: React.FC = () => {
  const {
    learningUnits,
    activeLearningUnitId,
    setActiveLearningUnitId,
    activeLearnTab,
    setActiveLearnTab,
    setActiveContext,
    addLearningUnit,
    updateLearningUnit,
    deleteLearningUnit,
    addLearnBlock,
    updateLearnBlock,
    deleteLearnBlock,
    moveLearnBlock,
    reviewLearnCard,
    promoteBlockToClaim,
    promoteBlockToQuestion,
    promoteBlockToTask
  } = useWorkspace();
  const [selectedLevel, setSelectedLevel] = useState<CognitiveLevelId>('remembering');
  const [locator, setLocator] = useState('');
  const [search, setSearch] = useState('');
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const activeUnit = useMemo(
    () => learningUnits.find(unit => unit.id === activeLearningUnitId) || learningUnits[0] || null,
    [activeLearningUnitId, learningUnits]
  );
  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return learningUnits;
    return learningUnits.filter(unit => `${unit.title} ${unit.source.title} ${unit.tags.join(' ')}`.toLowerCase().includes(query));
  }, [learningUnits, search]);

  useEffect(() => {
    if (!activeLearningUnitId && learningUnits[0]) setActiveLearningUnitId(learningUnits[0].id);
  }, [activeLearningUnitId, learningUnits, setActiveLearningUnitId]);

  const openBoard = (unitId: string) => {
    setActiveLearningUnitId(unitId);
    setActiveLearnTab('board');
    setActiveContext({ type: 'learn', id: `learn-board-${unitId}`, label: 'Learn / Board', secondaryLabel: 'Visual source study' });
  };

  const openToday = () => {
    setActiveLearnTab('today');
    setActiveContext({ type: 'learn', id: 'learn-today', label: 'Learn / Today', secondaryLabel: 'Review queue and learning boards' });
  };

  const createBlock = (kind: LearnBlockKind) => {
    if (!activeUnit) return;
    const block = makeBlock(kind, selectedLevel, locator.trim());
    addLearnBlock(activeUnit.id, block);
    setLocator('');
    requestAnimationFrame(() => document.getElementById(`learn-block-${block.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const reorderByDrop = (targetBlockId: string) => {
    if (!activeUnit || !draggedBlockId || draggedBlockId === targetBlockId) return;
    const blocks = [...activeUnit.blocks];
    const fromIndex = blocks.findIndex(block => block.id === draggedBlockId);
    const targetIndex = blocks.findIndex(block => block.id === targetBlockId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(targetIndex, 0, moved);
    updateLearningUnit(activeUnit.id, { blocks });
    setDraggedBlockId(null);
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface)]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"><GraduationCap size={16} /></div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-ink)]">Learn</h1>
            <p className="hidden text-[0.6875rem] text-[var(--color-ink-muted)] sm:block">Turn a source into pictures you can recall and use.</p>
          </div>
        </div>
        <nav aria-label="Learn views" className="ml-auto flex rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-1">
          <button type="button" onClick={openToday} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${activeLearnTab === 'today' ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)]' : 'text-[var(--color-ink-muted)]'}`}>Today</button>
          <button type="button" onClick={() => activeUnit && openBoard(activeUnit.id)} disabled={!activeUnit} className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${activeLearnTab === 'board' ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)]' : 'text-[var(--color-ink-muted)]'}`}>Board</button>
        </nav>
        <select
          value={activeUnit?.id || ''}
          onChange={event => openBoard(event.target.value)}
          aria-label="Select learning board"
          className="max-w-48 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2 py-1.5 text-xs lg:hidden"
        >
          {learningUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
        </select>
        <button type="button" onClick={() => setIsSourceModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><Plus size={14} /> New source</button>
      </header>

      {activeLearnTab === 'today' ? (
        <TodayView units={learningUnits} onOpenBoard={openBoard} onReviewCard={reviewLearnCard} />
      ) : activeUnit ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LibrarySidebar units={filteredUnits} activeUnitId={activeUnit.id} search={search} onSearch={setSearch} onOpen={openBoard} />
          <main className="min-w-0 flex-1 overflow-y-auto learn-board-grid">
            <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
              <BoardHeader
                unit={activeUnit}
                onUpdate={updates => updateLearningUnit(activeUnit.id, updates)}
                onDelete={() => {
                  if (!window.confirm(`Delete “${activeUnit.title}” and all its blocks?`)) return;
                  deleteLearningUnit(activeUnit.id);
                  setActiveLearnTab('today');
                }}
              />
              <BloomLens unit={activeUnit} selectedLevel={selectedLevel} onSelect={setSelectedLevel} />
              <CaptureToolbar level={selectedLevel} locator={locator} onLocatorChange={setLocator} onCreate={createBlock} />
              <div className="relative mt-5 space-y-4 pb-20">
                <div className="absolute bottom-0 left-[0.875rem] top-0 w-px bg-[var(--color-rule)]" aria-hidden="true" />
                {activeUnit.blocks.length ? activeUnit.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDraggedBlockId(block.id)}
                    onDragEnd={() => setDraggedBlockId(null)}
                    onDragOver={event => event.preventDefault()}
                    onDrop={() => reorderByDrop(block.id)}
                    className={`relative pl-7 ${draggedBlockId === block.id ? 'opacity-40' : ''}`}
                  >
                    <span className={`absolute left-[0.625rem] top-5 h-2 w-2 rounded-full ring-4 ring-[var(--color-surface)] ${COGNITIVE_LEVELS[block.level].dotClass}`} />
                    <VisualBlock
                      block={block}
                      index={index}
                      count={activeUnit.blocks.length}
                      onUpdate={updates => updateLearnBlock(activeUnit.id, block.id, updates)}
                      onDelete={() => deleteLearnBlock(activeUnit.id, block.id)}
                      onMove={direction => moveLearnBlock(activeUnit.id, block.id, direction)}
                      onReview={recalled => reviewLearnCard(activeUnit.id, block.id, recalled)}
                      onPromote={(kind, text) => {
                        if (kind === 'claim') promoteBlockToClaim(activeUnit.id, block.id, text);
                        if (kind === 'question') promoteBlockToQuestion(activeUnit.id, block.id, text.slice(0, 180), activeUnit.tags);
                        if (kind === 'task') promoteBlockToTask(activeUnit.id, block.id, `Explore: ${text.slice(0, 90)}`, text);
                      }}
                    />
                  </div>
                )) : (
                  <EmptyBoard level={selectedLevel} onCreate={createBlock} />
                )}
              </div>
            </div>
          </main>
          <LearningGuide unit={activeUnit} level={selectedLevel} onSelectLevel={setSelectedLevel} onCreate={createBlock} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"><Library size={30} className="text-[var(--color-ink-muted)]" /><p className="text-sm font-medium">Start with today’s source.</p><button type="button" onClick={() => setIsSourceModalOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">New source</button></div>
      )}

      {isSourceModalOpen && <NewSourceModal onClose={() => setIsSourceModalOpen(false)} onCreate={data => { const unit = addLearningUnit(data); setIsSourceModalOpen(false); openBoard(unit.id); }} />}
    </div>
  );
};

const LibrarySidebar: React.FC<{
  units: LearningUnit[];
  activeUnitId: string;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (id: string) => void;
}> = ({ units, activeUnitId, search, onSearch, onOpen }) => (
  <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-rule)] bg-[var(--color-paper)] lg:flex">
    <div className="border-b border-[var(--color-rule)] p-3">
      <label className="flex items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-2">
        <Search size={13} className="text-[var(--color-ink-muted)]" />
        <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Find a board" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
      </label>
    </div>
    <div className="flex-1 overflow-y-auto p-2">
      {units.map(unit => (
        <button key={unit.id} type="button" onClick={() => onOpen(unit.id)} className={`mb-1 w-full rounded-xl border px-3 py-2.5 text-left ${unit.id === activeUnitId ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40' : 'border-transparent hover:bg-[var(--color-surface)]'}`}>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]"><SourceIcon kind={unit.source.kind} /> {SOURCE_KIND_LABEL[unit.source.kind]}</div>
          <div className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-[var(--color-ink)]">{unit.title}</div>
          <div className="mt-1 text-[0.6875rem] text-[var(--color-ink-muted)]">{unit.blocks.length} blocks</div>
        </button>
      ))}
    </div>
  </aside>
);

const BoardHeader: React.FC<{ unit: LearningUnit; onUpdate: (updates: Partial<LearningUnit>) => void; onDelete: () => void }> = ({ unit, onUpdate, onDelete }) => (
  <section className="mb-5">
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)]"><SourceIcon kind={unit.source.kind} size={17} /></div>
      <div className="min-w-0 flex-1">
        <input value={unit.title} onChange={event => onUpdate({ title: event.target.value })} aria-label="Learning question" className="w-full border-0 bg-transparent font-serif text-2xl font-semibold leading-tight text-[var(--color-ink)] outline-none" />
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <input value={unit.source.title} onChange={event => onUpdate({ source: { ...unit.source, title: event.target.value } })} aria-label="Source title" className="min-w-48 flex-1 border-0 bg-transparent outline-none" />
          {unit.source.url && <a href={unit.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">Open source <ExternalLink size={11} /></a>}
        </div>
      </div>
      <button type="button" onClick={onDelete} aria-label="Delete board" className="p-2 text-[var(--color-ink-muted)] hover:text-rose-600"><Trash2 size={15} /></button>
    </div>
    <textarea value={unit.description} onChange={event => onUpdate({ description: event.target.value })} rows={2} aria-label="Learning goal" placeholder="What should you be able to explain or do after this source?" className="mt-3 w-full resize-none rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none" />
  </section>
);

const BloomLens: React.FC<{ unit: LearningUnit; selectedLevel: CognitiveLevelId; onSelect: (level: CognitiveLevelId) => void }> = ({ unit, selectedLevel, onSelect }) => {
  const coverage = levelCoverage(unit);
  return (
    <section aria-label="Bloom learning levels" className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] sm:grid-cols-6">
      {COGNITIVE_LEVEL_ORDER.map(level => {
        const meta = COGNITIVE_LEVELS[level];
        const active = level === selectedLevel;
        return (
          <button key={level} type="button" onClick={() => onSelect(level)} aria-pressed={active} className={`relative border-r border-[var(--color-rule)] px-2 py-3 text-center last:border-r-0 ${active ? 'bg-[var(--color-surface)]' : 'hover:bg-[var(--color-surface)]/60'}`}>
            <span className={`mx-auto mb-1 block h-2 w-2 rounded-full ${coverage[level] ? meta.dotClass : 'border border-[var(--color-rule)]'}`} />
            <span className={`block text-[0.6875rem] font-semibold ${active ? meta.color : 'text-[var(--color-ink-muted)]'}`}>{meta.name}</span>
            <span className="mt-0.5 block text-[0.625rem] font-mono text-[var(--color-ink-muted)]">{coverage[level]}</span>
          </button>
        );
      })}
    </section>
  );
};

const CaptureToolbar: React.FC<{ level: CognitiveLevelId; locator: string; onLocatorChange: (value: string) => void; onCreate: (kind: LearnBlockKind) => void }> = ({ level, locator, onLocatorChange, onCreate }) => {
  const meta = COGNITIVE_LEVELS[level];
  return (
    <section className="mt-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${meta.badgeClass}`}>L{meta.levelNumber} {meta.name}</div>
        <p className="min-w-48 flex-1 text-xs text-[var(--color-ink-muted)]">{meta.promptQuestion}</p>
        <input value={locator} onChange={event => onLocatorChange(event.target.value)} placeholder="Source: p. 184 / 14:32" aria-label="Location for new block" className="w-44 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-mono" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(Object.entries(BLOCK_META) as Array<[LearnBlockKind, (typeof BLOCK_META)[LearnBlockKind]]>).map(([kind, item]) => {
          const Icon = item.icon;
          const suggested = LEVEL_RECIPES[level].blockKinds.includes(kind);
          return <button key={kind} type="button" onClick={() => onCreate(kind)} title={item.hint} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors ${suggested ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]'}`}><Icon size={15} /><span className="text-[0.6875rem] font-medium">{item.label}</span></button>;
        })}
      </div>
    </section>
  );
};

const LearningGuide: React.FC<{ unit: LearningUnit; level: CognitiveLevelId; onSelectLevel: (level: CognitiveLevelId) => void; onCreate: (kind: LearnBlockKind) => void }> = ({ unit, level, onSelectLevel, onCreate }) => {
  const meta = COGNITIVE_LEVELS[level];
  const recipe = LEVEL_RECIPES[level];
  const coverage = levelCoverage(unit);
  const nextLevel = COGNITIVE_LEVEL_ORDER.find(candidate => coverage[candidate] === 0);
  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-[var(--color-rule)] bg-[var(--color-paper)] p-4 2xl:block">
      <p className="text-[0.625rem] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">Visual recipe</p>
      <h2 className={`mt-2 font-serif text-xl font-semibold ${meta.color}`}>{meta.name}</h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">{recipe.instruction}</p>
      <div className="mt-4 space-y-2">
        {recipe.blockKinds.map(kind => {
          const item = BLOCK_META[kind];
          const Icon = item.icon;
          return <button key={kind} type="button" onClick={() => onCreate(kind)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-3 text-left hover:border-indigo-400"><Icon size={16} /><span><span className="block text-xs font-semibold text-[var(--color-ink)]">{item.label}</span><span className="block text-[0.6875rem] text-[var(--color-ink-muted)]">{item.hint}</span></span></button>;
        })}
      </div>
      <div className="mt-6 border-t border-[var(--color-rule)] pt-4">
        <p className="text-[0.625rem] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">Coverage, not mastery</p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">A colored level means evidence exists. It does not claim you mastered it.</p>
        {nextLevel && <button type="button" onClick={() => onSelectLevel(nextLevel)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Next gap: {COGNITIVE_LEVELS[nextLevel].name}</button>}
      </div>
    </aside>
  );
};

const EmptyBoard: React.FC<{ level: CognitiveLevelId; onCreate: (kind: LearnBlockKind) => void }> = ({ level, onCreate }) => (
  <div className="relative ml-7 rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper)] px-6 py-12 text-center">
    <p className="font-serif text-lg font-semibold text-[var(--color-ink)]">Start with a visual, not a summary.</p>
    <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">{LEVEL_RECIPES[level].instruction}</p>
    <div className="mt-4 flex flex-wrap justify-center gap-2">{LEVEL_RECIPES[level].blockKinds.map(kind => <button key={kind} type="button" onClick={() => onCreate(kind)} className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium">Add {BLOCK_META[kind].label.toLowerCase()}</button>)}</div>
  </div>
);

const NewSourceModal: React.FC<{ onClose: () => void; onCreate: (data: { title: string; source: LearnSource; description?: string; tags?: string[] }) => void }> = ({ onClose, onCreate }) => {
  const [kind, setKind] = useState<LearnSourceKind>('book');
  const [sourceTitle, setSourceTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [url, setUrl] = useState('');
  const [goal, setGoal] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sourceTitle.trim() || !question.trim()) return;
    onCreate({
      title: question.trim(),
      source: { kind, title: sourceTitle.trim(), ...(url.trim() ? { url: url.trim() } : {}) },
      description: goal.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="new-source-title" className="w-full max-w-lg rounded-2xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-5 shadow-2xl">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><BookOpen size={17} /></div><div><h2 id="new-source-title" className="text-sm font-semibold">New learning board</h2><p className="text-xs text-[var(--color-ink-muted)]">One question from one source.</p></div><button type="button" onClick={onClose} aria-label="Close" className="ml-auto p-2 text-[var(--color-ink-muted)]"><X size={16} /></button></div>
        <div className="mt-5 grid grid-cols-5 gap-2">{(['book', 'video', 'paper', 'course', 'note'] as LearnSourceKind[]).map(option => <button key={option} type="button" onClick={() => setKind(option)} className={`rounded-xl border px-2 py-2 text-[0.6875rem] font-medium capitalize ${option === kind ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-[var(--color-rule)] text-[var(--color-ink-muted)]'}`}>{option}</button>)}</div>
        <label className="mt-4 block space-y-1.5"><span className="text-xs font-medium">Source title</span><input autoFocus required value={sourceTitle} onChange={event => setSourceTitle(event.target.value)} placeholder="Understanding Deep Learning" className="w-full rounded-xl border bg-[var(--color-paper)] px-3 py-2.5 text-sm" /></label>
        <label className="mt-3 block space-y-1.5"><span className="text-xs font-medium">What are you trying to understand?</span><input required value={question} onChange={event => setQuestion(event.target.value)} placeholder="Why are attention scores divided by √dₖ?" className="w-full rounded-xl border bg-[var(--color-paper)] px-3 py-2.5 text-sm" /></label>
        <label className="mt-3 block space-y-1.5"><span className="text-xs font-medium">Link or file URL <span className="font-normal text-[var(--color-ink-muted)]">optional</span></span><input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border bg-[var(--color-paper)] px-3 py-2.5 text-sm" /></label>
        <label className="mt-3 block space-y-1.5"><span className="text-xs font-medium">Success looks like <span className="font-normal text-[var(--color-ink-muted)]">optional</span></span><textarea value={goal} onChange={event => setGoal(event.target.value)} rows={2} placeholder="I can explain the variance argument and compute a toy example." className="w-full resize-none rounded-xl border bg-[var(--color-paper)] px-3 py-2.5 text-sm" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">Cancel</button><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Create board</button></div>
      </form>
    </div>
  );
};

const SourceIcon: React.FC<{ kind: LearnSourceKind; size?: number }> = ({ kind, size = 12 }) => {
  if (kind === 'video') return <MonitorPlay size={size} />;
  if (kind === 'paper') return <FileText size={size} />;
  return <BookOpen size={size} />;
};

function makeBlock(kind: LearnBlockKind, level: CognitiveLevelId, locator?: string): LearnBlock {
  const now = Date.now();
  const base = { id: crypto.randomUUID(), level, locator, createdAt: now, updatedAt: now };
  if (kind === 'card') return { ...base, kind, front: '', back: '', box: 0, dueAt: now } satisfies CardBlock;
  if (kind === 'note') return { ...base, kind, text: '' } satisfies NoteBlock;
  if (kind === 'image') return { ...base, kind, caption: '', dataUrl: '' } satisfies ImageBlock;
  if (kind === 'table') return { ...base, kind, title: '', columns: ['Concept', 'Meaning', 'Evidence'], rows: [['', '', ''], ['', '', '']] } satisfies TableBlock;
  if (kind === 'tree') return { ...base, kind, title: '', nodes: [{ id: crypto.randomUUID(), parentId: null, label: 'Main concept' }] } satisfies TreeBlock;
  return { ...base, kind, title: '', nodes: [{ id: crypto.randomUUID(), label: 'Idea A' }, { id: crypto.randomUUID(), label: 'Idea B' }], edges: [] } satisfies GraphBlock;
}
