import React, { useState, useMemo } from 'react';
import {
  ScrollText,
  Plus,
  Copy,
  Trash2,
  Check,
  X,
  Search,
  ExternalLink,
  BookOpen,
  Calendar,
  FileText,
  Bookmark,
  Building
} from 'lucide-react';
import { ManuscriptDocument, ManuscriptMeta } from '../../manuscriptTypes';

interface ManuscriptVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuscripts: ManuscriptDocument[];
  activeManuscriptId: string;
  onSwitchManuscript: (id: string) => void;
  onCreateManuscript: (meta?: Partial<ManuscriptMeta>) => ManuscriptDocument;
  onDuplicateManuscript: (id: string) => ManuscriptDocument;
  onDeleteManuscript: (id: string) => void;
}

export const ManuscriptVaultModal: React.FC<ManuscriptVaultModalProps> = ({
  isOpen,
  onClose,
  manuscripts,
  activeManuscriptId,
  onSwitchManuscript,
  onCreateManuscript,
  onDuplicateManuscript,
  onDeleteManuscript
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'drafting' | 'review_ready' | 'submitted'>('all');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newVenue, setNewVenue] = useState('ICLR 2025');
  const [newAbstract, setNewAbstract] = useState('');

  const filteredManuscripts = useMemo(() => {
    return manuscripts.filter(doc => {
      const matchesSearch =
        doc.meta.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.meta.subtitle && doc.meta.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        doc.meta.targetVenue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.meta.authors.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || doc.meta.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [manuscripts, searchQuery, statusFilter]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateManuscript({
      title: newTitle.trim(),
      subtitle: newSubtitle.trim(),
      targetVenue: newVenue.trim() || 'ICLR 2025',
      abstract: newAbstract.trim(),
      status: 'drafting',
      authors: [{ name: 'Research Author', affiliation: 'Thinking OS Laboratory' }]
    });

    setNewTitle('');
    setNewSubtitle('');
    setNewVenue('ICLR 2025');
    setNewAbstract('');
    setIsCreatingNew(false);
    onClose();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'review_ready':
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Review Ready
          </span>
        );
      case 'submitted':
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Submitted
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Drafting
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--color-rule)] flex items-center justify-between bg-[var(--color-paper)]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center border border-purple-300 dark:border-purple-800">
              <ScrollText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--color-ink)]">
                  Manuscript Vault
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200/50">
                  {manuscripts.length} Papers
                </span>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Manage all academic manuscripts and publications in your research workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingNew && (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>New Manuscript</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Create New Manuscript Inline Form */}
        {isCreatingNew && (
          <form onSubmit={handleCreate} className="p-5 border-b border-[var(--color-rule)] bg-purple-50/20 dark:bg-purple-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Plus size={13} /> Draft New Research Paper
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[0.6875rem] font-mono uppercase text-[var(--color-ink-muted)]">
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Attention Sink Preservation in Streaming Transformers"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[0.6875rem] font-mono uppercase text-[var(--color-ink-muted)]">
                  Target Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. ICLR 2025 / NeurIPS"
                  value={newVenue}
                  onChange={e => setNewVenue(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[0.6875rem] font-mono uppercase text-[var(--color-ink-muted)]">
                Subtitle (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. A Structural and Empirical Investigation"
                value={newSubtitle}
                onChange={e => setNewSubtitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[0.6875rem] font-mono uppercase text-[var(--color-ink-muted)]">
                Initial Abstract
              </label>
              <textarea
                rows={2}
                placeholder="Core problem, methodology, and primary empirical findings..."
                value={newAbstract}
                onChange={e => setNewAbstract(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:border-purple-500 resize-none font-serif"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-rule)] text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                Create Paper & Open in Studio
              </button>
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface)] shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--color-ink-muted)]" />
            <input
              type="text"
              placeholder="Search papers by title, authors, venue..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)]/40 text-[var(--color-ink)] focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] text-[0.6875rem] font-mono">
            {(['all', 'drafting', 'review_ready', 'submitted'] as const).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-[var(--color-surface)] text-purple-700 dark:text-purple-300 font-bold shadow-2xs'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Manuscript List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredManuscripts.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-ink-muted)]">
              <ScrollText size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No manuscripts found.</p>
              <p className="text-xs mt-1">Try another search query or click "New Manuscript" to start a paper.</p>
            </div>
          ) : (
            filteredManuscripts.map(doc => {
              const docId = doc.id || 'doc-1';
              const isActive = docId === activeManuscriptId;
              const wordCount = doc.sections.reduce((acc, s) => {
                const words = s.content.trim() ? s.content.trim().split(/\s+/).length : 0;
                return acc + words;
              }, 0);

              return (
                <div
                  key={docId}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-purple-400 bg-purple-50/25 dark:bg-purple-950/20 shadow-xs ring-1 ring-purple-400/50'
                      : 'border-[var(--color-rule)] bg-[var(--color-surface)] hover:border-purple-300/80 hover:bg-[var(--color-paper)]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isActive && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold bg-purple-600 text-white shrink-0">
                            <Check size={10} /> Active in Studio
                          </span>
                        )}
                        <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-[var(--color-paper)] text-[var(--color-ink-muted)] border border-[var(--color-rule)] flex items-center gap-1">
                          <Building size={10} /> {doc.meta.targetVenue}
                        </span>
                        {getStatusBadge(doc.meta.status)}
                      </div>

                      <h4
                        onClick={() => {
                          onSwitchManuscript(docId);
                          onClose();
                        }}
                        className="text-sm font-serif font-bold text-[var(--color-ink)] hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors leading-snug"
                      >
                        {doc.meta.title}
                      </h4>

                      {doc.meta.subtitle && (
                        <p className="text-xs text-[var(--color-ink-muted)] italic font-serif">
                          {doc.meta.subtitle}
                        </p>
                      )}

                      {doc.meta.abstract && (
                        <p className="text-[0.6875rem] text-[var(--color-ink-muted)] line-clamp-2 leading-relaxed font-serif">
                          {doc.meta.abstract}
                        </p>
                      )}

                      {/* Paper Metrics */}
                      <div className="pt-2 flex flex-wrap items-center gap-4 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                        <span className="flex items-center gap-1">
                          <FileText size={12} className="text-purple-500" />
                          <strong className="text-[var(--color-ink)]">{doc.sections.length}</strong> sections
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} className="text-emerald-500" />
                          <strong className="text-[var(--color-ink)]">{wordCount.toLocaleString()}</strong> words
                        </span>
                        <span className="flex items-center gap-1">
                          <Bookmark size={12} className="text-indigo-500" />
                          <strong className="text-[var(--color-ink)]">{doc.citations.length}</strong> citations
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(doc.meta.lastEditedAt || doc.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Paper Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-mono font-medium hover:bg-purple-200 transition-colors"
                        >
                          Viewing
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchManuscript(docId);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors shadow-xs"
                        >
                          <ExternalLink size={12} />
                          <span>Open</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDuplicateManuscript(docId)}
                        title="Duplicate this manuscript"
                        className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-purple-600 hover:bg-[var(--color-paper)] transition-colors border border-[var(--color-rule)]"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete manuscript "${doc.meta.title}"?`)) {
                            onDeleteManuscript(docId);
                          }
                        }}
                        disabled={manuscripts.length <= 1}
                        title="Delete manuscript"
                        className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-[var(--color-paper)] transition-colors border border-[var(--color-rule)] disabled:opacity-30"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--color-rule)] bg-[var(--color-paper)]/40 flex items-center justify-between text-xs text-[var(--color-ink-muted)] shrink-0 font-mono">
          <span>{filteredManuscripts.length} of {manuscripts.length} manuscripts</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-paper)] font-medium transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
