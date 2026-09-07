import React, { useState, useRef } from 'react';
import {
  ScrollText,
  BookOpen,
  Layout,
  GitPullRequest,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  BookMarked,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  Edit3,
  FileText,
  Bold,
  Italic,
  Code,
  Hash,
  List,
  RotateCcw,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Tag,
  Lightbulb,
  Image,
  Table2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  ManuscriptSection,
  ArgumentRole,
  SynthesisArtifact
} from '../../manuscriptTypes';
import { SynthesisLocker } from './SynthesisLocker';
import { CitationManager } from './CitationManager';
import { PreprintView } from './PreprintView';
import { StoryboardView } from './StoryboardView';
import { ArtifactModal } from './ArtifactModal';
import { CitationModal } from './CitationModal';
import { TabHelpTip } from '../common/TabHelpTip';

export const ManuscriptSurface: React.FC = () => {
  const {
    manuscript,
    updateManuscriptMeta,
    updateManuscriptSection,
    addManuscriptSection,
    removeManuscriptSection,
    reorderManuscriptSections,
    attachArtifactToSection,
    detachArtifactFromSection,
    attachClaimToSection,
    detachClaimFromSection,
    attachCitationToSection,
    detachCitationFromSection,
    addSynthesisArtifact,
    addCitation,
    resetManuscriptToSample,
    claims,
    links
  } = useWorkspace();

  // Active view mode: 'composer' | 'preprint' | 'storyboard'
  const [viewMode, setViewMode] = useState<'composer' | 'preprint' | 'storyboard'>('composer');

  // Active section selected for editing
  const [activeSectionId, setActiveSectionId] = useState<string>(
    manuscript.sections[0]?.id || ''
  );

  // Right sidebar tab: 'locker' | 'citations'
  const [rightTab, setRightTab] = useState<'locker' | 'citations'>('locker');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Editor preview mode: 'edit' | 'preview'
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');

  // Modals
  const [isArtifactModalOpen, setIsArtifactModalOpen] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [citationToEdit, setCitationToEdit] = useState<any>(null);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // Drop target feedback in outline
  const [dropOverSectionId, setDropOverSectionId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSection =
    manuscript.sections.find(s => s.id === activeSectionId) ||
    manuscript.sections[0];

  // Calculate total words in manuscript
  const totalWords = manuscript.sections.reduce((acc, s) => {
    const words = s.content.trim().split(/\s+/).filter(Boolean).length;
    return acc + words;
  }, 0);

  const totalTargetWords = manuscript.sections.reduce(
    (acc, s) => acc + (s.targetWordCount || 500),
    0
  );

  // Word count for active section
  const activeWordCount = activeSection
    ? activeSection.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  // Insert tag helper into active section editor
  const handleInsertTag = (tag: string) => {
    if (!activeSection) return;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prev = activeSection.content;
      const next = prev.substring(0, start) + tag + prev.substring(end);
      updateManuscriptSection(activeSection.id, { content: next });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      updateManuscriptSection(activeSection.id, {
        content: activeSection.content + '\n' + tag
      });
    }
  };

  // Reordering sections
  const moveSection = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= manuscript.sections.length) return;
    const copy = [...manuscript.sections];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    reorderManuscriptSections(copy);
  };

  // Outline Drop Zone handling
  const handleDragOverOutlineSection = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dropOverSectionId !== sectionId) {
      setDropOverSectionId(sectionId);
    }
  };

  const handleDragLeaveOutlineSection = () => {
    setDropOverSectionId(null);
  };

  const handleDropOnOutlineSection = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    setDropOverSectionId(null);
    try {
      const customData = e.dataTransfer.getData('application/x-manuscript-drop');
      if (customData) {
        const parsed = JSON.parse(customData);
        if (parsed.kind === 'artifact') {
          attachArtifactToSection(sectionId, parsed.id);
        } else if (parsed.kind === 'claim') {
          attachClaimToSection(sectionId, parsed.id);
        } else if (parsed.kind === 'citation') {
          attachCitationToSection(sectionId, parsed.id);
        }
      }
    } catch (err) {
      console.warn('Drop parse error:', err);
    }
  };

  const roleLabelMap: Record<ArgumentRole, { label: string; color: string }> = {
    hook_motivation: { label: 'Motivation / Gap', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' },
    thesis_claim: { label: 'Thesis / Claim', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300' },
    theoretical_derivation: { label: 'Theory / Derivation', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300' },
    methodology_system: { label: 'System Architecture', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300' },
    empirical_evidence: { label: 'Empirical Evidence', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' },
    counterargument_refute: { label: 'Dialectic Boundary', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' },
    implications_future: { label: 'Synthesis / Impact', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300' }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-surface)] text-[var(--color-ink)] overflow-hidden">
      {/* Top Header Toolbar */}
      <header className="px-5 py-2.5 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-4 select-none shrink-0 shadow-2xs">
        {/* Title & Venue */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ScrollText size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                onClick={() => setIsMetaModalOpen(true)}
                className="text-sm font-bold text-[var(--color-ink)] truncate hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors tracking-tight"
                title="Click to edit paper metadata"
              >
                {manuscript.meta.title}
              </h2>
              <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 shrink-0 border border-purple-200/40">
                {manuscript.meta.targetVenue}
              </span>
              <TabHelpTip
                title="Manuscript Studio"
                category="Academic Synthesis"
                summary="Draft, storyboard, and format publication-grade research papers."
                tips={[
                  "Switch between Composer (editing), Argument Storyboard (narrative audit), and Preprint Reader (formatted preview).",
                  "In Composer: write section text, set narrative goals, and insert math/citations.",
                  "Drag verified claims or citations directly from the right panel into the editor.",
                  "Use Preprint Reader to preview and print publication-ready PDFs."
                ]}
                placement="bottom"
                variant="inline"
              />
            </div>
            <p className="text-[0.7rem] text-[var(--color-ink-muted)] truncate">
              {manuscript.meta.authors.map(a => a.name).join(', ')} ·{' '}
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {totalWords.toLocaleString()}
              </span>{' '}
              / {totalTargetWords.toLocaleString()} words
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <nav aria-label="Manuscript Views" className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('composer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              viewMode === 'composer'
                ? 'bg-[var(--color-surface)] text-purple-700 dark:text-purple-300 shadow-xs border border-purple-300/60 dark:border-purple-700/60 font-semibold'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Layout size={13} />
            <span>Composer</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('storyboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              viewMode === 'storyboard'
                ? 'bg-[var(--color-surface)] text-purple-700 dark:text-purple-300 shadow-xs border border-purple-300/60 dark:border-purple-700/60 font-semibold'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <GitPullRequest size={13} />
            <span>Argument Storyboard</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preprint')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              viewMode === 'preprint'
                ? 'bg-[var(--color-surface)] text-purple-700 dark:text-purple-300 shadow-xs border border-purple-300/60 dark:border-purple-700/60 font-semibold'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <BookOpen size={13} />
            <span>Preprint Reader</span>
          </button>
        </nav>

        {/* Reset & Right panel toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetManuscriptToSample}
            title="Reset manuscript to initial benchmark data"
            className="p-1.5 rounded-lg border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors"
          >
            <RotateCcw size={14} />
          </button>

          {viewMode === 'composer' && (
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              title={isRightSidebarOpen ? 'Hide locker' : 'Open locker'}
              className="p-1.5 rounded-lg border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors"
            >
              {isRightSidebarOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          )}
        </div>
      </header>

      {/* Surface Body */}
      {viewMode === 'storyboard' && (
        <StoryboardView
          onSelectSection={secId => {
            setActiveSectionId(secId);
            setViewMode('composer');
          }}
        />
      )}

      {viewMode === 'preprint' && <PreprintView />}

      {viewMode === 'composer' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Document Outline */}
          <aside className="w-80 border-r border-[var(--color-rule)] bg-[var(--color-paper)]/40 flex flex-col shrink-0 select-none overflow-hidden">
            {/* Outline Header */}
            <div className="p-3 border-b border-[var(--color-rule)] flex items-center justify-between bg-[var(--color-surface)]">
              <div>
                <span className="text-xs font-semibold text-[var(--color-ink)]">
                  Narrative Outline
                </span>
                <span className="text-[0.65rem] font-mono text-[var(--color-ink-muted)] ml-1.5">
                  ({manuscript.sections.length} sections)
                </span>
              </div>
              <button
                onClick={() => {
                  const newId = addManuscriptSection(activeSectionId);
                  setActiveSectionId(newId);
                }}
                className="flex items-center gap-1 text-[0.7rem] px-2 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                <Plus size={12} /> Section
              </button>
            </div>

            {/* Outline List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {manuscript.sections.map((sec, idx) => {
                const isActive = sec.id === activeSectionId;
                const isOver = dropOverSectionId === sec.id;
                const roleInfo = roleLabelMap[sec.argumentRole] || {
                  label: sec.argumentRole,
                  color: 'bg-slate-100 text-slate-800'
                };
                const secWords = sec.content.trim().split(/\s+/).filter(Boolean).length;
                const wordPct = Math.min(
                  100,
                  Math.round((secWords / (sec.targetWordCount || 500)) * 100)
                );

                return (
                  <div
                    key={sec.id}
                    onDragOver={e => handleDragOverOutlineSection(e, sec.id)}
                    onDragLeave={handleDragLeaveOutlineSection}
                    onDrop={e => handleDropOnOutlineSection(e, sec.id)}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isOver
                        ? 'border-indigo-500 ring-2 ring-indigo-400/40 bg-indigo-50/40 dark:bg-indigo-950/40 scale-[1.01]'
                        : isActive
                        ? 'border-indigo-400 dark:border-indigo-700 bg-[var(--color-surface)] shadow-xs ring-1 ring-indigo-300/40'
                        : 'border-[var(--color-rule)] bg-[var(--color-surface)]/70 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Section Number, Role Tag, Move controls */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          §{sec.sectionNumber}
                        </span>
                        <span
                          className={`text-[0.62rem] font-mono px-1.5 py-0.5 rounded font-semibold ${roleInfo.color}`}
                        >
                          {roleInfo.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            moveSection(idx, 'up');
                          }}
                          disabled={idx === 0}
                          className="p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            moveSection(idx, 'down');
                          }}
                          disabled={idx === manuscript.sections.length - 1}
                          className="p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Section Title */}
                    <h4 className="text-xs font-semibold text-[var(--color-ink)] line-clamp-2 leading-snug">
                      {sec.title}
                    </h4>

                    {/* Grounded items badges */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5 text-[0.6rem] font-mono">
                      {sec.attachedClaimIds.map(cId => (
                        <span
                          key={cId}
                          className="px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold"
                        >
                          {cId}
                        </span>
                      ))}

                      {sec.attachedArtifactIds.map(aId => {
                        const art = manuscript.artifacts.find(a => a.id === aId);
                        if (!art) return null;
                        return (
                          <span
                            key={aId}
                            className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-ink-muted)] flex items-center gap-0.5"
                          >
                            {art.type === 'figure' && <Image size={9} />}
                            {art.type === 'table' && <Table2 size={9} />}
                            {art.type === 'fact' && <Lightbulb size={9} />}
                            {art.badge || art.title.slice(0, 6)}
                          </span>
                        );
                      })}

                      {sec.attachedCitationKeys.length > 0 && (
                        <span className="px-1 py-0.5 rounded bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center gap-0.5">
                          <BookMarked size={9} />
                          {sec.attachedCitationKeys.length} refs
                        </span>
                      )}
                    </div>

                    {/* Word count meter */}
                    <div className="space-y-1 pt-1 border-t border-[var(--color-rule)]/50">
                      <div className="flex justify-between text-[0.62rem] text-[var(--color-ink-muted)] font-mono">
                        <span>{secWords} words</span>
                        <span>{wordPct}% target</span>
                      </div>
                      <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, wordPct)}%` }}
                          className={`h-full rounded-full transition-all ${
                            wordPct > 100
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Center Column: Section Editor Canvas */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[var(--color-surface)]">
            {activeSection ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Section Meta & Narrative Goal Bar */}
                <div className="p-4 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/30 space-y-3 shrink-0">
                  {/* Title & Section Number Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={activeSection.sectionNumber}
                      onChange={e =>
                        updateManuscriptSection(activeSection.id, { sectionNumber: e.target.value })
                      }
                      className="w-16 px-2 py-1 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-center"
                      title="Section Number"
                    />

                    <input
                      type="text"
                      value={activeSection.title}
                      onChange={e =>
                        updateManuscriptSection(activeSection.id, { title: e.target.value })
                      }
                      placeholder="Section Title..."
                      className="flex-1 px-3 py-1 text-sm font-serif font-bold text-[var(--color-ink)] rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
                    />

                    {/* Argument Role Selector */}
                    <select
                      value={activeSection.argumentRole}
                      onChange={e =>
                        updateManuscriptSection(activeSection.id, {
                          argumentRole: e.target.value as ArgumentRole
                        })
                      }
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] font-mono font-medium text-[var(--color-ink)]"
                    >
                      <option value="hook_motivation">Hook & Motivation</option>
                      <option value="thesis_claim">Thesis & Claims</option>
                      <option value="theoretical_derivation">Theoretical Derivation</option>
                      <option value="methodology_system">System Architecture</option>
                      <option value="empirical_evidence">Empirical Evidence</option>
                      <option value="counterargument_refute">Dialectic Boundary</option>
                      <option value="implications_future">Conclusion & Impact</option>
                    </select>

                    <button
                      onClick={() => removeManuscriptSection(activeSection.id)}
                      disabled={manuscript.sections.length <= 1}
                      title="Delete section"
                      className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-[var(--color-paper)] transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Narrative Goal Guide */}
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40">
                    <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="text-[0.68rem] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-mono">
                        Argumentation: Narrative Goal of this Section
                      </div>
                      <input
                        type="text"
                        value={activeSection.narrativeGoal}
                        onChange={e =>
                          updateManuscriptSection(activeSection.id, { narrativeGoal: e.target.value })
                        }
                        placeholder="e.g. Prove that naive FIFO eviction destroys softmax entropy normalization..."
                        className="w-full text-xs bg-transparent border-b border-indigo-300/40 dark:border-indigo-700/40 focus:outline-none focus:border-indigo-500 py-0.5 text-[var(--color-ink)]"
                      />
                    </div>
                  </div>

                  {/* Attached Grounding Elements Row */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-[0.68rem] font-mono text-[var(--color-ink-muted)] font-semibold">
                      Attached Elements:
                    </span>

                    {/* Claims */}
                    {activeSection.attachedClaimIds.map(cId => {
                      const claim = claims.find(c => c.id === cId);
                      return (
                        <span
                          key={cId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[0.68rem] font-mono"
                        >
                          <strong>{cId}</strong>
                          <button
                            onClick={() => detachClaimFromSection(activeSection.id, cId)}
                            className="hover:text-red-500 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}

                    {/* Citations */}
                    {activeSection.attachedCitationKeys.map(key => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 text-[0.68rem] font-mono"
                      >
                        <BookMarked size={10} />
                        @{key}
                        <button
                          onClick={() => detachCitationFromSection(activeSection.id, key)}
                          className="hover:text-red-500 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {/* Artifacts */}
                    {activeSection.attachedArtifactIds.map(artId => {
                      const art = manuscript.artifacts.find(a => a.id === artId);
                      if (!art) return null;
                      return (
                        <span
                          key={artId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-[var(--color-ink)] text-[0.68rem]"
                        >
                          {art.type === 'figure' && <Image size={10} />}
                          {art.type === 'table' && <Table2 size={10} />}
                          {art.type === 'fact' && <Lightbulb size={10} />}
                          {art.badge || art.title.slice(0, 15)}
                          <button
                            onClick={() => detachArtifactFromSection(activeSection.id, artId)}
                            className="hover:text-red-500 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}

                    {activeSection.attachedClaimIds.length === 0 &&
                      activeSection.attachedCitationKeys.length === 0 &&
                      activeSection.attachedArtifactIds.length === 0 && (
                        <span className="text-[0.68rem] text-[var(--color-ink-muted)] italic">
                          None attached. Drag figures, tables, claims, or citations here to ground this section.
                        </span>
                      )}
                  </div>
                </div>

                {/* Editor Toolbar */}
                <div className="px-4 py-2 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center justify-between gap-2 select-none shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleInsertTag('**bold text**')}
                      className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                      title="Bold"
                    >
                      <Bold size={13} />
                    </button>
                    <button
                      onClick={() => handleInsertTag('*italic text*')}
                      className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                      title="Italic"
                    >
                      <Italic size={13} />
                    </button>
                    <button
                      onClick={() => handleInsertTag('`code`')}
                      className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                      title="Inline code"
                    >
                      <Code size={13} />
                    </button>
                    <button
                      onClick={() => handleInsertTag('$$\nE = mc^2\n$$')}
                      className="px-1.5 py-0.5 rounded text-[0.68rem] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                      title="Math Equation Block"
                    >
                      $$fx$$
                    </button>
                    <button
                      onClick={() => handleInsertTag('### Subheading\n')}
                      className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                      title="Subheading"
                    >
                      <Hash size={13} />
                    </button>

                    <div className="w-px h-4 bg-[var(--color-rule)] mx-1" />

                    {/* Quick Citation insert button */}
                    <button
                      onClick={() => {
                        if (manuscript.citations[0]) {
                          handleInsertTag(`\\cite{${manuscript.citations[0].key}}`);
                        }
                      }}
                      className="flex items-center gap-1 text-[0.68rem] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                    >
                      <BookMarked size={11} /> \cite&#123;ref&#125;
                    </button>
                  </div>

                  {/* Mode toggle and word count */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                      {activeWordCount} words · est.{' '}
                      {Math.max(1, Math.round(activeWordCount / 200))} min read
                    </span>

                    <div className="flex rounded-lg border border-[var(--color-rule)] p-0.5 bg-[var(--color-paper)]">
                      <button
                        onClick={() => setEditorMode('edit')}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          editorMode === 'edit'
                            ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-2xs font-semibold'
                            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        <Edit3 size={12} className="inline mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => setEditorMode('preview')}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          editorMode === 'preview'
                            ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-2xs font-semibold'
                            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        <Eye size={12} className="inline mr-1" /> Preview
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editor Content Body */}
                <div className="flex-1 overflow-hidden p-6 md:p-8 bg-[var(--color-surface)]">
                  {editorMode === 'edit' ? (
                    <textarea
                      ref={textareaRef}
                      value={activeSection.content}
                      onChange={e =>
                        updateManuscriptSection(activeSection.id, { content: e.target.value })
                      }
                      placeholder="Write your argumentative paragraph here in Markdown, referencing citations (\cite{key}) and empirical figures..."
                      className="w-full h-full resize-none font-serif text-sm md:text-base leading-relaxed text-[var(--color-ink)] bg-transparent border-none focus:outline-none placeholder:text-[var(--color-ink-muted)]/50"
                    />
                  ) : (
                    <div className="w-full h-full overflow-y-auto font-serif text-sm md:text-base leading-relaxed text-[var(--color-ink)] space-y-4 whitespace-pre-wrap">
                      {activeSection.content}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-ink-muted)]">
                No section selected. Choose a section from the outline.
              </div>
            )}
          </main>

          {/* Right Column: Synthesis Locker & Citation Manager */}
          {isRightSidebarOpen && (
            <aside className="w-80 md:w-96 border-l border-[var(--color-rule)] flex flex-col shrink-0 overflow-hidden bg-[var(--color-surface)]">
              {/* Tabs Switcher for Locker vs Citations */}
              <div className="px-3 py-2 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/60 flex items-center justify-between select-none">
                <div className="flex gap-1">
                  <button
                    onClick={() => setRightTab('locker')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      rightTab === 'locker'
                        ? 'bg-[var(--color-surface)] text-indigo-600 dark:text-indigo-400 border border-[var(--color-rule)] font-semibold shadow-2xs'
                        : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Synthesis Locker</span>
                  </button>
                  <button
                    onClick={() => setRightTab('citations')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      rightTab === 'citations'
                        ? 'bg-[var(--color-surface)] text-teal-600 dark:text-teal-400 border border-[var(--color-rule)] font-semibold shadow-2xs'
                        : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <BookMarked size={13} />
                    <span>Citations ({manuscript.citations.length})</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {rightTab === 'locker' ? (
                  <SynthesisLocker
                    activeSectionId={activeSectionId}
                    onInsertTag={handleInsertTag}
                    onOpenArtifactModal={() => setIsArtifactModalOpen(true)}
                  />
                ) : (
                  <CitationManager
                    activeSectionId={activeSectionId}
                    onInsertCite={handleInsertTag}
                    onOpenCitationModal={cit => {
                      setCitationToEdit(cit);
                      setIsCitationModalOpen(true);
                    }}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Artifact Modal */}
      <ArtifactModal
        isOpen={isArtifactModalOpen}
        onClose={() => setIsArtifactModalOpen(false)}
        onSave={art => addSynthesisArtifact(art)}
      />

      {/* Citation Modal */}
      <CitationModal
        isOpen={isCitationModalOpen}
        initialCitation={citationToEdit}
        onClose={() => {
          setIsCitationModalOpen(false);
          setCitationToEdit(null);
        }}
        onSave={cit => addCitation(cit)}
      />

      {/* Metadata Edit Modal */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-manuscript-meta-title"
            className="bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[var(--color-rule)] flex items-center justify-between">
              <h3 id="modal-manuscript-meta-title" className="text-base font-semibold text-[var(--color-ink)]">
                Manuscript Publication Meta
              </h3>
              <button
                onClick={() => setIsMetaModalOpen(false)}
                aria-label="Close modal"
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">Title</label>
                <input
                  type="text"
                  value={manuscript.meta.title}
                  onChange={e => updateManuscriptMeta({ title: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">Subtitle</label>
                <input
                  type="text"
                  value={manuscript.meta.subtitle || ''}
                  onChange={e => updateManuscriptMeta({ subtitle: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">Target Venue</label>
                <input
                  type="text"
                  value={manuscript.meta.targetVenue}
                  onChange={e => updateManuscriptMeta({ targetVenue: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">Abstract</label>
                <textarea
                  rows={5}
                  value={manuscript.meta.abstract}
                  onChange={e => updateManuscriptMeta({ abstract: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--color-rule)] flex justify-end">
              <button
                onClick={() => setIsMetaModalOpen(false)}
                className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
