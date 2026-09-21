import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { SurveyCandidateQuestion, SurveyOpenProblem, SurveyRetireReasonKind } from '../../types';

export type SurveyDialogAction =
  | { kind: 'create'; problemIds: string[] }
  | { kind: 'link'; problemIds: string[]; candidateId?: string }
  | { kind: 'edit' | 'promote'; candidate: SurveyCandidateQuestion }
  | { kind: 'retire'; item: SurveyCandidateQuestion | SurveyOpenProblem; itemType: 'candidate' | 'problem' };

export function SurveyDialog({ action, onClose }: { action: SurveyDialogAction; onClose: () => void }) {
  const { candidateQuestions, openProblems, addSurveyCandidate, updateSurveyCandidate,
    linkSurveyProblemsToCandidate, promoteCandidateQuestion, retireSurveyCandidateQuestion, retireSurveyOpenProblem } = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(action.kind === 'edit' ? action.candidate.title : '');
  const [reason, setReason] = useState('');
  const [candidateId, setCandidateId] = useState(action.kind === 'link' ? action.candidateId || '' : '');
  const [falsifiable, setFalsifiable] = useState(false);
  const [withinYear, setWithinYear] = useState(false);
  const [retireKind, setRetireKind] = useState<SurveyRetireReasonKind>('solved_since');
  const [error, setError] = useState('');
  const heading = { create: 'New candidate question', link: 'Link problems to candidate', edit: 'Edit candidate question',
    promote: 'Promote to research question', retire: 'Retire record' }[action.kind];
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.showModal();
    return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    let result: { success: boolean; error?: string };
    switch (action.kind) {
      case 'create': result = addSurveyCandidate(title, action.problemIds, reason); break;
      case 'edit': result = updateSurveyCandidate(action.candidate.id, title); break;
      case 'link': result = linkSurveyProblemsToCandidate(candidateId, action.problemIds, reason); break;
      case 'promote': result = promoteCandidateQuestion(action.candidate.id, title, falsifiable, withinYear); break;
      case 'retire': {
        if (!reason.trim()) { setError('Add a reference or blocking constraint.'); return; }
        const retirement = { kind: retireKind, reference: reason.trim(), retiredAt: Date.now() };
        if (action.itemType === 'candidate') retireSurveyCandidateQuestion(action.item.id, retirement);
        else retireSurveyOpenProblem(action.item.id, retirement);
        result = { success: true };
      }
    }
    if (result.success) onClose();
    else setError(result.error || 'Could not save.');
  };

  return <dialog ref={dialog} className="survey-dialog" aria-labelledby="survey-dialog-title" onCancel={onClose}>
    <form onSubmit={submit} className="survey-form">
      <h2 id="survey-dialog-title">{heading}</h2>
      {(action.kind === 'create' || action.kind === 'link') && action.problemIds.length > 0 && <div className="survey-source">
        <strong>{action.problemIds.length} selected problems</strong>
        <ul>{action.problemIds.map(id => <li key={id}>{openProblems.find(problem => problem.id === id)?.text || 'Unavailable problem'}</li>)}</ul>
      </div>}
      {(action.kind === 'create' || action.kind === 'edit') && <label>Candidate question
        <textarea autoFocus required value={title} onChange={event => setTitle(event.target.value)} rows={3} placeholder="What question could these problems motivate?" />
      </label>}
      {action.kind === 'link' && <label>Candidate question
        <select autoFocus required value={candidateId} onChange={event => setCandidateId(event.target.value)}>
          <option value="">Choose a candidate</option>
          {candidateQuestions.filter(candidate => !candidate.retireReason && !candidate.promotedQuestionId).map(candidate =>
            <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
        </select>
      </label>}
      {(action.kind === 'link' || (action.kind === 'create' && action.problemIds.length > 0)) && <label>Why do these problems matter to this question?
        <textarea required value={reason} onChange={event => setReason(event.target.value)} rows={3} />
        <span className="survey-muted">This reason is saved on each new link. Existing links are unchanged.</span>
      </label>}
      {action.kind === 'promote' && <>
        <p>{action.candidate.title}</p>
        <label>Proposed claim answering this question<textarea autoFocus required value={title} onChange={event => setTitle(event.target.value)} rows={3} /></label>
        <label className="survey-check"><input type="checkbox" required checked={falsifiable} onChange={event => setFalsifiable(event.target.checked)} />This claim could be false.</label>
        <label className="survey-check"><input type="checkbox" required checked={withinYear} onChange={event => setWithinYear(event.target.checked)} />I can test this claim within a year.</label>
        <p className="survey-muted">Creates a research question and an unverified claim. This is not a scientific conclusion.</p>
      </>}
      {action.kind === 'retire' && <>
        <p>{'title' in action.item ? action.item.title : action.item.text}</p>
        <fieldset><legend>Retirement reason</legend>
          {(['solved_since', 'infeasible', 'already_stated'] as const).map(kind => <label key={kind} className="survey-check">
            <input type="radio" name="retire-kind" checked={retireKind === kind} onChange={() => setRetireKind(kind)} />{kind.replaceAll('_', ' ')}
          </label>)}
        </fieldset>
        <label>Reference or blocking constraint<textarea required value={reason} onChange={event => setReason(event.target.value)} rows={3} /></label>
        <p className="survey-muted">The record and its existing links remain available under Retired.</p>
      </>}
      {error && <p role="alert">{error}</p>}
      <footer className="survey-actions"><button type="button" onClick={onClose}>Cancel</button>
        <button className="survey-primary" type="submit">{action.kind === 'link' ? 'Save links' : action.kind === 'promote' ? 'Promote question' : 'Save'}</button></footer>
    </form>
  </dialog>;
}
