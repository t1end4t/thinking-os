import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, FileCheck2, GitBranch, GripVertical, HelpCircle, Link2, Pencil, Trash2, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Link } from '../../types';

interface TreeNode {
  id: string;
  kind: 'question' | 'claim' | 'evidence';
  title: string;
  author: string;
  rejected?: boolean;
  rejectionReason?: string;
}

interface ConnectionDraft {
  childId: string;
  parentId: string;
  previousParentId?: string;
}

export function ArgumentTree({ selectedId, onEdit, onMessage }: {
  selectedId: string | null;
  onEdit: (id: string) => void;
  onMessage: (message: string) => void;
}) {
  const { questions, claims, evidence, links, removeGraphNode, moveGraphNode } = useWorkspace();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragged, setDragged] = useState<ConnectionDraft | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionDraft | null>(null);
  const [reason, setReason] = useState('');
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nodes: TreeNode[] = [
    ...questions.map(item => ({ ...item, kind: 'question' as const })),
    ...claims.map(item => ({ ...item, title: item.text, kind: 'claim' as const })),
    ...evidence.map(item => ({ ...item, kind: 'evidence' as const }))
  ];
  const byId = new Map(nodes.map(node => [node.id, node]));
  const branches = new Map<string, { node: TreeNode; link: Link }[]>();
  const childIds = new Set<string>();
  for (const link of links) {
    const parent = byId.get(link.parentId);
    const child = byId.get(link.childId);
    if (!parent || !child) continue;
    if (!(link.kind === 'question-claim' && parent.kind === 'question' && child.kind === 'claim')
      && !(link.kind === 'claim-evidence' && parent.kind === 'claim' && child.kind === 'evidence')) continue;
    branches.set(parent.id, [...(branches.get(parent.id) ?? []), { node: child, link }]);
    childIds.add(child.id);
  }

  useEffect(() => {
    if (connection) dialogRef.current?.showModal();
  }, [connection?.childId]);

  const canConnect = (parent: TreeNode, childId: string) => {
    const child = byId.get(childId);
    return ((parent.kind === 'question' && child?.kind === 'claim') || (parent.kind === 'claim' && child?.kind === 'evidence'))
      && !links.some(link => link.parentId === parent.id && link.childId === childId);
  };

  const openConnection = (draft: ConnectionDraft) => {
    setReason('');
    setError('');
    setKeepOriginal(true);
    setConnection(draft);
  };

  const renderNode = (node: TreeNode, incoming?: Link): React.ReactNode => {
    const children = branches.get(node.id) ?? [];
    const isCollapsed = collapsed.has(node.id);
    const isTarget = Boolean(dragged && canConnect(node, dragged.childId));
    const Icon = node.kind === 'question' ? HelpCircle : node.kind === 'claim' ? GitBranch : FileCheck2;
    const sharedCount = links.filter(link => link.childId === node.id).length;
    return (
      <li key={incoming?.id ?? node.id} className="argument-branch">
        <article
          aria-label={`${node.kind}: ${node.title}`}
          data-node-id={node.id}
          data-kind={node.kind}
          data-selected={selectedId === node.id}
          data-drop-target={isTarget}
          data-drag-over={dropTarget === (incoming?.id ?? node.id)}
          data-dragging={dragged?.childId === node.id}
          className="argument-card"
          draggable={node.kind !== 'question'}
          onDragStart={event => {
            event.stopPropagation();
            event.dataTransfer.setData('application/x-thinking-os-node', node.id);
            event.dataTransfer.effectAllowed = 'linkMove';
            setDragged({ childId: node.id, parentId: '', previousParentId: incoming?.parentId });
          }}
          onDragEnd={() => { setDragged(null); setDropTarget(null); }}
          onDragOver={event => {
            if (!isTarget) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'link';
            setDropTarget(incoming?.id ?? node.id);
          }}
          onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
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
          <div className="argument-card-main">
            {children.length > 0 ? (
              <button type="button" className="argument-icon-button" aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${node.title}`} aria-expanded={!isCollapsed} onClick={() => setCollapsed(current => {
                const next = new Set(current);
                if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
                return next;
              })}>{isCollapsed ? <ChevronRight /> : <ChevronDown />}</button>
            ) : <span className="argument-node-spacer" />}
            <span className="argument-type-icon"><Icon /></span>
            <div className="argument-card-content">
              <div className="argument-card-meta">
                <span className="argument-kind">{node.kind}</span>
                {incoming && <span className="argument-status" data-status={incoming.status}>{incoming.status}</span>}
                {sharedCount > 1 && <span title="This is one record shared by multiple parents">{sharedCount} parents</span>}
                {node.rejected && <span className="argument-status" data-status="missing">Rejected</span>}
              </div>
              <button type="button" className="argument-title" onClick={() => onEdit(node.id)}>{node.title}</button>
            </div>
            {node.kind !== 'question' && <GripVertical className="argument-grip" aria-label="Drag to another parent" />}
          </div>
          <div className="argument-card-footer">
            <span className="argument-provenance" title={`${node.id} · ${node.author}`}>{node.author}{children.length > 0 ? ` · ${children.length} ${node.kind === 'question' ? 'claims' : 'evidence'}` : ''}</span>
            <div className="argument-actions">
              {node.kind !== 'question' && <button type="button" aria-label={`Connect ${node.kind}: ${node.title}`} onClick={() => openConnection({ childId: node.id, parentId: '', previousParentId: incoming?.parentId })}><Link2 /> Connect</button>}
              <button type="button" aria-label={`Edit ${node.kind}: ${node.title}`} aria-pressed={selectedId === node.id} onClick={() => onEdit(node.id)}><Pencil /> Edit</button>
              <button type="button" className="argument-remove" aria-label={`Remove ${node.kind}: ${node.title}`} onClick={() => {
                if (!window.confirm(`Permanently remove this ${node.kind}?\n\n${node.title}\n\nIts connected links will also be deleted. Other questions, claims, and evidence will be kept. This cannot be undone.`)) return;
                const result = removeGraphNode(node.id);
                onMessage(result.success ? `${node.kind} removed. Other records were kept.` : result.error ?? 'Could not remove item.');
              }}><Trash2 /> Remove</button>
            </div>
          </div>
          {incoming && <details className="argument-link-reason"><summary>Connection reason</summary><p>{incoming.userReason}</p></details>}
          {node.rejected && <p className="argument-rejection">{node.rejectionReason}</p>}
          {isTarget && <span className="argument-drop-label">Drop to connect {dragged && byId.get(dragged.childId)?.kind}</span>}
        </article>
        {children.length > 0 && !isCollapsed && <ul className="argument-children">{children.map(child => renderNode(child.node, child.link))}</ul>}
      </li>
    );
  };

  return (
    <section aria-label="Argument tree" className="argument-outline">
      <div className="argument-outline-toolbar">
        <div className="argument-counts"><span>{questions.length} questions</span><ArrowRight /><span>{claims.length} claims</span><ArrowRight /><span>{evidence.length} evidence</span></div>
        <div className="argument-actions">
          <button type="button" title="Expand all" aria-label="Expand all branches" onClick={() => setCollapsed(new Set())}><ChevronsUpDown /></button>
          <button type="button" title="Collapse all" aria-label="Collapse all branches" onClick={() => setCollapsed(new Set(branches.keys()))}><ChevronsDownUp /></button>
        </div>
      </div>
      <p className="argument-hint"><GripVertical /> Drag a claim or evidence onto a parent. Or use Connect.</p>
      <ul className="argument-roots">{nodes.filter(node => node.kind === 'question').map(node => renderNode(node))}</ul>
      {nodes.some(node => node.kind !== 'question' && !childIds.has(node.id)) && <section aria-label="Unlinked items" className="argument-unlinked">
        <h3>Unlinked objects</h3><p>Keep these records; connect them when their role is clear.</p>
        <ul className="argument-roots">{nodes.filter(node => node.kind !== 'question' && !childIds.has(node.id)).map(node => renderNode(node))}</ul>
      </section>}
      {nodes.length === 0 && <div className="argument-empty"><GitBranch /><h2>Start with a question</h2><p>Use New to add your first research question.</p></div>}
      <dialog ref={dialogRef} className="argument-connect-dialog" aria-labelledby="argument-connect-title" onClose={() => setConnection(null)} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
        {connection && <form onSubmit={event => {
          event.preventDefault();
          const result = moveGraphNode(connection.childId, connection.parentId, reason, keepOriginal ? undefined : connection.previousParentId);
          if (!result.success) { setError(result.error ?? 'Could not connect item.'); return; }
          setCollapsed(current => { const next = new Set(current); next.delete(connection.parentId); return next; });
          onMessage(keepOriginal || !connection.previousParentId ? 'Connection created. Existing links were kept.' : 'Connection moved. Other shared links were kept.');
          dialogRef.current?.close();
        }}>
          <header><div><span className="argument-eyebrow">Research connection</span><h2 id="argument-connect-title">Give this link a reason</h2></div><button type="button" className="argument-icon-button" aria-label="Cancel connection" onClick={() => dialogRef.current?.close()}><X /></button></header>
          <p className="argument-connect-child">{byId.get(connection.childId)?.title}</p>
          <label>Parent {byId.get(connection.childId)?.kind === 'claim' ? 'question' : 'claim'}<select autoFocus required value={connection.parentId} onChange={event => { setError(''); setConnection({ ...connection, parentId: event.target.value }); }}>
            <option value="">Choose a parent…</option>
            {nodes.filter(node => canConnect(node, connection.childId)).map(node => <option key={node.id} value={node.id}>{node.title}</option>)}
          </select></label>
          <label>Why does this object support its parent?<textarea required rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="State the connection in your own words." /></label>
          {connection.previousParentId && <label className="argument-keep-link"><input type="checkbox" checked={keepOriginal} onChange={event => setKeepOriginal(event.target.checked)} />Keep the original parent connection</label>}
          {!keepOriginal && connection.previousParentId && <p className="argument-hint">Only the dragged connection will be replaced. Other shared links stay intact.</p>}
          {error && <p role="alert" className="argument-rejection">{error}</p>}
          <footer><button type="button" className="kanban-modal-cancel-btn" onClick={() => dialogRef.current?.close()}>Cancel</button><button type="submit" className="kanban-modal-save-btn" disabled={!connection.parentId || !reason.trim()}><Link2 />{keepOriginal || !connection.previousParentId ? 'Create connection' : 'Move connection'}</button></footer>
        </form>}
      </dialog>
    </section>
  );
}
