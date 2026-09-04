import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Paper, EvidenceForm, EvidenceOrigin } from '../../types';
import {
  FileText,
  Bookmark,
  ExternalLink,
  MessageSquare,
  Plus,
  Highlighter,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const PapersSurface: React.FC = () => {
  const {
    papers,
    claims,
    addEvidence,
    setActiveContext,
    sendAssistantMessage
  } = useWorkspace();

  const [activePaperId, setActivePaperId] = useState<string>('p1');
  const [selectedText, setSelectedText] = useState<string>('');
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{ x: number; y: number } | null>(null);

  // Evidence creation modal
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [findingTitle, setFindingTitle] = useState<string>('');
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claims[0]?.id || '');
  const [evidenceForm, setEvidenceForm] = useState<EvidenceForm>('measurement');
  const [userReason, setUserReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const articleRef = useRef<HTMLDivElement>(null);
  const activePaper = papers.find(p => p.id === activePaperId) || papers[0];

  // Handle text selection in paper reader
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setFloatingToolbarPos(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 5) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setFloatingToolbarPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 44
      });
    } else {
      setFloatingToolbarPos(null);
    }
  };

  const handleAskAssistant = () => {
    if (!selectedText) return;
    setActiveContext({
      type: 'passage',
      id: `passage-${Date.now()}`,
      label: `Passage from ${activePaper.authors.split(',')[0]} (${activePaper.year})`,
      secondaryLabel: `"${selectedText.slice(0, 35)}..."`,
      metadata: { paperId: activePaper.id, passage: selectedText }
    });
    sendAssistantMessage(`passage-${Date.now()}`, `Analyzing passage:\n"${selectedText}"\n\nHow does this finding relate to our claims on representational interference?`);
    setFloatingToolbarPos(null);
  };

  const handleOpenEvidenceModal = () => {
    setFindingTitle(selectedText.slice(0, 100));
    setUserReason('');
    setFormError(null);
    setShowEvidenceModal(true);
    setFloatingToolbarPos(null);
  };

  const handleCreateEvidence = () => {
    if (!userReason.trim()) {
      setFormError('Gate 5 violation: Every evidence link requires a committed user reason.');
      return;
    }

    const result = addEvidence(
      {
        title: findingTitle.trim(),
        origin: 'literature',
        form: evidenceForm,
        citation: `${activePaper.authors.split(',')[0]} ${activePaper.year}`,
        paperId: activePaper.id
      },
      selectedClaimId,
      userReason.trim()
    );

    if (!result.success) {
      setFormError(result.error || 'Failed to create evidence.');
    } else {
      setShowEvidenceModal(false);
      setFindingTitle('');
      setUserReason('');
    }
  };

  return (
    <div
      id="papers-surface"
      className="flex-1 h-full flex flex-col bg-[var(--color-surface)] overflow-hidden"
    >
      {/* Paper Tabs Header */}
      <div className="h-12 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/70 px-4 flex items-center gap-2 shrink-0 overflow-x-auto">
        {papers.map(p => {
          const isActive = p.id === activePaperId;
          return (
            <button
              key={p.id}
              id={`paper-tab-${p.id}`}
              onClick={() => {
                setActivePaperId(p.id);
                setFloatingToolbarPos(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-mono rounded-full flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">{p.title}</span>
              <span className="text-[10px] text-teal-600/70 dark:text-teal-400/70">
                ({p.year})
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Reader View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail: Section TOC & Linked Passages */}
        <aside className="w-72 border-r border-[var(--color-rule)] bg-[var(--color-surface)] p-5 flex flex-col gap-5 shrink-0 overflow-y-auto hidden md:flex">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/50 w-fit">
              Document Metadata
            </span>
            <h3 className="font-serif text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug mt-1">
              {activePaper.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activePaper.authors}
            </p>
            <p className="font-mono text-[11px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              {activePaper.citation} • {activePaper.pageCount} pp
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
              <LinkIcon className="w-3 h-3 text-teal-600" />
              Linked Passages in Graph
            </span>
            <div className="flex flex-col gap-2">
              {activePaper.sections.map(sec => {
                const linked = sec.paragraphs.filter(p => p.linkedClaimId);
                if (linked.length === 0) return null;
                return (
                  <div
                    key={sec.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-2xs"
                  >
                    <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                      {sec.title}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-1 w-fit font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Linked to Claim #{linked[0].linkedClaimId}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Paper Text Reader */}
        <main
          ref={articleRef}
          onMouseUp={handleMouseUp}
          className="flex-1 h-full overflow-y-auto p-8 lg:p-12 flex justify-center bg-[var(--color-paper)]"
        >
          <div className="max-w-[72ch] w-full flex flex-col gap-6">
            <header className="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h1 className="font-serif text-[28px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {activePaper.title}
              </h1>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                <span>{activePaper.authors}</span>
                <span className="font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.5 rounded-full border border-teal-200/50 font-medium">
                  {activePaper.citation}
                </span>
              </div>
            </header>

            {/* Render paper markdown / formatted text */}
            <div className="font-serif text-[16px] text-slate-800 dark:text-slate-200 leading-relaxed space-y-5 select-text">
              {activePaper.markdown.split('\n\n').map((block, idx) => {
                if (block.startsWith('### ')) {
                  return (
                    <h3
                      key={idx}
                      className="font-sans font-bold text-[18px] text-slate-900 dark:text-slate-100 pt-5 border-t border-slate-200/60 dark:border-slate-800"
                    >
                      {block.replace('### ', '')}
                    </h3>
                  );
                }
                // Check if this paragraph is linked
                const isLinked = activePaper.sections.some(s =>
                  s.paragraphs.some(p => p.linkedClaimId && block.includes('sparse'))
                );

                return (
                  <p
                    key={idx}
                    className={`relative transition-colors ${
                      isLinked
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500 pl-4 py-2 rounded-r-xl'
                        : ''
                    }`}
                  >
                    {block}
                  </p>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Floating Toolbar on Text Selection */}
      {floatingToolbarPos && (
        <div
          id="paper-selection-toolbar"
          style={{
            left: `${floatingToolbarPos.x}px`,
            top: `${floatingToolbarPos.y}px`
          }}
          className="fixed -translate-x-1/2 z-50 flex items-center gap-1.5 bg-slate-900/90 text-white backdrop-blur-md px-2 py-1.5 rounded-full shadow-xl text-xs font-mono select-none border border-slate-700/60 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={handleAskAssistant}
            className="px-3 py-1 flex items-center gap-1.5 hover:bg-white/20 rounded-full transition-colors font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-300" />
            <span>Ask</span>
          </button>

          <div className="w-[1px] h-3 bg-white/20" />

          <button
            onClick={handleOpenEvidenceModal}
            className="px-3 py-1 flex items-center gap-1.5 hover:bg-white/20 rounded-full transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span>+ Evidence</span>
          </button>

          <div className="w-[1px] h-3 bg-white/20" />

          <button
            onClick={() => setFloatingToolbarPos(null)}
            className="px-3 py-1 flex items-center gap-1.5 hover:bg-white/20 rounded-full transition-colors font-medium"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-300" />
            <span>Highlight</span>
          </button>
        </div>
      )}

      {/* Gate 5: Evidence Creation Modal (Requires One-Line User Reason) */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/50">
                Gate 5 Evidence Capture
              </span>
              <h3 className="font-serif text-[18px] font-bold text-slate-900 dark:text-slate-100 mt-2">
                Attach Finding to Argument Tree
              </h3>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              {/* Finding summary */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[11px] text-slate-700 dark:text-slate-300 uppercase font-semibold">
                  Finding Statement (Extracted finding, NOT the paper itself):
                </label>
                <input
                  type="text"
                  value={findingTitle}
                  onChange={e => setFindingTitle(e.target.value)}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-serif text-[14px]"
                />
              </div>

              {/* Target Claim */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[11px] text-slate-700 dark:text-slate-300 uppercase font-semibold">
                  Target Claim to Support:
                </label>
                <select
                  value={selectedClaimId}
                  onChange={e => setSelectedClaimId(e.target.value)}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-serif text-[13px]"
                >
                  {claims.map(c => (
                    <option key={c.id} value={c.id}>
                      Claim #{c.id}: {c.text.slice(0, 70)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Vocabulary */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] text-slate-700 dark:text-slate-300 uppercase font-semibold">
                  Evidence Form:
                </label>
                <div className="flex items-center gap-2">
                  {(['measurement', 'derivation', 'counterexample'] as EvidenceForm[]).map(form => (
                    <button
                      key={form}
                      type="button"
                      onClick={() => setEvidenceForm(form)}
                      className={`px-3 py-1 text-xs font-mono rounded-full border transition-all capitalize font-medium ${
                        evidenceForm === form
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {form}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mandatory User Reason */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] text-slate-900 dark:text-slate-100 uppercase font-bold">
                    Your Reason (REQUIRED by Gate 5):
                  </label>
                  <span className="font-mono text-[10px] text-rose-500 font-semibold">
                    * Never written by model
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={userReason}
                  onChange={e => setUserReason(e.target.value)}
                  placeholder="Why does this passage support the chosen claim?"
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-serif text-[14px]"
                />
              </div>

              {formError && (
                <span className="font-mono text-xs text-rose-500 font-medium">
                  {formError}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-3.5 py-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvidence}
                disabled={!userReason.trim() || !findingTitle.trim()}
                className="px-4 py-1.5 font-mono text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium transition-colors disabled:opacity-40 shadow-xs"
              >
                Create Evidence Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
