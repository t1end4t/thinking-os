import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  Code
} from 'lucide-react';
import { CitationItem } from '../../manuscriptTypes';
import { useWorkspace } from '../../context/WorkspaceContext';

interface CitationManagerProps {
  onInsertCite?: (citeTag: string) => void;
  onOpenCitationModal: (citationToEdit?: CitationItem | null) => void;
  activeSectionId?: string;
}

export const CitationManager: React.FC<CitationManagerProps> = ({
  onInsertCite,
  onOpenCitationModal,
  activeSectionId
}) => {
  const {
    manuscript,
    attachCitationToSection,
    removeCitation
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedBibKey, setExpandedBibKey] = useState<string | null>(null);

  // Filter citations
  const filteredCitations = manuscript.citations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.key.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.authors.toLowerCase().includes(q) ||
      c.venue.toLowerCase().includes(q) ||
      (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const handleDragStartCitation = (e: React.DragEvent, citation: CitationItem) => {
    e.dataTransfer.setData(
      'application/x-manuscript-drop',
      JSON.stringify({ kind: 'citation', id: citation.key, title: citation.title })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const copyBibtex = (citation: CitationItem) => {
    navigator.clipboard.writeText(citation.bibtex);
    setCopiedKey(citation.key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyAllBibtex = () => {
    const all = manuscript.citations.map(c => c.bibtex).join('\n\n');
    navigator.clipboard.writeText(all);
    setCopiedKey('all');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] border-l border-[var(--color-rule)] select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--color-rule)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <BookMarked size={15} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
              Citations & BibTeX
              <span className="text-[0.65rem] font-mono font-normal text-[var(--color-ink-muted)]">
                ({manuscript.citations.length})
              </span>
            </h4>
            <p className="text-[0.68rem] text-[var(--color-ink-muted)]">
              Bibliographic registry & argumentative grounding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={copyAllBibtex}
            title="Copy full bibliography as .bib"
            className="flex items-center gap-1 text-[0.7rem] px-2 py-1 rounded-lg border border-[var(--color-rule)] hover:bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors"
          >
            {copiedKey === 'all' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            .bib
          </button>
          <button
            onClick={() => onOpenCitationModal(null)}
            className="flex items-center gap-1 text-[0.72rem] font-medium px-2.5 py-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-2xs transition-colors shrink-0"
          >
            <Plus size={13} />
            Add Ref
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/30">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search key, author, venue, title..."
            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredCitations.length === 0 && (
          <div className="text-center py-10 text-[var(--color-ink-muted)] space-y-2">
            <BookMarked size={28} className="mx-auto opacity-40 text-teal-600" />
            <p className="text-xs">No citations match your search</p>
            <button
              onClick={() => onOpenCitationModal(null)}
              className="text-xs text-teal-600 hover:underline font-medium"
            >
              + Add a new citation
            </button>
          </div>
        )}

        {filteredCitations.map(cit => {
          const isAttachedToActive = activeSectionId
            ? manuscript.sections.find(s => s.id === activeSectionId)?.attachedCitationKeys.includes(cit.key)
            : false;

          const isBibExpanded = expandedBibKey === cit.key;

          return (
            <div
              key={cit.key}
              draggable
              onDragStart={e => handleDragStartCitation(e, cit)}
              className="group relative p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-teal-300 dark:hover:border-teal-800 transition-all cursor-grab active:cursor-grabbing shadow-xs"
            >
              {/* Key Row */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-200">
                    @{cit.key}
                  </span>
                  <span className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-[var(--color-ink-muted)]">
                    {cit.year}
                  </span>
                  {cit.venue && (
                    <span className="text-[0.65rem] px-1.5 py-0.5 rounded border border-[var(--color-rule)] text-[var(--color-ink-muted)] truncate max-w-[120px]">
                      {cit.venue}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenCitationModal(cit)}
                    title="Edit citation"
                    className="p-1 rounded text-[var(--color-ink-muted)] hover:text-teal-600 hover:bg-[var(--color-surface)]"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => removeCitation(cit.key)}
                    title="Delete citation"
                    className="p-1 rounded text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-[var(--color-surface)]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h5 className="text-xs font-semibold text-[var(--color-ink)] leading-snug line-clamp-2">
                {cit.title}
              </h5>

              {/* Authors */}
              <p className="text-[0.68rem] text-[var(--color-ink-muted)] mt-1 line-clamp-1 italic">
                {cit.authors}
              </p>

              {/* Supported Claims Badges */}
              {cit.claimIds && cit.claimIds.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <span className="text-[0.62rem] text-purple-700 dark:text-purple-300 font-medium">
                    Grounds:
                  </span>
                  {cit.claimIds.map(cId => (
                    <span
                      key={cId}
                      className="text-[0.62rem] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300"
                    >
                      {cId}
                    </span>
                  ))}
                </div>
              )}

              {/* Abstract snippet if present */}
              {cit.abstract && (
                <p className="text-[0.65rem] text-[var(--color-ink-muted)] mt-1.5 line-clamp-2 leading-tight">
                  {cit.abstract}
                </p>
              )}

              {/* BibTeX toggleable view */}
              {isBibExpanded && (
                <div className="mt-2 p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)]">
                  <pre className="text-[0.62rem] font-mono text-[var(--color-ink)] overflow-x-auto whitespace-pre leading-relaxed">
                    {cit.bibtex}
                  </pre>
                </div>
              )}

              {/* Footer controls */}
              <div className="mt-2.5 pt-2 border-t border-[var(--color-rule)] flex items-center justify-between text-[0.68rem]">
                <button
                  onClick={() => setExpandedBibKey(isBibExpanded ? null : cit.key)}
                  className="text-[0.62rem] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] flex items-center gap-1 font-mono"
                >
                  <Code size={11} /> {isBibExpanded ? 'Hide' : 'BibTeX'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyBibtex(cit)}
                    title="Copy BibTeX to clipboard"
                    className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-teal-600 flex items-center gap-1"
                  >
                    {copiedKey === cit.key ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    Bib
                  </button>

                  {onInsertCite && (
                    <button
                      onClick={() => onInsertCite(`\\cite{${cit.key}}`)}
                      title="Insert \\cite{key} into text"
                      className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-teal-600"
                    >
                      \cite
                    </button>
                  )}

                  {activeSectionId && (
                    <button
                      onClick={() =>
                        isAttachedToActive
                          ? null
                          : attachCitationToSection(activeSectionId, cit.key)
                      }
                      disabled={isAttachedToActive}
                      className={`text-[0.65rem] px-2 py-0.5 rounded font-medium transition-colors ${
                        isAttachedToActive
                          ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {isAttachedToActive ? 'Attached' : '+ Attach'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
