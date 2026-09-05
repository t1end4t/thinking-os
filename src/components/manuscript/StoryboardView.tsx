import React from 'react';
import {
  Compass,
  Sparkles,
  Layers,
  FlaskConical,
  ShieldAlert,
  Award,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Image,
  Table2,
  Lightbulb,
  BookMarked
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ArgumentRole } from '../../manuscriptTypes';

interface StoryboardViewProps {
  onSelectSection: (sectionId: string) => void;
}

interface NarrativeStage {
  role: ArgumentRole;
  label: string;
  title: string;
  question: string;
  color: {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
  };
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NARRATIVE_STAGES: NarrativeStage[] = [
  {
    role: 'hook_motivation',
    label: 'Stage 1',
    title: 'Motivation & Empirical Dilemma',
    question: 'Why does this problem matter and where does naive existing practice collapse?',
    color: {
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-900/50',
      text: 'text-amber-800 dark:text-amber-300',
      iconBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
    },
    icon: Compass
  },
  {
    role: 'thesis_claim',
    label: 'Stage 2',
    title: 'Core Thesis & Central Claims',
    question: 'What is the novel scientific claim or hypothesis we propose to resolve the gap?',
    color: {
      bg: 'bg-purple-50/50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-900/50',
      text: 'text-purple-800 dark:text-purple-300',
      iconBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
    },
    icon: Sparkles
  },
  {
    role: 'theoretical_derivation',
    label: 'Stage 3',
    title: 'Theoretical Foundations & Proofs',
    question: 'What mathematical lemmas or first-principle derivations justify this claim?',
    color: {
      bg: 'bg-sky-50/50 dark:bg-sky-950/20',
      border: 'border-sky-200 dark:border-sky-900/50',
      text: 'text-sky-800 dark:text-sky-300',
      iconBg: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300'
    },
    icon: BookOpen
  },
  {
    role: 'methodology_system',
    label: 'Stage 4',
    title: 'Architecture & System Design',
    question: 'How is the conceptual proof engineered into a concrete, reproducible system?',
    color: {
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      border: 'border-indigo-200 dark:border-indigo-900/50',
      text: 'text-indigo-800 dark:text-indigo-300',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
    },
    icon: Layers
  },
  {
    role: 'empirical_evidence',
    label: 'Stage 5',
    title: 'Empirical Verification & Benchmarks',
    question: 'What controlled measurements defend the claim against baselines?',
    color: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-900/50',
      text: 'text-emerald-800 dark:text-emerald-300',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
    },
    icon: FlaskConical
  },
  {
    role: 'counterargument_refute',
    label: 'Stage 6',
    title: 'Dialectics & Boundary Analysis',
    question: 'Under what stress conditions does the solution break down, and how do we bound it?',
    color: {
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      border: 'border-rose-200 dark:border-rose-900/50',
      text: 'text-rose-800 dark:text-rose-300',
      iconBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
    },
    icon: ShieldAlert
  },
  {
    role: 'implications_future',
    label: 'Stage 7',
    title: 'Synthesis & Future Implications',
    question: 'What paradigm shift does this establish for the broader research landscape?',
    color: {
      bg: 'bg-teal-50/50 dark:bg-teal-950/20',
      border: 'border-teal-200 dark:border-teal-900/50',
      text: 'text-teal-800 dark:text-teal-300',
      iconBg: 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
    },
    icon: Award
  }
];

export const StoryboardView: React.FC<StoryboardViewProps> = ({ onSelectSection }) => {
  const { manuscript, claims, links, evidence } = useWorkspace();

  // Calculate paper dialectic metrics
  const totalSections = manuscript.sections.length;
  const attachedClaimsCount = new Set(manuscript.sections.flatMap(s => s.attachedClaimIds)).size;
  const attachedCitationsCount = new Set(manuscript.sections.flatMap(s => s.attachedCitationKeys)).size;
  const attachedArtifactsCount = new Set(manuscript.sections.flatMap(s => s.attachedArtifactIds)).size;

  // Check how many claims in the paper have evidence that holds
  const claimsInPaper = claims.filter(c =>
    manuscript.sections.some(s => s.attachedClaimIds.includes(c.id))
  );

  const claimsWithHolds = claimsInPaper.filter(c => {
    const claimLinks = links.filter(l => l.parentId === c.id && l.kind === 'claim-evidence');
    return claimLinks.some(l => l.status === 'holds');
  });

  const rigorScore = claimsInPaper.length > 0
    ? Math.round((claimsWithHolds.length / claimsInPaper.length) * 100)
    : 100;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper)]/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[0.7rem] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                SCIENTIFIC ARGUMENTATION STORYBOARD
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                From Research Claim to Rigorous Manuscript
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--color-ink)]">
              {manuscript.meta.title}
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1 max-w-3xl leading-relaxed">
              A paper is a structured scientific narrative. Track how your claims are introduced, mathematically grounded, experimentally defended, and dialectically bounded.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] text-center min-w-[90px]">
              <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {rigorScore}%
              </div>
              <div className="text-[0.65rem] text-[var(--color-ink-muted)] font-medium">
                Claim Rigor
              </div>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] text-center min-w-[90px]">
              <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {attachedClaimsCount} / {claims.length}
              </div>
              <div className="text-[0.65rem] text-[var(--color-ink-muted)] font-medium">
                Claims Linked
              </div>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] text-center min-w-[90px]">
              <div className="text-sm font-bold font-mono text-teal-600 dark:text-teal-400">
                {attachedCitationsCount}
              </div>
              <div className="text-[0.65rem] text-[var(--color-ink-muted)] font-medium">
                Citations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Storyboard Pipeline */}
      <div className="space-y-4">
        {NARRATIVE_STAGES.map((stage, idx) => {
          const StageIcon = stage.icon;
          // Find sections mapped to this role
          const matchingSections = manuscript.sections.filter(s => s.argumentRole === stage.role);

          return (
            <div
              key={stage.role}
              className={`p-4 rounded-xl border ${stage.color.border} ${stage.color.bg} transition-all space-y-3`}
            >
              {/* Stage Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${stage.color.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <StageIcon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.65rem] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                        {stage.label}
                      </span>
                      <h4 className={`text-sm font-bold ${stage.color.text}`}>
                        {stage.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[var(--color-ink)] mt-0.5 italic">
                      "{stage.question}"
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono text-[var(--color-ink-muted)] shrink-0">
                  {matchingSections.length} {matchingSections.length === 1 ? 'section' : 'sections'}
                </div>
              </div>

              {/* Sections mapped to this stage */}
              {matchingSections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {matchingSections.map(sec => {
                    // Claims in this section
                    const secClaims = claims.filter(c => sec.attachedClaimIds.includes(c.id));
                    // Artifacts in this section
                    const secArtifacts = manuscript.artifacts.filter(a =>
                      sec.attachedArtifactIds.includes(a.id)
                    );

                    return (
                      <div
                        key={sec.id}
                        onClick={() => onSelectSection(sec.id)}
                        className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-indigo-400 hover:shadow-xs cursor-pointer transition-all space-y-2 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              §{sec.sectionNumber}
                            </span>
                            <span className="text-xs font-semibold text-[var(--color-ink)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {sec.title}
                            </span>
                          </div>
                          <ArrowRight size={13} className="text-[var(--color-ink-muted)] group-hover:translate-x-0.5 transition-transform" />
                        </div>

                        {/* Narrative goal */}
                        {sec.narrativeGoal && (
                          <p className="text-[0.68rem] text-[var(--color-ink-muted)] line-clamp-2 leading-relaxed bg-[var(--color-paper)] p-1.5 rounded">
                            {sec.narrativeGoal}
                          </p>
                        )}

                        {/* Grounded elements badges */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[0.62rem] font-mono">
                          {secClaims.map(c => {
                            const cLinks = links.filter(l => l.parentId === c.id && l.kind === 'claim-evidence');
                            const hasHolds = cLinks.some(l => l.status === 'holds');

                            return (
                              <span
                                key={c.id}
                                className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  hasHolds
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {hasHolds ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                Claim {c.id}
                              </span>
                            );
                          })}

                          {secArtifacts.map(a => (
                            <span
                              key={a.id}
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-ink-muted)] flex items-center gap-0.5"
                            >
                              {a.type === 'figure' && <Image size={10} />}
                              {a.type === 'table' && <Table2 size={10} />}
                              {a.type === 'fact' && <Lightbulb size={10} />}
                              {a.badge || a.title.slice(0, 10)}
                            </span>
                          ))}

                          {sec.attachedCitationKeys.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center gap-0.5">
                              <BookMarked size={10} />
                              {sec.attachedCitationKeys.length} refs
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[0.72rem] text-[var(--color-ink-muted)] py-2 px-3 rounded-lg border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)]/50 flex items-center justify-between">
                  <span>No sections currently fulfill this narrative role.</span>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    Consider adding or assigning a section
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
