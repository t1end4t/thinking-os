import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Paper, EvidenceForm, PaperHighlight } from '../../types';
import {
  FileText,
  ExternalLink,
  MessageSquare,
  Highlighter,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Plus,
  Trash2,
  X,
  ChevronRight,
  Layers,
  Sparkles,
  Search,
  LayoutGrid,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  Star,
  Calendar,
  Tag,
  Hash
} from 'lucide-react';
import { TabHelpTip } from '../common/TabHelpTip';
import { PdfViewer, PdfSelection } from './PdfViewer';
import { AddPaperModal } from './AddPaperModal';
import { getPaperPdfUrl } from '../../utils/pdfGenerator';

export const PapersSurface: React.FC = () => {
  const {
    papers,
    claims,
    addEvidence,
    setActiveContext,
    sendAssistantMessage,
    setIsDockOpen,
    addPaper,
    removePaper,
    addPaperHighlight,
    removePaperHighlight
  } = useWorkspace();

  // Multi-tab state: open paper IDs
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);

  // Active view: 'vault' (full Vault card/list view) OR a paperId (reader tab)
  const [activeTab, setActiveTab] = useState<string>('vault');

  // Vault View Layout: 'cards' | 'list'
  const [vaultLayout, setVaultLayout] = useState<'cards' | 'list'>('cards');

  // Left sidebar toggle for larger reader: collapsed / expanded
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => window.innerWidth < 900);

  // Left sidebar tab when reading: 'toc' | 'highlights' | 'vault'
  const [leftSidebarTab, setLeftSidebarTab] = useState<'toc' | 'highlights' | 'vault'>('toc');

  // Add Paper modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);

  // Search and filter for vault
  const [searchVaultQuery, setSearchVaultQuery] = useState<string>('');
  const [vaultFilter, setVaultFilter] = useState<'all' | 'highlights' | 'linked'>('all');
  const [vaultSort, setVaultSort] = useState<'year-desc' | 'year-asc' | 'title' | 'highlights'>('year-desc');

  // Floating toolbar state
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{ x: number; y: number } | null>(null);

  // Gate 5: Evidence creation modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [findingTitle, setFindingTitle] = useState<string>('');
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claims[0]?.id || '');
  const [evidenceForm, setEvidenceForm] = useState<EvidenceForm>('measurement');
  const [userReason, setUserReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedRects, setSelectedRects] = useState<PaperHighlight['rects']>([]);
  const clearSelection = useCallback(() => setFloatingToolbarPos(null), []);

  useEffect(() => {
    const dismissOutside = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !toolbarRef.current?.contains(event.target)) clearSelection();
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearSelection();
        window.getSelection()?.removeAllRanges();
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    window.addEventListener('resize', clearSelection);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
      window.removeEventListener('resize', clearSelection);
    };
  }, [clearSelection]);

  const activePaper = useMemo(() => {
    if (activeTab === 'vault') return null;
    return papers.find(p => p.id === activeTab) || null;
  }, [papers, activeTab]);

  // Tab switching and opening
  const handleOpenPaperTab = (paperId: string) => {
    if (!openTabIds.includes(paperId)) {
      setOpenTabIds(prev => [...prev, paperId]);
    }
    setActiveTab(paperId);
    setFloatingToolbarPos(null);
  };

  const handleCloseTab = (e: React.MouseEvent, paperIdToClose: string) => {
    e.stopPropagation();
    const newTabs = openTabIds.filter(id => id !== paperIdToClose);
    setOpenTabIds(newTabs);

    if (activeTab === paperIdToClose) {
      if (newTabs.length > 0) {
        setActiveTab(newTabs[0]);
      } else {
        setActiveTab('vault');
      }
    }
    setFloatingToolbarPos(null);
  };

  // Text selection from PDF.js viewer
  const handlePdfTextSelect = useCallback((sel: PdfSelection) => {
    setSelectedText(sel.text);
    setSelectedPage(sel.pageNumber);
    setSelectedRects(sel.rects);
    setFloatingToolbarPos({
      x: Math.max(160, Math.min(window.innerWidth - 160, sel.rect.left + sel.rect.width / 2)),
      y: Math.max(10, sel.rect.top - 50)
    });
  }, []);

  // Action 1: Ask Assistant
  const handleAskAssistant = () => {
    if (!selectedText || !activePaper) return;
    const passageContextId = `passage-${Date.now()}`;
    setActiveContext({
      type: 'passage',
      id: passageContextId,
      label: `Passage from ${activePaper.authors.split(',')[0]} (${activePaper.year})`,
      secondaryLabel: `"${selectedText.slice(0, 38)}..."`,
      metadata: { paperId: activePaper.id, passage: selectedText, pageNumber: selectedPage }
    });
    setIsDockOpen(true);
    sendAssistantMessage(
      passageContextId,
      `Examining passage from ${activePaper.title}:\n\n"${selectedText}"\n\nHow does this finding impact our existing claims?`
    );
    setFloatingToolbarPos(null);
    window.getSelection()?.removeAllRanges();
  };

  // Action 2: Open Evidence modal
  const handleOpenEvidenceModal = () => {
    setFindingTitle(selectedText.slice(0, 100));
    setUserReason('');
    setFormError(null);
    setShowEvidenceModal(true);
    setFloatingToolbarPos(null);
    window.getSelection()?.removeAllRanges();
  };

  // Action 3: Highlight & KEEP highlight
  const handleCreateHighlight = () => {
    if (!selectedText || !activePaper) return;
    addPaperHighlight(activePaper.id, {
      text: selectedText,
      color: 'amber',
      pageNumber: selectedPage,
      rects: selectedRects
    });
    setFloatingToolbarPos(null);
    window.getSelection()?.removeAllRanges();
  };

  // Gate 5: Submit evidence
  const handleCreateEvidence = () => {
    if (!activePaper) return;

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

  // Remove paper confirmation
  const handleConfirmRemovePaper = () => {
    if (!paperToDelete) return;
    const idToRemove = paperToDelete.id;
    removePaper(idToRemove);
    setPaperToDelete(null);

    const remainingTabs = openTabIds.filter(id => id !== idToRemove);
    setOpenTabIds(remainingTabs);

    if (activeTab === idToRemove) {
      if (remainingTabs.length > 0) {
        setActiveTab(remainingTabs[0]);
      } else {
        setActiveTab('vault');
      }
    }
  };

  // Filter & Sort vault papers
  const filteredVaultPapers = useMemo(() => {
    let result = [...papers];

    // Search query
    if (searchVaultQuery.trim()) {
      const q = searchVaultQuery.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.authors.toLowerCase().includes(q) ||
          p.citation?.toLowerCase().includes(q) ||
          p.abstract?.toLowerCase().includes(q)
      );
    }

    // Filter pills
    if (vaultFilter === 'highlights') {
      result = result.filter(p => (p.highlights?.length || 0) > 0);
    } else if (vaultFilter === 'linked') {
      result = result.filter(p =>
        p.sections?.some(s => s.paragraphs?.some(par => par.linkedClaimId))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (vaultSort === 'year-desc') return b.year - a.year;
      if (vaultSort === 'year-asc') return a.year - b.year;
      if (vaultSort === 'title') return a.title.localeCompare(b.title);
      if (vaultSort === 'highlights') return (b.highlights?.length || 0) - (a.highlights?.length || 0);
      return 0;
    });

    return result;
  }, [papers, searchVaultQuery, vaultFilter, vaultSort]);

  // Counts for filters
  const papersWithHighlightsCount = useMemo(() => {
    return papers.filter(p => (p.highlights?.length || 0) > 0).length;
  }, [papers]);

  const papersWithLinksCount = useMemo(() => {
    return papers.filter(p =>
      p.sections?.some(s => s.paragraphs?.some(par => par.linkedClaimId))
    ).length;
  }, [papers]);

  return (
    <div
      id="papers-surface"
      className="flex-1 h-full flex flex-col bg-[var(--color-surface)] overflow-hidden"
    >
      {/* Top Header: Title, Global Actions, and Multi-Tab Bar */}
      <header className="px-5 py-2.5 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col gap-2 shrink-0 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Surface Title & Description */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
                  Paper Vault & Real PDF Reader
                </h1>
                <TabHelpTip
                  title="Paper Vault & Real PDF Reader"
                  category="Literature Review"
                  summary="High-fidelity academic paper reader with native vector PDF rendering, multi-tab browsing, customizable card/list vault views, and highlight extraction."
                  tips={[
                    "Use tabs to read and navigate multiple papers simultaneously.",
                    "Toggle between Card View and List View in the Vault library.",
                    "Click 'Larger Reader' (or collapse sidebar) to expand the PDF viewing canvas.",
                    "Select any text in the PDF to trigger [ Ask | Evidence | Highlight ].",
                    "Add new research papers via DOI, URL, or local PDF upload."
                  ]}
                  placement="bottom"
                  variant="inline"
                />
              </div>
              <p className="text-[0.6875rem] text-[var(--color-ink-muted)] hidden sm:block">
                Multi-tab vector PDF reader, card/list vault browser, and Gate 5 evidence capture
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* If in reading mode: Reader Mode Toggle & Toggle Left Sidebar (Larger Reader) */}
            {activePaper && activeTab !== 'vault' && (
              <>
                {/* Toggle Left Sidebar to give a Larger Reader */}
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(prev => !prev)}
                  title={isSidebarCollapsed ? 'Show sidebar (Outline & Highlights)' : 'Collapse sidebar for larger reader'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    isSidebarCollapsed
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700 shadow-2xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  ) : (
                    <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{isSidebarCollapsed ? 'Show Sidebar' : 'Larger Reader'}</span>
                </button>

              </>
            )}

            {/* Add Paper Button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Paper</span>
            </button>

            {/* Delete active paper (if in reader) */}
            {activePaper && activeTab !== 'vault' && (
              <button
                type="button"
                onClick={() => setPaperToDelete(activePaper)}
                title="Remove paper from vault"
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Multi-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none max-w-full">
          {/* Main Vault Library Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('vault');
              setFloatingToolbarPos(null);
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-all shrink-0 border ${
              activeTab === 'vault'
                ? 'bg-teal-600 text-white font-semibold border-teal-600 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Vault Library ({papers.length})</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0 mx-1" />

          {/* Open Paper Tabs (Supports reading multiple papers simultaneously) */}
          {openTabIds.length === 0 ? (
            <span className="text-xs text-slate-400 italic px-2">No reader tabs open. Select a paper from the vault.</span>
          ) : (
            openTabIds.map(tabId => {
              const paper = papers.find(p => p.id === tabId);
              if (!paper) return null;
              const isActive = paper.id === activeTab;
              const hlCount = paper.highlights?.length || 0;

              return (
                <div
                  key={paper.id}
                  role="group"
                  aria-label={`Reader tab: ${paper.title}`}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer select-none shrink-0 border ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-500/60 dark:border-teal-500/50 font-semibold shadow-2xs ring-1 ring-teal-500/20'
                      : 'bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-500' : 'text-slate-400'}`} />
                  <button type="button" onClick={() => handleOpenPaperTab(paper.id)} aria-pressed={isActive} className="truncate max-w-[150px]">{paper.title}</button>
                  <span className="text-[10px] text-slate-400">({paper.year})</span>

                  {hlCount > 0 && (
                    <span
                      title={`${hlCount} saved highlights`}
                      className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-[10px] font-bold"
                    >
                      ★ {hlCount}
                    </span>
                  )}

                  {/* Close Tab Button */}
                  <button
                    type="button"
                    onClick={e => handleCloseTab(e, paper.id)}
                    title="Close tab"
                    aria-label={`Close tab: ${paper.title}`}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}

          {/* Plus tab button to add / open papers */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            title="Open or Add another paper"
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors shrink-0 border border-slate-200 dark:border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Surface Body: Vault View (Cards / List) OR Reader View */}
      {activeTab === 'vault' ? (
        /* ========================================================================= */
        /* VAULT EXPLORER: CARD VIEW OR LIST VIEW                                     */
        /* ========================================================================= */
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[var(--color-surface)]">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Vault Controls & Filters Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search papers by title, author, citation, abstract..."
                  value={searchVaultQuery}
                  onChange={e => setSearchVaultQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 shadow-2xs"
                />
                {searchVaultQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchVaultQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View layout toggle, Sort & Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter Chips */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setVaultFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      vaultFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    All ({papers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultFilter('highlights')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      vaultFilter === 'highlights'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Star className="w-3 h-3 text-amber-500" />
                    <span>Highlighted ({papersWithHighlightsCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultFilter('linked')}
                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      vaultFilter === 'linked'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3 text-emerald-500" />
                    <span>Linked ({papersWithLinksCount})</span>
                  </button>
                </div>

                {/* Sort Dropdown */}
                <select
                  value={vaultSort}
                  onChange={e => setVaultSort(e.target.value as any)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-500"
                >
                  <option value="year-desc">Year (Newest first)</option>
                  <option value="year-asc">Year (Oldest first)</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="highlights">Most Highlights</option>
                </select>

                {/* Card View vs List View Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setVaultLayout('cards')}
                    title="Card View"
                    className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
                      vaultLayout === 'cards'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Card View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultLayout('list')}
                    title="List View"
                    className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${
                      vaultLayout === 'list'
                        ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Empty state if no papers match query */}
            {filteredVaultPapers.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-8">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="font-serif text-base font-bold text-slate-800 dark:text-slate-200">
                  No matching papers found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  {searchVaultQuery
                    ? `No papers in your vault matched "${searchVaultQuery}".`
                    : 'Your paper vault is empty.'}
                </p>
                {searchVaultQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchVaultQuery('')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : vaultLayout === 'cards' ? (
              /* ------------------------------------------------------------------- */
              /* CARD VIEW: Grid of rich paper cards                                */
              /* ------------------------------------------------------------------- */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredVaultPapers.map(paper => {
                  const isOpen = openTabIds.includes(paper.id);
                  const hlCount = paper.highlights?.length || 0;
                  const hasLinkedClaim = paper.sections?.some(s =>
                    s.paragraphs?.some(p => p.linkedClaimId)
                  );

                  return (
                    <div
                      key={paper.id}
                      className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-teal-500/50 transition-all flex flex-col justify-between gap-4 relative"
                    >
                      {/* Top Bar: Year Badge, Citation, and Delete */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60">
                            {paper.year}
                          </span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60">
                            {paper.citation}
                          </span>
                          {isOpen && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Open in tab
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setPaperToDelete(paper);
                          }}
                          title="Delete paper"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Main Paper Info */}
                      <div className="space-y-2">
                        <h3
                          onClick={() => handleOpenPaperTab(paper.id)}
                          className="font-serif text-base font-bold text-slate-900 dark:text-slate-100 leading-snug cursor-pointer group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors"
                        >
                          {paper.title}
                        </h3>

                        <p className="text-xs text-slate-500 font-medium">
                          {paper.authors}
                        </p>

                        {/* Abstract snippet */}
                        {paper.abstract && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {paper.abstract}
                          </p>
                        )}
                      </div>

                      {/* Card Footer: Metadata indicators and Read CTA */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          {hlCount > 0 && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {hlCount} {hlCount === 1 ? 'highlight' : 'highlights'}
                            </span>
                          )}
                          {hasLinkedClaim && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Linked
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenPaperTab(paper.id)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 dark:hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs ml-auto"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{isOpen ? 'Switch to Reader' : 'Read Paper'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ------------------------------------------------------------------- */
              /* LIST VIEW: Structured academic row list                            */
              /* ------------------------------------------------------------------- */
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Title & DOI</th>
                        <th className="py-3 px-4">Authors</th>
                        <th className="py-3 px-4">Year</th>
                        <th className="py-3 px-4">Citation</th>
                        <th className="py-3 px-4">Highlights</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredVaultPapers.map(paper => {
                        const isOpen = openTabIds.includes(paper.id);
                        const hlCount = paper.highlights?.length || 0;

                        return (
                          <tr
                            key={paper.id}
                            onClick={() => handleOpenPaperTab(paper.id)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                          >
                            <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                                <div>
                                  <div className="font-serif font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                    {paper.title}
                                  </div>
                                  {paper.doi && (
                                    <span className="font-mono text-[10px] text-slate-400">
                                      DOI: {paper.doi}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {paper.authors}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                              {paper.year}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                              {paper.citation}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {hlCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  ★ {hlCount}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaperTab(paper.id)}
                                  className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white rounded-md font-medium text-xs transition-colors"
                                >
                                  {isOpen ? 'Open Tab' : 'Read'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaperToDelete(paper)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                  title="Delete paper"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : !activePaper ? (
        /* ========================================================================= */
        /* NO PAPER SELECTED FALLBACK                                                */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--color-surface)]">
          <BookOpen className="w-14 h-14 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-serif text-lg font-semibold text-slate-800 dark:text-slate-200">No papers open</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Browse the Vault Library or add a research paper via DOI, URL, or local PDF upload.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('vault')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Open Vault Library</span>
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* READER WORKSPACE: SIDEBAR + PDF VIEWER               */
        /* ========================================================================= */
        <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden relative">
          {/* Collapsible Left Sidebar: Outline, Highlights, Vault (Can toggle left to larger reader) */}
          {!isSidebarCollapsed && (
            <aside className="absolute inset-y-0 left-0 max-w-full md:static w-72 md:w-80 border-r border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col shrink-0 overflow-hidden transition-all duration-200 z-10">
              {/* Sidebar Header with subtabs and collapse button */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1.5 gap-1 shrink-0">
                <div className="flex items-center gap-1 text-xs font-medium flex-1">
                  <button
                    type="button"
                    onClick={() => setLeftSidebarTab('toc')}
                    className={`flex-1 py-1 px-1.5 rounded-md transition-colors text-center truncate ${
                      leftSidebarTab === 'toc'
                        ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Outline
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftSidebarTab('highlights')}
                    className={`flex-1 py-1 px-1.5 rounded-md transition-colors text-center flex items-center justify-center gap-1 truncate ${
                      leftSidebarTab === 'highlights'
                        ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>Notes</span>
                    <span className="text-[10px] px-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      {activePaper.highlights?.length || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftSidebarTab('vault')}
                    className={`flex-1 py-1 px-1.5 rounded-md transition-colors text-center truncate ${
                      leftSidebarTab === 'vault'
                        ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Vault
                  </button>
                </div>

                {/* Direct collapse button inside sidebar */}
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  title="Collapse sidebar for larger reader"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* SUBTAB 1: Outline & Metadata */}
                {leftSidebarTab === 'toc' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/50 w-fit block">
                        Active Paper
                      </span>
                      <h3 className="font-serif text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {activePaper.title}
                      </h3>
                      <p className="text-xs text-slate-500">{activePaper.authors}</p>
                      <div className="font-mono text-[11px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                        <span>{activePaper.citation}</span>
                        {activePaper.doi && <span>• DOI: {activePaper.doi}</span>}
                      </div>
                    </div>

                    {/* Linked Argument Passages */}
                    <div className="space-y-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                        <LinkIcon className="w-3 h-3 text-teal-600" />
                        Linked Passages in Graph
                      </span>
                      {activePaper.sections?.length > 0 ? (
                        activePaper.sections.map(sec => {
                          const linked = sec.paragraphs?.filter(p => p.linkedClaimId) || [];
                          if (linked.length === 0) return null;
                          return (
                            <div
                              key={sec.id}
                              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg space-y-1 shadow-2xs"
                            >
                              <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {sec.title}
                              </span>
                              <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-1 w-fit font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Linked to Claim #{linked[0].linkedClaimId}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic">No formal argument links yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: Highlights Kept */}
                {leftSidebarTab === 'highlights' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Saved Highlights ({activePaper.highlights?.length || 0})
                      </span>
                    </div>

                    {(!activePaper.highlights || activePaper.highlights.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                        <Highlighter className="w-6 h-6 mx-auto mb-2 opacity-50 text-amber-500" />
                        <span>Select text in the reader and click [ Highlight ] to keep excerpts.</span>
                      </div>
                    ) : (
                      activePaper.highlights.map(hl => (
                        <div
                          key={hl.id}
                          className="p-3 bg-amber-50/50 dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 rounded-xl space-y-2 shadow-2xs group"
                        >
                          <p className="text-xs text-slate-800 dark:text-slate-200 italic leading-relaxed border-l-2 border-amber-500 pl-2">
                            "{hl.text}"
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                            <span>{hl.pageNumber ? `Page ${hl.pageNumber}` : 'Excerpt'}</span>
                            <button
                              type="button"
                              onClick={() => removePaperHighlight(activePaper.id, hl.id)}
                              className="text-slate-400 hover:text-red-500 focus-visible:text-red-500"
                              title="Delete highlight"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* SUBTAB 3: Vault Mini Explorer */}
                {leftSidebarTab === 'vault' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Vault Papers ({papers.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('vault')}
                        className="text-[11px] text-teal-600 hover:underline font-mono"
                      >
                        Full Vault →
                      </button>
                    </div>

                    <div className="space-y-2">
                      {papers.map(p => {
                        const isOpen = openTabIds.includes(p.id);
                        const isCurr = p.id === activePaper.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleOpenPaperTab(p.id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                              isCurr
                                ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-500 text-teal-900 dark:text-teal-200 font-medium'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="font-semibold line-clamp-1">{p.title}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">{p.authors} ({p.year})</div>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-teal-600 dark:text-teal-400">
                              <span>{isOpen ? 'Open in tab' : 'Click to read'}</span>
                              {p.highlights?.length ? <span>★ {p.highlights.length}</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}


          <main className="flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col relative bg-[var(--color-surface)]">
            <PdfViewer
              key={activePaper.id}
              pdfUrl={getPaperPdfUrl(activePaper)}
              highlights={activePaper.highlights}
              title={activePaper.title}
              onTextSelect={handlePdfTextSelect}
              onClearSelection={clearSelection}
            />
          </main>
        </div>
      )}

      {/* Floating Toolbar on Text Selection: [ Ask | Evidence | Highlight ] */}
      {floatingToolbarPos && (
        <div
          id="paper-selection-toolbar"
          ref={toolbarRef}
          role="toolbar"
          aria-label="Selected passage actions"
          onPointerDown={event => event.preventDefault()}
          style={{
            left: `${floatingToolbarPos.x}px`,
            top: `${floatingToolbarPos.y}px`
          }}
          className="fixed -translate-x-1/2 z-50 flex items-center gap-1.5 bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-2xl text-xs font-sans select-none border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* 1. Ask */}
          <button
            type="button"
            onClick={handleAskAssistant}
            className="px-3 py-1 flex items-center gap-1.5 hover:bg-white/20 rounded-full transition-colors font-medium text-slate-200 hover:text-white"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-300" />
            <span>Ask</span>
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* 2. Evidence */}
          <button
            type="button"
            onClick={handleOpenEvidenceModal}
            className="px-3 py-1 flex items-center gap-1.5 hover:bg-white/20 rounded-full transition-colors font-medium text-slate-200 hover:text-white"
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-300" />
            <span>Evidence</span>
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* 3. Highlight */}
          <button
            type="button"
            onClick={handleCreateHighlight}
            className="px-3 py-1 flex items-center gap-1.5 hover:bg-white/20 rounded-full transition-colors font-medium text-amber-200 hover:text-amber-100"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-300" />
            <span>Highlight</span>
          </button>
        </div>
      )}

      {/* Gate 5: Evidence Creation Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-mono text-[0.75rem] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/50">
                Gate 5 Evidence Capture
              </span>
              <h3 className="font-serif text-[1.3125rem] font-bold text-slate-900 dark:text-slate-100 mt-2">
                Attach Finding to Argument Tree
              </h3>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Finding / Excerpt Title:
                </label>
                <input
                  type="text"
                  value={findingTitle}
                  onChange={e => setFindingTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Target Claim in Argument Tree:
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {claims.map(c => {
                    const isSelected = selectedClaimId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClaimId(c.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 font-medium text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono text-[0.625rem] text-teal-600 dark:text-teal-400 font-bold block">
                            Claim #{c.id}
                          </span>
                          <span className="font-sans line-clamp-2">{c.text}</span>
                        </div>
                        {isSelected && <CheckCircle2 size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Evidence Form:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'measurement', label: 'Measurement', desc: 'Empirical metric' },
                    { id: 'benchmark', label: 'Benchmark', desc: 'Comparative run' },
                    { id: 'derivation', label: 'Derivation', desc: 'Formal/Math' },
                    { id: 'trace', label: 'Trace', desc: 'Execution artifact' },
                    { id: 'observation', label: 'Observation', desc: 'Literature finding' }
                  ].map(f => {
                    const isSelected = evidenceForm === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setEvidenceForm(f.id as EvidenceForm)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-slate-900 dark:text-slate-100 font-medium shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold">{f.label}</div>
                        <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">{f.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  User Reason (Mandatory Gate 5 Justification):
                </label>
                <textarea
                  value={userReason}
                  onChange={e => setUserReason(e.target.value)}
                  placeholder="Explain why this paper finding supports or falsifies the chosen claim..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-sans text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowEvidenceModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateEvidence}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-500 text-xs font-mono font-medium transition-colors shadow-2xs"
              >
                Link Evidence to Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Paper Confirmation Modal */}
      {paperToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 rounded-2xl flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-serif text-base font-bold text-slate-900 dark:text-slate-100">
                Remove Paper from Vault?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">"{paperToDelete.title}"</strong>? Open tabs and local annotations for this paper will be cleared.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaperToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemovePaper}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-2xs"
              >
                Remove Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Paper Modal */}
      <AddPaperModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddPaper={addPaper}
        onSelectPaper={handleOpenPaperTab}
      />
    </div>
  );
};
