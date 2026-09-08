import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileCheck2,
  Filter,
  GitBranch,
  GripVertical,
  HelpCircle,
  Link2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  TriangleAlert,
  X
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Link, LinkStatus } from '../../types';

export interface TreeNode {
  id: string;
  kind: 'question' | 'claim' | 'evidence';
  title: string;
  author: string;
  tags?: string[];
  citation?: string;
  origin?: string;
  form?: string;
  rejected?: boolean;
  rejectionReason?: string;
}

interface ConnectionDraft {
  childId: string;
  parentId: string;
  previousParentId?: string;
}

interface ArgumentTreeProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onMessage: (message: string) => void;
  onNewChild?: (parentId: string, parentKind: 'question' | 'claim') => void;
  onStartCreate?: (kind: 'question' | 'claim' | 'evidence') => void;
}

export const ArgumentTree: React.FC<ArgumentTreeProps> = ({
  selectedId,
  onSelect,
  onEdit,
  onMessage,
  onNewChild,
  onStartCreate
}) => {
  const { questions, claims, evidence, links, removeGraphNode, moveGraphNode } = useWorkspace();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'question' | 'claim' | 'evidence' | 'review'>('all');
  const [dragged, setDragged] = useState<ConnectionDraft | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionDraft | null>(null);
  const [reason, setReason] = useState('');
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  const nodes: TreeNode[] = useMemo(() => [
    ...questions.map(item => ({
      id: item.id,
      kind: 'question' as const,
      title: item.title,
      author: item.author,
      tags: item.tags
    })),
    ...claims.map(item => ({
      id: item.id,
      kind: 'claim' as const,
      title: item.text,
      author: item.author,
      rejected: item.rejected,
      rejectionReason: item.rejectionReason
    })),
    ...evidence.map(item => ({
      id: item.id,
      kind: 'evidence' as const,
      title: item.title,
      author: item.author,
      citation: item.citation,
      origin: item.origin,
      form: item.form
    }))
  ], [questions, claims, evidence]);

  const byId = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  const branches = useMemo(() => {
    const map = new Map<string, { node: TreeNode; link: Link }[]>();
    for (const link of links) {
      const parent = byId.get(link.parentId);
      const child = byId.get(link.childId);
      if (!parent || !child) continue;
      if (
        !(link.kind === 'question-claim' && parent.kind === 'question' && child.kind === 'claim') &&
        !(link.kind === 'claim-evidence' && parent.kind === 'claim' && child.kind === 'evidence')
      ) {
        continue;
      }
      map.set(parent.id, [...(map.get(parent.id) ?? []), { node: child, link }]);
    }
    return map;
  }, [byId, links]);

  const childIds = useMemo(() => {
    const set = new Set<string>();
    for (const link of links) {
      if (byId.has(link.parentId) && byId.has(link.childId)) {
        set.add(link.childId);
      }
    }
    return set;
  }, [byId, links]);

  // Counts for review filter: items with weak/missing links or rejected claims
  const reviewNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const link of links) {
      if (link.status === 'weak' || link.status === 'missing') {
        set.add(link.parentId);
        set.add(link.childId);
      }
    }
    for (const claim of claims) {
      if (claim.rejected) {
        set.add(claim.id);
      }
    }
    return set;
  }, [links, claims]);

  // Search filter
  const matchesSearch = (node: TreeNode): boolean => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      node.title.toLowerCase().includes(q) ||
      node.id.toLowerCase().includes(q) ||
      node.author.toLowerCase().includes(q) ||
      Boolean(node.tags?.some(tag => tag.toLowerCase().includes(q))) ||
      Boolean(node.citation?.toLowerCase().includes(q))
    );
  };

  const matchesTypeFilter = (node: TreeNode): boolean => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'review') return reviewNodeIds.has(node.id);
    return node.kind === typeFilter;
  };

  const isVisibleOrHasVisibleChildren = (node: TreeNode): boolean => {
    if (matchesSearch(node) && matchesTypeFilter(node)) return true;
    const children = branches.get(node.id) ?? [];
    return children.some(child => isVisibleOrHasVisibleChildren(child.node));
  };

  useEffect(() => {
    if (connection) dialogRef.current?.showModal();
  }, [connection?.childId]);

  const canConnect = (parent: TreeNode, childId: string) => {
    const child = byId.get(childId);
    return (
      ((parent.kind === 'question' && child?.kind === 'claim') ||
        (parent.kind === 'claim' && child?.kind === 'evidence')) &&
      !links.some(link => link.parentId === parent.id && link.childId === childId)
    );
  };

  const openConnection = (draft: ConnectionDraft) => {
    setReason('');
    setError('');
    setKeepOriginal(true);
    setConnection(draft);
  };

  const renderStatusPill = (status: LinkStatus) => {
    if (status === 'holds') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.6875rem] font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          holds
        </span>
      );
    }
    if (status === 'weak') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.6875rem] font-mono font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          weak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.6875rem] font-mono font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        missing
      </span>
    );
  };

  const renderNode = (node: TreeNode, incoming?: Link): React.ReactNode => {
    const allChildren = branches.get(node.id) ?? [];
    const children = allChildren.filter(child => isVisibleOrHasVisibleChildren(child.node));
    const isCollapsed = collapsed.has(node.id);
    const isTarget = Boolean(dragged && canConnect(node, dragged.childId));
    const isSelected = selectedId === node.id;
    const Icon = node.kind === 'question' ? HelpCircle : node.kind === 'claim' ? GitBranch : FileCheck2;
    const sharedCount = links.filter(link => link.childId === node.id).length;

    // Check if this node itself matches the filters
    const selfMatches = matchesSearch(node) && matchesTypeFilter(node);

    return (
      <li key={incoming?.id ?? node.id} className="argument-branch">
        <article
          aria-label={`${node.kind}: ${node.title}`}
          data-node-id={node.id}
          data-kind={node.kind}
          data-selected={isSelected}
          data-drop-target={isTarget}
          data-drag-over={dropTarget === (incoming?.id ?? node.id)}
          data-dragging={dragged?.childId === node.id}
          className={`argument-card ${!selfMatches ? 'opacity-65' : ''}`}
          draggable={node.kind !== 'question'}
          onClick={() => onSelect(node.id)}
          onDragStart={event => {
            event.stopPropagation();
            event.dataTransfer.setData('application/x-thinking-os-node', node.id);
            event.dataTransfer.effectAllowed = 'linkMove';
            setDragged({ childId: node.id, parentId: '', previousParentId: incoming?.parentId });
          }}
          onDragEnd={() => {
            setDragged(null);
            setDropTarget(null);
          }}
          onDragOver={event => {
            if (!isTarget) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'link';
            setDropTarget(incoming?.id ?? node.id);
          }}
          onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDropTarget(null);
            }
          }}
          onDrop={event => {
            event.preventDefault();
            event.stopPropagation();
            if (dragged && isTarget && event.dataTransfer.getData('application/x-thinking-os-node') === dragged.childId) {
              openConnection({ ...dragged, parentId: node.id });
            }
            setDragged(null);
            setDropTarget(null);
          }}
        >
          {/* Top Row: Type, Status, Badges, Gripper */}
          <div className="argument-card-top-row">
            <div className="flex items-center gap-2 min-w-0">
              {allChildren.length > 0 ? (
                <button
                  type="button"
                  className="w-5 h-5 rounded flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors shrink-0"
                  aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${node.title}`}
                  aria-expanded={!isCollapsed}
                  onClick={e => {
                    e.stopPropagation();
                    setCollapsed(current => {
                      const next = new Set(current);
                      if (next.has(node.id)) next.delete(node.id);
                      else next.add(node.id);
                      return next;
                    });
                  }}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}

              <div className="argument-card-badges">
                {/* Kind Pill */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-mono font-bold uppercase tracking-wider ${
                    node.kind === 'question'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : node.kind === 'claim'
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <Icon size={11} />
                  {node.kind}
                </span>

                {/* ID Pill */}
                <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                  {node.id}
                </span>

                {/* Incoming Link Status */}
                {incoming && renderStatusPill(incoming.status)}

                {/* Shared parents badge */}
                {sharedCount > 1 && (
                  <span
                    className="font-mono text-[0.6875rem] px-1.5 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]"
                    title="This object is linked to multiple parents in the argument graph"
                  >
                    {sharedCount} parents
                  </span>
                )}

                {/* Rejected Badge */}
                {node.rejected && (
                  <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 font-bold border border-rose-300/40">
                    <TriangleAlert size={11} />
                    REJECTED
                  </span>
                )}
              </div>
            </div>

            {node.kind !== 'question' && (
              <div
                className="cursor-grab text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] p-1 shrink-0"
                title="Drag to connect under a different parent"
                onClick={e => e.stopPropagation()}
              >
                <GripVertical size={14} />
              </div>
            )}
          </div>

          {/* Card Body: Title & Meta */}
          <div className="argument-card-body">
            <h3 className="argument-card-title">{node.title}</h3>

            {/* Question Tags */}
            {node.tags && node.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {node.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper)] border border-[var(--color-rule)]"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Evidence details: origin, form, citation */}
            {node.kind === 'evidence' && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                {node.origin && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)]">
                    origin: {node.origin}
                  </span>
                )}
                {node.form && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)]">
                    form: {node.form}
                  </span>
                )}
                {node.citation && (
                  <span className="inline-flex items-center gap-1 text-[var(--color-ink)] font-sans italic truncate max-w-xs">
                    <BookOpen size={11} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    {node.citation}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Incoming Link Rationale Callout */}
          {incoming?.userReason && (
            <div className="argument-reason-callout">
              <Link2 size={13} className="shrink-0 text-[var(--accent-indigo)] mt-0.5" />
              <div>
                <span className="font-mono text-[0.625rem] uppercase tracking-wider font-semibold block text-[var(--color-ink-muted)] mb-0.5">
                  Link Rationale
                </span>
                <blockquote>&ldquo;{incoming.userReason}&rdquo;</blockquote>
              </div>
            </div>
          )}

          {/* Rejection notice */}
          {node.rejected && node.rejectionReason && (
            <div className="mx-3 mb-2.5 p-2 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
              <strong className="font-mono uppercase text-[0.625rem] tracking-wider block mb-0.5">
                Rejection reason:
              </strong>
              {node.rejectionReason}
            </div>
          )}

          {/* Drop Target Helper Badge */}
          {isTarget && (
            <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-200 dark:border-indigo-800 text-center font-mono text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
              Drop here to link under this {node.kind}
            </div>
          )}

          {/* Card Footer: Provenance & Actions */}
          <div className="argument-card-footer" onClick={e => e.stopPropagation()}>
            <span
              className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)] truncate"
              title={`${node.id} · authored by ${node.author}`}
            >
              by {node.author}
              {allChildren.length > 0 &&
                ` · ${allChildren.length} ${node.kind === 'question' ? 'claims' : 'evidence'}`}
            </span>

            <div className="argument-card-actions">
              {/* Quick Add Child button */}
              {node.kind === 'question' && onNewChild && (
                <button
                  type="button"
                  onClick={() => onNewChild(node.id, 'question')}
                  className="argument-micro-btn primary"
                  title="Add a new claim answering this question"
                >
                  <Plus size={12} />
                  Claim
                </button>
              )}
              {node.kind === 'claim' && onNewChild && (
                <button
                  type="button"
                  onClick={() => onNewChild(node.id, 'claim')}
                  className="argument-micro-btn primary"
                  title="Add new empirical or literature evidence supporting this claim"
                >
                  <Plus size={12} />
                  Evidence
                </button>
              )}

              {/* Connect button for claims and evidence */}
              {node.kind !== 'question' && (
                <button
                  type="button"
                  onClick={() =>
                    openConnection({
                      childId: node.id,
                      parentId: '',
                      previousParentId: incoming?.parentId
                    })
                  }
                  className="argument-micro-btn"
                  title={`Connect ${node.kind} to a parent`}
                >
                  <Link2 size={12} />
                  Connect
                </button>
              )}

              {/* Inspect / Edit Button */}
              <button
                type="button"
                onClick={() => onEdit(node.id)}
                className={`argument-micro-btn ${isSelected ? 'primary' : ''}`}
                title="Open object inspector & editor"
              >
                <Pencil size={12} />
                Edit
              </button>

              {/* Remove Button with confirmation */}
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      `Permanently remove this ${node.kind}?\n\n"${node.title}"\n\nIts incident links will be removed, but descendant claims and evidence will be preserved.`
                    )
                  ) {
                    return;
                  }
                  const result = removeGraphNode(node.id);
                  onMessage(
                    result.success
                      ? `${node.kind.toUpperCase()} ${node.id} removed. Descendants were preserved.`
                      : result.error ?? 'Could not remove item.'
                  );
                }}
                className="argument-micro-btn danger"
                title={`Remove ${node.kind}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </article>

        {/* Child branches */}
        {allChildren.length > 0 && !isCollapsed && (
          <ul className="argument-children">
            {children.map(child => renderNode(child.node, child.link))}
          </ul>
        )}

        {/* Argument Gap in Tree: when a question has no claims, or a claim has no evidence */}
        {allChildren.length === 0 && !isCollapsed && (node.kind === 'question' || node.kind === 'claim') && onNewChild && (
          <ul className="argument-children">
            <li className="argument-gap-item">
              <button
                type="button"
                onClick={() => onNewChild(node.id, node.kind as 'question' | 'claim')}
                className="argument-gap-btn group"
                title={`Argument Gap: Click to add ${node.kind === 'question' ? 'claim' : 'evidence'} to ground this ${node.kind}`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle size={12} className="text-amber-500 shrink-0" />
                  <span className="truncate">
                    Argument Gap: No {node.kind === 'question' ? 'answering claims' : 'grounding evidence'} attached
                  </span>
                </span>
                <span className="argument-gap-action group-hover:scale-105 transition-transform">
                  + Add {node.kind === 'question' ? 'Claim' : 'Evidence'}
                </span>
              </button>
            </li>
          </ul>
        )}
      </li>
    );
  };

  // Root questions to display
  const rootQuestions = nodes.filter(node => node.kind === 'question');
  const visibleRoots = rootQuestions.filter(node => isVisibleOrHasVisibleChildren(node));

  // Unlinked claims & evidence (nodes with no incoming parent link)
  const unlinkedNodes = nodes.filter(node => node.kind !== 'question' && !childIds.has(node.id));
  const visibleUnlinked = unlinkedNodes.filter(node => matchesSearch(node) && matchesTypeFilter(node));

  return (
    <section aria-label="Argument tree" className="argument-outline">
      {/* Search & Filter Toolbar Card */}
      <div className="argument-toolbar-card">
        {/* Top line: Search and View Mode buttons */}
        <div className="argument-search-bar">
          <Search size={14} className="absolute left-2.5 text-[var(--color-ink-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search questions, claims, evidence, tags..."
            className="argument-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] p-0.5"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {/* Quick Expand / Collapse */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              type="button"
              onClick={() => setCollapsed(new Set())}
              className="argument-micro-btn"
              title="Expand all branches"
            >
              <ChevronsUpDown size={13} />
              <span className="hidden sm:inline">Expand</span>
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(new Set(branches.keys()))}
              className="argument-micro-btn"
              title="Collapse all branches"
            >
              <ChevronsDownUp size={13} />
              <span className="hidden sm:inline">Collapse</span>
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="argument-filter-chips">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              data-active={typeFilter === 'all'}
              className="argument-filter-pill"
            >
              All ({nodes.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('question')}
              data-active={typeFilter === 'question'}
              className="argument-filter-pill"
            >
              <HelpCircle size={11} className="text-indigo-600 dark:text-indigo-400" />
              Questions ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('claim')}
              data-active={typeFilter === 'claim'}
              className="argument-filter-pill"
            >
              <GitBranch size={11} className="text-teal-600 dark:text-teal-400" />
              Claims ({claims.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('evidence')}
              data-active={typeFilter === 'evidence'}
              className="argument-filter-pill"
            >
              <FileCheck2 size={11} className="text-amber-600 dark:text-amber-400" />
              Evidence ({evidence.length})
            </button>
            {reviewNodeIds.size > 0 && (
              <button
                type="button"
                onClick={() => setTypeFilter('review')}
                data-active={typeFilter === 'review'}
                className="argument-filter-pill text-amber-700 dark:text-amber-300"
              >
                <TriangleAlert size={11} />
                Needs Review ({reviewNodeIds.size})
              </button>
            )}
          </div>

          {onStartCreate && (
            <button
              type="button"
              onClick={() => onStartCreate('question')}
              className="argument-micro-btn primary ml-auto"
            >
              <Plus size={13} />
              New Object
            </button>
          )}
        </div>
      </div>

      {/* Main Hierarchy Tree */}
      {visibleRoots.length > 0 ? (
        <ul className="argument-roots">
          {visibleRoots.map(node => renderNode(node))}
        </ul>
      ) : nodes.length > 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col items-center gap-2">
          <Filter size={24} className="text-[var(--color-ink-muted)] opacity-50" />
          <p className="text-sm font-medium text-[var(--color-ink)]">No argument nodes match current filters</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
            className="text-xs font-mono text-[var(--accent-indigo)] hover:underline mt-1"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl border border-dashed border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col items-center gap-3">
          <HelpCircle size={32} className="text-indigo-500 opacity-60" />
          <h3 className="font-serif text-lg font-bold text-[var(--color-ink)]">Start your Argument Tree</h3>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
            Research begins with an empirical or theoretical question. Add your first question to begin mapping claims and evidence.
          </p>
          {onStartCreate && (
            <button
              type="button"
              onClick={() => onStartCreate('question')}
              className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              Create First Question
            </button>
          )}
        </div>
      )}

      {/* Unlinked Objects Section */}
      {visibleUnlinked.length > 0 && (
        <section aria-label="Unlinked items" className="mt-8 pt-6 border-t-2 border-dashed border-[var(--color-rule)]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--color-ink-muted)] flex items-center gap-2">
                <Link2 size={13} />
                Unlinked Records ({visibleUnlinked.length})
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                Floating claims or evidence without a parent connection. Drag onto a parent or click Connect.
              </p>
            </div>
          </div>

          <ul className="argument-roots">
            {visibleUnlinked.map(node => renderNode(node))}
          </ul>
        </section>
      )}

      {/* Drag-and-Drop / Connect Modal Dialog */}
      <dialog
        ref={dialogRef}
        className="argument-connect-dialog"
        aria-labelledby="argument-connect-title"
        onClose={() => setConnection(null)}
        onKeyDown={event => {
          if (event.key === 'Escape') event.stopPropagation();
        }}
      >
        {connection && (
          <form
            onSubmit={event => {
              event.preventDefault();
              if (!reason.trim()) {
                setError('A link reason is strictly required by the research epistemology.');
                return;
              }
              const result = moveGraphNode(
                connection.childId,
                connection.parentId,
                reason.trim(),
                keepOriginal ? undefined : connection.previousParentId
              );
              if (!result.success) {
                setError(result.error ?? 'Could not connect item.');
                return;
              }
              setCollapsed(current => {
                const next = new Set(current);
                next.delete(connection.parentId);
                return next;
              });
              onMessage(
                keepOriginal || !connection.previousParentId
                  ? 'Connection created. Existing links were preserved.'
                  : 'Connection moved to new parent.'
              );
              dialogRef.current?.close();
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div>
                <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                  Epistemic Link Requirement
                </span>
                <h2 id="argument-connect-title" className="font-serif text-lg font-bold text-[var(--color-ink)] mt-0.5">
                  Connect {byId.get(connection.childId)?.kind.toUpperCase()} to Parent
                </h2>
              </div>
              <button
                type="button"
                className="p-1 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                onClick={() => dialogRef.current?.close()}
                aria-label="Cancel connection"
              >
                <X size={16} />
              </button>
            </div>

            {/* Child Node Preview */}
            <div className="p-3 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] flex flex-col gap-1">
              <span className="font-mono text-[0.625rem] uppercase text-[var(--color-ink-muted)] font-bold">
                Connecting Child Object:
              </span>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {byId.get(connection.childId)?.title}
              </p>
            </div>

            {/* Parent Selector */}
            <label className="argument-field-label">
              <span>Parent {byId.get(connection.childId)?.kind === 'claim' ? 'Question' : 'Claim'}</span>
              <select
                autoFocus
                required
                value={connection.parentId}
                onChange={e => {
                  setError('');
                  setConnection({ ...connection, parentId: e.target.value });
                }}
                className="argument-select"
              >
                <option value="">Select parent object...</option>
                {nodes
                  .filter(node => canConnect(node, connection.childId))
                  .map(node => (
                    <option key={node.id} value={node.id}>
                      [{node.kind.toUpperCase()}] {node.title}
                    </option>
                  ))}
              </select>
            </label>

            {/* Link Reason (MANDATORY per AGENTS.md invariant) */}
            <label className="argument-field-label">
              <span>Why does this object support or answer its parent? (Mandatory)</span>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={e => {
                  setError('');
                  setReason(e.target.value);
                }}
                placeholder="State the epistemic rationale in your own words (e.g., Empirical measurement in table 2 directly refutes the 4-bit quantization baseline)..."
                className="argument-textarea"
              />
            </label>

            {/* Checkbox if this node already had a parent */}
            {connection.previousParentId && (
              <label className="flex items-center gap-2 text-xs text-[var(--color-ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepOriginal}
                  onChange={e => setKeepOriginal(e.target.checked)}
                  className="rounded border-[var(--color-rule)] text-indigo-600 focus:ring-indigo-500"
                />
                <span>Keep original parent connection (multi-parent shared child)</span>
              </label>
            )}

            {error && (
              <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-mono">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-rule)]">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="px-3.5 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs font-mono font-medium hover:bg-[var(--color-paper)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!connection.parentId || !reason.trim()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-mono font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Link2 size={13} />
                {keepOriginal || !connection.previousParentId ? 'Create Connection' : 'Move Connection'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
};
