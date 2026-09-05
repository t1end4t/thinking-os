import React, { useState } from 'react';
import {
  Image,
  Table2,
  Lightbulb,
  StickyNote,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Tag,
  ArrowRight,
  Trash2,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { SynthesisArtifact, SynthesisArtifactType } from '../../manuscriptTypes';
import { useWorkspace } from '../../context/WorkspaceContext';

interface SynthesisLockerProps {
  onInsertTag?: (tag: string) => void;
  onOpenArtifactModal: () => void;
  activeSectionId?: string;
}

export const SynthesisLocker: React.FC<SynthesisLockerProps> = ({
  onInsertTag,
  onOpenArtifactModal,
  activeSectionId
}) => {
  const {
    manuscript,
    claims,
    links,
    attachArtifactToSection,
    attachClaimToSection,
    removeSynthesisArtifact
  } = useWorkspace();

  const [activeFilter, setActiveFilter] = useState<'all' | SynthesisArtifactType | 'claim'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtifactForAttach, setSelectedArtifactForAttach] = useState<string | null>(null);

  // Filter artifacts
  const filteredArtifacts = manuscript.artifacts.filter(art => {
    if (activeFilter !== 'all' && activeFilter !== 'claim' && art.type !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = art.title.toLowerCase().includes(q);
      const matchDesc = (art.description || '').toLowerCase().includes(q);
      const matchBadge = (art.badge || '').toLowerCase().includes(q);
      const matchTags = (art.tags || []).some(t => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchBadge || matchTags;
    }
    return true;
  });

  // Filter claims
  const filteredClaims = claims.filter(c => {
    if (activeFilter !== 'all' && activeFilter !== 'claim') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.id.toLowerCase().includes(q) || c.text.toLowerCase().includes(q);
    }
    return true;
  });

  // Drag start handler
  const handleDragStartArtifact = (e: React.DragEvent, artifact: SynthesisArtifact) => {
    e.dataTransfer.setData(
      'application/x-manuscript-drop',
      JSON.stringify({ kind: 'artifact', id: artifact.id, title: artifact.title, badge: artifact.badge })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragStartClaim = (e: React.DragEvent, claimId: string, claimText: string) => {
    e.dataTransfer.setData(
      'application/x-manuscript-drop',
      JSON.stringify({ kind: 'claim', id: claimId, title: claimText })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleQuickAttach = (kind: 'artifact' | 'claim', id: string, targetSectionId: string) => {
    if (kind === 'artifact') {
      attachArtifactToSection(targetSectionId, id);
    } else {
      attachClaimToSection(targetSectionId, id);
    }
    setSelectedArtifactForAttach(null);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] border-l border-[var(--color-rule)] select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--color-rule)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers size={15} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
              Synthesis Locker
              <span className="text-[0.65rem] font-mono font-normal text-[var(--color-ink-muted)]">
                ({manuscript.artifacts.length + claims.length})
              </span>
            </h4>
            <p className="text-[0.68rem] text-[var(--color-ink-muted)]">
              Figures, tables, facts & claims ready to attach
            </p>
          </div>
        </div>

        <button
          onClick={onOpenArtifactModal}
          className="flex items-center gap-1 text-[0.72rem] font-medium px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors shrink-0"
        >
          <Plus size={13} />
          New Artifact
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-2.5 border-b border-[var(--color-rule)] space-y-2 bg-[var(--color-paper)]/30">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search artifacts, figures, claims..."
            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`text-[0.68rem] px-2 py-0.5 rounded-full transition-colors ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            All ({manuscript.artifacts.length + claims.length})
          </button>
          <button
            onClick={() => setActiveFilter('figure')}
            className={`text-[0.68rem] flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              activeFilter === 'figure'
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Image size={11} />
            Figures ({manuscript.artifacts.filter(a => a.type === 'figure').length})
          </button>
          <button
            onClick={() => setActiveFilter('table')}
            className={`text-[0.68rem] flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              activeFilter === 'table'
                ? 'bg-emerald-600 text-white font-medium'
                : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Table2 size={11} />
            Tables ({manuscript.artifacts.filter(a => a.type === 'table').length})
          </button>
          <button
            onClick={() => setActiveFilter('fact')}
            className={`text-[0.68rem] flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              activeFilter === 'fact'
                ? 'bg-amber-600 text-white font-medium'
                : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Lightbulb size={11} />
            Facts ({manuscript.artifacts.filter(a => a.type === 'fact').length})
          </button>
          <button
            onClick={() => setActiveFilter('note')}
            className={`text-[0.68rem] flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              activeFilter === 'note'
                ? 'bg-sky-600 text-white font-medium'
                : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <StickyNote size={11} />
            Notes ({manuscript.artifacts.filter(a => a.type === 'note').length})
          </button>
          <button
            onClick={() => setActiveFilter('claim')}
            className={`text-[0.68rem] flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
              activeFilter === 'claim'
                ? 'bg-purple-600 text-white font-medium'
                : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Sparkles size={11} />
            Claims ({claims.length})
          </button>
        </div>
      </div>

      {/* Artifact list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Artifacts */}
        {activeFilter !== 'claim' &&
          filteredArtifacts.map(artifact => {
            const isAttachedToActive = activeSectionId
              ? manuscript.sections.find(s => s.id === activeSectionId)?.attachedArtifactIds.includes(artifact.id)
              : false;

            return (
              <div
                key={artifact.id}
                draggable
                onDragStart={e => handleDragStartArtifact(e, artifact)}
                className="group relative p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-grab active:cursor-grabbing shadow-xs"
              >
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {artifact.type === 'figure' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-medium bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-mono">
                        <Image size={11} />
                        {artifact.badge || 'Figure'}
                      </span>
                    )}
                    {artifact.type === 'table' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-medium bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-mono">
                        <Table2 size={11} />
                        {artifact.badge || 'Table'}
                      </span>
                    )}
                    {artifact.type === 'fact' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-medium bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-mono">
                        <Lightbulb size={11} />
                        Fact Anchor
                      </span>
                    )}
                    {artifact.type === 'note' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-medium bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-mono">
                        <StickyNote size={11} />
                        Derivation Note
                      </span>
                    )}

                    {artifact.claimId && (
                      <span className="text-[0.65rem] font-mono px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                        {artifact.claimId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => removeSynthesisArtifact(artifact.id)}
                      title="Remove artifact"
                      className="p-1 rounded text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-[var(--color-surface)]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h5 className="text-xs font-semibold text-[var(--color-ink)] line-clamp-2 leading-snug">
                  {artifact.title}
                </h5>
                {artifact.subtitle && (
                  <p className="text-[0.68rem] text-[var(--color-ink-muted)] mt-0.5 line-clamp-1">
                    {artifact.subtitle}
                  </p>
                )}

                {/* Visual Preview */}
                {artifact.type === 'figure' && artifact.figure && (
                  <div className="mt-2 p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)] space-y-1.5">
                    <div className="h-16 flex items-end gap-1.5 px-2 pt-2 border-b border-[var(--color-rule)]">
                      {artifact.figure.dataPoints?.map((pt, i) => {
                        const heightPct = Math.min(100, Math.max(15, (pt.value / 100) * 100));
                        const baselineHeight = pt.baseline
                          ? Math.min(100, Math.max(10, (pt.baseline / 100) * 100))
                          : null;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                            <div className="w-full flex items-end justify-center gap-0.5 h-12">
                              {baselineHeight !== null && (
                                <div
                                  style={{ height: `${baselineHeight}%` }}
                                  className="w-1.5 bg-slate-300 dark:bg-slate-700 rounded-xs"
                                  title={`Baseline: ${pt.baseline}`}
                                />
                              )}
                              <div
                                style={{ height: `${heightPct}%` }}
                                className="w-2.5 bg-indigo-500 rounded-xs transition-all"
                                title={`Value: ${pt.value}`}
                              />
                            </div>
                            <span className="text-[0.58rem] font-mono text-[var(--color-ink-muted)] truncate w-full text-center">
                              {pt.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[0.65rem] text-[var(--color-ink-muted)] line-clamp-1 italic px-1">
                      {artifact.figure.caption}
                    </div>
                  </div>
                )}

                {artifact.type === 'table' && artifact.table && (
                  <div className="mt-2 p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)] overflow-hidden">
                    <table className="w-full text-[0.62rem] font-mono">
                      <thead>
                        <tr className="border-b border-[var(--color-rule)] text-[var(--color-ink-muted)]">
                          {artifact.table.headers.slice(0, 3).map((h, i) => (
                            <th key={i} className="p-1 text-left font-semibold truncate">
                              {h}
                            </th>
                          ))}
                          {artifact.table.headers.length > 3 && (
                            <th className="p-1 text-left font-semibold text-[0.55rem] text-[var(--color-ink-muted)]">
                              +{artifact.table.headers.length - 3} cols
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {artifact.table.rows.slice(0, 2).map((row, ri) => (
                          <tr key={ri} className="border-b border-[var(--color-rule)]/50">
                            {row.slice(0, 3).map((cell, ci) => (
                              <td key={ci} className="p-1 truncate max-w-[80px]">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-[0.6rem] text-[var(--color-ink-muted)] mt-1 px-1 flex justify-between">
                      <span>{artifact.table.rows.length} rows total</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ready to cite</span>
                    </div>
                  </div>
                )}

                {artifact.type === 'fact' && artifact.factMetric && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                    <div className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                      {artifact.factMetric}
                    </div>
                    {artifact.factContext && (
                      <p className="text-[0.65rem] text-[var(--color-ink)] mt-1 leading-tight">
                        {artifact.factContext}
                      </p>
                    )}
                  </div>
                )}

                {artifact.type === 'note' && artifact.noteMarkdown && (
                  <div className="mt-2 p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)]">
                    <p className="text-[0.68rem] text-[var(--color-ink)] line-clamp-3 font-mono leading-relaxed whitespace-pre-wrap">
                      {artifact.noteMarkdown}
                    </p>
                  </div>
                )}

                {/* Footer Controls & Drag helper */}
                <div className="mt-2.5 pt-2 border-t border-[var(--color-rule)] flex items-center justify-between text-[0.68rem]">
                  <span className="text-[0.62rem] text-[var(--color-ink-muted)] flex items-center gap-1">
                    <ArrowRight size={10} /> Drag to Outline
                  </span>

                  <div className="flex items-center gap-1.5">
                    {onInsertTag && (
                      <button
                        onClick={() =>
                          onInsertTag(
                            artifact.badge
                              ? `[${artifact.badge}: ${artifact.title}]`
                              : `[${artifact.title}]`
                          )
                        }
                        title="Insert reference tag into editor"
                        className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-indigo-600"
                      >
                        Tag Text
                      </button>
                    )}

                    {activeSectionId && (
                      <button
                        onClick={() =>
                          isAttachedToActive
                            ? null
                            : attachArtifactToSection(activeSectionId, artifact.id)
                        }
                        disabled={isAttachedToActive}
                        className={`text-[0.65rem] px-2 py-0.5 rounded font-medium transition-colors ${
                          isAttachedToActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
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

        {/* Claims section */}
        {(activeFilter === 'all' || activeFilter === 'claim') && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 font-mono flex items-center gap-1">
                <Sparkles size={12} /> Claims in Research Map
              </span>
              <span className="text-[0.65rem] text-[var(--color-ink-muted)]">
                {filteredClaims.length} propositions
              </span>
            </div>

            {filteredClaims.map(claim => {
              // Count evidence links for this claim
              const claimLinks = links.filter(l => l.parentId === claim.id && l.kind === 'claim-evidence');
              const holdsCount = claimLinks.filter(l => l.status === 'holds').length;
              const weakCount = claimLinks.filter(l => l.status === 'weak').length;
              const isAttachedToActive = activeSectionId
                ? manuscript.sections.find(s => s.id === activeSectionId)?.attachedClaimIds.includes(claim.id)
                : false;

              return (
                <div
                  key={claim.id}
                  draggable
                  onDragStart={e => handleDragStartClaim(e, claim.id, claim.text)}
                  className="p-3 rounded-xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/20 hover:border-purple-400 transition-all cursor-grab active:cursor-grabbing shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white">
                        {claim.id}
                      </span>
                      {claim.rejected ? (
                        <span className="text-[0.65rem] text-red-600 flex items-center gap-0.5 font-medium">
                          <AlertTriangle size={11} /> Refuted
                        </span>
                      ) : (
                        <span className="text-[0.65rem] text-emerald-600 flex items-center gap-0.5 font-medium">
                          <CheckCircle2 size={11} /> Active Hypothesis
                        </span>
                      )}
                    </div>

                    <div className="text-[0.62rem] font-mono text-[var(--color-ink-muted)]">
                      {holdsCount} holds · {weakCount} weak
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-ink)] leading-snug line-clamp-3">
                    {claim.text}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-purple-200/50 dark:border-purple-900/30 flex items-center justify-between text-[0.65rem]">
                    <span className="text-[0.6rem] text-[var(--color-ink-muted)]">
                      Drag to ground section
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onInsertTag && (
                        <button
                          onClick={() => onInsertTag(`[Claim ${claim.id}]`)}
                          className="px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-purple-600"
                        >
                          Tag
                        </button>
                      )}

                      {activeSectionId && (
                        <button
                          onClick={() =>
                            isAttachedToActive
                              ? null
                              : attachClaimToSection(activeSectionId, claim.id)
                          }
                          disabled={isAttachedToActive}
                          className={`px-2 py-0.5 rounded font-medium transition-colors ${
                            isAttachedToActive
                              ? 'bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {isAttachedToActive ? 'Attached' : '+ Ground'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
