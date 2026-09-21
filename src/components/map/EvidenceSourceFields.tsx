import { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Evidence } from '../../types';
import { getEvidenceSource } from '../../utils/evidenceSource';

export function EvidenceSourceFields({ evidence, editing }: { evidence: Evidence; editing: boolean }) {
  const { papers, experiments, updateEvidence, openEvidenceSource } = useWorkspace();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const source = getEvidenceSource(evidence, papers, experiments);
  const experiment = experiments.find(item => item.id === evidence.experimentId);
  const update = (changes: Parameters<typeof updateEvidence>[1]) => {
    const result = updateEvidence(evidence.id, changes);
    setError(result.error || '');
  };

  if (source.kind === 'reasoning') return (
    <p className="text-xs text-[var(--color-ink-muted)]">Own reasoning. The evidence text and citation record the argument; no external source is linked.</p>
  );

  return (
    <section aria-label="Evidence source" className="flex flex-col gap-3 rounded-lg border border-[var(--color-rule)] p-3 text-xs">
      <h3 className="font-semibold">Source</h3>
      {source.kind === 'missing' ? (
        <p role="status" className="text-[var(--color-ink-muted)]">{source.message}</p>
      ) : (
        <button type="button" className="argument-micro-btn self-start" onClick={() => openEvidenceSource(evidence.id)}>
          {source.kind === 'paper' ? `Open Paper: ${source.paper.title}` : `Open Experiment: ${source.experiment.title}`}
        </button>
      )}
      {evidence.excerpt && <blockquote className="whitespace-pre-wrap border-l-2 border-[var(--color-rule)] pl-3">{evidence.excerpt}</blockquote>}
      {!editing && <button type="button" className="argument-micro-btn self-start" aria-expanded={linking} onClick={() => setLinking(!linking)}>{linking ? 'Close source fields' : 'Link source'}</button>}
      {(editing || linking) && (
        <>
          {evidence.origin === 'literature' ? (
            <>
              <label className="argument-field-label">
                <span>Source paper</span>
                <select aria-label="Source paper" className="argument-select" value={evidence.paperId || ''} onChange={event => update({ paperId: event.target.value || undefined })}>
                  <option value="">No paper linked</option>
                  {evidence.paperId && !papers.some(item => item.id === evidence.paperId) && <option value={evidence.paperId}>Unavailable: {evidence.paperId}</option>}
                  {papers.map(paper => <option key={paper.id} value={paper.id}>{paper.title}</option>)}
                </select>
              </label>
              {evidence.paperId && <label className="argument-field-label">
                <span>Source page (optional)</span>
                <input className="argument-input" type="number" min="1" step="1" value={evidence.pageNumber ?? ''} onChange={event => update({ pageNumber: event.target.value ? Number(event.target.value) : undefined })} />
              </label>}
            </>
          ) : (
            <>
              <label className="argument-field-label">
                <span>Source experiment</span>
                <select aria-label="Source experiment" className="argument-select" value={evidence.experimentId || ''} onChange={event => update({ experimentId: event.target.value || undefined })}>
                  <option value="">No experiment linked</option>
                  {evidence.experimentId && !experiment && <option value={evidence.experimentId}>Unavailable: {evidence.experimentId}</option>}
                  {experiments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              </label>
              {experiment && <label className="argument-field-label">
                <span>Source artifact (optional)</span>
                <select aria-label="Source artifact (optional)" className="argument-select" value={evidence.artifactId || ''} onChange={event => update({ artifactId: event.target.value || undefined })}>
                  <option value="">Experiment overview</option>
                  {evidence.artifactId && !experiment.artifacts.some(item => item.id === evidence.artifactId) && <option value={evidence.artifactId}>Unavailable: {evidence.artifactId}</option>}
                  {experiment.artifacts.map(artifact => <option key={artifact.id} value={artifact.id}>{artifact.name}</option>)}
                </select>
              </label>}
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
