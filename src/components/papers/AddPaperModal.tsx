import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Link,
  Upload,
  BookOpen,
  Search,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Paper } from '../../types';
import { parseArxivLink } from '../../utils/pdfGenerator';
import { fetchPaperMetadata, readPdfMetadata, paperIdentifier, searchPaperTitles, PaperTitleMatch } from './paperMetadata';

interface AddPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPaper: (paperData: Omit<Paper, 'id'> & { id?: string }) => { success: boolean; paper?: Paper; error?: string };
  onSelectPaper: (paperId: string) => void;
}

type ModeTab = 'title' | 'doi' | 'url' | 'upload';

export const AddPaperModal: React.FC<AddPaperModalProps> = ({
  isOpen,
  onClose,
  onAddPaper,
  onSelectPaper
}) => {
  const [activeTab, setActiveTab] = useState<ModeTab>('doi');
  const [doiInput, setDoiInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [titleQuery, setTitleQuery] = useState('');
  const [titleMatches, setTitleMatches] = useState<PaperTitleMatch[] | null>(null);
  const [fetching, setFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState<string>('');
  const [authors, setAuthors] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [citation, setCitation] = useState<string>('');
  const [abstract, setAbstract] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [markdown, setMarkdown] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [doi, setDoi] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [resolved, setResolved] = useState<string>('');

  const requestId = useRef(0);
  useEffect(() => {
    if (!isOpen) setFetching(false);
    return () => { requestId.current++; };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setAuthors('');
    setYear(new Date().getFullYear());
    setCitation('');
    setAbstract('');
    setPdfUrl('');
    setPdfDataUrl('');
    setMarkdown('');
    setPageCount(1);
    setDoi('');
    setSourceUrl('');
    setResolved('');
    setError(null);
    setDoiInput('');
    setUrlInput('');
    setTitleQuery('');
    setTitleMatches(null);
  };

  const closeModal = () => {
    requestId.current++;
    resetForm();
    setFetching(false);
    onClose();
  };

  const applyMetadata = (meta: Awaited<ReturnType<typeof fetchPaperMetadata>>, fallbackUrl?: string) => {
    if (meta.title) setTitle(meta.title);
    if (meta.authors) setAuthors(meta.authors);
    if (meta.year) setYear(meta.year);
    if (meta.citation) setCitation(meta.citation);
    if (meta.abstract) setAbstract(meta.abstract);
    if (meta.doi) setDoi(meta.doi);
    setSourceUrl(meta.url || fallbackUrl || '');
    if (meta.pdfUrl) setPdfUrl(meta.pdfUrl);
    if (meta.pageCount) setPageCount(meta.pageCount);
    if (meta.markdown) setMarkdown(meta.markdown);
    else if (meta.title) {
      setMarkdown(`# ${meta.title}\n\n## Abstract\n${meta.abstract || 'No abstract available.'}`);
    }
    setResolved(meta.doi ? `Metadata resolved for ${meta.doi}. Review the fields below before saving.` : 'PDF information loaded. No DOI found; review the fields below.');
  };

  const handleTitleSearch = async () => {
    if (fetching) return;
    const query = titleQuery.trim();
    const request = ++requestId.current;
    resetForm();
    setTitleQuery(query);
    setFetching(true);
    try {
      const matches = await searchPaperTitles(query);
      if (request === requestId.current) setTitleMatches(matches);
    } catch (reason) {
      if (request === requestId.current) setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (request === requestId.current) setFetching(false);
    }
  };

  const lookupMetadata = async (input: string, tab: ModeTab) => {
    if (!input.trim()) {
      setError(tab === 'doi' ? 'Enter a DOI (e.g. 10.1145/3639478).' : 'Enter a paper URL or arXiv link.');
      return;
    }
    if (fetching) return;
    const request = ++requestId.current;
    resetForm();
    if (tab === 'doi') setDoiInput(input);
    else if (tab === 'url') setUrlInput(input);
    else setTitleQuery(titleQuery);
    setFetching(true);
    const arxiv = parseArxivLink(input);
    if (arxiv) setPdfUrl(arxiv.pdfUrl);
    else if (/^https?:\/\/.+\.pdf(\?|#|$)/i.test(input.trim())) setPdfUrl(input.trim());
    try {
      const metadata = await fetchPaperMetadata(input);
      if (request !== requestId.current) return;
      applyMetadata(metadata, /^https?:\/\//i.test(input.trim()) ? input.trim() : undefined);
    } catch (reason) {
      if (request !== requestId.current) return;
      setDoi(paperIdentifier(input) || '');
      setError(reason instanceof Error ? reason.message : String(reason));
      if (!title && arxiv) {
        setTitle(`arXiv:${arxiv.arxivId}`);
        setSourceUrl(arxiv.absUrl);
      }
    } finally {
      if (request === requestId.current) setFetching(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || fetching) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid .pdf document.');
      return;
    }
    const request = ++requestId.current;
    resetForm();
    setFetching(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the file.'));
        reader.onerror = () => reject(new Error('Could not read the file. Try selecting it again.'));
        reader.readAsDataURL(file);
      });
      const metadata = await readPdfMetadata(await file.arrayBuffer());
      if (request !== requestId.current) return;
      setPdfDataUrl(dataUrl);
      setTitle(file.name.replace(/\.pdf$/i, ''));
      applyMetadata(metadata);
      if (metadata.doi) {
        const resolvedMetadata = await fetchPaperMetadata(metadata.doi);
        if (request === requestId.current) applyMetadata({ ...metadata, ...resolvedMetadata });
      }
    } catch (reason) {
      if (request === requestId.current) setError(
        `Import or metadata lookup failed: ${reason instanceof Error ? reason.message : String(reason)}. If the PDF loaded, you can review its details and save it manually.`
      );
    } finally {
      if (request === requestId.current) setFetching(false);
    }
  };

  // Submit and create paper
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fetching) return;
    if (!title.trim()) {
      setError('Paper Title is required.');
      return;
    }

    if (doi.trim() && !paperIdentifier(doi)) {
      setError('Enter a valid DOI or clear the DOI field.');
      return;
    }
    if ([sourceUrl, pdfUrl].some(value => value.trim() && !/^https?:\/\//i.test(value.trim()))) {
      setError('Source and PDF links must use http:// or https://.');
      return;
    }
    const cleanYear = Number(year) || new Date().getFullYear();
    const cleanCitation = citation.trim() || `${authors.split(',')[0] || 'Paper'} (${cleanYear})`;

    const result = onAddPaper({
      title: title.trim(),
      authors: authors.trim() || 'Unknown Authors',
      year: cleanYear,
      citation: cleanCitation,
      doi: paperIdentifier(doi) || undefined,
      url: sourceUrl.trim() || undefined,
      pdfUrl: pdfUrl.trim() || undefined,
      pdfDataUrl: pdfDataUrl || undefined,
      abstract: abstract.trim() || undefined,
      markdown: markdown.trim() || `# ${title}\n\n## Abstract\n${abstract || 'No abstract text.'}`,
      pageCount: pageCount || 1,
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          title: 'Abstract',
          paragraphs: [{ id: `par-${Date.now()}-1` }]
        }
      ],
      highlights: []
    });

    if (result.success && result.paper) {
      onSelectPaper(result.paper.id);
      resetForm();
      onClose();
    } else {
      setError(result.error || 'Failed to add paper to vault.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label="Add Paper to Vault" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add Paper to Vault</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Import academic research by title, DOI, URL, or local PDF</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            aria-label="Close add paper"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Import Mode Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 gap-1 overflow-x-auto">
          {[
            { id: 'title', label: 'Title Search', icon: Search },
            { id: 'doi', label: 'DOI Lookup', icon: Search },
            { id: 'url', label: 'URL / arXiv', icon: Link },
            { id: 'upload', label: 'Upload PDF', icon: Upload }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                disabled={fetching}
                onClick={() => {
                  setActiveTab(tab.id as ModeTab);
                  setError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-900 rounded-t-md'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <fieldset disabled={fetching} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resolved && !error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs" role="status">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{resolved}</span>
            </div>
          )}

          {activeTab === 'title' && (
            <div className="space-y-3">
              <label htmlFor="paper-title-search" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Paper title</label>
              <div className="flex gap-2">
                <input
                  id="paper-title-search"
                  value={titleQuery}
                  maxLength={300}
                  placeholder="e.g. AgentArk: Distilling Multi-Agent Intelligence into a Single LLM Agent"
                  onChange={event => { setTitleQuery(event.target.value); setTitleMatches(null); }}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void handleTitleSearch(); } }}
                  className="min-w-0 flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button type="button" onClick={() => void handleTitleSearch()} disabled={fetching}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                  {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search papers
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Search Crossref and DataCite, including arXiv papers. Choose a match, then review its details before adding.</p>
              {titleMatches && (
                <div className="space-y-2" aria-label="Paper title matches">
                  <p role="status" className="text-xs text-slate-500">
                    {titleMatches.length ? `${titleMatches.length} matches. Select the paper you want.` : 'No matching papers found. Try a shorter title, DOI, or PDF upload.'}
                  </p>
                  {titleMatches.map(match => (
                    <button key={match.doi} type="button" onClick={() => void lookupMetadata(match.doi, 'title')}
                      className="block w-full text-left p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-teal-500 space-y-1">
                      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">{match.title}</span>
                      <span className="block text-xs text-slate-500">{match.authors || 'Authors unavailable'}{match.year ? ` (${match.year})` : ''}</span>
                      <span className="block text-[11px] font-mono text-teal-600 dark:text-teal-400">{match.doi}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode 1: DOI */}
          {activeTab === 'doi' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Digital Object Identifier (DOI)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 10.48550/arXiv.2309.17453 or 10.1145/3639478"
                  value={doiInput}
                  onChange={e => setDoiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), void lookupMetadata(doiInput, 'doi'))}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => void lookupMetadata(doiInput, 'doi')}
                  disabled={fetching}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Fetch Details</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Retrieves title, authors, year, venue, and abstract from CrossRef, falling back to DataCite for arXiv DOIs.
              </p>
            </div>
          )}

          {/* Mode 2: URL / arXiv */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Paper URL or arXiv link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. https://arxiv.org/abs/2309.17453 or direct .pdf link"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), void lookupMetadata(urlInput, 'url'))}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => void lookupMetadata(urlInput, 'url')}
                  disabled={fetching}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                  <span>Fetch Details</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Accepts arXiv links, DOI links, and public PDF links. If a site blocks access, upload the PDF instead.
              </p>
            </div>
          )}

          {/* Mode 3: Upload PDF */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">The PDF stays local. Detected DOI or arXiv identifiers are looked up online to fill in authors and publication details.</p>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Upload Local PDF Document
              </label>
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 rounded-xl p-6 text-center transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Upload className="w-8 h-8 text-teal-500" />
                  <span className="text-xs font-medium">
                    {pdfDataUrl ? 'PDF Loaded Successfully (Click to replace)' : 'Drag and drop your PDF here, or click to browse'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports all standard academic PDF documents
                  </span>
                </div>
              </div>
              {pdfDataUrl && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Document parsed ({pageCount} pages). Form fields below have been pre-filled.</span>
                </div>
              )}
            </div>
          )}

          {/* Detailed Paper Metadata Inputs (Editable for all modes) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Paper Details & Review
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">Paper Title *</label>
              <input
                type="text"
                placeholder="Title of the paper"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Authors</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe, Jane Smith"
                  value={authors}
                  onChange={e => setAuthors(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400">Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2024"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">Citation / Venue</label>
              <input
                type="text"
                placeholder="e.g. ICLR 2024 / Nature Machine Intelligence"
                value={citation}
                onChange={e => setCitation(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">Abstract</label>
              <textarea
                rows={3}
                placeholder="Paper abstract or key summary..."
                value={abstract}
                onChange={e => setAbstract(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400" htmlFor="paper-doi">DOI</label>
                <input
                  id="paper-doi"
                  type="text"
                  placeholder="e.g. 10.1145/3639478"
                  value={doi}
                  onChange={e => setDoi(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 dark:text-slate-400" htmlFor="paper-url">Source URL</label>
                <input
                  id="paper-url"
                  type="text"
                  placeholder="https://doi.org/... or https://arxiv.org/abs/..."
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">PDF Document Link (Optional)</label>
              <input
                type="text"
                placeholder="https://.../paper.pdf"
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={fetching}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Paper to Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
};
