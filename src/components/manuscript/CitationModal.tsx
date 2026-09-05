import React, { useState } from 'react';
import { X, BookMarked, Sparkles } from 'lucide-react';
import { CitationItem } from '../../manuscriptTypes';
import { useWorkspace } from '../../context/WorkspaceContext';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (citation: CitationItem) => void;
  initialCitation?: CitationItem | null;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCitation
}) => {
  const { claims } = useWorkspace();

  const [mode, setMode] = useState<'form' | 'bibtex'>('form');
  const [key, setKey] = useState(initialCitation?.key || '');
  const [title, setTitle] = useState(initialCitation?.title || '');
  const [authors, setAuthors] = useState(initialCitation?.authors || '');
  const [year, setYear] = useState<number>(initialCitation?.year || 2024);
  const [venue, setVenue] = useState(initialCitation?.venue || '');
  const [doi, setDoi] = useState(initialCitation?.doi || '');
  const [url, setUrl] = useState(initialCitation?.url || '');
  const [abstract, setAbstract] = useState(initialCitation?.abstract || '');
  const [bibtex, setBibtex] = useState(initialCitation?.bibtex || '');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>(initialCitation?.claimIds || []);
  const [tagsInput, setTagsInput] = useState((initialCitation?.tags || []).join(', '));

  if (!isOpen) return null;

  // Simple BibTeX auto-parser
  const parseBibtexString = (rawBibtex: string) => {
    try {
      const keyMatch = rawBibtex.match(/@\w+\s*\{\s*([^,\s]+)/);
      if (keyMatch && keyMatch[1]) setKey(keyMatch[1].trim());

      const titleMatch = rawBibtex.match(/title\s*=\s*[{"]([^}"]+)[}"]/i);
      if (titleMatch && titleMatch[1]) setTitle(titleMatch[1].trim());

      const authorMatch = rawBibtex.match(/author\s*=\s*[{"]([^}"]+)[}"]/i);
      if (authorMatch && authorMatch[1]) setAuthors(authorMatch[1].trim());

      const yearMatch = rawBibtex.match(/year\s*=\s*[{"]?(\d{4})[}"]?/i);
      if (yearMatch && yearMatch[1]) setYear(parseInt(yearMatch[1], 10));

      const venueMatch =
        rawBibtex.match(/booktitle\s*=\s*[{"]([^}"]+)[}"]/i) ||
        rawBibtex.match(/journal\s*=\s*[{"]([^}"]+)[}"]/i);
      if (venueMatch && venueMatch[1]) setVenue(venueMatch[1].trim());

      const doiMatch = rawBibtex.match(/doi\s*=\s*[{"]([^}"]+)[}"]/i);
      if (doiMatch && doiMatch[1]) setDoi(doiMatch[1].trim());
    } catch (e) {
      console.warn('BibTeX parse error:', e);
    }
  };

  const handleBibtexChange = (val: string) => {
    setBibtex(val);
    parseBibtexString(val);
  };

  const generateBibtexFromFields = () => {
    const bib = `@inproceedings{${key || 'citation_key'},
  title={${title || 'Untitled'}},
  author={${authors || 'Unknown'}},
  booktitle={${venue || 'Proceedings'}},
  year={${year || 2024}}${doi ? `,\n  doi={${doi}}` : ''}
}`;
    setBibtex(bib);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !title.trim()) return;

    let finalBibtex = bibtex.trim();
    if (!finalBibtex) {
      finalBibtex = `@inproceedings{${key.trim()},
  title={${title.trim()}},
  author={${authors.trim()}},
  booktitle={${venue.trim()}},
  year={${year}}${doi ? `,\n  doi={${doi.trim()}}` : ''}
}`;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const citationItem: CitationItem = {
      key: key.trim(),
      title: title.trim(),
      authors: authors.trim(),
      year,
      venue: venue.trim(),
      doi: doi.trim() || undefined,
      url: url.trim() || undefined,
      abstract: abstract.trim() || undefined,
      bibtex: finalBibtex,
      claimIds: selectedClaimIds.length > 0 ? selectedClaimIds : undefined,
      tags: tags.length > 0 ? tags : undefined
    };

    onSave(citationItem);
    onClose();
  };

  const toggleClaim = (cId: string) => {
    setSelectedClaimIds(prev =>
      prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-citation-title"
        className="bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-rule)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <BookMarked size={16} />
            </div>
            <div>
              <h3 id="modal-add-citation-title" className="text-base font-semibold text-[var(--color-ink)]">
                {initialCitation ? 'Edit Citation' : 'Add Research Citation'}
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Manage bibliographic references, BibTeX entries, and link them to claims.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 py-2.5 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/40 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('form')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === 'form'
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-rule)] shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Manual Details
            </button>
            <button
              type="button"
              onClick={() => setMode('bibtex')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === 'bibtex'
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-rule)] shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Paste BibTeX
            </button>
          </div>

          <button
            type="button"
            onClick={generateBibtexFromFields}
            className="text-[0.7rem] flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-mono"
          >
            <Sparkles size={12} /> Auto-generate BibTeX
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {mode === 'bibtex' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--color-ink)]">
                Paste Raw BibTeX Entry
              </label>
              <textarea
                rows={7}
                value={bibtex}
                onChange={e => handleBibtexChange(e.target.value)}
                placeholder="@article{key,&#10;  title={Paper Title},&#10;  author={Author One and Author Two},&#10;  year={2024}&#10;}"
                className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
              />
              <p className="text-[0.7rem] text-[var(--color-ink-muted)]">
                Fields below are automatically parsed from this BibTeX snippet.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Citation Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={key}
                onChange={e => setKey(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="e.g. xiao2024streaming"
                className="w-full text-xs font-mono px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
              />
              <p className="text-[0.65rem] text-[var(--color-ink-muted)] mt-0.5">
                Use via <code>\cite&#123;{key || 'key'}&#125;</code>
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Paper / Work Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Full paper title"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Authors (Full names or formatted)
              </label>
              <input
                type="text"
                value={authors}
                onChange={e => setAuthors(e.target.value)}
                placeholder="Guangxuan Xiao, Yuandong Tian, et al."
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value, 10) || 2024)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Venue / Conference / Journal
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="ICLR, NeurIPS, ICML, Nature..."
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                DOI / ArXiv Identifier
              </label>
              <input
                type="text"
                value={doi}
                onChange={e => setDoi(e.target.value)}
                placeholder="10.48550/arXiv.2309.17453"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
              Abstract or Core Argument Takeaway
            </label>
            <textarea
              rows={2}
              value={abstract}
              onChange={e => setAbstract(e.target.value)}
              placeholder="Summary of empirical finding or theoretical proof..."
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Link to Claims */}
          <div className="pt-2 border-t border-[var(--color-rule)]">
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1.5">
              Claims Reinforced by this Citation
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)]">
              {claims.map(c => {
                const isSelected = selectedClaimIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClaim(c.id)}
                    className={`text-[0.7rem] px-2 py-1 rounded-md transition-all text-left flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-teal-600 text-white font-medium shadow-2xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-rule)] hover:border-teal-400'
                    }`}
                  >
                    <span className="font-mono font-bold">[{c.id}]</span>
                    <span className="truncate max-w-[200px]">{c.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="architecture, attention, long-context"
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[var(--color-rule)] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-xs"
            >
              Save Citation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
