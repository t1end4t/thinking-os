import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Compass,
  BookOpen,
  Share2,
  Plus
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { LearningUnit, LearnViewMode } from '../../learnTypes';
import { BookCurriculumSidebar } from './BookCurriculumSidebar';
import { StudyDeskView } from './StudyDeskView';
import { UnitEditorModal } from './UnitEditorModal';
import { LearnKnowledgeGraph } from './LearnKnowledgeGraph';
import { CurriculumMatrix } from './CurriculumMatrix';
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
    promoteConjectureToTask
  } = useWorkspace();

  // Minimalist Tab normalization: every route maps cleanly to one of the 3 core views
  const currentTab: 'desk' | 'roadmap' | 'graph' = useMemo(() => {
    if (activeLearnTab === 'roadmap' || activeLearnTab === 'matrix') return 'roadmap';
    if (activeLearnTab === 'graph') return 'graph';
    // All other modes ('desk', 'notes', 'theory', 'labs', 'practice', 'ladder') map directly to 'desk'
    return 'desk';
  }, [activeLearnTab]);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<LearningUnit | null>(null);
  const [modalDefaultBook, setModalDefaultBook] = useState<string | undefined>(undefined);
  const [modalDefaultChapter, setModalDefaultChapter] = useState<string | undefined>(undefined);

  // Active unit selection
  const activeUnit = useMemo(() => {
    return learningUnits.find(u => u.id === activeLearningUnitId) || learningUnits[0] || null;
  }, [learningUnits, activeLearningUnitId]);

  const handleOpenCreateModal = (defaultBook?: string, defaultChapter?: string) => {
    setUnitToEdit(null);
    setModalDefaultBook(defaultBook || 'Understanding Deep Learning (Simon J.D. Prince)');
    setModalDefaultChapter(defaultChapter || '');
    setIsEditorModalOpen(true);
  };

  const handleOpenEditModal = (unit: LearningUnit) => {
    setUnitToEdit(unit);
    setModalDefaultBook(unit.book);
    setModalDefaultChapter(unit.chapter);
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

  const handleDeleteUnit = (id: string) => {
    deleteLearningUnit(id);
    if (activeLearningUnitId === id) {
      const remaining = learningUnits.filter(u => u.id !== id);
      if (remaining.length > 0) {
        setActiveLearningUnitId(remaining[0].id);
      }
    }
  };

  const handleSelectUnitToStudy = (unitId: string) => {
    setActiveLearningUnitId(unitId);
    setActiveLearnTab('desk');
  };

  // The 3 purposeful, minimalist tabs serving the core learning flow
  const TABS: { id: 'desk' | 'roadmap' | 'graph'; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }[] = [
    {
      id: 'desk',
      label: 'Study Desk',
      icon: BookOpen,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
    },
    {
      id: 'roadmap',
      label: 'Curriculum Shelf',
      icon: Compass,
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800'
    },
    {
      id: 'graph',
      label: 'Concept Graph',
      icon: Share2,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800'
    }
  ];

  return (
    <div id="learn-surface-root" className="flex-1 flex flex-col overflow-hidden w-full h-full bg-[var(--color-surface)]">
      {/* Top Surface Header with Navigation Tabs */}
      <header className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                Academic Curriculum & Second Brain
              </h1>
              <TabHelpTip
                title="Academic Learning & Cognitive Rigor"
                category="Epistemic Workspace"
                summary="Systematize textbook reading across Bloom's 6 cognitive levels: Remember, Understand, Apply, Analyze, Evaluate, and Create with an integrated reading scratchpad."
                tips={[
                  "Study Desk: 3-column unified reading desk with textbook navigation, 6-level cognitive progression, interactive sandbox, and notes scratchpad.",
                  "Level 1 (Remember): Notation, active recall flashcards, and axioms.",
                  "Level 2 (Understand): Feynman intuition and physical mental models.",
                  "Level 3 (Apply): Toy code snippet and live parameter sandbox.",
                  "Level 4 (Analyze): Boundary condition stress-tests and contrastive matrices.",
                  "Level 5 (Evaluate): Architectural trade-off ledgers and spot-the-flaw proof audits.",
                  "Level 6 (Create): Formulate research hypotheses and 1-click bridge to Thinking OS Claims.",
                  "Curriculum Shelf: Bird's-eye catalog of all books, chapters, and Bloom mastery.",
                  "Concept Graph: Obsidian-style second brain network of mathematical dependencies."
                ]}
                placement="bottom"
                variant="inline"
              />
            </div>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)] hidden sm:block">
              Textbook distillation, 6-level Bloom rigor, mathematical toys, and integrated reading scratchpad
            </p>
          </div>
        </div>

        {/* Tab Switcher - Clean, Minimalist 3 Tabs */}
        <nav aria-label="Curriculum Navigation Tabs" className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-rule)] shadow-2xs overflow-x-auto max-w-full">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`learn-tab-btn-${tab.id}`}
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden w-full h-full relative">
        {/* ============================================================ */}
        {/* TAB 1: STUDY DESK (Primary 3-Column Reading & Notes Flow)     */}
        {/* ============================================================ */}
        {currentTab === 'desk' && (
          <div className="flex-1 flex overflow-hidden w-full h-full">
            {/* Left Column: Book & Chapter Curriculum Navigator */}
            <BookCurriculumSidebar
              learningUnits={learningUnits}
              activeUnitId={activeUnit?.id || null}
              onSelectUnit={setActiveLearningUnitId}
              onOpenCreateModal={handleOpenCreateModal}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Center & Right Column: Study Desk with 6-Level Rigor & Scratchpad */}
            {activeUnit ? (
              <StudyDeskView
                unit={activeUnit}
                onUpdateUnit={updates => updateLearningUnit(activeUnit.id, updates)}
                onUpdateLevelProgress={(level, score) =>
                  updateLearningLevelProgress(activeUnit.id, level, score)
                }
                onOpenEditModal={handleOpenEditModal}
                onDeleteUnit={handleDeleteUnit}
                onPromoteToClaim={conjecture => promoteConjectureToClaim(activeUnit.id, conjecture)}
                onPromoteToQuestion={(title, tags) =>
                  promoteConjectureToQuestion(activeUnit.id, title, tags)
                }
                onPromoteToTask={(title, desc) =>
                  promoteConjectureToTask(activeUnit.id, title, desc)
                }
              />
            ) : (
              <EmptyTopicState
                onOpenRoadmap={() => setActiveLearnTab('roadmap')}
                onOpenCreate={() => handleOpenCreateModal()}
              />
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: CURRICULUM SHELF (Catalog & Roadmap Overview)         */}
        {/* ============================================================ */}
        {currentTab === 'roadmap' && (
          <CurriculumMatrix
            learningUnits={learningUnits}
            onSelectUnit={unitId => handleSelectUnitToStudy(unitId)}
            onOpenCreateModal={() => handleOpenCreateModal()}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 3: CONCEPT GRAPH (Obsidian-Style Knowledge Network)      */}
        {/* ============================================================ */}
        {currentTab === 'graph' && (
          <LearnKnowledgeGraph
            learningUnits={learningUnits}
            activeUnitId={activeUnit?.id || null}
            onSelectUnit={setActiveLearningUnitId}
            onOpenStudyUnit={unitId => handleSelectUnitToStudy(unitId)}
          />
        )}
      </div>

      {/* Unit Creation / Edit Modal */}
      <UnitEditorModal
        unit={unitToEdit}
        defaultBook={modalDefaultBook}
        defaultChapter={modalDefaultChapter}
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
        Select a study topic from the curriculum sidebar or shelf to explore its 6-level cognitive breakdown.
      </p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenRoadmap}
          className="px-4 py-2 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] hover:border-emerald-500 text-xs font-medium text-[var(--color-ink)] shadow-2xs transition-colors"
        >
          Open Curriculum Shelf
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
