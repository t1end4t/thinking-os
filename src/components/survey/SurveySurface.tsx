import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  SurveyOpenProblem,
  SurveyCandidateQuestion,
  SurveyRetireReasonKind,
  SurveyRetireReason
} from '../../types';
import {
  Plus,
  Compass,
  AlertOctagon,
  ArrowRight,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  FileText,
  Clock,
  Archive,
  Ban,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { TabHelpTip } from '../common/TabHelpTip';

export const SurveySurface: React.FC = () => {
  const {
    openProblems,
    candidateQuestions,
    addSurveyOpenProblem,
    retireSurveyOpenProblem,
    retireSurveyCandidateQuestion,
    promoteCandidateQuestion,
    unclusteredOpenProblemsCount,
    setActiveContext
  } = useWorkspace();

  const [activeSubView, setActiveSubView] = useState<'active' | 'retired'>('active');
  const [filterStaleOnly, setFilterStaleOnly] = useState<boolean>(false);

  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCitation, setNewNoteCitation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Promotion modal state
  const [selectedCandidate, setSelectedCandidate] = useState<SurveyCandidateQuestion | null>(null);
  const [claimText, setClaimText] = useState('');
  const [confirmedFalsifiable, setConfirmedFalsifiable] = useState(false);
  const [confirmedSettledWithinYear, setConfirmedSettledWithinYear] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  // Structured Retire modal state
  const [retiringItem, setRetiringItem] = useState<{
    type: 'problem' | 'candidate';
    id: string;
    title: string;
  } | null>(null);
  const [retireKind, setRetireKind] = useState<SurveyRetireReasonKind>('solved_since');
  const [retireReference, setRetireReference] = useState<string>('');
  const [retireError, setRetireError] = useState<string | null>(null);

  // Stale calculation (older than 180 days)
  const isStale = (createdAt: number) => {
    return Date.now() - createdAt > 180 * 24 * 60 * 60 * 1000;
  };

  // Filtered lists based on active/retired and stale
  const filteredProblems = openProblems.filter(op => {
    const isRetired = !!op.retireReason;
    if (activeSubView === 'active' && isRetired) return false;
    if (activeSubView === 'retired' && !isRetired) return false;
    if (filterStaleOnly && !isStale(op.createdAt)) return false;
    return true;
  });

  const filteredCandidates = candidateQuestions.filter(cq => {
    const isRetired = !!cq.retireReason;
    if (activeSubView === 'active' && isRetired) return false;
    if (activeSubView === 'retired' && !isRetired) return false;
    if (filterStaleOnly && !isStale(cq.createdAt)) return false;
    return true;
  });

  // Loose unclustered notes
  const looseNotes = filteredProblems.filter(op => !op.candidateId);

  // Clustered candidate questions
  const clusters = filteredCandidates.map(candidate => {
    const memberNotes = openProblems.filter(op => candidate.openProblemIds.includes(op.id));
    return { candidate, memberNotes };
  });

  // Check 15-note stop condition: >= 15 unclustered notes AND < 3 candidate questions
  const isStopGateTriggered = unclusteredOpenProblemsCount >= 15 && candidateQuestions.filter(c => !c.retireReason).length < 3;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const res = addSurveyOpenProblem(newNoteText, newNoteCitation);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to add note.');
    } else {
      setNewNoteText('');
      setNewNoteCitation('');
      setErrorMessage(null);
    }
  };

  const handleOpenPromoteModal = (candidate: SurveyCandidateQuestion) => {
    setSelectedCandidate(candidate);
    setClaimText('');
    setConfirmedFalsifiable(false);
    setConfirmedSettledWithinYear(false);
    setPromotionError(null);
  };

  const handleConfirmPromotion = () => {
    if (!selectedCandidate) return;
    const res = promoteCandidateQuestion(
      selectedCandidate.id,
      claimText,
      confirmedFalsifiable,
      confirmedSettledWithinYear
    );
    if (!res.success) {
      setPromotionError(res.error || 'Promotion failed.');
    } else {
      setSelectedCandidate(null);
    }
  };

  const handleOpenRetireModal = (type: 'problem' | 'candidate', id: string, title: string) => {
    setRetiringItem({ type, id, title });
    setRetireKind('solved_since');
    setRetireReference('');
    setRetireError(null);
  };

  const handleConfirmRetire = () => {
    if (!retiringItem) return;
    if (!retireReference.trim()) {
      setRetireError(
        retireKind === 'solved_since'
          ? 'Specify the citing paper solving this problem.'
          : retireKind === 'infeasible'
          ? 'Specify the blocking resource or constraint.'
          : 'Specify the prior literature citation.'
      );
      return;
    }

    const reason: SurveyRetireReason = {
      kind: retireKind,
      reference: retireReference.trim(),
      retiredAt: Date.now()
    };

    if (retiringItem.type === 'problem') {
      retireSurveyOpenProblem(retiringItem.id, reason);
    } else {
      retireSurveyCandidateQuestion(retiringItem.id, reason);
    }
    setRetiringItem(null);
  };

  return (
    <section
      id="survey-surface"
      className="flex min-h-0 flex-1 flex-col bg-[var(--color-paper)]"
    >
      {/* Surface Header with Deliberate Friction Gate Indicator */}
      <header className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Compass size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                Literature Survey
              </h1>
              <TabHelpTip
                title="Literature Survey"
                category="Pre-Question Exploration"
                summary="Pre-question exploration: capture open problems from background reading and cluster them into candidate research questions."
                tips={[
                  "Add unclustered open problem notes from background reading.",
                  "Cluster convergent notes into formal Candidate Research Questions.",
                  "Promote qualified candidates into formal Argument Map Claims (Gate 5 check).",
                  "Keep unclustered notes below 15 to avoid endless reading without synthesis.",
                  "Retire invalid or resolved problems with structured citing references."
                ]}
                placement="bottom"
                variant="inline"
              />
            </div>
            <p className="text-[0.6875rem] text-[var(--color-ink-muted)] hidden sm:block">
              Synthesize loose open-problem notes into candidate clusters before promoting to claims
            </p>
          </div>
        </div>

        {/* Subviews and Stale Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[var(--color-paper)] p-0.5 rounded-lg border border-[var(--color-rule)] text-xs font-mono">
            <button
              onClick={() => setActiveSubView('active')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeSubView === 'active' ? 'bg-[var(--color-surface)] text-[var(--color-ink)] font-semibold shadow-2xs' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
            >
              Active ({openProblems.filter(p => !p.retireReason).length})
            </button>
            <button
              onClick={() => setActiveSubView('retired')}
              className={`px-2.5 py-1 rounded-md transition-colors ${activeSubView === 'retired' ? 'bg-[var(--color-surface)] text-[var(--color-ink)] font-semibold shadow-2xs' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
            >
              Retired ({openProblems.filter(p => !!p.retireReason).length + candidateQuestions.filter(c => !!c.retireReason).length})
            </button>
          </div>

          <button
            onClick={() => setFilterStaleOnly(!filterStaleOnly)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
              filterStaleOnly
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-semibold'
                : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
            title="Filter items older than 6 months"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Stale (&gt;6mo)</span>
          </button>

          {/* Gate 2: 15-Note Counter Meter */}
          <div className="flex items-center gap-3.5 bg-[var(--color-paper)] border border-[var(--color-rule)] px-3 py-1.5 rounded-xl shadow-2xs">
            <div className="flex flex-col">
              <span className="font-mono text-[0.625rem] uppercase text-[var(--color-ink-muted)] font-medium">
                Unclustered
              </span>
              <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                {unclusteredOpenProblemsCount} / 15
              </span>
            </div>

            <div className="w-16 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-rule)]">
              <div
                style={{ width: `${Math.min((unclusteredOpenProblemsCount / 15) * 100, 100)}%` }}
                className={`h-full transition-all duration-300 ${
                  unclusteredOpenProblemsCount >= 13
                    ? 'bg-rose-500'
                    : unclusteredOpenProblemsCount >= 8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

            <div className="flex flex-col border-l border-[var(--color-rule)] pl-2.5">
              <span className="font-mono text-[0.625rem] uppercase text-[var(--color-ink-muted)] font-medium">
                Candidates
              </span>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                {candidateQuestions.filter(c => !c.retireReason).length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Scrollable Canvas Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Deliberate Friction Hard Stop Blocker (Gate 2) */}
        {isStopGateTriggered && (
          <div
            id="survey-gate-hard-stop"
            className="p-4 md:p-5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-3.5 shadow-2xs"
          >
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <h4 className="font-mono text-xs uppercase font-bold text-rose-700 dark:text-rose-400">
                Gate 2 Hard Stop Active: 15 Unclustered Notes Limit Reached
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                Research friction policy enforced: You have accumulated 15 loose notes with fewer than 3 candidates. You cannot record new loose notes until you synthesize at least three candidate questions from this material.
              </p>
            </div>
          </div>
        )}

        {/* Add New Open Problem Note Form */}
        <form
          onSubmit={handleAddNote}
          className="p-4 md:p-5 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl flex flex-col gap-3 shadow-2xs"
        >
          <span className="font-mono text-[0.7813rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            Record Open-Problem Note (Single assertion: "What is still open here?")
          </span>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <input
              type="text"
              disabled={isStopGateTriggered}
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              placeholder="e.g. Microcontroller SRAM limits force activation swapping that dominates compute latency by up to 8x."
              className="md:col-span-8 p-2.5 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            />

            <input
              type="text"
              disabled={isStopGateTriggered}
              value={newNoteCitation}
              onChange={e => setNewNoteCitation(e.target.value)}
              placeholder="Citation / Source (e.g. Lin et al. 2023)"
              className="md:col-span-3 p-2.5 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isStopGateTriggered || !newNoteText.trim()}
              className="md:col-span-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all shadow-2xs disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {errorMessage && (
            <span className="text-xs font-mono text-rose-500 font-medium">
              {errorMessage}
            </span>
          )}
        </form>

        {/* Main Field Grid: Candidate Clusters on Left, Loose Pile on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Left 8 Cols: Accepted Candidate Clusters */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink)] font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                Candidate Question Clusters ({clusters.length})
              </span>
              <span className="text-[0.75rem] font-mono text-[var(--color-ink-muted)]">
                Visible group boundaries around accepted note material
              </span>
            </div>

            <div className="flex flex-col gap-5">
              {clusters.map(({ candidate, memberNotes }) => (
                <div
                  key={candidate.id}
                  id={`candidate-cluster-${candidate.id}`}
                  className="border border-[var(--color-rule)] rounded-xl bg-[var(--color-surface)] p-5 md:p-6 flex flex-col gap-4 relative shadow-2xs hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                >
                  {/* Cluster Boundary Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] pb-3.5">
                    <div className="flex-1">
                      <span className="font-mono text-[0.6875rem] uppercase text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50 tracking-wider">
                        Candidate Question [CQ]
                      </span>
                      <h3 className="font-serif text-[1.25rem] font-bold text-[var(--color-ink)] mt-2 leading-snug">
                        {candidate.title}
                      </h3>
                    </div>

                    {/* Actions and Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isStale(candidate.createdAt) && (
                        <span className="font-mono text-[0.6875rem] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>&gt;6mo</span>
                        </span>
                      )}

                      {candidate.retireReason ? (
                        <span className="font-mono text-[0.6875rem] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-[var(--color-rule)] flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          <span>Retired ({candidate.retireReason.kind}): {candidate.retireReason.reference}</span>
                        </span>
                      ) : candidate.promotedQuestionId ? (
                        <span className="font-mono text-[0.75rem] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase font-bold">
                          Promoted to {candidate.promotedQuestionId}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenRetireModal('candidate', candidate.id, candidate.title)}
                            className="px-2.5 py-1 border border-[var(--color-rule)] hover:border-slate-400 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] font-mono text-xs rounded-full transition-colors cursor-pointer"
                            title="Retire candidate with structured reason"
                          >
                            Retire...
                          </button>
                          <button
                            id={`promote-candidate-btn-${candidate.id}`}
                            onClick={() => handleOpenPromoteModal(candidate)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs rounded-full flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer font-medium"
                          >
                            <span>Promote to Question</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Material Notes Inside Cluster */}
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                      Constituent Open-Problem Notes ({memberNotes.length}):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {memberNotes.map(note => (
                        <div
                          key={note.id}
                          className="p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg flex flex-col justify-between gap-2"
                        >
                          <p className="font-sans text-[0.875rem] text-[var(--color-ink)] leading-snug">
                            {note.text}
                          </p>
                          <div className="flex items-center justify-between text-[0.6875rem] font-mono text-[var(--color-ink-muted)] border-t border-[var(--color-rule)] pt-1.5">
                            <span className="truncate">{note.citation}</span>
                            <span>{note.id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 4 Cols: Loose Open-Problem Pile */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink)] font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Loose Open Problems ({looseNotes.length})
              </span>
              <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] bg-[var(--color-surface)] border border-[var(--color-rule)] px-2 py-0.5 rounded-full">
                Unclustered
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {looseNotes.length === 0 ? (
                <div className="p-8 border border-dashed border-[var(--color-rule)] rounded-xl text-center text-xs font-mono text-[var(--color-ink-muted)] bg-[var(--color-surface)]">
                  No loose notes remaining. All items clustered.
                </div>
              ) : (
                looseNotes.map(note => (
                  <div
                    key={note.id}
                    id={`loose-note-${note.id}`}
                    className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl flex flex-col gap-2 shadow-2xs hover:border-amber-400 dark:hover:border-amber-600 transition-all"
                  >
                    <p className="font-sans text-[0.875rem] text-[var(--color-ink)] leading-relaxed">
                      {note.text}
                    </p>

                    {note.retireReason && (
                      <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 border border-[var(--color-rule)] text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{note.retireReason.kind}:</span> {note.retireReason.reference}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[0.6875rem] font-mono text-[var(--color-ink-muted)] border-t border-[var(--color-rule)] pt-2 mt-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate font-medium">{note.citation}</span>
                        {isStale(note.createdAt) && (
                          <span className="flex items-center gap-1 text-[0.625rem] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                            <Clock className="w-2.5 h-2.5" />
                            <span>&gt;6mo</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {!note.retireReason && (
                          <button
                            onClick={() => handleOpenRetireModal('problem', note.id, note.text.slice(0, 45) + '...')}
                            className="text-[0.6875rem] text-[var(--color-ink-muted)] hover:text-rose-600 underline font-mono cursor-pointer"
                          >
                            Retire
                          </button>
                        )}
                        <span>{note.id}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gate 3 Promotion Modal: Mandatory User Claim + Both Confirmations */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-rule)] max-w-lg w-full p-6 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="border-b border-[var(--color-rule)] pb-3">
              <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                Gate 3 Question Promotion Contract
              </span>
              <h3 className="font-serif text-[1.25rem] font-bold text-[var(--color-ink)] mt-2">
                {selectedCandidate.title}
              </h3>
            </div>

            <p className="text-xs text-[var(--color-ink-muted)] font-sans leading-relaxed">
              A candidate is promoted to a real <strong className="font-mono text-[var(--color-ink)]">QUESTION</strong> only after the user writes a claim that answers it, and confirms it is falsifiable and resolvable within one year. Promotion is one-way.
            </p>

            {/* Mandatory User Claim Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[0.75rem] uppercase text-[var(--color-ink)] font-bold">
                1. Your Initial Claim (Answers this question):
              </label>
              <textarea
                rows={3}
                value={claimText}
                onChange={e => setClaimText(e.target.value)}
                placeholder="e.g. Runtime memory contention accounts for over 65% of latency variance on sub-milliwatt devices."
                className="w-full p-2.5 font-serif text-[0.9375rem] bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-xl text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Mandatory Confirmation 1: Falsifiable */}
            <div
              onClick={() => setConfirmedFalsifiable(!confirmedFalsifiable)}
              className="flex items-start gap-3 p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-xl cursor-pointer select-none transition-colors hover:border-amber-400"
            >
              {confirmedFalsifiable ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              )}
              <div className="flex flex-col text-xs">
                <span className="font-sans font-medium text-[var(--color-ink)]">
                  I confirm this claim could be false.
                </span>
                <span className="text-[0.75rem] text-[var(--color-ink-muted)] mt-0.5">
                  An empirical or formal observation exists that would refute this assertion.
                </span>
              </div>
            </div>

            {/* Mandatory Confirmation 2: Resolvable within 1 year */}
            <div
              onClick={() => setConfirmedSettledWithinYear(!confirmedSettledWithinYear)}
              className="flex items-start gap-3 p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-xl cursor-pointer select-none transition-colors hover:border-amber-400"
            >
              {confirmedSettledWithinYear ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              )}
              <div className="flex flex-col text-xs">
                <span className="font-sans font-medium text-[var(--color-ink)]">
                  I confirm this claim could be settled within a year.
                </span>
                <span className="text-[0.75rem] text-[var(--color-ink-muted)] mt-0.5">
                  The methodology and resources exist to empirically test this relationship.
                </span>
              </div>
            </div>

            {promotionError && (
              <span className="font-mono text-xs text-rose-500 font-medium">
                {promotionError}
              </span>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-rule)]">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-3.5 py-1.5 font-mono text-xs border border-[var(--color-rule)] text-[var(--color-ink)] rounded-full hover:bg-[var(--color-paper)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPromotion}
                disabled={!claimText.trim() || !confirmedFalsifiable || !confirmedSettledWithinYear}
                className="px-4 py-1.5 font-mono text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-full font-medium transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                Promote to Real Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Retire Modal (Mandatory Fixed Set Reason & Reference) */}
      {retiringItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-rule)] max-w-md w-full p-6 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="border-b border-[var(--color-rule)] pb-3">
              <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200/50 dark:border-rose-800/50">
                Structured Retire Flow
              </span>
              <h3 className="font-serif text-base font-bold text-[var(--color-ink)] mt-2">
                Retire {retiringItem.type === 'problem' ? 'Open-Problem Note' : 'Candidate Question'}
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1 font-mono line-clamp-2">
                &ldquo;{retiringItem.title}&rdquo;
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-mono text-[0.75rem] uppercase text-[var(--color-ink)] font-bold">
                Retire Reason (Select from standard research reasons):
              </label>

              <div className="flex flex-col gap-2">
                {[
                  {
                    kind: 'solved_since' as const,
                    label: 'Solved Since',
                    desc: 'Resolved by recent literature (requires citing paper)',
                    placeholder: 'Citing paper title / DOI (e.g. Wu & Zhang 2024, arXiv:2401.12345)'
                  },
                  {
                    kind: 'infeasible' as const,
                    label: 'Infeasible',
                    desc: 'Empirically or technically infeasible with current resources',
                    placeholder: 'Blocking resource or constraint (e.g. Requires 50,000 GPU hours)'
                  },
                  {
                    kind: 'already_stated' as const,
                    label: 'Already Stated',
                    desc: 'Already established or answered in prior literature',
                    placeholder: 'Reference / Section (e.g. Formulated in Bengio 2018 §4.2)'
                  }
                ].map(opt => (
                  <label
                    key={opt.kind}
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-colors ${
                      retireKind === opt.kind
                        ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30'
                        : 'border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="retireKind"
                        checked={retireKind === opt.kind}
                        onChange={() => setRetireKind(opt.kind)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[0.6875rem] text-[var(--color-ink-muted)] ml-5 mt-0.5">
                      {opt.desc}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="font-mono text-[0.75rem] uppercase text-[var(--color-ink)] font-bold">
                  {retireKind === 'solved_since'
                    ? 'Citing Paper / Evidence Reference (Required):'
                    : retireKind === 'infeasible'
                    ? 'Blocking Resource / Constraint Reason (Required):'
                    : 'Prior Reference Citation (Required):'}
                </label>
                <input
                  type="text"
                  value={retireReference}
                  onChange={e => setRetireReference(e.target.value)}
                  placeholder={
                    retireKind === 'solved_since'
                      ? 'e.g. Chen et al. 2024, NeurIPS'
                      : retireKind === 'infeasible'
                      ? 'e.g. Requires dedicated wafer fab equipment'
                      : 'e.g. Shannon 1948 Theorem 2'
                  }
                  className="w-full p-2.5 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-xl text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono"
                />
              </div>

              {retireError && (
                <span className="text-xs font-mono text-rose-500 font-medium">
                  {retireError}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-rule)]">
              <button
                onClick={() => setRetiringItem(null)}
                className="px-3.5 py-1.5 font-mono text-xs border border-[var(--color-rule)] text-[var(--color-ink)] rounded-full hover:bg-[var(--color-paper)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRetire}
                disabled={!retireReference.trim()}
                className="px-4 py-1.5 font-mono text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-full font-medium transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                Confirm Structured Retirement
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
