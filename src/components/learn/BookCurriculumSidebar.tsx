import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Folder,
  FolderOpen,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  BookMarked,
  Filter,
  X,
  Layers
} from 'lucide-react';
import { LearningUnit, CognitiveLevelId, COGNITIVE_LEVELS } from '../../learnTypes';

interface BookCurriculumSidebarProps {
  learningUnits: LearningUnit[];
  activeUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
  onOpenCreateModal: (defaultBook?: string, defaultChapter?: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const BookCurriculumSidebar: React.FC<BookCurriculumSidebarProps> = ({
  learningUnits,
  activeUnitId,
  onSelectUnit,
  onOpenCreateModal,
  isCollapsed,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedBooks, setCollapsedBooks] = useState<Record<string, boolean>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Group units by Book -> Chapter -> Units
  const groupedData = useMemo(() => {
    const booksMap: Record<string, Record<string, LearningUnit[]>> = {};

    learningUnits.forEach(unit => {
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          unit.title.toLowerCase().includes(q) ||
          (unit.book && unit.book.toLowerCase().includes(q)) ||
          (unit.chapter && unit.chapter.toLowerCase().includes(q)) ||
          unit.tags.some(t => t.toLowerCase().includes(q));
        if (!matches) return;
      }

      // Filter by category
      if (selectedCategoryFilter !== 'all' && unit.category !== selectedCategoryFilter) {
        return;
      }

      const book = unit.book || 'General Literature & Reference';
      const chapter = unit.chapter || 'Independent Chapters';

      if (!booksMap[book]) {
        booksMap[book] = {};
      }
      if (!booksMap[book][chapter]) {
        booksMap[book][chapter] = [];
      }
      booksMap[book][chapter].push(unit);
    });

    return booksMap;
  }, [learningUnits, searchQuery, selectedCategoryFilter]);

  const toggleBook = (book: string) => {
    setCollapsedBooks(prev => ({ ...prev, [book]: !prev[book] }));
  };

  const getTopicProgressSummary = (unit: LearningUnit) => {
    const levels: CognitiveLevelId[] = [
      'remembering',
      'understanding',
      'applying',
      'analyzing',
      'evaluating',
      'creating'
    ];
    const completedCount = levels.filter(lvl => (unit.progress[lvl] || 0) >= 70).length;
    return { completedCount, total: 6 };
  };

  if (isCollapsed) {
    return (
      <aside
        id="book-curriculum-sidebar-collapsed"
        className="w-12 shrink-0 border-r border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col items-center py-3 gap-3 select-none"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors"
          title="Expand Curriculum Navigator"
        >
          <ChevronRight size={18} />
        </button>
        <div className="w-7 h-[1px] bg-[var(--color-rule)]" />
        <button
          type="button"
          onClick={() => onOpenCreateModal()}
          className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
          title="Add New Study Topic"
        >
          <Plus size={16} />
        </button>
        <div className="flex-1 flex flex-col items-center gap-2 mt-2">
          {learningUnits.slice(0, 5).map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelectUnit(u.id)}
              className={`w-7 h-7 rounded-lg text-[0.6875rem] font-mono font-bold flex items-center justify-center transition-all ${
                activeUnitId === u.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]'
              }`}
              title={`${u.book ? `${u.book}: ` : ''}${u.title}`}
            >
              {u.title.charAt(0)}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside
      id="book-curriculum-sidebar"
      className="w-80 sm:w-88 shrink-0 border-r border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col overflow-hidden select-none"
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-[var(--color-rule)] flex items-center justify-between gap-2 shrink-0 bg-[var(--color-paper)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
            <BookOpen size={15} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[var(--color-ink)] tracking-tight">
              Curriculum & Bookshelf
            </h2>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
              {learningUnits.length} topics across {Object.keys(groupedData).length} sources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenCreateModal()}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1 shadow-2xs transition-colors"
            title="Add New Topic or Book Chapter"
          >
            <Plus size={13} />
            <span className="text-[0.6875rem] font-mono">New</span>
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronRight size={14} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2.5 border-b border-[var(--color-rule)] bg-[var(--color-surface)]/50 flex flex-col gap-2 shrink-0">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-[var(--color-ink-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search topics, books, tags..."
            className="w-full pl-7 pr-7 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Book & Chapter Tree List */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3">
        {Object.keys(groupedData).length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--color-ink-muted)] flex flex-col items-center gap-2 my-auto">
            <BookMarked size={28} className="opacity-30" />
            <p>No study topics match your search.</p>
            <button
              type="button"
              onClick={() => onOpenCreateModal()}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium"
            >
              Create Topic
            </button>
          </div>
        ) : (
          Object.entries(groupedData).map(([bookTitle, chaptersMap]) => {
            const isBookCollapsed = !!collapsedBooks[bookTitle];
            const totalUnitsInBook = Object.values(chaptersMap).reduce((acc, curr) => acc + curr.length, 0);

            return (
              <div
                key={bookTitle}
                className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] overflow-hidden shadow-2xs"
              >
                {/* Book Header Bar */}
                <div
                  onClick={() => toggleBook(bookTitle)}
                  className="px-3 py-2 bg-[var(--color-surface)]/70 hover:bg-[var(--color-surface)] cursor-pointer flex items-center justify-between gap-2 border-b border-[var(--color-rule)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[var(--color-ink-muted)]">
                      {isBookCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </span>
                    <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-[var(--color-ink)] truncate" title={bookTitle}>
                      {bookTitle}
                    </span>
                  </div>
                  <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] shrink-0">
                    {totalUnitsInBook}
                  </span>
                </div>

                {/* Chapters & Units List */}
                {!isBookCollapsed && (
                  <div className="p-1.5 flex flex-col gap-2">
                    {Object.entries(chaptersMap).map(([chapterTitle, units]) => (
                      <div key={chapterTitle} className="flex flex-col gap-1">
                        {/* Chapter Subheading */}
                        <div className="px-2 pt-1 flex items-center justify-between text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                          <span className="truncate" title={chapterTitle}>
                            {chapterTitle}
                          </span>
                        </div>

                        {/* Units in Chapter */}
                        <div className="flex flex-col gap-1 pl-1">
                          {units.map(unit => {
                            const isSelected = activeUnitId === unit.id;
                            const { completedCount } = getTopicProgressSummary(unit);

                            return (
                              <button
                                key={unit.id}
                                type="button"
                                onClick={() => onSelectUnit(unit.id)}
                                className={`text-left p-2 rounded-lg border transition-all flex flex-col gap-1.5 ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 shadow-2xs ring-1 ring-emerald-400/30'
                                    : 'bg-[var(--color-paper)] hover:bg-[var(--color-surface)] border-[var(--color-rule)] hover:border-emerald-200 dark:hover:border-emerald-900'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <span
                                    className={`text-xs leading-snug font-medium line-clamp-2 ${
                                      isSelected
                                        ? 'text-emerald-900 dark:text-emerald-100 font-semibold'
                                        : 'text-[var(--color-ink)]'
                                    }`}
                                  >
                                    {unit.section ? `${unit.section}: ` : ''}
                                    {unit.title}
                                  </span>
                                </div>

                                {/* Cognitive 6-Level Progress Dots */}
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <div className="flex items-center gap-1" title={`${completedCount}/6 Cognitive Levels Solid`}>
                                    {(['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'] as CognitiveLevelId[]).map(
                                      (lvl, idx) => {
                                        const score = unit.progress[lvl] || 0;
                                        const meta = COGNITIVE_LEVELS[lvl];
                                        const isSolid = score >= 70;
                                        const isInProgress = score > 0 && score < 70;

                                        return (
                                          <div
                                            key={lvl}
                                            className={`w-3.5 h-1.5 rounded-xs transition-colors ${
                                              isSolid
                                                ? 'bg-emerald-500 dark:bg-emerald-400'
                                                : isInProgress
                                                ? 'bg-amber-400 dark:bg-amber-500'
                                                : 'bg-[var(--color-rule)]'
                                            }`}
                                            title={`Level ${idx + 1} (${meta.name}): ${score}%`}
                                          />
                                        );
                                      }
                                    )}
                                    <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)] ml-1">
                                      L{completedCount}/6
                                    </span>
                                  </div>

                                  {unit.difficulty && (
                                    <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)]">
                                      {unit.difficulty}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2.5 border-t border-[var(--color-rule)] bg-[var(--color-surface)]/60 text-[0.6875rem] font-mono text-[var(--color-ink-muted)] flex items-center justify-between">
        <span>6-Level Cognitive Rigor</span>
        <button
          type="button"
          onClick={() => onOpenCreateModal()}
          className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <Plus size={11} />
          <span>New Topic</span>
        </button>
      </div>
    </aside>
  );
};
