import React from 'react';
import {
  Compass,
  Lightbulb,
  Sliders,
  BookmarkCheck,
  Sparkles,
  FileText,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowRight
} from 'lucide-react';
import { CognitiveLevelId, LearningUnit } from '../../learnTypes';

export type StudyPhaseId = 'intuition' | 'labs' | 'recall' | 'synthesis' | 'notes';

interface CognitiveProgressionBarProps {
  unit: LearningUnit;
  activeLevel?: CognitiveLevelId;
  onSelectLevel?: (level: CognitiveLevelId) => void;
  activePhase?: StudyPhaseId;
  onSelectPhase?: (phase: StudyPhaseId) => void;
}

interface PhaseConfig {
  id: StudyPhaseId;
  mappedLevel: CognitiveLevelId;
  number: string;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  activeBg: string;
}

const STUDY_PHASES: PhaseConfig[] = [
  {
    id: 'intuition',
    mappedLevel: 'understanding',
    number: '01',
    name: 'Intuition & Theory',
    subtitle: 'Mental models, formal notation & axioms',
    icon: Lightbulb,
    accentColor: 'text-sky-600 dark:text-sky-400',
    activeBg: 'bg-sky-50 dark:bg-sky-950/50 border-sky-500/60 ring-sky-500/20'
  },
  {
    id: 'labs',
    mappedLevel: 'applying',
    number: '02',
    name: 'Interactive Labs & Proofs',
    subtitle: 'Parameter sandbox & worked derivations',
    icon: Sliders,
    accentColor: 'text-amber-600 dark:text-amber-400',
    activeBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-500/60 ring-amber-500/20'
  },
  {
    id: 'recall',
    mappedLevel: 'remembering',
    number: '03',
    name: 'Active Recall & Practice',
    subtitle: 'Flashcards, flaw critique & challenges',
    icon: BookmarkCheck,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/60 ring-emerald-500/20'
  },
  {
    id: 'synthesis',
    mappedLevel: 'creating',
    number: '04',
    name: 'Research Synthesis',
    subtitle: 'Conjectures, bridge to Claims & Tasks',
    icon: Sparkles,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    activeBg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500/60 ring-indigo-500/20'
  },
  {
    id: 'notes',
    mappedLevel: 'creating',
    number: '05',
    name: 'My Study Notes',
    subtitle: 'Personal markdown scratchpad',
    icon: FileText,
    accentColor: 'text-purple-600 dark:text-purple-400',
    activeBg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-500/60 ring-purple-500/20'
  }
];

export const CognitiveProgressionBar: React.FC<CognitiveProgressionBarProps> = ({
  unit,
  activeLevel = 'understanding',
  onSelectLevel,
  activePhase,
  onSelectPhase
}) => {
  // Determine current active phase
  const currentPhase: StudyPhaseId = activePhase
    ? activePhase
    : activeLevel === 'remembering' || activeLevel === 'evaluating'
    ? 'recall'
    : activeLevel === 'applying' || activeLevel === 'analyzing'
    ? 'labs'
    : activeLevel === 'creating'
    ? 'synthesis'
    : 'intuition';

  const handleSelectPhase = (phase: PhaseConfig) => {
    if (onSelectPhase) {
      onSelectPhase(phase.id);
    }
    if (onSelectLevel) {
      onSelectLevel(phase.mappedLevel);
    }
  };

  // Human-oriented completion checks
  const isIntuitionComplete = (unit.progress?.understanding || 0) >= 60;
  const isLabsComplete = (unit.progress?.applying || 0) >= 50;
  const isRecallComplete = (unit.progress?.remembering || 0) >= 60;
  const isSynthesisComplete =
    !!unit.creating?.promotedClaimId || (unit.creating?.conjectureDraft?.length || 0) > 20;
  const isNotesComplete = (unit.studyNotes?.trim().length || 0) > 20;

  const getPhaseCompletion = (id: StudyPhaseId): boolean => {
    switch (id) {
      case 'intuition':
        return isIntuitionComplete;
      case 'labs':
        return isLabsComplete;
      case 'recall':
        return isRecallComplete;
      case 'synthesis':
        return isSynthesisComplete;
      case 'notes':
        return isNotesComplete;
    }
  };

  const completedCount = [
    isIntuitionComplete,
    isLabsComplete,
    isRecallComplete,
    isSynthesisComplete,
    isNotesComplete
  ].filter(Boolean).length;

  return (
    <div className="w-full bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-2xl p-4 md:p-5 shadow-xs flex flex-col gap-3.5">
      {/* Top Header: Topic Focus & Human Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-rule)]/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Compass size={16} />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-ink)]">
              Interactive Study Flow
            </h3>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
              Progress through intuition, hands-on derivations, active self-testing, and synthesis
            </p>
          </div>
        </div>

        {/* Stations completed pill */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)]">
            <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider">
              Study Stations:
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {completedCount} of 5 Complete
            </span>
            {completedCount === 5 && (
              <Award size={13} className="text-amber-500 animate-bounce" />
            )}
          </div>
        </div>
      </div>

      {/* The 5 Human Learning Stations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {STUDY_PHASES.map(phase => {
          const Icon = phase.icon;
          const isActive = currentPhase === phase.id;
          const isDone = getPhaseCompletion(phase.id);

          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => handleSelectPhase(phase)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 relative group ${
                isActive
                  ? `${phase.activeBg} ring-1 shadow-xs`
                  : 'border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)] hover:border-[var(--color-ink-muted)]/40'
              }`}
            >
              {/* Step number + Status icon */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-[0.625rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)]">
                  Phase {phase.number}
                </span>
                {isDone ? (
                  <CheckCircle2 size={13} className="text-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[var(--color-rule)]" />
                )}
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className={`p-1 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]'
                  }`}
                >
                  <Icon size={13} />
                </div>
                <span
                  className={`text-xs font-semibold tracking-tight truncate ${
                    isActive ? 'text-[var(--color-ink)] font-bold' : 'text-[var(--color-ink)]'
                  }`}
                >
                  {phase.name}
                </span>
              </div>

              {/* Subtitle */}
              <p className="text-[0.625rem] text-[var(--color-ink-muted)] line-clamp-1">
                {phase.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
