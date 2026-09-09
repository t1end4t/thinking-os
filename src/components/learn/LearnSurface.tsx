import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Boxes,
  Brain,
  Check,
  CheckCircle2,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Hash,
  Library,
  Lightbulb,
  MonitorPlay,
  Network,
  Plus,
  Rows3,
  Search,
  Sigma,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  CardBlock,
  CodeBlock,
  COGNITIVE_LEVELS,
  COGNITIVE_LEVEL_ORDER,
  CognitiveLevelId,
  DerivationBlock,
  GraphBlock,
  ImageBlock,
  LearnBlock,
  LearnBlockKind,
  LearnSource,
  LearnSourceKind,
  LearningUnit,
  NotationSymbol,
  NoteBlock,
  SyllabusSection,
  TableBlock,
  TensorBlock,
  TreeBlock
} from '../../learnTypes';
import { BLOCK_META, VisualBlock } from './VisualBlock';
import { SOURCE_KIND_LABEL, TodayView } from './TodayView';
import { MathView } from '../common/MathView';

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

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isNotationDrawerOpen, setIsNotationDrawerOpen] = useState(false);
  const [testAllDerivations, setTestAllDerivations] = useState(false);
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
    return learningUnits.filter(
      unit =>
        `${unit.title} ${unit.source.title} ${unit.tags.join(' ')} ${unit.source.authorOrChannel || ''}`
          .toLowerCase()
          .includes(query)
    );
  }, [learningUnits, search]);

  // Keep activeLearningUnitId valid
  useEffect(() => {
    if (!activeLearningUnitId && learningUnits[0]) {
      setActiveLearningUnitId(learningUnits[0].id);
    }
  }, [activeLearningUnitId, learningUnits, setActiveLearningUnitId]);

  // Reset section filter when active unit changes
  useEffect(() => {
    setSelectedSectionId(null);
  }, [activeUnit?.id]);

  const openBoard = (unitId: string) => {
    setActiveLearningUnitId(unitId);
    setActiveLearnTab('board');
    setActiveContext({
      type: 'learn',
      id: `learn-board-${unitId}`,
      label: 'Learn / Study Console',
      secondaryLabel: 'Interactive DL & Math Workspace'
    });
  };

  const openToday = () => {
    setActiveLearnTab('today');
    setActiveContext({
      type: 'learn',
      id: 'learn-today',
      label: 'Learn / Review Queue',
      secondaryLabel: 'Daily Spaced Repetition'
    });
  };

  const createBlock = (kind: LearnBlockKind) => {
    if (!activeUnit) return;
    const block = makeBlock(kind, 'applying', locator.trim(), selectedSectionId || undefined);
    addLearnBlock(activeUnit.id, block);
    setLocator('');
    requestAnimationFrame(() =>
      document.getElementById(`learn-block-${block.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
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

  const addSyllabusSection = (title: string, locator?: string) => {
    if (!activeUnit) return;
    const newSection: SyllabusSection = {
      id: crypto.randomUUID(),
      title: title.trim(),
      locator: locator?.trim(),
      completed: false
    };
    const sections = [...(activeUnit.sections || []), newSection];
    updateLearningUnit(activeUnit.id, { sections });
    setSelectedSectionId(newSection.id);
  };

  const toggleSectionCompleted = (sectionId: string) => {
    if (!activeUnit || !activeUnit.sections) return;
    const sections = activeUnit.sections.map(s =>
      s.id === sectionId ? { ...s, completed: !s.completed } : s
    );
    updateLearningUnit(activeUnit.id, { sections });
  };

  const addNotationSymbol = (symbol: string, meaning: string, shape?: string) => {
    if (!activeUnit) return;
    const newSymbol: NotationSymbol = {
      id: crypto.randomUUID(),
      symbol: symbol.trim(),
      meaning: meaning.trim(),
      shape: shape?.trim()
    };
    const notation = [...(activeUnit.notation || []), newSymbol];
    updateLearningUnit(activeUnit.id, { notation });
  };

  const deleteNotationSymbol = (id: string) => {
    if (!activeUnit || !activeUnit.notation) return;
    const notation = activeUnit.notation.filter(item => item.id !== id);
    updateLearningUnit(activeUnit.id, { notation });
  };

  // Filter blocks by active syllabus section if selected
  const displayedBlocks = useMemo(() => {
    if (!activeUnit) return [];
    if (!selectedSectionId) return activeUnit.blocks;
    return activeUnit.blocks.filter(block => block.sectionId === selectedSectionId);
  }, [activeUnit, selectedSectionId]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-surface)]">
      {/* Top Application Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
            <GraduationCap size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[var(--color-ink)]">Learn</h1>
              <span className="rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--color-ink-muted)]">
                Math & LLM Console
              </span>
            </div>
            <p className="hidden text-[0.6875rem] text-[var(--color-ink-muted)] sm:block">
              Curricula, step derivations, tensor shapes, and spaced active recall.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav aria-label="Learn views" className="flex rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-1">
            <button
              type="button"
              onClick={openToday}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                activeLearnTab === 'today'
                  ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)] font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Today's Recall
            </button>
            <button
              type="button"
              onClick={() => activeUnit && openBoard(activeUnit.id)}
              disabled={!activeUnit}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                activeLearnTab === 'board'
                  ? 'bg-[var(--accent-indigo-soft)] text-[var(--accent-indigo)] font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Study Workspace
            </button>
          </nav>

          <button
            type="button"
            onClick={() => setIsSourceModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} /> New Source
          </button>
        </div>
      </header>

      {activeLearnTab === 'today' ? (
        <TodayView units={learningUnits} onOpenBoard={openBoard} onReviewCard={reviewLearnCard} />
      ) : activeUnit ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left Library & Curricula Navigator */}
          <LibrarySidebar
            units={filteredUnits}
            activeUnitId={activeUnit.id}
            search={search}
            onSearch={setSearch}
            onOpen={openBoard}
            onNewSource={() => setIsSourceModalOpen(true)}
          />

          {/* Center Workspace */}
          <main className="min-w-0 flex-1 overflow-y-auto learn-board-grid">
            <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
              {/* Board Header with Meta & Action Controls */}
              <BoardHeader
                unit={activeUnit}
                isNotationDrawerOpen={isNotationDrawerOpen}
                onToggleNotation={() => setIsNotationDrawerOpen(!isNotationDrawerOpen)}
                testAllDerivations={testAllDerivations}
                onToggleTestAll={() => setTestAllDerivations(!testAllDerivations)}
                onUpdate={updates => updateLearningUnit(activeUnit.id, updates)}
                onDelete={() => {
                  if (!window.confirm(`Delete "${activeUnit.title}" and all its study blocks?`)) return;
                  deleteLearningUnit(activeUnit.id);
                  setActiveLearnTab('today');
                }}
              />

              {/* Collapsible Notation Ledger Drawer */}
              {isNotationDrawerOpen && (
                <NotationLedger
                  unit={activeUnit}
                  onAddSymbol={addNotationSymbol}
                  onDeleteSymbol={deleteNotationSymbol}
                  onClose={() => setIsNotationDrawerOpen(false)}
                />
              )}

              {/* Syllabus / Lecture Navigator (for courses, books, playlists) */}
              <SyllabusBar
                unit={activeUnit}
                selectedSectionId={selectedSectionId}
                onSelectSection={setSelectedSectionId}
                onAddSection={addSyllabusSection}
                onToggleCompleted={toggleSectionCompleted}
              />

              {/* Deep Learning & Math Fast Capture Toolbar */}
              <CaptureToolbar
                unit={activeUnit}
                locator={locator}
                onLocatorChange={setLocator}
                onCreate={createBlock}
              />

              {/* Learning Blocks Stream */}
              <div className="relative mt-5 space-y-4 pb-24">
                <div className="absolute bottom-0 left-[0.875rem] top-0 w-px bg-[var(--color-rule)]" aria-hidden="true" />
                {displayedBlocks.length ? (
                  displayedBlocks.map((block, index) => {
                    const blockWithTestMode =
                      testAllDerivations && block.kind === 'derivation'
                        ? { ...block, testMode: true }
                        : block;

                    return (
                      <div
                        key={block.id}
                        id={`learn-block-${block.id}`}
                        draggable
                        onDragStart={() => setDraggedBlockId(block.id)}
                        onDragEnd={() => setDraggedBlockId(null)}
                        onDragOver={event => event.preventDefault()}
                        onDrop={() => reorderByDrop(block.id)}
                        className={`relative pl-7 transition-opacity ${
                          draggedBlockId === block.id ? 'opacity-40' : ''
                        }`}
                      >
                        <span className="absolute left-[0.625rem] top-5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-indigo-500 ring-2 ring-[var(--color-rule)]" />
                        <VisualBlock
                          block={blockWithTestMode}
                          index={index}
                          count={displayedBlocks.length}
                          onUpdate={updates => updateLearnBlock(activeUnit.id, block.id, updates)}
                          onDelete={() => deleteLearnBlock(activeUnit.id, block.id)}
                          onMove={direction => moveLearnBlock(activeUnit.id, block.id, direction)}
                          onReview={recalled => reviewLearnCard(activeUnit.id, block.id, recalled)}
                          onPromote={(kind, text) => {
                            if (kind === 'claim') promoteBlockToClaim(activeUnit.id, block.id, text);
                            if (kind === 'question')
                              promoteBlockToQuestion(activeUnit.id, block.id, text.slice(0, 180), activeUnit.tags);
                            if (kind === 'task')
                              promoteBlockToTask(activeUnit.id, block.id, `Explore: ${text.slice(0, 90)}`, text);
                          }}
                        />
                      </div>
                    );
                  })
                ) : (
                  <EmptyWorkspace
                    unit={activeUnit}
                    selectedSection={activeUnit.sections?.find(s => s.id === selectedSectionId)}
                    onCreate={createBlock}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <Library size={32} className="text-[var(--color-ink-muted)]" />
          <p className="text-sm font-medium">Select or create a study source.</p>
          <button
            type="button"
            onClick={() => setIsSourceModalOpen(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white"
          >
            New Source
          </button>
        </div>
      )}

      {isSourceModalOpen && (
        <NewSourceModal
          onClose={() => setIsSourceModalOpen(false)}
          onCreate={data => {
            const unit = addLearningUnit(data);
            setIsSourceModalOpen(false);
            openBoard(unit.id);
          }}
        />
      )}
    </div>
  );
};

const LibrarySidebar: React.FC<{
  units: LearningUnit[];
  activeUnitId: string;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (id: string) => void;
  onNewSource: () => void;
}> = ({ units, activeUnitId, search, onSearch, onOpen, onNewSource }) => {
  const coursesAndBooks = useMemo(
    () => units.filter(u => ['course', 'book', 'video'].includes(u.source.kind)),
    [units]
  );
  const articlesAndNotes = useMemo(
    () => units.filter(u => ['article', 'paper', 'note'].includes(u.source.kind)),
    [units]
  );

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-rule)] bg-[var(--color-paper)] lg:flex">
      <div className="border-b border-[var(--color-rule)] p-3">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-1.5">
          <Search size={13} className="text-[var(--color-ink-muted)]" />
          <input
            value={search}
            onChange={event => onSearch(event.target.value)}
            placeholder="Search playlists, books, papers..."
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Curricula / Playlists Section */}
        {coursesAndBooks.length > 0 && (
          <div>
            <div className="px-2 pb-1 text-[0.625rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
              Courses & Playlists ({coursesAndBooks.length})
            </div>
            <div className="space-y-1">
              {coursesAndBooks.map(unit => (
                <SourceListItem
                  key={unit.id}
                  unit={unit}
                  isActive={unit.id === activeUnitId}
                  onOpen={() => onOpen(unit.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Concept Dives / Articles Section */}
        {articlesAndNotes.length > 0 && (
          <div>
            <div className="px-2 pb-1 text-[0.625rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
              Articles & Papers ({articlesAndNotes.length})
            </div>
            <div className="space-y-1">
              {articlesAndNotes.map(unit => (
                <SourceListItem
                  key={unit.id}
                  unit={unit}
                  isActive={unit.id === activeUnitId}
                  onOpen={() => onOpen(unit.id)}
                />
              ))}
            </div>
          </div>
        )}

        {units.length === 0 && (
          <div className="p-4 text-center text-xs text-[var(--color-ink-muted)]">
            No matching sources found.
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-rule)] p-2">
        <button
          type="button"
          onClick={onNewSource}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-rule)] py-2 text-xs font-medium text-[var(--color-ink-muted)] hover:border-indigo-400 hover:text-[var(--color-ink)]"
        >
          <Plus size={13} /> Add Source
        </button>
      </div>
    </aside>
  );
};

const SourceListItem: React.FC<{
  unit: LearningUnit;
  isActive: boolean;
  onOpen: () => void;
}> = ({ unit, isActive, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className={`w-full rounded-xl border p-2.5 text-left transition-all ${
      isActive
        ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40 shadow-xs'
        : 'border-transparent hover:bg-[var(--color-surface)]'
    }`}
  >
    <div className="flex items-center gap-1.5 text-[0.625rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
      <SourceIcon kind={unit.source.kind} size={11} />
      <span>{SOURCE_KIND_LABEL[unit.source.kind] || unit.source.kind}</span>
    </div>
    <div className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-[var(--color-ink)]">
      {unit.title}
    </div>
    <div className="mt-1 flex items-center justify-between text-[0.6875rem] text-[var(--color-ink-muted)]">
      <span className="truncate max-w-[9rem]">{unit.source.title}</span>
      <span className="font-mono">{unit.blocks.length} blocks</span>
    </div>
  </button>
);

const BoardHeader: React.FC<{
  unit: LearningUnit;
  isNotationDrawerOpen: boolean;
  onToggleNotation: () => void;
  testAllDerivations: boolean;
  onToggleTestAll: () => void;
  onUpdate: (updates: Partial<LearningUnit>) => void;
  onDelete: () => void;
}> = ({
  unit,
  isNotationDrawerOpen,
  onToggleNotation,
  testAllDerivations,
  onToggleTestAll,
  onUpdate,
  onDelete
}) => {
  const notationCount = unit.notation?.length || 0;

  return (
    <section className="mb-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)]">
            <SourceIcon kind={unit.source.kind} size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[0.6875rem] font-mono uppercase font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {SOURCE_KIND_LABEL[unit.source.kind] || unit.source.kind}
              </span>
              {unit.source.url && (
                <a
                  href={unit.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Source Link <ExternalLink size={11} />
                </a>
              )}
            </div>
            <input
              value={unit.title}
              onChange={event => onUpdate({ title: event.target.value })}
              aria-label="Learning focus title"
              placeholder="What are you mastering in this source?"
              className="mt-1 w-full border-0 bg-transparent font-serif text-2xl font-semibold leading-tight text-[var(--color-ink)] outline-none"
            />
            <input
              value={unit.source.title}
              onChange={event => onUpdate({ source: { ...unit.source, title: event.target.value } })}
              aria-label="Source title"
              placeholder="Source name (e.g. Karpathy Zero to Hero, LLaMA 3 paper)"
              className="mt-0.5 w-full border-0 bg-transparent text-xs text-[var(--color-ink-muted)] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notation Ledger Toggle Button */}
          <button
            type="button"
            onClick={onToggleNotation}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
              isNotationDrawerOpen
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Sigma size={13} />
            <span>Notation</span>
            <span className="rounded bg-black/5 px-1 dark:bg-white/10">{notationCount}</span>
          </button>

          {/* Test All Derivations Toggle */}
          <button
            type="button"
            onClick={onToggleTestAll}
            title="Conceal derivation steps across the entire board to practice derivations on scratch paper"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
              testAllDerivations
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {testAllDerivations ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{testAllDerivations ? 'Recall Test: ON' : 'Test Myself'}</span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete board"
            className="p-2 text-[var(--color-ink-muted)] hover:text-rose-600"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <textarea
        value={unit.description}
        onChange={event => onUpdate({ description: event.target.value })}
        rows={2}
        aria-label="Learning goal"
        placeholder="Motivation & Takeaway: What exact problem does this concept solve? What should you be able to derive or code?"
        className="w-full resize-none rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-xs leading-relaxed text-[var(--color-ink)] outline-none"
      />
    </section>
  );
};

const NotationLedger: React.FC<{
  unit: LearningUnit;
  onAddSymbol: (symbol: string, meaning: string, shape?: string) => void;
  onDeleteSymbol: (id: string) => void;
  onClose: () => void;
}> = ({ unit, onAddSymbol, onDeleteSymbol, onClose }) => {
  const [symbol, setSymbol] = useState('');
  const [meaning, setMeaning] = useState('');
  const [shape, setShape] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !meaning.trim()) return;
    onAddSymbol(symbol, meaning, shape);
    setSymbol('');
    setMeaning('');
    setShape('');
  };

  const notation = unit.notation || [];

  return (
    <div className="mb-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <div className="flex items-center justify-between border-b border-indigo-200/50 pb-2.5 dark:border-indigo-900/50">
        <div className="flex items-center gap-2">
          <Sigma size={15} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-[var(--color-ink)]">
            Notation & Symbol Ledger
          </h3>
          <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
            (Ground every symbol in this source to avoid notation confusion)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Existing Symbols Grid */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {notation.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-2.5 shadow-xs"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-sm text-indigo-700 dark:text-indigo-300">
                  <MathView math={item.symbol} block={false} draggable={false} showAiAction={false} />
                </span>
                {item.shape && (
                  <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--color-ink-muted)]">
                    {item.shape}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-ink)] truncate">{item.meaning}</p>
            </div>
            <button
              type="button"
              onClick={() => onDeleteSymbol(item.id)}
              className="ml-2 p-1 text-[var(--color-ink-muted)] hover:text-rose-600"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {notation.length === 0 && (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)] italic">
          No notation symbols defined yet. Add symbols like $B$ (batch size), $T$ (sequence length), or $d_k$ below.
        </p>
      )}

      {/* Add Symbol Inline Form */}
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-900/50">
        <input
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          placeholder="Symbol (e.g. d_k or B)"
          className="w-28 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-xs font-mono"
        />
        <input
          value={meaning}
          onChange={e => setMeaning(e.target.value)}
          placeholder="Meaning (e.g. Head dimension = D / H)"
          className="min-w-48 flex-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-xs"
        />
        <input
          value={shape}
          onChange={e => setShape(e.target.value)}
          placeholder="Shape e.g. R^{B \times T \times D}"
          className="w-36 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-xs font-mono"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Add Symbol
        </button>
      </form>
    </div>
  );
};

const SyllabusBar: React.FC<{
  unit: LearningUnit;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onAddSection: (title: string, locator?: string) => void;
  onToggleCompleted: (id: string) => void;
}> = ({ unit, selectedSectionId, onSelectSection, onAddSection, onToggleCompleted }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocator, setNewLocator] = useState('');

  const sections = unit.sections || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddSection(newTitle, newLocator);
    setNewTitle('');
    setNewLocator('');
    setIsAdding(false);
  };

  return (
    <div className="mb-4 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-2.5 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-rule)]/50 pb-2">
        <div className="flex items-center gap-2">
          <Hash size={13} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-[0.6875rem] font-mono uppercase tracking-wider font-semibold text-[var(--color-ink)]">
            Syllabus & Lecture Chapters
          </span>
          <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)]">
            ({sections.length} sections)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <Plus size={11} /> Add Chapter / Lecture
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface)] p-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="e.g. Lecture 7: Self-Attention & Multi-Head Attention"
            className="min-w-64 flex-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-xs"
          />
          <input
            value={newLocator}
            onChange={e => setNewLocator(e.target.value)}
            placeholder="Timestamp e.g. 38:15 or p. 120"
            className="w-32 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] px-2.5 py-1.5 text-xs font-mono"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="rounded-lg border border-[var(--color-rule)] px-2.5 py-1.5 text-xs"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Pill stream */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectSection(null)}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            selectedSectionId === null
              ? 'bg-indigo-600 text-white font-semibold'
              : 'border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          All Stream ({unit.blocks.length})
        </button>

        {sections.map(sec => {
          const isSelected = selectedSectionId === sec.id;
          const blockCount = unit.blocks.filter(b => b.sectionId === sec.id).length;

          return (
            <div
              key={sec.id}
              className={`inline-flex items-center rounded-lg border text-xs transition-colors ${
                isSelected
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 font-semibold'
                  : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleCompleted(sec.id)}
                title={sec.completed ? 'Mark incomplete' : 'Mark completed'}
                className="p-1 pl-1.5 text-[var(--color-ink-muted)] hover:text-emerald-600"
              >
                {sec.completed ? <CheckCircle2 size={12} className="text-emerald-500" /> : <div className="h-2.5 w-2.5 rounded-full border border-[var(--color-rule)]" />}
              </button>
              <button
                type="button"
                onClick={() => onSelectSection(sec.id)}
                className="py-1 pr-1.5"
              >
                <span>{sec.title}</span>
                {sec.locator && <span className="ml-1 font-mono text-[0.625rem] opacity-60">[{sec.locator}]</span>}
                <span className="ml-1.5 font-mono text-[0.625rem] opacity-60">({blockCount})</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CaptureToolbar: React.FC<{
  unit: LearningUnit;
  locator: string;
  onLocatorChange: (value: string) => void;
  onCreate: (kind: LearnBlockKind) => void;
}> = ({ unit, locator, onLocatorChange, onCreate }) => {
  return (
    <section className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-rule)]/50 pb-2">
        <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
          Add Learning Block
        </span>
        <input
          value={locator}
          onChange={event => onLocatorChange(event.target.value)}
          placeholder="Citation locator: p. 184 / 14:32 / §3.2"
          aria-label="Location for new block"
          className="w-52 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-mono"
        />
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-9">
        {(Object.entries(BLOCK_META) as Array<[LearnBlockKind, (typeof BLOCK_META)[LearnBlockKind]]>).map(
          ([kind, item]) => {
            const Icon = item.icon;
            const isHighlighted = ['derivation', 'tensor', 'code', 'card'].includes(kind);

            return (
              <button
                key={kind}
                type="button"
                onClick={() => onCreate(kind)}
                title={item.hint}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
                  isHighlighted
                    ? 'border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:border-indigo-400 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]'
                }`}
              >
                <Icon size={16} />
                <span className="text-[0.625rem] font-medium leading-tight">{item.label}</span>
              </button>
            );
          }
        )}
      </div>
    </section>
  );
};

const EmptyWorkspace: React.FC<{
  unit: LearningUnit;
  selectedSection?: SyllabusSection;
  onCreate: (kind: LearnBlockKind) => void;
}> = ({ unit, selectedSection, onCreate }) => (
  <div className="relative ml-7 rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper)] px-6 py-12 text-center">
    <p className="font-serif text-lg font-semibold text-[var(--color-ink)]">
      {selectedSection ? `Ready to study: ${selectedSection.title}` : 'Empty Study Stream'}
    </p>
    <p className="mx-auto mt-1.5 max-w-md text-xs text-[var(--color-ink-muted)] leading-relaxed">
      Break this topic down with precision. Capture derivations with blank-paper testing, map tensor
      shape transformations, write vectorized PyTorch code, or add recall flashcards.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={() => onCreate('derivation')}
        className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
      >
        + Add Math Derivation
      </button>
      <button
        type="button"
        onClick={() => onCreate('tensor')}
        className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium"
      >
        + Add Tensor Flow
      </button>
      <button
        type="button"
        onClick={() => onCreate('code')}
        className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium"
      >
        + Add PyTorch Code
      </button>
      <button
        type="button"
        onClick={() => onCreate('card')}
        className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium"
      >
        + Add Recall Card
      </button>
    </div>
  </div>
);

const SourceIcon: React.FC<{ kind: LearnSourceKind; size?: number }> = ({ kind, size = 12 }) => {
  if (kind === 'video') return <MonitorPlay size={size} />;
  if (kind === 'paper') return <FileText size={size} />;
  if (kind === 'article') return <Sparkles size={size} />;
  if (kind === 'course') return <GraduationCap size={size} />;
  if (kind === 'note') return <Lightbulb size={size} />;
  return <BookOpen size={size} />;
};

const NewSourceModal: React.FC<{
  onClose: () => void;
  onCreate: (data: {
    title: string;
    source: LearnSource;
    description?: string;
    tags?: string[];
    sections?: SyllabusSection[];
    notation?: NotationSymbol[];
  }) => void;
}> = ({ onClose, onCreate }) => {
  const [kind, setKind] = useState<LearnSourceKind>('course');
  const [sourceTitle, setSourceTitle] = useState('');
  const [focusTitle, setFocusTitle] = useState('');
  const [url, setUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [initialLectures, setInitialLectures] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sourceTitle.trim() || !focusTitle.trim()) return;

    const sections: SyllabusSection[] = initialLectures
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => ({
        id: crypto.randomUUID(),
        title: line,
        completed: false
      }));

    onCreate({
      title: focusTitle.trim(),
      source: { kind, title: sourceTitle.trim(), ...(url.trim() ? { url: url.trim() } : {}) },
      description: goal.trim(),
      sections: sections.length ? sections : undefined
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-source-title"
        className="w-full max-w-lg rounded-2xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
            <BookOpen size={17} />
          </div>
          <div>
            <h2 id="new-source-title" className="text-sm font-semibold">
              New Study Source
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Course playlist, textbook, blog post, or paper.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto p-2 text-[var(--color-ink-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Source Kind Picker */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(['course', 'book', 'article', 'paper', 'video', 'note'] as LearnSourceKind[]).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              className={`rounded-xl border px-2 py-2 text-[0.6875rem] font-medium capitalize transition-colors ${
                option === kind
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="text-xs font-medium">Source name or playlist title</span>
          <input
            autoFocus
            required
            value={sourceTitle}
            onChange={event => setSourceTitle(event.target.value)}
            placeholder="e.g. Andrej Karpathy - Neural Networks: Zero to Hero"
            className="w-full rounded-xl border bg-[var(--color-paper)] px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block space-y-1.5">
          <span className="text-xs font-medium">Study Focus / Question</span>
          <input
            required
            value={focusTitle}
            onChange={event => setFocusTitle(event.target.value)}
            placeholder="e.g. Transformer Attention & Tensor Mechanics"
            className="w-full rounded-xl border bg-[var(--color-paper)] px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block space-y-1.5">
          <span className="text-xs font-medium">
            Link or video URL <span className="font-normal text-[var(--color-ink-muted)]">optional</span>
          </span>
          <input
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://youtube.com/playlist?list=..."
            className="w-full rounded-xl border bg-[var(--color-paper)] px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block space-y-1.5">
          <span className="text-xs font-medium">
            Chapters / Lectures (one per line){' '}
            <span className="font-normal text-[var(--color-ink-muted)]">optional</span>
          </span>
          <textarea
            value={initialLectures}
            onChange={event => setInitialLectures(event.target.value)}
            rows={3}
            placeholder="Lecture 1: The spelled-out intro to backprop&#10;Lecture 2: The spelled-out intro to language modeling&#10;Lecture 7: Let's build GPT: from scratch, in code"
            className="w-full resize-none rounded-xl border bg-[var(--color-paper)] px-3 py-2 text-xs font-mono"
          />
        </label>

        <label className="mt-3 block space-y-1.5">
          <span className="text-xs font-medium">
            What will you be able to derive or build?{' '}
            <span className="font-normal text-[var(--color-ink-muted)]">optional</span>
          </span>
          <textarea
            value={goal}
            onChange={event => setGoal(event.target.value)}
            rows={2}
            placeholder="Derive attention variance scaling factor, track [B, T, D] tensor flow, and code PyTorch MHA."
            className="w-full resize-none rounded-xl border bg-[var(--color-paper)] px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            Create Study Board
          </button>
        </div>
      </form>
    </div>
  );
};

function makeBlock(
  kind: LearnBlockKind,
  level: CognitiveLevelId = 'applying',
  locator?: string,
  sectionId?: string
): LearnBlock {
  const now = Date.now();
  const base = {
    id: crypto.randomUUID(),
    level,
    locator: locator || undefined,
    sectionId,
    createdAt: now,
    updatedAt: now
  };

  if (kind === 'derivation') {
    return {
      ...base,
      kind,
      title: '',
      objective: '',
      initialEquation: '',
      steps: [
        {
          id: crypto.randomUUID(),
          latex: '',
          explanation: '',
          rule: ''
        }
      ],
      conclusion: '',
      testMode: false
    } satisfies DerivationBlock;
  }

  if (kind === 'tensor') {
    return {
      ...base,
      kind,
      title: '',
      architectureName: '',
      symbolsLegend: '',
      rows: [
        {
          id: crypto.randomUUID(),
          operation: '',
          inputShape: '',
          outputShape: '',
          parameters: '',
          notes: ''
        }
      ]
    } satisfies TensorBlock;
  }

  if (kind === 'code') {
    return {
      ...base,
      kind,
      title: '',
      language: 'pytorch',
      code: '',
      notes: ''
    } satisfies CodeBlock;
  }

  if (kind === 'card') {
    return {
      ...base,
      kind,
      front: '',
      back: '',
      box: 0,
      dueAt: now
    } satisfies CardBlock;
  }

  if (kind === 'note') {
    return {
      ...base,
      kind,
      text: ''
    } satisfies NoteBlock;
  }

  if (kind === 'image') {
    return {
      ...base,
      kind,
      caption: '',
      dataUrl: ''
    } satisfies ImageBlock;
  }

  if (kind === 'table') {
    return {
      ...base,
      kind,
      title: '',
      columns: ['Concept / Layer', 'Input / Formulation', 'Key Invariant / Shape'],
      rows: [
        ['', '', ''],
        ['', '', '']
      ]
    } satisfies TableBlock;
  }

  if (kind === 'tree') {
    return {
      ...base,
      kind,
      title: '',
      nodes: [{ id: crypto.randomUUID(), parentId: null, label: 'Main Concept' }]
    } satisfies TreeBlock;
  }

  return {
    ...base,
    kind: 'graph',
    title: '',
    nodes: [
      { id: crypto.randomUUID(), label: 'Mechanism A' },
      { id: crypto.randomUUID(), label: 'Mechanism B' }
    ],
    edges: []
  } satisfies GraphBlock;
}
