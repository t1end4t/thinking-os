import { useState, useMemo, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLiterature } from '../../context/useLiterature';
import { sameDiscoveryPaper } from '../../literatureClient';
import type { DiscoveryPaper } from '../../literatureTypes';
import { LiteratureJobForm } from '../runtime/AgentJobsView';
import {
  Search,
  Sparkles,
  RefreshCw,
  BookOpen,
  BookmarkPlus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Tag,
  X,
  FilePlus2,
  Compass,
  ArrowRight,
  Layers,
  ListFilter
} from 'lucide-react';
import './literature.css';

// Intelligent academic query formulation from natural research inquiries
export function formulateAcademicQueries(prompt: string): string[] {
  const clean = prompt.trim();
  if (!clean) return [];

  const stopPatterns = [
    /^(can you|please|could you|i want to|i'm looking for|i am looking for|find|search for|look for|show me)\s+/i,
    /^(tôi muốn|hãy tìm|tìm giúp tôi|tìm các|tìm kiếm|cho tôi các|nghiên cứu về|bài báo về)\s+/i,
    /^(recent papers on|papers about|literature on|studies on|academic work on)\s+/i,
  ];

  let corePrompt = clean;
  for (const pattern of stopPatterns) {
    corePrompt = corePrompt.replace(pattern, '').trim();
  }

  const queries: string[] = [];
  const query1 = corePrompt.slice(0, 140).trim();
  if (query1) queries.push(query1);

  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'from',
    'which', 'that', 'this', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'how', 'what', 'why', 'when', 'where', 'who', 'về', 'và', 'hoặc', 'các', 'những', 'của', 'trong',
    'giúp', 'để', 'với', 'từ', 'cho', 'là', 'được', 'có', 'trong', 'các', 'những'
  ]);

  const words = corePrompt
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !commonWords.has(w.toLowerCase()));

  if (words.length >= 2) {
    const keyTerms = words.slice(0, 5).join(' ');
    if (keyTerms && !queries.includes(keyTerms)) {
      queries.push(keyTerms);
    }
  }

  const lower = corePrompt.toLowerCase();
  if (!lower.includes('benchmark') && !lower.includes('survey') && words.length >= 2) {
    const query3 = `${words.slice(0, 3).join(' ')} empirical evaluation`;
    if (!queries.includes(query3)) queries.push(query3);
  }

  return queries.slice(0, 4);
}

export function DiscoveryView() {
  const { workspaceDir, workspaceLoading, workspaceSyncing, papers, addPaper, openPaperSource, addSurveyOpenProblem } = useWorkspace();
  const literature = useLiterature(workspaceDir);

  const [searchPrompt, setSearchPrompt] = useState('');
  const [lastSearchedPrompt, setLastSearchedPrompt] = useState('');
  const [expand, setExpand] = useState(true);
  const [catalogFilter, setCatalogFilter] = useState('');
  const [activeScope, setActiveScope] = useState<'all' | 'search' | 'unvaulted' | 'vaulted'>('all');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'title'>('year-desc');

  const [scheduling, setScheduling] = useState(false);
  const [selectedPaperForProblem, setSelectedPaperForProblem] = useState<DiscoveryPaper | null>(null);
  const [problemObservationText, setProblemObservationText] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const busy = literature.busy !== null;

  // Starter topic suggestions
  const topicSuggestions = [
    {
      label: 'KV Cache Quantization & Pruning',
      query: 'KV cache quantization, token pruning, and attention sparsity in LLM inference'
    },
    {
      label: 'Process Supervision & Verifiable Traces',
      query: 'Process supervision, formal verification, and test-time compute scaling'
    },
    {
      label: 'State-Space Models (Mamba vs Transformers)',
      query: 'State-space models Mamba vs Transformers empirical benchmarks and associative recall'
    },
    {
      label: 'Speculative Decoding Acceleration',
      query: 'Speculative decoding acceleration, draft model verification, and acceptance latency'
    }
  ];

  // Refinements to quickly drill down into search results
  const refinementOptions = [
    'Empirical benchmarks & ablation studies',
    'Published in the last 12 months',
    'Survey & comprehensive taxonomy',
    'Hardware efficiency & latency guarantees'
  ];

  const handleSearch = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? searchPrompt).trim();
    if (!prompt || busy) return;

    setLastSearchedPrompt(prompt);
    if (overridePrompt) setSearchPrompt(overridePrompt);

    const formulated = formulateAcademicQueries(prompt);

    const success = await literature.search({
      brief: prompt,
      queries: formulated,
      expand
    });

    if (success) {
      setActiveScope('search');
    }
  };

  const handleApplyRefinement = (refinement: string) => {
    const combined = `${lastSearchedPrompt || searchPrompt} ${refinement}`.trim();
    handleSearch(combined);
  };

  // Save paper into local vault
  const saveToVault = (paper: DiscoveryPaper) => {
    setErrorMsg('');
    const existing = papers.find(candidate => sameDiscoveryPaper(candidate, paper));
    if (existing) {
      setNotice('This paper is already in your vault.');
      setTimeout(() => setNotice(''), 3000);
      return;
    }

    const result = addPaper({
      id: `p-${crypto.randomUUID()}`,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      doi: paper.doi,
      url: paper.url,
      abstract: paper.abstract,
      citation: `${paper.authors || 'Authors unavailable'} (${paper.year || 'Year unavailable'}). ${paper.title}.`,
      pageCount: 1,
      sections: [],
      markdown: `# ${paper.title}\n\n## Abstract\n\n${paper.abstract || 'No abstract available.'}\n\n## Discovery provenance\n\nMetadata and abstract only; full text has not been retrieved.\n\nSource: ${paper.source}\nDiscovered: ${new Date(paper.discoveredAt).toISOString()}\nQueries:\n${paper.queries.map(q => `- ${q}`).join('\n')}${paper.jobId ? `\nJob: ${paper.jobId}` : ''}${paper.runId ? `\nRun: ${paper.runId}` : ''}`,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Could not save paper to vault.');
    } else {
      setNotice(`Saved “${result.paper.title}” to your local vault.`);
      setTimeout(() => setNotice(''), 3500);
    }
  };

  // Extract open problem from paper to send to Synthesis
  const handleExtractProblem = (paper: DiscoveryPaper) => {
    setSelectedPaperForProblem(paper);
    setProblemObservationText(`Authors observe limitation in "${paper.title}": `);
  };

  const confirmExtractProblem = () => {
    if (!selectedPaperForProblem || !problemObservationText.trim()) return;

    const inVault = papers.find(p => sameDiscoveryPaper(p, selectedPaperForProblem));
    const citation = `${selectedPaperForProblem.authors || 'Authors'} (${selectedPaperForProblem.year || 'Year'}). ${selectedPaperForProblem.title}`;

    const res = addSurveyOpenProblem(
      problemObservationText.trim(),
      citation,
      {
        paperId: inVault?.id,
        attribution: 'paper-author',
        excerpt: selectedPaperForProblem.abstract ? selectedPaperForProblem.abstract.slice(0, 300) : undefined
      }
    );

    if (res.success) {
      setNotice('Observation captured and added to Synthesis board!');
      setSelectedPaperForProblem(null);
      setProblemObservationText('');
      setTimeout(() => setNotice(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to capture observation.');
    }
  };

  // Filter and sort the paper catalog
  const filteredPapers = useMemo(() => {
    // 1. Filter by active scope
    let base = literature.results;
    if (activeScope === 'search' && literature.searchResults.length > 0) {
      base = literature.searchResults;
    } else if (activeScope === 'vaulted') {
      base = base.filter(p => papers.some(candidate => sameDiscoveryPaper(candidate, p)));
    } else if (activeScope === 'unvaulted') {
      base = base.filter(p => !papers.some(candidate => sameDiscoveryPaper(candidate, p)));
    }

    // 2. Filter by search input inside catalog
    if (catalogFilter.trim()) {
      const q = catalogFilter.toLowerCase().trim();
      base = base.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          (p.authors && p.authors.toLowerCase().includes(q)) ||
          (p.abstract && p.abstract.toLowerCase().includes(q)) ||
          (p.source && p.source.toLowerCase().includes(q))
      );
    }

    // 3. Sort
    return [...base].sort((a, b) => {
      if (sortBy === 'year-desc') return (b.year || 0) - (a.year || 0);
      if (sortBy === 'year-asc') return (a.year || 0) - (b.year || 0);
      return a.title.localeCompare(b.title);
    });
  }, [literature.results, literature.searchResults, activeScope, catalogFilter, sortBy, papers]);

  return (
    <div className="discovery-surface">
      <div className="discovery-container">
        <section className="discovery-mission" aria-labelledby="discovery-mission-title">
          <div>
            <span className="discovery-section-index">Discover</span>
            <h2 id="discovery-mission-title">Describe the research question.</h2>
            <p>Include the mechanism, population, constraint, comparison, or evidence gap. Paper Scout formulates retrieval queries; you judge relevance and quality.</p>
          </div>
        </section>

        {/* Global Feedback Notifications */}
        {notice && (
          <div role="status" className="discovery-feedback p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="p-0.5 opacity-70 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div role="alert" className="discovery-feedback p-3 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg('')} className="p-0.5 opacity-70 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
        )}

        {/* 1. Google Scholar AI Mode Search Section */}
        <section className="scholar-search-card" aria-label="Academic Literature Search">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSearch();
            }}
            className="scholar-search-box"
          >
            <Search size={18} className="text-[var(--color-ink-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchPrompt}
              onChange={e => setSearchPrompt(e.target.value)}
              placeholder="Example: Which TinyML methods reduce transformer memory without losing anomaly-detection recall?"
              disabled={busy}
              className="scholar-search-input"
            />

            <div className="scholar-search-actions">
              {searchPrompt && (
                <button
                  type="button"
                  onClick={() => setSearchPrompt('')}
                  className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  title="Clear input"
                >
                  <X size={14} />
                </button>
              )}

              <button
                type="submit"
                disabled={!searchPrompt.trim() || busy}
                className="scholar-search-btn"
              >
                {busy ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Searching…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Scout papers</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Options & Topic Suggestions Bar */}
          <div className="scholar-options-bar">
            {/* Suggested Starter Topics */}
            <div className="scholar-topic-chips">
              <span className="text-[0.6875rem] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
                Explore:
              </span>
              {topicSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSearch(item.query)}
                  className="scholar-topic-chip"
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 text-xs shrink-0">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={expand}
                  onChange={e => setExpand(e.target.checked)}
                  className="accent-[var(--accent-indigo)]"
                />
                <span className="text-[0.6875rem] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
                  Codex query expansion
                </span>
              </label>

              <button
                type="button"
                onClick={() => setScheduling(true)}
                className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                <Clock size={12} />
                <span>Schedule job</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void literature.refresh()}
                className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                title="Refresh catalog from disk"
              >
                <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. AI Synthesis & Query Strategy Banner (Visible after search or when queries exist) */}
        {(lastSearchedPrompt || literature.searchQueries.length > 0) && (
          <details className="scholar-ai-banner animate-in fade-in" aria-label="Search strategy">
            <summary>
              <span>Search strategy</span>
              <strong>{literature.searchQueries.length} queries · {literature.searchResults.length} candidates</strong>
            </summary>
            <div className="scholar-ai-banner-header">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[var(--accent-indigo)] flex items-center justify-center shrink-0">
                  <Sparkles size={13} />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-[var(--color-ink)]">
                    {lastSearchedPrompt ? `Search brief: "${lastSearchedPrompt}"` : 'Search strategy'}
                  </h3>
                  <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Retrieval queries sent to Crossref and arXiv. {literature.searchResults.length} candidate publications require review.
                  </p>
                </div>
              </div>

              {/* Formulated Queries as Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {literature.searchQueries.map((q, idx) => (
                  <span key={idx} className="scholar-ai-tag">
                    <Tag size={10} className="text-[var(--accent-indigo)]" />
                    <span>{q}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Follow-up Refinements */}
            <div className="scholar-refinement-chips">
              <span className="text-[0.6875rem] text-[var(--color-ink-muted)] font-medium">
                Refine search:
              </span>
              {refinementOptions.map((refine, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyRefinement(refine)}
                  className="scholar-refinement-btn"
                >
                  <ArrowRight size={10} />
                  <span>{refine}</span>
                </button>
              ))}
            </div>
          </details>
        )}

        {/* 3. Integrated Paper Catalog Section */}
        <section className="literature-inbox flex flex-col gap-3" aria-labelledby="literature-inbox-heading">
          <header className="literature-inbox-heading">
            <div>
              <span className="discovery-section-index">Evidence inbox</span>
              <h2 id="literature-inbox-heading">Review before saving.</h2>
            </div>
            <p><ListFilter size={12} aria-hidden="true" />Metadata is discovered. Relevance and scientific quality are not inferred automatically.</p>
          </header>
          {/* Catalog Toolbar & Filters */}
          <div className="catalog-toolbar">
            <div className="catalog-filter-group">
              <button
                type="button"
                onClick={() => setActiveScope('all')}
                className={`catalog-chip-toggle ${activeScope === 'all' ? 'active' : ''}`}
              >
                <Layers size={12} />
                <span>All Inbox</span>
                <span className="font-mono text-[0.625rem] px-1.5 py-0.2 rounded-full bg-[var(--color-rule)] text-[var(--color-ink)]">
                  {literature.results.length}
                </span>
              </button>

              {literature.searchResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveScope('search')}
                  className={`catalog-chip-toggle ${activeScope === 'search' ? 'active' : ''}`}
                >
                  <Sparkles size={12} />
                  <span>Current Search</span>
                  <span className="font-mono text-[0.625rem] px-1.5 py-0.2 rounded-full bg-[var(--color-rule)] text-[var(--color-ink)]">
                    {literature.searchResults.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveScope('unvaulted')}
                className={`catalog-chip-toggle ${activeScope === 'unvaulted' ? 'active' : ''}`}
              >
                <BookmarkPlus size={12} />
                <span>Not in Vault</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScope('vaulted')}
                className={`catalog-chip-toggle ${activeScope === 'vaulted' ? 'active' : ''}`}
              >
                <CheckCircle2 size={12} />
                <span>In Vault</span>
              </button>
            </div>

            {/* In-catalog search & sort */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                <input
                  type="search"
                  placeholder="Filter papers in catalog…"
                  value={catalogFilter}
                  onChange={e => setCatalogFilter(e.target.value)}
                  className="text-xs py-1.5 pl-7 pr-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] w-52 placeholder:text-[var(--color-ink-muted)]"
                />
              </div>

              <select
                value={sortBy}
                onChange={event => {
                  const value = event.target.value;
                  if (value === 'year-desc' || value === 'year-asc' || value === 'title') setSortBy(value);
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] font-mono"
              >
                <option value="year-desc">Newest Year</option>
                <option value="year-asc">Oldest Year</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Empty Catalog State */}
          {filteredPapers.length === 0 && (
            <div className="p-12 text-center border border-dashed border-[var(--color-rule)] rounded-2xl bg-[var(--color-surface)]/40 my-4">
              <Compass size={32} className="mx-auto mb-2 text-[var(--color-ink-muted)] opacity-60" />
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                {catalogFilter ? 'No papers match your filter' : 'No discovered publications yet'}
              </h4>
              <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto mt-1">
                {catalogFilter
                  ? 'Try clearing or changing your keyword search filter.'
                  : 'Write a research brief on the left. The resulting candidates will retain the queries and job provenance that found them.'}
              </p>
            </div>
          )}

          {/* Papers Feed */}
          <div className="scholar-papers-list">
            {filteredPapers.map(paper => {
              const inVault = papers.find(candidate => sameDiscoveryPaper(candidate, paper));

              return (
                <article key={paper.id} className="scholar-paper-card">
                  {/* Card Header & Metadata */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="survey-pill font-mono text-[0.6875rem] font-bold bg-[var(--color-paper)] text-[var(--color-ink)]">
                          {paper.year || 'Year unrecorded'}
                        </span>
                        <span className="survey-pill font-mono text-[0.6875rem] text-[var(--accent-indigo)] border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 font-semibold">
                          {paper.source}
                        </span>
                        {paper.doi && (
                          <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                            DOI: {paper.doi}
                          </span>
                        )}
                        {paper.queries?.length > 0 && (
                          <span className="survey-pill font-mono text-[0.625rem] text-[var(--color-ink-muted)] hidden sm:inline-flex">
                            via: {paper.queries[0]}
                          </span>
                        )}
                      </div>

                      <h4 className="scholar-paper-title">
                        {paper.title}
                      </h4>

                      <p className="scholar-paper-authors mt-1">
                        {paper.authors || 'Authors unavailable'}
                      </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {inVault ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-1 rounded-md">
                            <CheckCircle2 size={11} />
                            In Vault
                          </span>
                          <button
                            type="button"
                            className="survey-btn inline-flex items-center gap-1 text-xs"
                            onClick={() => openPaperSource(inVault.id)}
                            title="Open in Paper Reader"
                          >
                            <BookOpen size={11} />
                            <span>Reader</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={workspaceLoading || workspaceSyncing}
                          onClick={() => saveToVault(paper)}
                          className="survey-btn survey-btn-primary inline-flex items-center gap-1 text-xs"
                          title="Save this paper into your local research vault"
                        >
                          <BookmarkPlus size={12} />
                          <span>Save to Vault</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleExtractProblem(paper)}
                        className="survey-btn inline-flex items-center gap-1 text-xs"
                        title="Extract an observation or limitation into the Synthesis board"
                      >
                        <FilePlus2 size={11} className="text-[var(--accent-indigo)]" />
                        <span>Extract Problem</span>
                      </button>

                      {paper.url && (
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noreferrer"
                          className="survey-btn inline-flex items-center gap-1 text-xs"
                          title="Open external publisher or repository URL"
                        >
                          <ExternalLink size={11} />
                          <span className="sr-only">External source</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Abstract */}
                  {paper.abstract && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[0.6875rem] font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] select-none">
                        View Abstract & Key Summary
                      </summary>
                      <p className="scholar-paper-abstract">
                        {paper.abstract}
                      </p>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* Extract Problem Modal Dialog */}
      {selectedPaperForProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)] mb-4">
              <div className="flex items-center gap-2">
                <FilePlus2 size={16} className="text-[var(--accent-indigo)]" />
                <h3 className="text-sm font-bold text-[var(--color-ink)]">
                  Extract Observation into Synthesis
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaperForProblem(null)}
                className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-[var(--color-ink-muted)] mb-3">
              Capture a concrete paper limitation, experimental tension, or theoretical gap from <strong>“{selectedPaperForProblem.title}”</strong>. This observation will appear in the Synthesis board ready to be clustered into candidate questions.
            </p>

            <label className="block mb-4">
              <span className="text-xs font-semibold text-[var(--color-ink)] block mb-1">
                Observation or Stated Problem:
              </span>
              <textarea
                autoFocus
                rows={4}
                value={problemObservationText}
                onChange={e => setProblemObservationText(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--accent-indigo)]"
                placeholder="What specific limitation, boundary condition, or anomaly does this paper document?"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedPaperForProblem(null)}
                className="survey-btn text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!problemObservationText.trim()}
                onClick={confirmExtractProblem}
                className="survey-btn survey-btn-primary text-xs"
              >
                Add to Synthesis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Job Setup Modal */}
      {scheduling && (
        <LiteratureJobForm
          initial={{
            brief: lastSearchedPrompt || searchPrompt || 'Literature monitoring',
            queries: literature.searchQueries.length > 0 ? literature.searchQueries : ['kv cache quantization', 'attention sparsity'],
            expand
          }}
          scheduler={literature.snapshot?.scheduler}
          busy={busy}
          error={literature.error}
          onClose={() => setScheduling(false)}
          onSave={async input => {
            const saved = await literature.createJob(input);
            if (saved) {
              setNotice('Daily monitoring job created successfully. Check Runtime / Agent Jobs.');
            }
            return saved;
          }}
        />
      )}
    </div>
  );
}
