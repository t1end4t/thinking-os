import React, { useState } from 'react';
import {
  X,
  Plus,
  Link,
  Upload,
  BookOpen,
  Sparkles,
  FileText,
  Search,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Paper } from '../../types';
import { fetchCrossrefMetadata, parseArxivLink, PRESET_PAPERS } from '../../utils/pdfGenerator';
import * as pdfjsLib from 'pdfjs-dist';

interface AddPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPaper: (paperData: Omit<Paper, 'id'> & { id?: string }) => { success: boolean; paper?: Paper; error?: string };
  onSelectPaper: (paperId: string) => void;
}

type ModeTab = 'doi' | 'url' | 'upload' | 'preset' | 'manual';

export const AddPaperModal: React.FC<AddPaperModalProps> = ({
  isOpen,
  onClose,
  onAddPaper,
  onSelectPaper
}) => {
  const [activeTab, setActiveTab] = useState<ModeTab>('doi');
  const [doiInput, setDoiInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
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
    setError(null);
  };

  // Handle DOI fetch
  const handleFetchDoi = async () => {
    if (!doiInput.trim()) {
      setError('Please enter a DOI (e.g. 10.48550/arXiv.2309.17453).');
      return;
    }
    setFetching(true);
    setError(null);

    // Check if it's an arXiv DOI or ID
    const arxivInfo = parseArxivLink(doiInput);
    if (arxivInfo) {
      setPdfUrl(arxivInfo.pdfUrl);
    }

    const meta = await fetchCrossrefMetadata(doiInput);
    setFetching(false);

    if (meta) {
      if (meta.title) setTitle(meta.title);
      if (meta.authors) setAuthors(meta.authors);
      if (meta.year) setYear(meta.year);
      if (meta.citation) setCitation(meta.citation);
      if (meta.abstract) setAbstract(meta.abstract);
      if (meta.url) {
        if (!pdfUrl) setPdfUrl(meta.url);
      }
      if (meta.title && !markdown) {
        setMarkdown(`# ${meta.title}\n\n## Abstract\n${meta.abstract || 'No abstract retrieved.'}\n\n## Notes\nAdded via CrossRef DOI ${doiInput}.`);
      }
    } else {
      setError('Could not automatically resolve metadata for this DOI. You can enter details manually below.');
    }
  };

  // Handle URL fetch / parse
  const handleParseUrl = () => {
    if (!urlInput.trim()) {
      setError('Please enter a paper URL or arXiv link.');
      return;
    }
    setError(null);
    const arxiv = parseArxivLink(urlInput);
    if (arxiv) {
      setPdfUrl(arxiv.pdfUrl);
      if (!title) setTitle(`arXiv:${arxiv.arxivId}`);
      if (!citation) setCitation(`arXiv preprint arXiv:${arxiv.arxivId}`);
      if (!markdown) {
        setMarkdown(`# arXiv:${arxiv.arxivId}\n\nPaper retrieved from ${urlInput}.\n\nView PDF directly in the reader above.`);
      }
    } else if (urlInput.toLowerCase().endsWith('.pdf')) {
      setPdfUrl(urlInput);
      const filename = urlInput.split('/').pop()?.replace('.pdf', '') || 'Document';
      if (!title) setTitle(decodeURIComponent(filename));
      if (!citation) setCitation(`Online PDF (${urlInput})`);
    } else {
      setPdfUrl(urlInput);
    }
  };

  // Handle Local PDF file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid .pdf document.');
      return;
    }

    setError(null);
    setFetching(true);

    const reader = new FileReader();
    reader.onload = async event => {
      const dataUrl = event.target?.result as string;
      setPdfDataUrl(dataUrl);

      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName);
      setCitation(`Local PDF (${file.name})`);

      try {
        // Try reading with pdfjs to get page count and title
        const arrayBuf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
        setPageCount(doc.numPages);

        const meta = await doc.getMetadata().catch(() => null);
        if (meta?.info) {
          const info = meta.info as any;
          if (info.Title) setTitle(info.Title);
          if (info.Author) setAuthors(info.Author);
        }

        // Try extracting first page text for initial markdown
        const p1 = await doc.getPage(1);
        const textContent = await p1.getTextContent();
        const extracted = textContent.items
          .map((i: any) => i.str)
          .join(' ')
          .slice(0, 1500);

        setMarkdown(`# ${fileName}\n\n## Abstract & First Page Extraction\n${extracted || 'PDF loaded successfully.'}`);
      } catch (err) {
        console.warn('PDF metadata read error:', err);
      } finally {
        setFetching(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit and create paper
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Paper Title is required.');
      return;
    }

    const cleanYear = Number(year) || new Date().getFullYear();
    const cleanCitation = citation.trim() || `${authors.split(',')[0] || 'Paper'} (${cleanYear})`;

    const result = onAddPaper({
      title: title.trim(),
      authors: authors.trim() || 'Unknown Authors',
      year: cleanYear,
      citation: cleanCitation,
      doi: doiInput.trim() || undefined,
      url: urlInput.trim() || undefined,
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

  // Quick add preset
  const handleAddPreset = (preset: typeof PRESET_PAPERS[0]) => {
    const { presetId, ...paperData } = preset;
    const result = onAddPaper({
      ...paperData,
      id: `p-${presetId}`
    });
    if (result.success && result.paper) {
      onSelectPaper(result.paper.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add Paper to Vault</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Import academic research via DOI, URL, or local PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Import Mode Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 gap-1 overflow-x-auto">
          {[
            { id: 'doi', label: 'DOI Lookup', icon: Search },
            { id: 'url', label: 'URL / arXiv', icon: Link },
            { id: 'upload', label: 'Upload PDF', icon: Upload },
            { id: 'preset', label: 'Benchmark Presets', icon: Sparkles },
            { id: 'manual', label: 'Manual Entry', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchDoi())}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={handleFetchDoi}
                  disabled={fetching}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Fetch Details</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Retrieves official citation, author list, abstract, and publication year directly from CrossRef.
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
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleParseUrl())}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={handleParseUrl}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Parse Link</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatically resolves arXiv preprints into PDF viewing links and canonical metadata.
              </p>
            </div>
          )}

          {/* Mode 3: Upload PDF */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
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

          {/* Mode 4: Presets */}
          {activeTab === 'preset' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Click any seminal benchmark paper to instantly add it to your research vault:
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {PRESET_PAPERS.map(preset => (
                  <div
                    key={preset.presetId}
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-teal-500/50 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {preset.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {preset.authors} ({preset.year})
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2">
                        {preset.abstract}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))}
              </div>
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
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
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
