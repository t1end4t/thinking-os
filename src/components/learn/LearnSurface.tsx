import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Compass,
  Lightbulb,
  Sliders,
  BookmarkCheck,
  FileText,
  Share2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Plus,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { LearningUnit, LearnViewMode } from '../../learnTypes';
import { RememberingView } from './levels/RememberingView';
import { UnderstandingView } from './levels/UnderstandingView';
import { ApplyingView } from './levels/ApplyingView';
import { AnalyzingView } from './levels/AnalyzingView';
import { EvaluatingView } from './levels/EvaluatingView';
import { CreatingView } from './levels/CreatingView';
import { UnitEditorModal } from './UnitEditorModal';
import { LearnKnowledgeGraph } from './LearnKnowledgeGraph';
import { CurriculumMatrix } from './CurriculumMatrix';
import { StudyNotesView } from './StudyNotesView';
import { TabHelpTip } from '../common/TabHelpTip';

export const LearnSurface: React.FC = () => {
  const {
    learningUnits,
    activeLearningUnitId,
    setActiveLearningUnitId,
    activeLearnTab,
    setActiveLearnTab,
    addLearningUnit,
    updateLearningUnit,
    deleteLearningUnit,
    updateLearningLevelProgress,
    promoteConjectureToClaim,
    promoteConjectureToQuestion,
    promoteConjectureToTask,
    setActiveSurface
  } = useWorkspace();

  // Active tab normalized (handling backward compatibility)
  const currentTab: LearnViewMode = useMemo(() => {
    if (activeLearnTab === 'desk' || activeLearnTab === 'ladder') return 'theory';
    if (activeLearnTab === 'matrix') return 'roadmap';
    return activeLearnTab || 'roadmap';
  }, [activeLearnTab]);

  // Sub-toggles within specific tabs for focused learning
  const [labMode, setLabMode] = useState<'sandbox' | 'analysis'>('sandbox');
  const [practiceMode, setPracticeMode] = useState<'flashcards' | 'critique'>('flashcards');
  const [notesMode, setNotesMode] = useState<'notes' | 'conjecture'>('notes');

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<LearningUnit | null>(null);

  // Active unit selection
  const activeUnit = useMemo(() => {
    return learningUnits.find(u => u.id === activeLearningUnitId) || learningUnits[0] || null;
  }, [learningUnits, activeLearningUnitId]);

  // Current unit index in curriculum
  const currentIndex = useMemo(() => {
    if (!activeUnit) return -1;
    return learningUnits.findIndex(u => u.id === activeUnit.id);
  }, [learningUnits, activeUnit]);

  const handlePrevUnit = () => {
    if (currentIndex > 0) {
      setActiveLearningUnitId(learningUnits[currentIndex - 1].id);
    }
  };

  const handleNextUnit = () => {
    if (currentIndex < learningUnits.length - 1) {
      setActiveLearningUnitId(learningUnits[currentIndex + 1].id);
    }
  };

  const handleOpenCreateModal = () => {
    setUnitToEdit(null);
    setIsEditorModalOpen(true);
  };

  const handleOpenEditModal = (unit: LearningUnit) => {
    setUnitToEdit(unit);
    setIsEditorModalOpen(true);
  };

  const handleSaveUnit = (
    unitData: Partial<LearningUnit> & { title: string; category: LearningUnit['category'] }
  ) => {
    if (unitData.id) {
      updateLearningUnit(unitData.id, unitData);
    } else {
      addLearningUnit(unitData);
    }
  };

  const handleDeleteUnit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this learning topic? This operation cannot be undone.')) {
      deleteLearningUnit(id);
    }
  };

  const handleSelectUnitToStudy = (unitId: string, targetTab: LearnViewMode = 'theory') => {
    setActiveLearningUnitId(unitId);
    setActiveLearnTab(targetTab);
  };

  const handleStudyUnitFromGraph = (unitId: string) => {
    setActiveLearningUnitId(unitId);
    setActiveLearnTab('theory');
  };

  // Human Tabs Definition
  const TABS: { id: LearnViewMode; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }[] = [
    { id: 'roadmap', label: 'Roadmap', icon: Compass, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' },
    { id: 'theory', label: 'Theory & Intuition', icon: Lightbulb, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800' },
    { id: 'labs', label: 'Interactive Labs', icon: Sliders, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800' },
    { id: 'practice', label: 'Recall & Practice', icon: BookmarkCheck, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-800' },
    { id: 'notes', label: 'Notes & Synthesis', icon: FileText, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800' },
    { id: 'graph', label: 'Concept Graph', icon: Share2, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800' }
  ];

  const isTopicSpecificTab = currentTab === 'theory' || currentTab === 'labs' || currentTab === 'practice' || currentTab === 'notes';

  return (
    <div id="learn-surface-root" className="flex-1 flex flex-col overflow-hidden w-full h-full bg-[var(--color-surface)]">
      {/* Top Surface Header with Dedicated Tabs Navigation (Just like Research section) */}
      <header className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                Curriculum & Learning
              </h1>
              <TabHelpTip
                title="Structured Research Learning"
                category="Epistemic Instrument"
                summary="Organized into dedicated workspaces like the research suite: overview roadmaps, conceptual intuition, parameter simulations, active recall flashcards, personal study notes, and the concept graph."
                tips={[
                  "Roadmap: Browse all topic tracks and progress status.",
                  "Theory & Intuition: Clean mathematical reader with physical intuition, formal definitions, and Feynman testing.",
                  "Interactive Labs: Experiment with parameter sliders and step-by-step mathematical proofs.",
                  "Recall & Practice: Spaced repetition flashcards and spot-the-flaw challenges.",
                  "Notes & Synthesis: Personal study scratchpad and research conjectures linked to Argument Map claims.",
                  "Concept Graph: Interactive Obsidian-style second brain network."
                ]}
                placement="bottom"
                variant="inline"
              />
            </div>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)] hidden sm:block">
              Dedicated workspaces for theory, interactive simulation, active recall, and research synthesis
            </p>
          </div>
        </div>

        {/* Dedicated Human Tab Switcher */}
        <nav aria-label="Curriculum Navigation Tabs" className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] shadow-2xs overflow-x-auto max-w-full">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLearnTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? `${tab.color} font-semibold shadow-xs border`
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] border border-transparent'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Streamlined Topic Navigation Strip (Only when studying a specific topic) */}
      {isTopicSpecificTab && activeUnit && (
        <div className="px-5 py-2.5 bg-[var(--color-paper)]/70 border-b border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 max-w-full overflow-x-auto">
            {/* Prev Topic */}
            <button
              type="button"
              onClick={handlePrevUnit}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:bg-[var(--color-paper)] disabled:opacity-30 disabled:pointer-events-none text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors shadow-2xs"
              title="Previous Topic in Curriculum"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Quick Topic Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="topic-selector-select" className="sr-only">Select Topic</label>
              <select
                id="topic-selector-select"
                value={activeUnit.id}
                onChange={e => setActiveLearningUnitId(e.target.value)}
                className="text-xs font-semibold text-[var(--color-ink)] bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[220px] sm:max-w-xs md:max-w-md truncate shadow-2xs cursor-pointer"
              >
                {learningUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.category} — {unit.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Topic */}
            <button
              type="button"
              onClick={handleNextUnit}
              disabled={currentIndex >= learningUnits.length - 1}
              className="p-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:bg-[var(--color-paper)] disabled:opacity-30 disabled:pointer-events-none text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors shadow-2xs"
              title="Next Topic in Curriculum"
            >
              <ChevronRight size={14} />
            </button>

            {/* Badges */}
            <span className="hidden sm:inline-block text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              {activeUnit.category}
            </span>
            <span className="hidden md:inline-block text-[0.6875rem] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] shrink-0">
              {activeUnit.difficulty}
            </span>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Topic Mastery Score */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-[var(--color-ink-muted)]">Mastery:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round(Object.values(activeUnit.progress).reduce((a, b) => a + b, 0) / 6)}%
              </span>
            </div>

            <div className="h-4 w-[1px] bg-[var(--color-rule)] mx-1" />

            {/* Return to Roadmap */}
            <button
              type="button"
              onClick={() => setActiveLearnTab('roadmap')}
              className="px-2.5 py-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              title="View full Curriculum Roadmap"
            >
              <Compass size={12} />
              <span className="hidden sm:inline">All Topics</span>
            </button>

            {/* Edit Topic */}
            <button
              type="button"
              onClick={() => handleOpenEditModal(activeUnit)}
              className="p-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-xs flex items-center gap-1 shadow-2xs transition-colors"
              title="Edit topic details"
            >
              <Edit3 size={12} />
              <span className="hidden sm:inline">Edit</span>
            </button>

            {/* Delete Topic */}
            <button
              type="button"
              onClick={e => handleDeleteUnit(activeUnit.id, e)}
              className="p-1.5 rounded-lg border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shadow-2xs transition-colors"
              title="Delete topic"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden w-full h-full relative">
        {/* TAB 1: Curriculum Roadmap */}
        {currentTab === 'roadmap' && (
          <CurriculumMatrix
            learningUnits={learningUnits}
            onSelectUnit={unitId => handleSelectUnitToStudy(unitId, 'theory')}
            onOpenCreateModal={handleOpenCreateModal}
          />
        )}

        {/* TAB 2: Theory & Intuition */}
        {currentTab === 'theory' && (
          <div className="flex-1 flex flex-col overflow-y-auto w-full h-full p-5 md:p-8">
            {activeUnit ? (
              <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
                <UnderstandingView
                  unit={activeUnit}
                  onUpdateProgress={score =>
                    updateLearningLevelProgress(activeUnit.id, 'understanding', score)
                  }
                  onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                />

                {/* Direct Gateway to Interactive Labs */}
                <div className="pt-6 border-t border-[var(--color-rule)] flex items-center justify-between">
                  <div className="text-xs font-mono text-[var(--color-ink-muted)]">
                    Next step: Put theory into practice with live simulations
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveLearnTab('labs')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all group"
                  >
                    <span>Proceed to Interactive Labs</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <EmptyTopicState onOpenRoadmap={() => setActiveLearnTab('roadmap')} onOpenCreate={handleOpenCreateModal} />
            )}
          </div>
        )}

        {/* TAB 3: Interactive Labs */}
        {currentTab === 'labs' && (
          <div className="flex-1 flex flex-col overflow-y-auto w-full h-full p-5 md:p-8">
            {activeUnit ? (
              <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
                {/* Clean Sub-Mode Switcher */}
                <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLabMode('sandbox')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        labMode === 'sandbox'
                          ? 'bg-amber-600 text-white font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)] border border-[var(--color-rule)]'
                      }`}
                    >
                      🔬 Parameter Sandbox & Worked Proofs
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabMode('analysis')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        labMode === 'analysis'
                          ? 'bg-amber-600 text-white font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)] border border-[var(--color-rule)]'
                      }`}
                    >
                      📐 Structural Components & Assumption Stress-Tests
                    </button>
                  </div>

                  <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] hidden sm:inline">
                    Hands-on Mathematical Exploration
                  </span>
                </div>

                {labMode === 'sandbox' ? (
                  <ApplyingView
                    unit={activeUnit}
                    onUpdateProgress={score =>
                      updateLearningLevelProgress(activeUnit.id, 'applying', score)
                    }
                    onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                  />
                ) : (
                  <AnalyzingView
                    unit={activeUnit}
                    onUpdateProgress={score =>
                      updateLearningLevelProgress(activeUnit.id, 'analyzing', score)
                    }
                    onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                  />
                )}

                {/* Direct Gateway to Active Recall */}
                <div className="pt-6 border-t border-[var(--color-rule)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveLearnTab('theory')}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    ← Back to Theory
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLearnTab('practice')}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all group"
                  >
                    <span>Proceed to Recall & Practice</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <EmptyTopicState onOpenRoadmap={() => setActiveLearnTab('roadmap')} onOpenCreate={handleOpenCreateModal} />
            )}
          </div>
        )}

        {/* TAB 4: Recall & Practice */}
        {currentTab === 'practice' && (
          <div className="flex-1 flex flex-col overflow-y-auto w-full h-full p-5 md:p-8">
            {activeUnit ? (
              <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
                {/* Clean Sub-Mode Switcher */}
                <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPracticeMode('flashcards')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        practiceMode === 'flashcards'
                          ? 'bg-teal-600 text-white font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)] border border-[var(--color-rule)]'
                      }`}
                    >
                      📇 Active Recall Flashcards (Spaced Repetition)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPracticeMode('critique')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        practiceMode === 'critique'
                          ? 'bg-teal-600 text-white font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)] border border-[var(--color-rule)]'
                      }`}
                    >
                      🔍 Spot-The-Flaw Mathematical Critique
                    </button>
                  </div>

                  <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] hidden sm:inline">
                    Long-term Memory & Analytical Rigor
                  </span>
                </div>

                {practiceMode === 'flashcards' ? (
                  <RememberingView
                    unit={activeUnit}
                    onUpdateProgress={score =>
                      updateLearningLevelProgress(activeUnit.id, 'remembering', score)
                    }
                    onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                  />
                ) : (
                  <EvaluatingView
                    unit={activeUnit}
                    onUpdateProgress={score =>
                      updateLearningLevelProgress(activeUnit.id, 'evaluating', score)
                    }
                    onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                  />
                )}

                {/* Direct Gateway to Notes & Synthesis */}
                <div className="pt-6 border-t border-[var(--color-rule)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveLearnTab('labs')}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    ← Back to Labs
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLearnTab('notes')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all group"
                  >
                    <span>Proceed to Notes & Synthesis</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <EmptyTopicState onOpenRoadmap={() => setActiveLearnTab('roadmap')} onOpenCreate={handleOpenCreateModal} />
            )}
          </div>
        )}

        {/* TAB 5: Notes & Synthesis */}
        {currentTab === 'notes' && (
          <div className="flex-1 flex flex-col overflow-y-auto w-full h-full p-5 md:p-8">
            {activeUnit ? (
              <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
                {/* Clean Sub-Mode Switcher */}
                <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNotesMode('notes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        notesMode === 'notes'
                          ? 'bg-purple-600 text-white font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)] border border-[var(--color-rule)]'
                      }`}
                    >
                      📝 Personal Study Scratchpad & Takeaways
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotesMode('conjecture')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        notesMode === 'conjecture'
                          ? 'bg-purple-600 text-white font-semibold shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)] border border-[var(--color-rule)]'
                      }`}
                    >
                      💡 Research Conjecture Studio (Bridge to Claims/Tasks)
                    </button>
                  </div>

                  <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] hidden sm:inline">
                    Knowledge Distillation & Synthesis
                  </span>
                </div>

                {notesMode === 'notes' ? (
                  <StudyNotesView
                    unit={activeUnit}
                    onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                  />
                ) : (
                  <CreatingView
                    unit={activeUnit}
                    onUpdateProgress={score =>
                      updateLearningLevelProgress(activeUnit.id, 'creating', score)
                    }
                    onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                    onPromoteToClaim={conjecture =>
                      promoteConjectureToClaim(activeUnit.id, conjecture)
                    }
                    onPromoteToQuestion={(title, tags) =>
                      promoteConjectureToQuestion(activeUnit.id, title, tags)
                    }
                    onPromoteToTask={(title, desc) =>
                      promoteConjectureToTask(activeUnit.id, title, desc)
                    }
                    onNavigateToSurface={surf => setActiveSurface(surf)}
                  />
                )}

                {/* Bottom navigation */}
                <div className="pt-6 border-t border-[var(--color-rule)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveLearnTab('practice')}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    ← Back to Practice
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLearnTab('roadmap')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Compass size={14} />
                    <span>Return to Roadmap</span>
                  </button>
                </div>
              </div>
            ) : (
              <EmptyTopicState onOpenRoadmap={() => setActiveLearnTab('roadmap')} onOpenCreate={handleOpenCreateModal} />
            )}
          </div>
        )}

        {/* TAB 6: Concept Graph */}
        {currentTab === 'graph' && (
          <LearnKnowledgeGraph
            learningUnits={learningUnits}
            activeUnitId={activeLearningUnitId}
            onSelectUnit={setActiveLearningUnitId}
            onOpenStudyUnit={handleStudyUnitFromGraph}
          />
        )}
      </div>

      {/* Unit Creation / Edit Modal */}
      <UnitEditorModal
        unit={unitToEdit}
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        onSave={handleSaveUnit}
      />
    </div>
  );
};

interface EmptyTopicStateProps {
  onOpenRoadmap: () => void;
  onOpenCreate: () => void;
}

const EmptyTopicState: React.FC<EmptyTopicStateProps> = ({ onOpenRoadmap, onOpenCreate }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--color-ink-muted)] m-auto">
      <BookOpen size={40} className="mb-3 opacity-30 text-[var(--color-ink)]" />
      <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-1">
        No Learning Topic Selected
      </h3>
      <p className="text-xs max-w-sm mb-4 leading-relaxed">
        Select a mathematical topic from the curriculum roadmap to explore intuition, parameter simulations, and flashcards.
      </p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenRoadmap}
          className="px-4 py-2 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] hover:border-emerald-500 text-xs font-medium text-[var(--color-ink)] shadow-2xs transition-colors"
        >
          Open Curriculum Roadmap
        </button>
        <button
          type="button"
          onClick={onOpenCreate}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus size={14} />
          <span>Create New Topic</span>
        </button>
      </div>
    </div>
  );
};
