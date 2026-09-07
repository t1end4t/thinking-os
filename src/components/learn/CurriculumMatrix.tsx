import React, { useState, useMemo } from 'react';
import {
  Compass,
  BookOpen,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  BookmarkCheck,
  Calculator,
  Layers,
  ChevronRight,
  Play,
  RotateCcw,
  Sliders,
  Award,
  HelpCircle,
  FileText
} from 'lucide-react';
import { LearningUnit, CognitiveLevelId } from '../../learnTypes';

interface CurriculumMatrixProps {
  learningUnits: LearningUnit[];
  onSelectUnit: (unitId: string) => void;
  onOpenCreateModal: () => void;
}

export const CurriculumMatrix: React.FC<CurriculumMatrixProps> = ({
  learningUnits,
  onSelectUnit,
  onOpenCreateModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'All' | 'in_progress' | 'mastered' | 'ready'>('All');

  const categories = useMemo(() => {
    const set = new Set(learningUnits.map(u => u.category));
    return ['All', ...Array.from(set)];
  }, [learningUnits]);

  const difficulties = ['All', 'Foundational', 'Intermediate', 'Advanced', 'Research Frontier'];

  // Identify in-progress or recently active unit
  const activeUnit = useMemo(() => {
    return (
      learningUnits.find(u => {
        const sum = Object.values(u.progress).reduce((a, b) => a + b, 0);
        return sum > 0 && sum < 500;
      }) || learningUnits[0]
    );
  }, [learningUnits]);

  // Aggregate stats that matter to a human learner
  const stats = useMemo(() => {
    let totalCards = 0;
    let totalDerivations = 0;
    let totalConjectures = 0;
    let masteredCount = 0;
    let inProgressCount = 0;

    learningUnits.forEach(u => {
      totalCards += (u.remembering?.keyTerms?.length || 0) + (u.remembering?.axiomsAndIdentities?.length || 0);
      totalDerivations += u.applying?.workedDerivations?.length || 0;
      if (u.creating?.promotedClaimId || (u.creating?.conjectureDraft && u.creating.conjectureDraft.length > 20)) {
        totalConjectures += 1;
      }
      const avg = Math.round(Object.values(u.progress).reduce((a, b) => a + b, 0) / 6);
      if (avg >= 80) masteredCount += 1;
      else if (avg > 0) inProgressCount += 1;
    });

    return { totalCards, totalDerivations, totalConjectures, masteredCount, inProgressCount };
  }, [learningUnits]);

  // Filter units
  const filteredUnits = useMemo(() => {
    return learningUnits.filter(u => {
      const matchesSearch =
        u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.mathFields.some(m => m.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.prerequisites.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'All' || u.category === selectedCategory;
      const matchesDiff = selectedDifficulty === 'All' || u.difficulty === selectedDifficulty;

      const avg = Math.round(Object.values(u.progress).reduce((a, b) => a + b, 0) / 6);
      let matchesStatus = true;
      if (selectedStatusFilter === 'in_progress') matchesStatus = avg > 0 && avg < 80;
      else if (selectedStatusFilter === 'mastered') matchesStatus = avg >= 80;
      else if (selectedStatusFilter === 'ready') matchesStatus = avg === 0;

      return matchesSearch && matchesCat && matchesDiff && matchesStatus;
    });
  }, [learningUnits, searchQuery, selectedCategory, selectedDifficulty, selectedStatusFilter]);

  // Group units by Category for curriculum tracks
  const groupedTracks = useMemo(() => {
    const map = new Map<string, LearningUnit[]>();
    filteredUnits.forEach(u => {
      const list = map.get(u.category) || [];
      list.push(u);
      map.set(u.category, list);
    });
    return Array.from(map.entries());
  }, [filteredUnits]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-5 md:p-8 max-w-7xl mx-auto w-full bg-[var(--color-surface)]">
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-rule)] pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
              Personal Research Curriculum
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--color-ink)] tracking-tight">
            Learning Roadmap & Study Hub
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1 max-w-2xl leading-relaxed">
            A human-centric learning environment structured around mental intuition, step-by-step mathematical proofs, interactive parameter simulations, and synthesizing insights into research claims.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus size={14} />
            <span>New Learning Topic</span>
          </button>
        </div>
      </div>

      {/* Human Progress Summary & Quick Resume Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Continue Learning Card */}
        {activeUnit && (
          <div className="lg:col-span-2 p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/40 via-[var(--color-paper)] to-[var(--color-paper)] dark:from-emerald-950/30 dark:via-[var(--color-paper)] dark:to-[var(--color-paper)] shadow-xs flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Play size={11} className="fill-current" />
                  <span>Continue Where You Left Off</span>
                </span>
                <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                  {activeUnit.difficulty}
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold text-[var(--color-ink)] mb-1.5 leading-snug">
                {activeUnit.title}
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)] line-clamp-2 leading-relaxed mb-3">
                {activeUnit.description}
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                {activeUnit.applying?.sandboxConfig && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
                    <Sliders size={11} />
                    <span>Interactive Sandbox</span>
                  </span>
                )}
                {activeUnit.applying?.workedDerivations?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Calculator size={11} />
                    <span>{activeUnit.applying.workedDerivations.length} Derivations</span>
                  </span>
                )}
                {activeUnit.remembering?.keyTerms?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <BookmarkCheck size={11} />
                    <span>{activeUnit.remembering.keyTerms.length} Recall Cards</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-rule)]/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--color-ink-muted)]">Category:</span>
                <span className="text-xs font-medium text-[var(--color-ink)] font-mono">{activeUnit.category}</span>
              </div>

              <button
                type="button"
                onClick={() => onSelectUnit(activeUnit.id)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <span>Enter Study Desk</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Human Metrics Overview */}
        <div className="p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] shadow-xs flex flex-col justify-between gap-4">
          <div>
            <span className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)] block mb-3">
              Your Knowledge Bank
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] flex flex-col">
                <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.inProgressCount}
                </span>
                <span className="text-[0.6875rem] text-[var(--color-ink-muted)] font-medium">
                  Active Topics
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] flex flex-col">
                <span className="text-lg font-mono font-bold text-sky-600 dark:text-sky-400">
                  {stats.totalCards}
                </span>
                <span className="text-[0.6875rem] text-[var(--color-ink-muted)] font-medium">
                  Active Recall Cards
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] flex flex-col">
                <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                  {stats.totalDerivations}
                </span>
                <span className="text-[0.6875rem] text-[var(--color-ink-muted)] font-medium">
                  Worked Proofs
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] flex flex-col">
                <span className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.totalConjectures}
                </span>
                <span className="text-[0.6875rem] text-[var(--color-ink-muted)] font-medium">
                  Research Claims
                </span>
              </div>
            </div>
          </div>

          <p className="text-[0.6875rem] text-[var(--color-ink-muted)] leading-relaxed border-t border-[var(--color-rule)]/60 pt-2">
            💡 Tip: Formulate novel conjectures in any topic to bridge ideas directly into research Claims and Tasks.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--color-ink-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search topics, prerequisites, formulas, tags..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Selector */}
          <div className="flex items-center gap-1 bg-[var(--color-paper)] p-1 rounded-xl border border-[var(--color-rule)] text-xs shadow-2xs">
            <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] px-2">Domain:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-[var(--color-ink)] focus:outline-none pr-2 font-medium cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c} className="bg-[var(--color-paper)] text-[var(--color-ink)]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Selector */}
          <div className="flex items-center gap-1 bg-[var(--color-paper)] p-1 rounded-xl border border-[var(--color-rule)] text-xs shadow-2xs">
            <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] px-2">Level:</span>
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="bg-transparent text-xs text-[var(--color-ink)] focus:outline-none pr-2 font-medium cursor-pointer"
            >
              {difficulties.map(d => (
                <option key={d} value={d} className="bg-[var(--color-paper)] text-[var(--color-ink)]">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-[var(--color-paper)] p-1 rounded-xl border border-[var(--color-rule)] text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('All')}
              className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono transition-colors ${
                selectedStatusFilter === 'All'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('in_progress')}
              className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono transition-colors ${
                selectedStatusFilter === 'in_progress'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('mastered')}
              className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono transition-colors ${
                selectedStatusFilter === 'mastered'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Mastered
            </button>
          </div>
        </div>
      </div>

      {/* Curriculum Tracks / Learning Pathways */}
      {filteredUnits.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] flex flex-col items-center justify-center">
          <BookOpen size={36} className="mb-3 opacity-30" />
          <h4 className="text-sm font-semibold text-[var(--color-ink)] mb-1">No learning units found</h4>
          <p className="text-xs max-w-sm">No topics match your current search or filters. Try clearing filters or create a new topic.</p>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Create New Learning Topic</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groupedTracks.map(([categoryName, units]) => (
            <div key={categoryName} className="flex flex-col gap-3">
              {/* Category Track Title */}
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--color-ink)]">
                    {categoryName}
                  </h3>
                  <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] px-2 py-0.2 rounded-full bg-[var(--color-paper)] border border-[var(--color-rule)]">
                    {units.length} {units.length === 1 ? 'topic' : 'topics'}
                  </span>
                </div>
              </div>

              {/* Cards Grid for this Track */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {units.map(unit => {
                  const avg = Math.round(
                    Object.values(unit.progress).reduce((a, b) => a + b, 0) / 6
                  );
                  const isMastered = avg >= 80;
                  const isInProgress = avg > 0 && avg < 80;

                  return (
                    <div
                      key={unit.id}
                      onClick={() => onSelectUnit(unit.id)}
                      className="p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-emerald-500/60 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 group relative"
                    >
                      {/* Top status & badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                            {unit.difficulty}
                          </span>

                          {isMastered ? (
                            <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={11} />
                              <span>Mastered</span>
                            </span>
                          ) : isInProgress ? (
                            <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-semibold flex items-center gap-1">
                              <Clock size={11} />
                              <span>In Progress ({avg}%)</span>
                            </span>
                          ) : (
                            <span className="text-[0.6875rem] font-mono px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-ink-muted)] border border-[var(--color-rule)]">
                              Ready to Study
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-[var(--color-ink)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug mb-1.5">
                          {unit.title}
                        </h4>

                        <p className="text-xs text-[var(--color-ink-muted)] line-clamp-3 leading-relaxed mb-3">
                          {unit.description}
                        </p>

                        {/* Prerequisites indicator if any */}
                        {unit.prerequisites.length > 0 && (
                          <div className="flex flex-col gap-1 mb-3 pt-2 border-t border-[var(--color-rule)]/60">
                            <span className="text-[0.625rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
                              Prerequisites:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {unit.prerequisites.slice(0, 2).map((prereq, idx) => (
                                <span
                                  key={idx}
                                  className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] truncate max-w-[200px]"
                                  title={prereq}
                                >
                                  {prereq}
                                </span>
                              ))}
                              {unit.prerequisites.length > 2 && (
                                <span className="text-[0.625rem] font-mono px-1 py-0.5 text-[var(--color-ink-muted)]">
                                  +{unit.prerequisites.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Capabilities & Enter Button */}
                      <div className="pt-3 border-t border-[var(--color-rule)] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                          {unit.applying?.sandboxConfig && (
                            <span title="Interactive Parameter Sandbox" className="text-sky-600 dark:text-sky-400">
                              🔬 Lab
                            </span>
                          )}
                          {unit.applying?.workedDerivations?.length > 0 && (
                            <span title="Worked Proofs" className="text-amber-600 dark:text-amber-400">
                              📐 {unit.applying.workedDerivations.length} proofs
                            </span>
                          )}
                          {unit.studyNotes && (
                            <span title="Personal Notes Taken" className="text-purple-600 dark:text-purple-400">
                              📝 Notes
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Study</span>
                          <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
