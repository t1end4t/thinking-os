import { useState } from 'react';
import { GripVertical, Plus, Link as LinkIcon } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { setAssistantContextData } from '../../utils/dragDrop';
import { SurveyDialog, type SurveyDialogAction } from './SurveyDialog';
import type { SurveyOpenProblem } from '../../types';

const PROBLEM_MIME = 'application/x-thinking-os-problem';

export function SynthesisView() {
  const { openProblems, candidateQuestions, addSurveyOpenProblem, unlinkSurveyProblemFromCandidate,
    unclusteredOpenProblemsCount, openPaperSource, papers } = useWorkspace();
  const [view, setView] = useState<'active' | 'retired'>('active');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<SurveyDialogAction | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [manualCitation, setManualCitation] = useState('');
  const [message, setMessage] = useState('');
  const matches = (text: string) => text.toLowerCase().includes(query.trim().toLowerCase());
  const problems = openProblems.filter(problem => Boolean(problem.retireReason) === (view === 'retired') && matches(problem.text));
  const candidates = candidateQuestions.filter(candidate => Boolean(candidate.retireReason) === (view === 'retired') && matches(candidate.title));
  const activeSelected = selected.filter(id => openProblems.some(problem => problem.id === id && !problem.retireReason));
  const membershipCount = (id: string) => candidateQuestions.filter(candidate => !candidate.retireReason && candidate.openProblemIds.includes(id)).length;
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  const beginDrag = (event: React.DragEvent, problem: SurveyOpenProblem) => {
    setAssistantContextData(event, { type: 'survey', id: problem.id, label: problem.text, secondaryLabel: problem.citation });
    event.dataTransfer.setData(PROBLEM_MIME, problem.id);
  };

  return <div className="survey-workbench">
    <div className="survey-toolbar">
      <div className="survey-actions" aria-label="Record status">{(['active', 'retired'] as const).map(value =>
        <button key={value} aria-pressed={view === value} onClick={() => { setView(value); setSelected([]); }}>{value === 'active' ? 'Active' : 'Retired'}</button>)}</div>
      <input type="search" aria-label="Search synthesis" placeholder="Find a problem or question…" value={query} onChange={event => setQuery(event.target.value)} />
      <button className="survey-primary" onClick={() => setAction({ kind: 'create', problemIds: [] })}><Plus size={14} />New candidate question</button>
    </div>
    <p className="survey-muted">Link problems to questions without moving their source records. A problem can inform several questions.</p>
    {unclusteredOpenProblemsCount >= 15 && <p className="survey-notice">{unclusteredOpenProblemsCount} active problems have no candidate. Consider synthesizing them; recording source observations remains available.</p>}
    {activeSelected.length > 0 && <div className="survey-toolbar survey-selection" role="status">
      <span>{activeSelected.length} selected</span>
      <button onClick={() => setAction({ kind: 'create', problemIds: activeSelected })}>Create candidate from selection</button>
      <button onClick={() => setAction({ kind: 'link', problemIds: activeSelected })}>Link selection to candidate</button>
      <button onClick={() => setSelected([])}>Clear selection</button>
    </div>}
    <div className="survey-columns">
      <section aria-labelledby="survey-problems-heading">
        <div className="survey-section-heading"><h2 id="survey-problems-heading">Open problems <span>{problems.length}</span></h2><span className="survey-muted">Source observations</span></div>
        {!problems.length && <div className="survey-empty">{query ? 'No matching problems.' : 'Read a paper and record a problem from a passage or highlight. You can also add a cross-paper observation manually.'}</div>}
        {problems.map(problem => <article key={problem.id} className="survey-card" data-problem-id={problem.id} draggable={!problem.retireReason} onDragStart={event => beginDrag(event, problem)}>
          <div className="survey-card-heading">
            {!problem.retireReason && <input type="checkbox" aria-label={`Select problem: ${problem.text}`} checked={selected.includes(problem.id)} onChange={() => toggle(problem.id)} />}
            <p>{problem.text}</p><GripVertical size={14} aria-hidden="true" className="survey-muted" />
          </div>
          <p className="survey-meta">{problem.citation}{problem.pageNumber ? ` · p. ${problem.pageNumber}` : ''}</p>
          <p className="survey-muted">{problem.attribution === 'paper-author' ? 'Author-stated limitation' : problem.attribution === 'user-inference' ? 'Your inference' : 'Attribution not recorded'} · {membershipCount(problem.id)} candidate links</p>
          {problem.excerpt && <details><summary>Source excerpt</summary><blockquote>{problem.excerpt}</blockquote></details>}
          {problem.retireReason && <p className="survey-muted">Retired: {problem.retireReason.kind.replaceAll('_', ' ')} · {problem.retireReason.reference}</p>}
          <div className="survey-actions">
            {problem.paperId && <button disabled={!papers.some(paper => paper.id === problem.paperId)} onClick={() => problem.paperId && openPaperSource(problem.paperId, problem.pageNumber)}>Open source</button>}
            {!problem.retireReason && <><button onClick={() => setAction({ kind: 'link', problemIds: [problem.id] })}><LinkIcon size={12} />Link to candidate</button>
              <button onClick={() => setAction({ kind: 'retire', item: problem, itemType: 'problem' })}>Retire</button></>}
          </div>
        </article>)}
        {view === 'active' && <details className="survey-manual"><summary>Add manually</summary>
          <form className="survey-form" onSubmit={event => {
            event.preventDefault();
            const result = addSurveyOpenProblem(manualText, manualCitation, { attribution: 'user-inference' });
            if (result.success) { setManualText(''); setManualCitation(''); setMessage('Problem recorded.'); }
            else setMessage(result.error || 'Could not record problem.');
          }}>
            <label>Open problem<textarea required rows={3} value={manualText} onChange={event => setManualText(event.target.value)} /></label>
            <label>Citation or source<input value={manualCitation} onChange={event => setManualCitation(event.target.value)} placeholder="Cross-paper observation or source reference" /></label>
            <button type="submit">Record problem</button>{message && <p role="status">{message}</p>}
          </form>
        </details>}
      </section>
      <section aria-labelledby="survey-candidates-heading">
        <div className="survey-section-heading"><h2 id="survey-candidates-heading">Candidate questions <span>{candidates.length}</span></h2><span className="survey-muted">Research directions</span></div>
        {!candidates.length && <div className="survey-empty">{query ? 'No matching candidates.' : 'Create a candidate question, then link or drop relevant problems here.'}</div>}
        {candidates.map(candidate => <article key={candidate.id} className={`survey-card survey-candidate ${hoveredCandidate === candidate.id ? 'survey-drop-active' : ''}`} data-candidate-id={candidate.id}
          draggable onDragStart={event => setAssistantContextData(event, { type: 'survey', id: candidate.id, label: candidate.title, secondaryLabel: 'Candidate question' })}
          onDragOver={event => { if (!candidate.retireReason && !candidate.promotedQuestionId && event.dataTransfer.types.includes(PROBLEM_MIME)) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setHoveredCandidate(candidate.id); } }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget instanceof Node ? event.relatedTarget : null)) setHoveredCandidate(null); }}
          onDrop={event => {
            event.preventDefault(); setHoveredCandidate(null);
            const id = event.dataTransfer.getData(PROBLEM_MIME);
            if (!candidate.retireReason && !candidate.promotedQuestionId && openProblems.some(problem => problem.id === id && !problem.retireReason)) {
              setAction({ kind: 'link', candidateId: candidate.id, problemIds: activeSelected.includes(id) ? activeSelected : [id] });
            }
          }}>
          <h3>{candidate.title}</h3>
          <p className="survey-meta">{candidate.promotedQuestionId ? 'Promoted to research map' : candidate.retireReason ? 'Retired' : 'Candidate · not yet a research commitment'}</p>
          {(candidate.problemLinks || []).map(link => {
            const problem = openProblems.find(item => item.id === link.problemId);
            return <div className="survey-linked-problem" key={link.id}>
              <p>{problem?.text || 'Source problem unavailable'}{problem?.retireReason && ' (retired)'}</p>
              <p className="survey-muted">{link.legacy ? 'Legacy association: ' : 'Why linked: '}{link.userReason}</p>
              {!candidate.retireReason && !candidate.promotedQuestionId && <button aria-label={`Unlink ${problem?.text || link.problemId} from ${candidate.title}`} onClick={() => unlinkSurveyProblemFromCandidate(candidate.id, link.problemId)}>Unlink</button>}
            </div>;
          })}
          {!candidate.retireReason && !candidate.promotedQuestionId && <>
            <p className="survey-drop-hint">Drop problems here to link. Source records stay unchanged.</p>
            <div className="survey-actions">
              <button onClick={() => setAction({ kind: 'edit', candidate })}>Edit question</button>
              <button onClick={() => setAction({ kind: 'promote', candidate })}>Promote</button>
              <button onClick={() => setAction({ kind: 'retire', item: candidate, itemType: 'candidate' })}>Retire</button>
            </div>
          </>}
          {candidate.retireReason && <p className="survey-muted">{candidate.retireReason.kind.replaceAll('_', ' ')} · {candidate.retireReason.reference}</p>}
        </article>)}
      </section>
    </div>
    {action && <SurveyDialog action={action} onClose={() => setAction(null)} />}
  </div>;
}
