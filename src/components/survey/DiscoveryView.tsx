import { useEffect, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLiterature } from '../../context/useLiterature';
import { sameDiscoveryPaper } from '../../literatureClient';
import type { DiscoveryPaper } from '../../literatureTypes';
import { LiteratureJobForm, parseQueries } from '../runtime/AgentJobsView';
import './literature.css';

export function DiscoveryView() {
  const { workspaceDir, workspaceLoading, workspaceSyncing, papers, addPaper, openPaperSource } = useWorkspace();
  const literature = useLiterature(workspaceDir);
  const [brief, setBrief] = useState('');
  const [queries, setQueries] = useState('');
  const [expand, setExpand] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const busy = literature.busy !== null;
  const valid = !!brief.trim() && parseQueries(queries).length > 0;
  useEffect(() => { setBrief(''); setQueries(''); setExpand(false); setScheduling(false); setNotice(''); setSaveError(''); }, [workspaceDir]);

  const save = (paper: DiscoveryPaper) => {
    setSaveError('');
    const existing = papers.find(candidate => sameDiscoveryPaper(candidate, paper));
    if (existing) { setNotice('This paper is already in your vault.'); return; }
    const result = addPaper({
      id: `p-${crypto.randomUUID()}`, title: paper.title, authors: paper.authors, year: paper.year,
      doi: paper.doi, url: paper.url, abstract: paper.abstract,
      citation: `${paper.authors || 'Authors unavailable'} (${paper.year || 'Year unavailable'}). ${paper.title}.`,
      pageCount: 1, sections: [],
      markdown: `# ${paper.title}\n\n## Abstract\n\n${paper.abstract || 'No abstract available.'}\n\n## Discovery provenance\n\nMetadata and abstract only; full text has not been retrieved.\n\nSource: ${paper.source}\nDiscovered: ${new Date(paper.discoveredAt).toISOString()}\nQueries:\n${paper.queries.map(query => `- ${query}`).join('\n')}${paper.jobId ? `\nJob: ${paper.jobId}` : ''}${paper.runId ? `\nRun: ${paper.runId}` : ''}`,
    });
    if (!result.success) setSaveError(result.error || 'The paper could not be saved.');
    else setNotice(`Saved “${result.paper.title}” to the vault.`);
  };

  return <section className="literature literature-discovery" aria-label="Discover literature">
    <header className="literature-heading"><div><h2>Discover</h2><p className="literature-note">Search a research brief. Review each source before adding it to your vault.</p></div>
      <button disabled={busy} onClick={() => void literature.refresh()}>Refresh inbox</button></header>
    <form className="literature-search" onSubmit={event => { event.preventDefault(); if (valid) void literature.search({ brief: brief.trim(), queries: parseQueries(queries), expand }); }}>
      <fieldset disabled={busy}>
        <div className="literature-fields"><label>Research brief<textarea required rows={4} maxLength={12000} value={brief} onChange={event => setBrief(event.target.value)} placeholder="What question are you investigating?" /></label>
          <label>Related queries · one per line<textarea required rows={4} maxLength={12000} value={queries} onChange={event => setQueries(event.target.value)} placeholder={'A precise search phrase\nA related method or concept'} /></label></div>
        <label className="literature-check"><input type="checkbox" checked={expand} onChange={event => setExpand(event.target.checked)} />Allow Codex to expand these queries</label>
        <p className="literature-note">Optional: sends your brief and queries to the configured Codex provider over the network. Leave unchecked to search only the queries above. Search queries always go to external literature sources.</p>
        <div className="literature-actions"><button className="literature-primary" disabled={!valid}>{literature.busy === 'search' ? 'Searching…' : 'Search now'}</button>
          <button type="button" disabled={!valid || !literature.snapshot} onClick={() => setScheduling(true)}>Create monitoring job</button></div>
      </fieldset>
    </form>
    {(literature.error || saveError) && <p role="alert" className="literature-error">{saveError || literature.error}</p>}
    {notice && <p role="status" className="literature-note">{notice}</p>}
    <header className="literature-heading"><h3>Inbox</h3><span className="literature-meta">{literature.results.length} unique papers</span></header>
    <p className="literature-note">Persisted job findings + your last direct search in this session. Abstract-only metadata, not a relevance judgment or verified evidence. Nothing is imported automatically.</p>
    {literature.searched && <details><summary>Last search · {literature.searchResults.length} results · {literature.searchQueries.length} queries</summary><ul>{literature.searchQueries.map(query => <li key={query}>{query}</li>)}</ul></details>}
    {literature.loading && <p role="status">Loading discovery inbox…</p>}
    {!literature.loading && !literature.results.length && <div className="literature-empty"><h3>{literature.searched ? 'No papers found' : 'Your discovery inbox is empty'}</h3><p>{literature.searched ? 'Try a broader query or another term. Scheduled findings will appear here too.' : 'Enter a brief and search queries, or create a daily monitoring job.'}</p></div>}
    <div className="literature-results">{literature.results.map(paper => {
      const existing = papers.find(candidate => sameDiscoveryPaper(candidate, paper));
      return <article className="literature-row" key={paper.id}>
        <header className="literature-heading"><h3>{paper.title}</h3><span className="literature-meta">{paper.year || 'Year unavailable'}</span></header>
        <p className="literature-note">{paper.authors || 'Authors unavailable'}</p>
        <p className="literature-meta">{paper.source} · {new Date(paper.discoveredAt).toLocaleDateString()} · {paper.jobId ? literature.snapshot?.jobs.find(job => job.id === paper.jobId)?.name ?? 'Monitoring job' : 'Direct search'}</p>
        {paper.doi && <p className="literature-meta">DOI: {paper.doi}</p>}
        <details><summary>Abstract and query provenance</summary>
          <p className="literature-prose">{paper.abstract || 'No abstract supplied by this source.'}</p>
          <p className="literature-note">Full text has not been retrieved. Matched queries:</p>
          <ul>{paper.queries.map(query => <li key={query}>{query}</li>)}</ul>
        </details>
        <div className="literature-actions">
          {existing ? <><span className="literature-meta">In Vault</span><button onClick={() => { if (!openPaperSource(existing.id)) setSaveError('This paper is no longer available in the vault.'); }}>Open</button></>
            : <button disabled={workspaceLoading || workspaceSyncing} onClick={() => save(paper)}>Save to Vault</button>}
          {paper.url && <a href={paper.url} target="_blank" rel="noreferrer">Source ↗<span className="sr-only"> (opens in a new tab)</span></a>}
        </div>
      </article>;
    })}</div>
    {scheduling && <LiteratureJobForm initial={{ brief, queries: parseQueries(queries), expand }} scheduler={literature.snapshot?.scheduler}
      busy={busy} error={literature.error} onClose={() => setScheduling(false)} onSave={async input => {
        const saved = await literature.createJob(input);
        if (saved) setNotice('Monitoring job created. Manage its schedule and runs in Runtime / Agent Jobs.');
        return saved;
      }} />}
  </section>;
}
