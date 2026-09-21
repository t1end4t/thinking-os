import { useState, useMemo } from 'react';
import {
  GripVertical,
  Plus,
  Link as LinkIcon,
  BookOpen,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  Filter,
  FileText,
  Trash2,
  ArrowUpRight,
  ExternalLink,
  HelpCircle,
  Layers,
  ChevronDown,
  Tag,
  PenTool
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { setAssistantContextData } from '../../utils/dragDrop';
import { SurveyDialog, type SurveyDialogAction } from './SurveyDialog';
import type { SurveyOpenProblem } from '../../types';

const PROBLEM_MIME = 'application/x-thinking-os-problem';

export function SynthesisView() {
  const {
    openProblems,
    candidateQuestions,
    addSurveyOpenProblem,
    unlinkSurveyProblemFromCandidate,
    unclusteredOpenProblemsCount,
    openPaperSource,
    papers
  } = useWorkspace();

  const [view, setView] = useState<'active' | 'retired'>('active');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<SurveyDialogAction | null>(null);
  const [draggedProblemId, setDraggedProblemId] = useState<string | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualCitation, setManualCitation] = useState('');
  const [manualAttribution, setManualAttribution] = useState<'user-inference' | 'paper-author'>('user-inference');
  const [message, setMessage] = useState('');

  const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());

  const problems = useMemo(
    () => openProblems.filter(problem => Boolean(problem.retireReason) === (view === 'retired') && matches(problem.text)),
    [openProblems, view, query]
  );

  const candidates = useMemo(
    () => candidateQuestions.filter(candidate => Boolean(candidate.retireReason) === (view === 'retired') && matches(candidate.title)),
    [candidateQuestions, view, query]
  );

  const activeSelected = useMemo(
    () => selected.filter(id => openProblems.some(problem => problem.id === id && !problem.retireReason)),
    [selected, openProblems]
  );

  const membershipCount = (id: string) =>
    candidateQuestions.filter(candidate => !candidate.retireReason && candidate.openProblemIds.includes(id)).length;

  const toggle = (id: string) =>
    setSelected(previous => (previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]));

  const selectAllProblems = () => {
    if (activeSelected.length === problems.length) {
      setSelected([]);
    } else {
      setSelected(problems.map(p => p.id));
    }
  };

  const beginDrag = (event: React.DragEvent, problem: SurveyOpenProblem) => {
    setDraggedProblemId(problem.id);
    setAssistantContextData(event, {
      type: 'survey',
      id: problem.id,
      label: problem.text,
      secondaryLabel: problem.citation
    });
    event.dataTransfer.setData(PROBLEM_MIME, problem.id);
    event.dataTransfer.setData('text/plain', problem.id);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="survey-workbench">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-rule)]">
        {/* Active vs Retired Segmented Filter */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]">
          {(['active', 'retired'] as const).map(value => {
            const count = value === 'active'
              ? openProblems.filter(p => !p.retireReason).length
              : openProblems.filter(p => Boolean(p.retireReason)).length;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => {
                  setView(value);
                  setSelected([]);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  view === value
                    ? 'bg-[var(--color-surface)] text-[var(--accent-indigo)] font-semibold shadow-2xs border border-[var(--color-rule)]'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                <span>{value === 'active' ? 'Active Records' : 'Retired'}</span>
                <span className="font-mono text-[0.6875rem] px-1.5 rounded-full bg-[var(--color-rule)] text-[var(--color-ink)]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md min-w-[220px]">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] pointer-events-none" />
            <input
              type="search"
              aria-label="Search synthesis"
              placeholder="Search problems or candidate questions…"
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="w-full text-xs py-1.5 pl-8 pr-7 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--accent-indigo)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Primary Buttons */}
        <div className="flex items-center gap-2">
          {view === 'active' && (
            <button
              type="button"
              onClick={() => setShowManualForm(prev => !prev)}
              className={`survey-btn inline-flex items-center gap-1.5 ${
                showManualForm ? 'border-[var(--accent-indigo)] text-[var(--accent-indigo)]' : ''
              }`}
            >
              <PenTool size={13} />
              <span>{showManualForm ? 'Close Entry Form' : 'Record Problem'}</span>
            </button>
          )}

          <button
            type="button"
            className="survey-btn survey-btn-primary inline-flex items-center gap-1.5"
            onClick={() => setAction({ kind: 'create', problemIds: [] })}
          >
            <Plus size={14} />
            <span>New Candidate Question</span>
          </button>
        </div>
      </div>

      {/* Helper Guideline */}
      <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-ink-muted)]">
        <p>
          Link observations to candidate questions without moving source records. A single observation can inform multiple questions.
        </p>
        <span className="hidden sm:inline font-mono text-[0.6875rem]">
          Drag & drop supported
        </span>
      </div>

      {/* High Unclustered Problems Warning */}
      {unclusteredOpenProblemsCount >= 15 && view === 'active' && (
        <div className="survey-notice my-3">
          <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs">
            <strong className="font-semibold text-[var(--color-ink)]">
              {unclusteredOpenProblemsCount} active observations have no candidate questions yet.
            </strong>
            <p className="text-[var(--color-ink-muted)] mt-0.5">
              Synthesize these observations into falsifiable directions. Recording new source observations remains available at any time.
            </p>
          </div>
        </div>
      )}

      {/* Floating Multi-Selection Action Bar */}
      {activeSelected.length > 0 && (
        <div className="survey-selection" role="status">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-[var(--accent-indigo)] flex items-center gap-1.5">
              <CheckCircle2 size={15} />
              {activeSelected.length} {activeSelected.length === 1 ? 'problem' : 'problems'} selected
            </span>
            <button
              type="button"
              onClick={selectAllProblems}
              className="text-[0.6875rem] text-[var(--color-ink-muted)] hover:underline ml-2"
            >
              {activeSelected.length === problems.length ? 'Deselect all' : 'Select all matching'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="survey-btn survey-btn-primary inline-flex items-center gap-1.5 text-xs"
              onClick={() => setAction({ kind: 'create', problemIds: activeSelected })}
            >
              <Sparkles size={13} />
              <span>Create Candidate from Selection</span>
            </button>

            <button
              type="button"
              className="survey-btn inline-flex items-center gap-1.5 text-xs"
              onClick={() => setAction({ kind: 'link', problemIds: activeSelected })}
            >
              <LinkIcon size={13} />
              <span>Link to Candidate</span>
            </button>

            <button
              type="button"
              onClick={() => setSelected([])}
              className="survey-btn survey-btn-subtle p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              title="Clear selection"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Manual Problem Recording Drawer */}
      {showManualForm && view === 'active' && (
        <div className="mt-4 p-5 rounded-xl border border-[var(--accent-indigo)] bg-[var(--color-surface)] shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-rule)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[var(--accent-indigo)] flex items-center justify-center">
                <PenTool size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--color-ink)]">
                  Record Observation or Open Problem Manually
                </h3>
                <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                  Capture cross-paper tensions, unaddressed edge cases, or experimental anomalies.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded-md"
            >
              <X size={16} />
            </button>
          </div>

          <form
            className="survey-form"
            onSubmit={event => {
              event.preventDefault();
              const result = addSurveyOpenProblem(manualText, manualCitation, { attribution: manualAttribution });
              if (result.success) {
                setManualText('');
                setManualCitation('');
                setMessage('Observation recorded successfully.');
                setTimeout(() => setMessage(''), 4000);
              } else {
                setMessage(result.error || 'Could not record problem.');
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label>
                <span>Problem statement or observation</span>
                <textarea
                  required
                  rows={3}
                  value={manualText}
                  onChange={event => setManualText(event.target.value)}
                  placeholder="What specific limitation, failure mode, or unresolved question was observed?"
                />
              </label>

              <div className="flex flex-col gap-3">
                <label>
                  <span>Citation or source reference</span>
                  <input
                    value={manualCitation}
                    onChange={event => setManualCitation(event.target.value)}
                    placeholder="e.g., Vaswani et al. (2017) or Cross-model evaluation"
                  />
                </label>

                <label>
                  <span>Observation attribution</span>
                  <select
                    value={manualAttribution}
                    onChange={e => setManualAttribution(e.target.value as 'user-inference' | 'paper-author')}
                  >
                    <option value="user-inference">Your inference / synthesis</option>
                    <option value="paper-author">Author-stated limitation in paper</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-rule)]">
              {message ? (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{message}</span>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowManualForm(false)} className="survey-btn">
                  Cancel
                </button>
                <button type="submit" className="survey-btn survey-btn-primary">
                  Record Problem
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Two-Column Synthesis Workbench */}
      <div className="survey-columns">
        {/* Left Column: Open Problems */}
        <section aria-labelledby="survey-problems-heading" className="flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--color-rule)]">
            <div className="flex items-center gap-2">
              <h2 id="survey-problems-heading" className="text-sm font-bold text-[var(--color-ink)]">
                Open Problems
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                {problems.length}
              </span>
            </div>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Source observations
            </span>
          </div>

          {!problems.length && (
            <div className="survey-empty">
              <FileText size={28} className="mx-auto mb-2 text-[var(--color-ink-muted)] opacity-60" />
              <h4 className="text-xs font-semibold text-[var(--color-ink)]">No observations found</h4>
              <p className="text-xs mt-1">
                {query
                  ? 'No problems match your current search query.'
                  : 'Highlight paper passages in the Paper Reader or click "Record Problem" to add cross-paper observations.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {problems.map(problem => {
              const linksCount = membershipCount(problem.id);
              return (
                <article
                  key={problem.id}
                  className={`survey-card ${draggedProblemId === problem.id ? 'opacity-50 ring-2 ring-[var(--accent-indigo)]' : ''}`}
                  data-problem-id={problem.id}
                  draggable={!problem.retireReason}
                  onDragStart={event => beginDrag(event, problem)}
                  onDragEnd={() => {
                    setDraggedProblemId(null);
                    setHoveredCandidate(null);
                  }}
                >
                  <div className="survey-card-heading">
                    {!problem.retireReason && (
                      <input
                        type="checkbox"
                        aria-label={`Select problem: ${problem.text}`}
                        checked={selected.includes(problem.id)}
                        onChange={() => toggle(problem.id)}
                      />
                    )}
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      {problem.text}
                    </p>
                    {!problem.retireReason && (
                      <span title="Drag onto a candidate question on the right" className="cursor-grab active:cursor-grabbing text-[var(--color-ink-muted)] p-0.5 hover:text-[var(--color-ink)]">
                        <GripVertical size={15} aria-hidden="true" />
                      </span>
                    )}
                  </div>

                  {/* Metadata & Attribution Row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-1">
                    <span className="survey-meta font-semibold">
                      {problem.citation}
                      {problem.pageNumber ? ` · p. ${problem.pageNumber}` : ''}
                    </span>

                    <span
                      className={`survey-pill font-mono ${
                        problem.attribution === 'paper-author'
                          ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800'
                          : 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800'
                      }`}
                    >
                      {problem.attribution === 'paper-author'
                        ? 'Author limitation'
                        : problem.attribution === 'user-inference'
                        ? 'Your inference'
                        : 'Unrecorded attribution'}
                    </span>

                    <span
                      className={`survey-pill font-mono text-[0.625rem] ${
                        linksCount > 0
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                          : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <LinkIcon size={10} />
                      {linksCount} {linksCount === 1 ? 'candidate' : 'candidates'}
                    </span>
                  </div>

                  {/* Source Excerpt details */}
                  {problem.excerpt && (
                    <details className="mt-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg p-2">
                      <summary className="cursor-pointer font-medium text-[var(--color-ink)] text-[0.6875rem] flex items-center justify-between">
                        <span>Source paper passage</span>
                        <ChevronDown size={12} className="text-[var(--color-ink-muted)]" />
                      </summary>
                      <blockquote className="italic font-serif text-[0.75rem] text-[var(--color-ink)] border-l-2 border-[var(--accent-indigo)] pl-2.5 my-2">
                        {problem.excerpt}
                      </blockquote>
                    </details>
                  )}

                  {/* Retired notice */}
                  {problem.retireReason && (
                    <div className="mt-2 text-[0.6875rem] font-mono text-[var(--color-missing)] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md px-2 py-1">
                      Retired: {problem.retireReason.kind.replaceAll('_', ' ')} · {problem.retireReason.reference}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-[var(--color-rule)]">
                    {problem.paperId && (
                      <button
                        type="button"
                        disabled={!papers.some(paper => paper.id === problem.paperId)}
                        onClick={() => problem.paperId && openPaperSource(problem.paperId, problem.pageNumber)}
                        className="survey-btn inline-flex items-center gap-1"
                        title="Open paper in reader at this page"
                      >
                        <BookOpen size={12} />
                        <span>Open source</span>
                      </button>
                    )}

                    {!problem.retireReason && (
                      <>
                        <button
                          type="button"
                          className="survey-btn inline-flex items-center gap-1"
                          onClick={() => setAction({ kind: 'link', problemIds: [problem.id] })}
                        >
                          <LinkIcon size={12} />
                          <span>Link to candidate</span>
                        </button>

                        <button
                          type="button"
                          className="survey-btn text-[var(--color-missing)] hover:border-[var(--color-missing)]"
                          onClick={() => setAction({ kind: 'retire', item: problem, itemType: 'problem' })}
                        >
                          Retire
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Right Column: Candidate Questions */}
        <section aria-labelledby="survey-candidates-heading" className="flex flex-col min-w-0">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--color-rule)]">
            <div className="flex items-center gap-2">
              <h2 id="survey-candidates-heading" className="text-sm font-bold text-[var(--color-ink)]">
                Candidate Questions
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                {candidates.length}
              </span>
            </div>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Formulated research directions
            </span>
          </div>

          {!candidates.length && (
            <div className="survey-empty">
              <Sparkles size={28} className="mx-auto mb-2 text-[var(--color-ink-muted)] opacity-60" />
              <h4 className="text-xs font-semibold text-[var(--color-ink)]">No candidate questions yet</h4>
              <p className="text-xs mt-1">
                {query
                  ? 'No candidate questions match your query.'
                  : 'Click "+ New Candidate Question" or drag problems from the left to shape your research agenda.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {candidates.map(candidate => (
              <article
                key={candidate.id}
                className={`survey-card ${hoveredCandidate === candidate.id ? 'survey-drop-active' : ''}`}
                data-candidate-id={candidate.id}
                draggable
                onDragStart={event =>
                  setAssistantContextData(event, {
                    type: 'survey',
                    id: candidate.id,
                    label: candidate.title,
                    secondaryLabel: 'Candidate question'
                  })
                }
                onDragEnter={event => {
                  if (!candidate.retireReason && !candidate.promotedQuestionId) {
                    event.preventDefault();
                    setHoveredCandidate(candidate.id);
                  }
                }}
                onDragOver={event => {
                  if (!candidate.retireReason && !candidate.promotedQuestionId) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                    if (hoveredCandidate !== candidate.id) {
                      setHoveredCandidate(candidate.id);
                    }
                  }
                }}
                onDragLeave={event => {
                  if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) {
                    setHoveredCandidate(null);
                  }
                }}
                onDrop={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  setHoveredCandidate(null);
                  const droppedId =
                    event.dataTransfer.getData(PROBLEM_MIME) ||
                    draggedProblemId ||
                    event.dataTransfer.getData('text/plain');
                  setDraggedProblemId(null);
                  if (
                    !candidate.retireReason &&
                    !candidate.promotedQuestionId &&
                    droppedId &&
                    openProblems.some(problem => problem.id === droppedId && !problem.retireReason)
                  ) {
                    setAction({
                      kind: 'link',
                      candidateId: candidate.id,
                      problemIds: activeSelected.includes(droppedId) ? activeSelected : [droppedId]
                    });
                  }
                }}
              >
                {/* Header & Status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--color-ink)] leading-snug">
                    {candidate.title}
                  </h3>
                  <div className="shrink-0">
                    {candidate.promotedQuestionId ? (
                      <span className="survey-pill font-mono text-[0.625rem] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={10} />
                        Promoted to Graph
                      </span>
                    ) : candidate.retireReason ? (
                      <span className="survey-pill font-mono text-[0.625rem] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800">
                        Retired
                      </span>
                    ) : (
                      <span className="survey-pill font-mono text-[0.625rem] text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800">
                        Candidate
                      </span>
                    )}
                  </div>
                </div>

                {/* Linked Problems List */}
                <div className="mt-3 space-y-2">
                  <div className="text-[0.6875rem] font-bold tracking-wider uppercase text-[var(--color-ink-muted)]">
                    Linked observations ({(candidate.problemLinks || []).length})
                  </div>

                  {(candidate.problemLinks || []).map(link => {
                    const problem = openProblems.find(item => item.id === link.problemId);
                    return (
                      <div className="survey-linked-problem text-xs" key={link.id}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-[var(--color-ink)]">
                            {problem?.text || 'Source problem unavailable'}
                            {problem?.retireReason && <span className="text-rose-500 ml-1">(retired)</span>}
                          </p>
                          {!candidate.retireReason && !candidate.promotedQuestionId && (
                            <button
                              type="button"
                              aria-label={`Unlink ${problem?.text || link.problemId} from ${candidate.title}`}
                              onClick={() => unlinkSurveyProblemFromCandidate(candidate.id, link.problemId)}
                              className="survey-btn survey-btn-subtle p-1 text-[var(--color-ink-muted)] hover:text-rose-600"
                              title="Unlink observation"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        <p className="text-[0.6875rem] text-[var(--color-ink-muted)] italic">
                          {link.legacy ? 'Legacy association: ' : 'Why linked: '}
                          {link.userReason}
                        </p>
                      </div>
                    );
                  })}

                  {(!candidate.problemLinks || candidate.problemLinks.length === 0) && (
                    <div className="text-xs text-[var(--color-ink-muted)] italic py-1">
                      No problems linked yet. Drag a problem here or click "+ Link Observation".
                    </div>
                  )}
                </div>

                {/* Drop Hint */}
                {!candidate.retireReason && !candidate.promotedQuestionId && (
                  <div
                    className={`survey-drop-hint mt-2 transition-all p-2 rounded-lg ${
                      hoveredCandidate === candidate.id
                        ? 'border border-[var(--accent-indigo)] bg-indigo-50/80 dark:bg-indigo-950/60 text-[var(--accent-indigo)] font-semibold'
                        : ''
                    }`}
                  >
                    <GripVertical size={12} className="text-[var(--accent-indigo)] shrink-0" />
                    <span>
                      {hoveredCandidate === candidate.id
                        ? 'Release to link observation to this question'
                        : 'Drop problems here to link. Source records stay unchanged.'}
                    </span>
                  </div>
                )}

                {/* Retirement Reference */}
                {candidate.retireReason && (
                  <p className="text-[0.6875rem] font-mono text-[var(--color-missing)] mt-2">
                    Retired: {candidate.retireReason.kind.replaceAll('_', ' ')} · {candidate.retireReason.reference}
                  </p>
                )}

                {/* Action Footer */}
                {!candidate.retireReason && !candidate.promotedQuestionId && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-[var(--color-rule)]">
                    <button
                      type="button"
                      className="survey-btn survey-btn-primary inline-flex items-center gap-1 text-xs"
                      onClick={() => setAction({ kind: 'promote', candidate })}
                      title="Promote to formal Research Question in the Argument Graph"
                    >
                      <Sparkles size={13} />
                      <span>Promote to Graph</span>
                    </button>

                    <button
                      type="button"
                      className="survey-btn inline-flex items-center gap-1"
                      onClick={() => setAction({ kind: 'link', candidateId: candidate.id, problemIds: [] })}
                    >
                      <LinkIcon size={12} />
                      <span>Link Problem</span>
                    </button>

                    <button
                      type="button"
                      className="survey-btn"
                      onClick={() => setAction({ kind: 'edit', candidate })}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="survey-btn text-[var(--color-missing)] hover:border-[var(--color-missing)]"
                      onClick={() => setAction({ kind: 'retire', item: candidate, itemType: 'candidate' })}
                    >
                      Retire
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Modal Dialog */}
      {action && <SurveyDialog action={action} onClose={() => setAction(null)} />}
    </div>
  );
}
