import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { SurveyCandidateQuestion, SurveyOpenProblem, SurveyRetireReasonKind } from '../../types';
import {
  Sparkles,
  Link as LinkIcon,
  Plus,
  PenTool,
  Archive,
  X,
  AlertCircle,
  FileText,
  CheckSquare,
  HelpCircle
} from 'lucide-react';

export type SurveyDialogAction =
  | { kind: 'create'; problemIds: string[] }
  | { kind: 'link'; problemIds: string[]; candidateId?: string }
  | { kind: 'edit' | 'promote'; candidate: SurveyCandidateQuestion }
  | { kind: 'retire'; item: SurveyCandidateQuestion | SurveyOpenProblem; itemType: 'candidate' | 'problem' };

const RATIONALE_PRESETS = [
  'Direct empirical limitation motivating this candidate question',
  'Core theoretical tension observed in current literature',
  'Unresolved boundary condition requiring investigation',
  'Contradictory empirical result needing mechanistic explanation'
];

export function SurveyDialog({ action, onClose }: { action: SurveyDialogAction; onClose: () => void }) {
  const {
    candidateQuestions,
    openProblems,
    addSurveyCandidate,
    updateSurveyCandidate,
    linkSurveyProblemsToCandidate,
    promoteCandidateQuestion,
    retireSurveyCandidateQuestion,
    retireSurveyOpenProblem
  } = useWorkspace();

  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(action.kind === 'edit' ? action.candidate.title : '');
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>(
    action.kind === 'create' || action.kind === 'link' ? action.problemIds : []
  );
  const [reason, setReason] = useState(
    action.kind === 'link' ? 'Direct empirical limitation motivating this candidate question.' : ''
  );
  const [candidateId, setCandidateId] = useState(action.kind === 'link' ? action.candidateId || '' : '');
  const [falsifiable, setFalsifiable] = useState(false);
  const [withinYear, setWithinYear] = useState(false);
  const [retireKind, setRetireKind] = useState<SurveyRetireReasonKind>('solved_since');
  const [error, setError] = useState('');

  const dialogConfig = {
    create: {
      title: 'New Candidate Question',
      subtitle: 'Formulate a potential research direction motivated by observations.',
      icon: Plus,
      submitText: 'Create Candidate'
    },
    link: {
      title: 'Link Observations to Candidate',
      subtitle: 'Establish a traceable rationale connecting problem observations to a question.',
      icon: LinkIcon,
      submitText: 'Save Links'
    },
    edit: {
      title: 'Edit Candidate Question',
      subtitle: 'Refine the phrasing and focus of this research direction.',
      icon: PenTool,
      submitText: 'Save Changes'
    },
    promote: {
      title: 'Promote to Research Graph',
      subtitle: 'Graduate this candidate into an active Research Question with a falsifiable Claim.',
      icon: Sparkles,
      submitText: 'Promote to Graph'
    },
    retire: {
      title: 'Retire Record',
      subtitle: 'Document why this direction or observation is no longer actively pursued.',
      icon: Archive,
      submitText: 'Confirm Retirement'
    }
  }[action.kind];

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    let result: { success: boolean; error?: string };

    switch (action.kind) {
      case 'create':
        result = addSurveyCandidate(title, selectedProblemIds, reason);
        break;
      case 'edit':
        result = updateSurveyCandidate(action.candidate.id, title);
        break;
      case 'link':
        if (!selectedProblemIds.length) {
          setError('Please select at least one observation to link.');
          return;
        }
        if (!candidateId) {
          setError('Please select a target candidate question.');
          return;
        }
        result = linkSurveyProblemsToCandidate(candidateId, selectedProblemIds, reason);
        break;
      case 'promote':
        result = promoteCandidateQuestion(action.candidate.id, title, falsifiable, withinYear);
        break;
      case 'retire': {
        if (!reason.trim()) {
          setError('Please provide a reference, blocking constraint, or explanation.');
          return;
        }
        const retirement = { kind: retireKind, reference: reason.trim(), retiredAt: Date.now() };
        if (action.itemType === 'candidate') {
          retireSurveyCandidateQuestion(action.item.id, retirement);
        } else {
          retireSurveyOpenProblem(action.item.id, retirement);
        }
        result = { success: true };
        break;
      }
    }

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Could not save.');
    }
  };

  const Icon = dialogConfig.icon;

  return (
    <dialog
      ref={dialog}
      className="survey-dialog"
      aria-labelledby="survey-dialog-title"
      onCancel={onClose}
    >
      <div className="survey-dialog-inner">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--color-rule)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[var(--accent-indigo)] flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div>
              <h2 id="survey-dialog-title" className="text-sm font-bold text-[var(--color-ink)]">
                {dialogConfig.title}
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                {dialogConfig.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} className="survey-form">
          {/* Selected Problems Preview & Selector */}
          {(action.kind === 'create' || action.kind === 'link') && (
            <div className="survey-source">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)] mb-1">
                <span className="flex items-center gap-1.5">
                  <FileText size={13} className="text-[var(--accent-indigo)]" />
                  {selectedProblemIds.length} {selectedProblemIds.length === 1 ? 'Selected Observation' : 'Selected Observations'}
                </span>
                {action.kind === 'link' && selectedProblemIds.length < openProblems.filter(p => !p.retireReason).length && (
                  <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Link observations
                  </span>
                )}
              </div>

              {selectedProblemIds.length > 0 ? (
                <ul className="text-xs text-[var(--color-ink-muted)] space-y-1">
                  {selectedProblemIds.map(id => {
                    const prob = openProblems.find(problem => problem.id === id);
                    return (
                      <li key={id} className="flex items-start justify-between gap-2 py-0.5">
                        <span className="text-[var(--color-ink)] font-medium">
                          {prob?.text || 'Unavailable problem'}
                          {prob?.citation && (
                            <span className="text-[0.6875rem] text-[var(--color-ink-muted)] font-mono ml-1.5">
                              ({prob.citation})
                            </span>
                          )}
                        </span>
                        {action.kind === 'link' && selectedProblemIds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedProblemIds(prev => prev.filter(item => item !== id))}
                            className="text-[var(--color-ink-muted)] hover:text-rose-600 p-0.5"
                            title="Remove observation from this link action"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-1">
                  <select
                    className="w-full text-xs py-1.5 px-2.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)]"
                    value=""
                    onChange={event => {
                      if (event.target.value) {
                        setSelectedProblemIds([event.target.value]);
                      }
                    }}
                  >
                    <option value="">Select an observation to link…</option>
                    {openProblems
                      .filter(problem => !problem.retireReason)
                      .map(problem => (
                        <option key={problem.id} value={problem.id}>
                          {problem.text.length > 70 ? `${problem.text.slice(0, 70)}…` : problem.text} ({problem.citation})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Candidate Question Text */}
          {(action.kind === 'create' || action.kind === 'edit') && (
            <label>
              <span>Candidate Research Question</span>
              <textarea
                autoFocus
                required
                value={title}
                onChange={event => setTitle(event.target.value)}
                rows={3}
                placeholder="What core question could these observations motivate?"
              />
            </label>
          )}

          {/* Target Candidate Selection for Linking */}
          {action.kind === 'link' && (
            action.candidateId ? (
              <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)]">
                <span className="text-[0.6875rem] uppercase font-bold tracking-wider text-[var(--color-ink-muted)]">
                  Target Candidate Question
                </span>
                <p className="text-xs font-semibold text-[var(--color-ink)] mt-0.5">
                  {candidateQuestions.find(candidate => candidate.id === candidateId)?.title || candidateId}
                </p>
              </div>
            ) : (
              <label>
                <span>Target Candidate Question</span>
                <select
                  autoFocus
                  required
                  value={candidateId}
                  onChange={event => setCandidateId(event.target.value)}
                >
                  <option value="">Choose a candidate question…</option>
                  {candidateQuestions
                    .filter(candidate => !candidate.retireReason && !candidate.promotedQuestionId)
                    .map(candidate => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.title}
                      </option>
                    ))}
                </select>
              </label>
            )
          )}

          {/* Link Rationale with Quick Presets */}
          {(action.kind === 'link' || (action.kind === 'create' && selectedProblemIds.length > 0)) && (
            <label>
              <div className="flex items-center justify-between">
                <span>Why do these observations matter to this question? (Required rationale)</span>
              </div>
              <textarea
                autoFocus={action.kind === 'link' && Boolean(action.candidateId)}
                required
                value={reason}
                onChange={event => setReason(event.target.value)}
                rows={2}
                placeholder="Describe the scientific mechanism, theoretical gap, or empirical contradiction..."
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {RATIONALE_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[0.6875rem] px-2 py-0.5 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--accent-indigo)] hover:border-[var(--accent-indigo)] transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <span className="survey-muted text-[0.6875rem] block mt-1">
                This reason is preserved on each link to ensure argument traceability.
              </span>
            </label>
          )}

          {/* Promote Candidate Flow */}
          {action.kind === 'promote' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)]">
                <span className="text-[0.6875rem] uppercase font-bold tracking-wider text-[var(--color-ink-muted)]">
                  Research Question
                </span>
                <p className="text-xs font-semibold text-[var(--color-ink)] mt-0.5">
                  {action.candidate.title}
                </p>
              </div>

              <label>
                <span>Proposed initial claim answering this question</span>
                <textarea
                  autoFocus
                  required
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  rows={3}
                  placeholder="State an empirical assertion or hypothesis that directly answers the question..."
                />
              </label>

              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-[var(--accent-indigo)]" />
                  Falsifiability Commitments (Required)
                </span>

                <label className="survey-check select-none">
                  <input
                    type="checkbox"
                    required
                    checked={falsifiable}
                    onChange={event => setFalsifiable(event.target.checked)}
                  />
                  <span className="text-xs text-[var(--color-ink)]">
                    This claim is falsifiable (it can be shown false by counter-evidence).
                  </span>
                </label>

                <label className="survey-check select-none">
                  <input
                    type="checkbox"
                    required
                    checked={withinYear}
                    onChange={event => setWithinYear(event.target.checked)}
                  />
                  <span className="text-xs text-[var(--color-ink)]">
                    I can empirically test or evaluate this claim within a year.
                  </span>
                </label>
              </div>

              <p className="text-[0.6875rem] text-[var(--color-ink-muted)] italic leading-relaxed">
                Graduates this candidate into an active Research Question and creates an unverified Claim in your Research Graph.
              </p>
            </div>
          )}

          {/* Retirement Flow */}
          {action.kind === 'retire' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)]">
                <span className="text-[0.6875rem] uppercase font-bold tracking-wider text-[var(--color-ink-muted)]">
                  Record to Retire
                </span>
                <p className="text-xs font-semibold text-[var(--color-ink)] mt-0.5">
                  {'title' in action.item ? action.item.title : action.item.text}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--color-ink)]">
                  Retirement Category
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['solved_since', 'infeasible', 'already_stated'] as const).map(kind => (
                    <label
                      key={kind}
                      className={`survey-check cursor-pointer ${
                        retireKind === kind ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)]' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="retire-kind"
                        checked={retireKind === kind}
                        onChange={() => setRetireKind(kind)}
                      />
                      <span className="text-xs capitalize font-medium">
                        {kind.replaceAll('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <label>
                <span>Reference, citation, or blocking constraint</span>
                <textarea
                  required
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  rows={3}
                  placeholder="Explain why this problem or direction is retired..."
                />
              </label>

              <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                The record and its relationship links remain safely archived and viewable under the "Retired" filter.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-rule)]">
            <button type="button" onClick={onClose} className="survey-btn">
              Cancel
            </button>
            <button type="submit" className="survey-btn survey-btn-primary">
              {dialogConfig.submitText}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
