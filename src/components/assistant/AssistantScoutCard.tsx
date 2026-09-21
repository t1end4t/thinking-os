import { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, FileSearch, Loader2, Pencil, Play, Square, X } from 'lucide-react';
import type { ScoutBrief, ScoutBriefInput, ScoutReport, ScoutRun, ScoutRunState } from '../../scoutTypes';

const ACTIVE_STAGES: Readonly<Partial<Record<ScoutRunState, string>>> = {
  queued: 'Preparing queries',
  retrieving: 'Searching sources',
  normalizing: 'Deduplicating candidates',
  screening: 'Screening titles and abstracts',
  assembling: 'Building the shortlist',
  cancelling: 'Cancelling the run'
};

type Draft = {
  readonly question: string;
  readonly purpose: string;
  readonly scope: string;
  readonly exclusions: string;
  readonly constraints: string;
  readonly directions: string;
  readonly criteria: string;
  readonly maxRecommendations: number;
};

function draftOf(brief: ScoutBrief): Draft {
  return {
    question: brief.question,
    purpose: brief.purpose,
    scope: brief.scope.join('\n'),
    exclusions: brief.exclusions.join('\n'),
    constraints: brief.constraints.join('\n'),
    directions: brief.searchDirections.map(direction => `${direction.query} :: ${direction.reason}`).join('\n'),
    criteria: brief.screeningCriteria.join('\n'),
    maxRecommendations: brief.maxRecommendations
  };
}

function lines(value: string): string[] {
  return value.split('\n').map(line => line.trim()).filter(Boolean);
}

function inputOf(brief: ScoutBrief, draft: Draft): ScoutBriefInput | null {
  const searchDirections = lines(draft.directions).map(line => {
    const separator = line.indexOf('::');
    return separator < 0 ? null : { query: line.slice(0, separator).trim(), reason: line.slice(separator + 2).trim() };
  });
  if (!draft.question.trim() || !draft.purpose.trim() || !searchDirections.length || searchDirections.some(direction => !direction?.query || !direction.reason)) return null;
  return {
    question: draft.question.trim(), purpose: draft.purpose.trim(), scope: lines(draft.scope), exclusions: lines(draft.exclusions),
    constraints: lines(draft.constraints), searchDirections: searchDirections.filter((direction): direction is NonNullable<typeof direction> => Boolean(direction)),
    screeningCriteria: lines(draft.criteria), maxRecommendations: draft.maxRecommendations,
    createdFrom: brief.createdFrom, author: 'user'
  };
}

export function AssistantScoutCard({ brief, run, report, busy, onSave, onRun, onCancel, onOpenReport }: {
  readonly brief: ScoutBrief;
  readonly run?: ScoutRun;
  readonly report?: ScoutReport;
  readonly busy: boolean;
  readonly onSave: (input: ScoutBriefInput) => Promise<boolean>;
  readonly onRun: () => Promise<boolean>;
  readonly onCancel: () => Promise<boolean>;
  readonly onOpenReport: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(() => draftOf(brief));
  const [validation, setValidation] = useState('');
  const stage = run ? ACTIVE_STAGES[run.state] : undefined;
  const active = Boolean(stage);

  useEffect(() => setDraft(draftOf(brief)), [brief]);

  const close = () => {
    dialog.current?.close();
    requestAnimationFrame(() => reviewButton.current?.focus());
  };
  const save = async () => {
    const input = inputOf(brief, draft);
    if (!input) { setValidation('Question, purpose, and every “query :: reason” line are required.'); return; }
    setValidation('');
    if (await onSave(input)) close();
  };

  return (
    <article className="assistant-scout-card" aria-label="Scout brief">
      <header><span><FileSearch size={14} />Scout brief</span><span>{run?.state ?? 'draft'}</span></header>
      <h3>{brief.question}</h3>
      <p>{brief.purpose}</p>
      <dl>
        <div><dt>Scope</dt><dd>{brief.scope.join(' · ') || 'No narrow scope recorded'}</dd></div>
        <div><dt>Exclusions</dt><dd>{brief.exclusions.join(' · ') || 'None recorded'}</dd></div>
        <div><dt>Search directions</dt><dd>{brief.searchDirections.length}</dd></div>
        <div><dt>Screening</dt><dd>{brief.screeningCriteria.join(' · ') || 'Title and abstract relevance'}</dd></div>
        <div><dt>Maximum</dt><dd>{brief.maxRecommendations} recommendations</dd></div>
      </dl>
      {run && stage && <div className="assistant-scout-progress" role="status"><Loader2 size={13} className="animate-spin" /><span>{stage}</span>
        <small>{run.counters.screened ? `${run.counters.screened} screened` : 'Detached run; assistant remains available'}</small></div>}
      {report && <section className="assistant-scout-result" aria-label="Scout result summary">
        <strong><CheckCircle2 size={13} />{report.recommendations.length} recommended · {report.uncertain.length} uncertain</strong>
        {report.recommendations.map(candidate => <p key={candidate.id}>{candidate.title}</p>)}
        {report.limitations[0] && <small>{report.limitations[0]}</small>}
      </section>}
      <div className="assistant-scout-actions">
        <button ref={reviewButton} type="button" onClick={() => dialog.current?.showModal()} disabled={busy || active}><Pencil size={12} />Review brief</button>
        {!active && !report && <button type="button" className="primary" onClick={() => void onRun()} disabled={busy}><Play size={12} />Run scout</button>}
        {run && active && <button type="button" onClick={() => void onCancel()} disabled={busy || run.state === 'cancelling'}><Square size={11} />Cancel</button>}
        {report && <button type="button" className="primary" onClick={onOpenReport}><BookOpen size={12} />Open full report</button>}
      </div>
      <dialog ref={dialog} className="assistant-scout-dialog" aria-labelledby={`scout-review-${brief.id}`} onCancel={close}>
        <form method="dialog" onSubmit={event => { event.preventDefault(); void save(); }}>
          <header><h2 id={`scout-review-${brief.id}`}>Review scout brief</h2><button type="button" onClick={close} aria-label="Close scout brief review"><X size={15} /></button></header>
          <label>Research question<textarea rows={3} value={draft.question} onChange={event => setDraft(current => ({ ...current, question: event.target.value }))} /></label>
          <label>Purpose<textarea rows={2} value={draft.purpose} onChange={event => setDraft(current => ({ ...current, purpose: event.target.value }))} /></label>
          <label>Included scope<textarea rows={2} value={draft.scope} onChange={event => setDraft(current => ({ ...current, scope: event.target.value }))} placeholder="One item per line" /></label>
          <label>Exclusions<textarea rows={2} value={draft.exclusions} onChange={event => setDraft(current => ({ ...current, exclusions: event.target.value }))} placeholder="One item per line" /></label>
          <label>Constraints<textarea rows={2} value={draft.constraints} onChange={event => setDraft(current => ({ ...current, constraints: event.target.value }))} placeholder="One item per line" /></label>
          <label>Search directions<textarea rows={4} value={draft.directions} onChange={event => setDraft(current => ({ ...current, directions: event.target.value }))} placeholder="query :: reason" /></label>
          <label>Screening criteria<textarea rows={3} value={draft.criteria} onChange={event => setDraft(current => ({ ...current, criteria: event.target.value }))} placeholder="One criterion per line" /></label>
          <label>Maximum recommendations<input type="number" min={1} max={5} value={draft.maxRecommendations} onChange={event => setDraft(current => ({ ...current, maxRecommendations: Number(event.target.value) }))} /></label>
          {validation && <p role="alert">{validation}</p>}
          <footer><button type="button" onClick={close}>Cancel</button><button type="submit" className="primary" disabled={busy}>Save brief</button></footer>
        </form>
      </dialog>
    </article>
  );
}
