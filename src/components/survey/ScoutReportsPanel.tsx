import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ExternalLink, FileSearch, History, RefreshCw, Scale, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useScouts } from '../../context/useScouts';
import type { ScoutCandidate, ScoutDismissalReason, ScoutReport } from '../../scoutTypes';
import type { Paper, PaperDiscoveryContext } from '../../types';
import { paperIdentity } from '../../utils/paperIdentity';
import './scoutReports.css';

const dismissalReasons: readonly { readonly value: ScoutDismissalReason; readonly label: string }[] = [
  { value: 'not-relevant', label: 'Not relevant' },
  { value: 'already-known', label: 'Already known' },
  { value: 'too-weak', label: 'Too weak or incomplete' },
  { value: 'duplicate-contribution', label: 'Duplicate contribution' },
  { value: 'not-useful-now', label: 'Not useful now' },
  { value: 'other', label: 'Other' }
];

function reportLabel(report: ScoutReport): string {
  return 'question' in report.inputSnapshot ? report.inputSnapshot.question : report.inputSnapshot.topic;
}

function paperData(candidate: ScoutCandidate, context: PaperDiscoveryContext): Omit<Paper, 'id'> {
  const doi = candidate.identities.find(identity => identity.kind === 'doi')?.value;
  const url = sourceUrl(candidate);
  const year = candidate.year ?? 0;
  return {
    title: candidate.title,
    authors: candidate.authors || 'Unknown Authors',
    year,
    citation: `${candidate.authors?.split(',')[0] || 'Unknown Authors'} (${year || 'year unknown'})`,
    pageCount: 1,
    markdown: `# ${candidate.title}\n\n## Abstract\n\n${candidate.abstract || 'No abstract was available during scouting.'}\n\n## Scouting assessment\n\n${candidate.recommendationReason || candidate.relevanceAssessment || 'No assessment was recorded.'}\n\nMetadata and abstract only; full text has not been inspected.`,
    sections: [{ id: `sec-${candidate.id}-abstract`, title: 'Abstract', paragraphs: [{ id: `par-${candidate.id}-abstract` }] }],
    ...(doi ? { doi } : {}),
    ...(url ? { url } : {}),
    ...(candidate.abstract ? { abstract: candidate.abstract } : {}),
    highlights: [],
    discoveryContexts: [context]
  };
}

function sourceUrl(candidate: ScoutCandidate): string | undefined {
  const url = candidate.identities.find(identity => identity.kind === 'url' && identity.canonical)?.value
    ?? candidate.identities.find(identity => identity.kind === 'url')?.value;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
  }
  const doi = candidate.identities.find(identity => identity.kind === 'doi')?.value;
  if (doi) return `https://doi.org/${doi}`;
  const arxiv = candidate.identities.find(identity => identity.kind === 'arxiv')?.value;
  return arxiv ? `https://arxiv.org/abs/${arxiv}` : undefined;
}

function CandidateCard({ candidate, report, compared, busy, onCompare, onDismiss, onInspect, onSave }: {
  readonly candidate: ScoutCandidate;
  readonly report: ScoutReport;
  readonly compared: boolean;
  readonly busy: boolean;
  readonly onCompare: () => void;
  readonly onDismiss: (button: HTMLButtonElement) => void;
  readonly onInspect: () => void;
  readonly onSave: () => void;
}) {
  const url = sourceUrl(candidate);
  return (
    <article className="scout-candidate-card" data-outcome={candidate.outcome ?? 'uncertain'}>
      <div className="scout-candidate-heading">
        <div>
          <div className="scout-candidate-meta">
            <span>{candidate.year || 'Year unknown'}</span><span>{candidate.authors || 'Authors unknown'}</span>
            {candidate.qualityConfidence && <span>Quality confidence: {candidate.qualityConfidence}</span>}
          </div>
          <h4>{candidate.title}</h4>
        </div>
        <span className="scout-outcome">{candidate.outcome ?? candidate.assessmentState}</span>
      </div>
      <div className="scout-assessment-grid">
        <section><strong>Why relevant</strong><p>{candidate.relevanceAssessment || 'No relevance assessment was available.'}</p></section>
        <section><strong>Expected reading value</strong><p>{candidate.expectedValue || 'Expected value remains uncertain.'}</p></section>
        <section><strong>Assessment evidence</strong><p>{candidate.evidenceExcerpt || 'No supporting excerpt was available.'}</p></section>
        <section><strong>Uncertain or missing</strong><p>{candidate.limitations.length ? candidate.limitations.join(' ') : 'No explicit limitation was recorded.'}</p></section>
      </div>
      <details className="scout-details">
        <summary>Abstract and provenance</summary>
        <div className="scout-details-body">
          <p>{candidate.abstract || 'No abstract was available. This candidate was not assessed from full text.'}</p>
          <dl>
            <div><dt>Matching queries</dt><dd>{candidate.matchingQueries.join(' · ') || 'None recorded'}</dd></div>
            <div><dt>Sources</dt><dd>{candidate.sources.join(' · ') || report.sources.join(' · ') || 'None recorded'}</dd></div>
            <div><dt>Quality evidence</dt><dd>{candidate.qualityEvidence?.join(' · ') || 'None verified'}</dd></div>
            <div><dt>Metadata conflicts</dt><dd>{candidate.metadataConflicts.length ? candidate.metadataConflicts.map(conflict => `${conflict.field}: ${conflict.values.join(' / ')}`).join(' · ') : 'None recorded'}</dd></div>
          </dl>
        </div>
      </details>
      <div className="scout-candidate-actions">
        <button type="button" className="survey-btn survey-btn-primary" disabled={busy} onClick={onSave}>
          <BookOpen size={12} />{candidate.decision === 'saved' ? 'Open in Papers' : 'Save to Papers'}
        </button>
        <button type="button" className="survey-btn" disabled={busy || Boolean(candidate.inspection)} onClick={onInspect}>
          <FileSearch size={12} />{candidate.inspection ? 'Inspection requested' : 'Inspect deeper'}
        </button>
        <button type="button" className="survey-btn" aria-pressed={compared} onClick={onCompare}><Scale size={12} />{compared ? 'Compared' : 'Compare'}</button>
        <button type="button" className="survey-btn" disabled={busy || candidate.decision === 'dismissed'} onClick={event => onDismiss(event.currentTarget)}>
          <X size={12} />{candidate.decision === 'dismissed' ? 'Dismissed' : 'Dismiss'}
        </button>
        {url && <a className="survey-btn" href={url} target="_blank" rel="noreferrer"><ExternalLink size={12} />Open source</a>}
      </div>
    </article>
  );
}

export function ScoutReportsPanel() {
  const { workspaceDir, workspaceLoading, workspaceSyncing, papers, addPaper, openPaperSource, activeScoutReportId } = useWorkspace();
  const scouts = useScouts(workspaceDir);
  const reports = useMemo(() => [...(scouts.snapshot?.reports ?? [])].sort((first, second) => second.createdAt - first.createdAt), [scouts.snapshot?.reports]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [compareIds, setCompareIds] = useState<readonly string[]>([]);
  const [dismissCandidate, setDismissCandidate] = useState<ScoutCandidate | null>(null);
  const [dismissReason, setDismissReason] = useState<ScoutDismissalReason>('not-useful-now');
  const [dismissNote, setDismissNote] = useState('');
  const dismissDialog = useRef<HTMLDialogElement>(null);
  const compareDialog = useRef<HTMLDialogElement>(null);
  const dismissTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (reports.length && !reports.some(report => report.id === selectedReportId)) setSelectedReportId(reports[0].id);
  }, [reports, selectedReportId]);
  useEffect(() => {
    if (activeScoutReportId && reports.some(report => report.id === activeScoutReportId)) setSelectedReportId(activeScoutReportId);
  }, [activeScoutReportId, reports]);
  useEffect(() => {
    if (dismissCandidate) dismissDialog.current?.showModal();
  }, [dismissCandidate]);

  const report = reports.find(item => item.id === selectedReportId) ?? reports[0];
  const run = report ? scouts.snapshot?.runs.find(item => item.id === report.id || item.reportId === report.id) : undefined;
  const candidates = report ? [...report.recommendations, ...report.uncertain] : [];
  const compared = candidates.filter(candidate => compareIds.includes(candidate.id));
  const disabled = workspaceLoading || workspaceSyncing || scouts.busy !== null;

  const saveCandidate = async (candidate: ScoutCandidate) => {
    if (!report) return;
    if (candidate.decision === 'saved' && candidate.paperId) {
      openPaperSource(candidate.paperId);
      return;
    }
    const context: PaperDiscoveryContext = {
      reportId: report.id, briefId: report.source.id, candidateId: candidate.id, matchingQueries: [...candidate.matchingQueries],
      recommendationReason: candidate.recommendationReason || candidate.relevanceAssessment || 'Saved from scout report.',
      evidenceLevel: candidate.abstract ? 'abstract' : 'metadata', savedAt: Date.now(), decisionSource: 'user'
    };
    const data = paperData(candidate, context);
    const existing = papers.find(paper => paperIdentity(paper) === paperIdentity(data));
    const paperId = existing?.id ?? `p-${crypto.randomUUID()}`;
    const decided = await scouts.decideCandidate({ reportId: report.id, candidateId: candidate.id, decision: 'saved', paperId });
    if (decided) addPaper({ ...data, id: paperId });
  };
  const confirmDismiss = async () => {
    if (!report || !dismissCandidate) return;
    const success = await scouts.decideCandidate({ reportId: report.id, candidateId: dismissCandidate.id, decision: 'dismissed', reason: dismissReason, ...(dismissNote.trim() ? { note: dismissNote.trim() } : {}) });
    if (success) dismissDialog.current?.close();
  };
  const closeDismiss = () => {
    setDismissCandidate(null); setDismissNote(''); setDismissReason('not-useful-now');
    requestAnimationFrame(() => dismissTrigger.current?.focus());
  };

  if (!reports.length) return (
    <section className="scout-report-empty" aria-label="Scout reports">
      <div><History size={16} /><strong>Scout reports</strong></div>
      <p>{scouts.loading ? 'Loading durable scout reports…' : 'No scout report exists yet. Existing literature search remains available below.'}</p>
      {scouts.error && <p role="alert">{scouts.error}</p>}
    </section>
  );

  return (
    <section className="scout-report-workbench" aria-label="Scout reports">
      <aside className="scout-report-history" aria-label="Scout report history">
        <div className="scout-report-history-heading"><span><History size={14} />Reports</span><button type="button" onClick={() => void scouts.refresh()} aria-label="Refresh scout reports"><RefreshCw size={13} /></button></div>
        {reports.map(item => <button key={item.id} type="button" aria-current={item.id === report?.id} onClick={() => { setSelectedReportId(item.id); setCompareIds([]); }}>
          <strong>{reportLabel(item)}</strong><span>{new Date(item.createdAt).toLocaleString()} · {item.recommendations.length} recommended</span>
        </button>)}
      </aside>
      {report && <div className="scout-report-main">
        <header className="scout-report-header">
          <div><span className="scout-report-kicker">{report.status} · {report.screening.model}</span><h3>{reportLabel(report)}</h3><p>{report.summary}</p></div>
          <button type="button" className="survey-btn" disabled={compared.length < 2} onClick={() => compareDialog.current?.showModal()}><Scale size={12} />Compare selected ({compared.length})</button>
        </header>
        {run && <div className="scout-run-strip" aria-label="Scout run summary">
          <span>Retrieved <strong>{run.counters.retrieved}</strong></span><span>Normalized <strong>{run.counters.normalized}</strong></span>
          <span>Screened <strong>{run.counters.screened}</strong></span><span>Queries <strong>{run.executedQueries.length}</strong></span>
          <span>Provider failures <strong>{run.providerAttempts.filter(attempt => attempt.status === 'failed').length}</strong></span>
        </div>}
        {scouts.error && <p className="scout-report-alert" role="alert">{scouts.error}</p>}
        <section className="scout-report-section"><h4><CheckCircle2 size={14} />Recommended <span>{report.recommendations.length}</span></h4>
          {report.recommendations.map(candidate => <CandidateCard key={candidate.id} candidate={candidate} report={report} compared={compareIds.includes(candidate.id)} busy={disabled}
            onCompare={() => setCompareIds(current => current.includes(candidate.id) ? current.filter(id => id !== candidate.id) : [...current, candidate.id])}
            onDismiss={button => { dismissTrigger.current = button; setDismissCandidate(candidate); }} onInspect={() => void scouts.requestInspection(report.id, candidate.id)} onSave={() => void saveCandidate(candidate)} />)}
        </section>
        <section className="scout-report-section"><h4><AlertTriangle size={14} />Uncertain <span>{report.uncertain.length}</span></h4>
          {report.uncertain.map(candidate => <CandidateCard key={candidate.id} candidate={candidate} report={report} compared={compareIds.includes(candidate.id)} busy={disabled}
            onCompare={() => setCompareIds(current => current.includes(candidate.id) ? current.filter(id => id !== candidate.id) : [...current, candidate.id])}
            onDismiss={button => { dismissTrigger.current = button; setDismissCandidate(candidate); }} onInspect={() => void scouts.requestInspection(report.id, candidate.id)} onSave={() => void saveCandidate(candidate)} />)}
        </section>
        <section className="scout-report-summary"><div><strong>Rejection summary</strong><p>{Object.entries(report.rejectionCounts).map(([reason, count]) => `${reason}: ${count}`).join(' · ') || 'No rejected candidates.'}</p></div>
          <div><strong>Run limitations</strong><p>{report.limitations.join(' ') || 'No run-level limitation was recorded.'}</p></div></section>
      </div>}
      <dialog ref={dismissDialog} className="scout-dialog" aria-labelledby="scout-dismiss-title" onClose={closeDismiss} onCancel={closeDismiss}>
        <form method="dialog" onSubmit={event => { event.preventDefault(); void confirmDismiss(); }}><h3 id="scout-dismiss-title">Dismiss candidate</h3><p>{dismissCandidate?.title}</p>
          <label>Reason<select value={dismissReason} onChange={event => { const reason = dismissalReasons.find(item => item.value === event.target.value)?.value; if (reason) setDismissReason(reason); }}>{dismissalReasons.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label>
          <label>Optional note<textarea value={dismissNote} onChange={event => setDismissNote(event.target.value)} maxLength={2000} rows={3} /></label>
          <div><button type="button" className="survey-btn" onClick={() => dismissDialog.current?.close()}>Cancel</button><button type="submit" className="survey-btn survey-btn-primary" disabled={disabled}>Dismiss</button></div>
        </form>
      </dialog>
      <dialog ref={compareDialog} className="scout-dialog scout-compare-dialog" aria-labelledby="scout-compare-title"><div className="scout-compare-heading"><h3 id="scout-compare-title">Candidate comparison</h3><button type="button" onClick={() => compareDialog.current?.close()} aria-label="Close comparison"><X size={16} /></button></div>
        <div className="scout-compare-scroll"><table><thead><tr><th>Dimension</th>{compared.map(candidate => <th key={candidate.id}>{candidate.title}</th>)}</tr></thead><tbody>
          {([['Relation to question', 'relevanceAssessment'], ['Expected use', 'expectedValue'], ['Evidence level', 'assessmentState'], ['Important limitation', 'limitations'], ['Suggested next action', 'suggestedNextAction']] as const).map(([label, field]) => <tr key={field}><th>{label}</th>{compared.map(candidate => <td key={candidate.id}>{field === 'limitations' ? candidate.limitations.join(' ') || 'Unknown' : candidate[field] || 'Unknown'}</td>)}</tr>)}
        </tbody></table></div></dialog>
    </section>
  );
}
