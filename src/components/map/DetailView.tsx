import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Claim, Evidence, EvidenceForm, EvidenceOrigin, Link, LinkStatus, Question } from '../../types';
import { Ban, Link2, PanelRight, Trash2, TriangleAlert, X } from 'lucide-react';
import { ArgumentTree } from './ArgumentTree';
import './argument.css';

type Selection =
  | { kind: 'question'; entity: Question }
  | { kind: 'claim'; entity: Claim }
  | { kind: 'evidence'; entity: Evidence };

const fieldClass =
  'w-full rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-slate-400';
const labelClass = 'font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold';
const buttonClass =
  'px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs font-mono font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)] disabled:opacity-40 disabled:pointer-events-none';

const statusPill = (status: LinkStatus) =>
  status === 'holds'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
    : status === 'weak'
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300';

interface DetailViewProps {
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ creating, onCreatingChange }) => {
  const {
    questions,
    claims,
    evidence,
    links,
    selectedNodeId,
    setSelectedNodeId,
    setSelectedLinkId,
    addQuestion,
    addClaim,
    addEvidence,
    updateQuestion,
    updateClaim,
    updateEvidence,
    updateLinkUserReason,
    connectNodes,
    setLinkStatus,
    deleteLink,
    weakenClaim,
    rejectClaim
  } = useWorkspace();

  const [newKind, setNewKind] = useState<'question' | 'claim' | 'evidence'>('question');
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newOrigin, setNewOrigin] = useState<EvidenceOrigin>('literature');
  const [newForm, setNewForm] = useState<EvidenceForm>('measurement');
  const [newCitation, setNewCitation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [linkTargetId, setLinkTargetId] = useState<string>('');
  const [linkReason, setLinkReason] = useState<string>('');
  const [weakenNote, setWeakenNote] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  const selection: Selection | null = useMemo(() => {
    const question = questions.find(item => item.id === selectedNodeId);
    if (question) return { kind: 'question', entity: question };
    const claim = claims.find(item => item.id === selectedNodeId);
    if (claim) return { kind: 'claim', entity: claim };
    const item = evidence.find(node => node.id === selectedNodeId);
    if (item) return { kind: 'evidence', entity: item };
    return null;
  }, [claims, evidence, questions, selectedNodeId]);

  const relatedLinks = useMemo(
    () => links.filter(link => link.parentId === selectedNodeId || link.childId === selectedNodeId),
    [links, selectedNodeId]
  );

  const entityLabel = (id: string) =>
    questions.find(item => item.id === id)?.title
    ?? claims.find(item => item.id === id)?.text
    ?? evidence.find(item => item.id === id)?.title
    ?? id;

  const connectOptions = selection?.kind === 'question'
    ? claims.filter(claim => !links.some(link => link.parentId === selection.entity.id && link.childId === claim.id))
    : selection?.kind === 'claim'
      ? evidence.filter(item => !links.some(link => link.parentId === selection.entity.id && link.childId === item.id))
      : [];

  const handleConnect = () => {
    if (!selection || selection.kind === 'evidence') return;
    const kind = selection.kind === 'question' ? 'question-claim' : 'claim-evidence';
    const result = connectNodes(kind, selection.entity.id, linkTargetId, linkReason);
    setMessage(result.success ? 'Link created.' : result.error ?? 'Could not create link.');
    if (result.success) {
      setLinkTargetId('');
      setLinkReason('');
    }
  };

  const handleSaveReason = (link: Link) => {
    const draft = reasonDrafts[link.id];
    if (!draft?.trim()) {
      setMessage('A link reason cannot be empty.');
      return;
    }
    updateLinkUserReason(link.id, draft);
    setReasonDrafts(current => {
      const next = { ...current };
      delete next[link.id];
      return next;
    });
    setMessage('Link reason saved.');
  };

  const handleCreate = () => {
    if (newKind === 'question') {
      const result = addQuestion(newTitle, newTags.split(',').map(tag => tag.trim()).filter(Boolean));
      setMessage(result.success ? 'Question created.' : result.error ?? 'Could not create question.');
      if (result.questionId) setSelectedNodeId(result.questionId);
      if (!result.success) return;
    } else if (newKind === 'claim') {
      const result = addClaim(newTitle, newParentId, newReason);
      setMessage(result.success ? 'Claim created and connected.' : result.error ?? 'Could not create claim.');
      if (result.claimId) setSelectedNodeId(result.claimId);
      if (!result.success) return;
    } else {
      const result = addEvidence({
        title: newTitle.trim(),
        origin: newOrigin,
        form: newForm,
        citation: newCitation.trim()
      }, newParentId, newReason);
      setMessage(result.success ? 'Evidence created and connected.' : result.error ?? 'Could not create evidence.');
      if (result.evidenceId) setSelectedNodeId(result.evidenceId);
      if (!result.success) return;
    }
    setNewTitle('');
    setNewTags('');
    setNewParentId('');
    setNewReason('');
    setNewCitation('');
    onCreatingChange(false);
  };

  if (creating) {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[var(--color-ink)]">Add to argument</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">Create one entity and its required parent link.</p>
          </div>
          <button type="button" onClick={() => onCreatingChange(false)} className={buttonClass}>Cancel</button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] w-fit mb-5">
          {(['question', 'claim', 'evidence'] as const).map(kind => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                setNewKind(kind);
                setNewParentId('');
                setMessage(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono capitalize ${newKind === kind ? 'bg-[var(--color-ink)] text-[var(--color-surface)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
            >
              {kind}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{newKind === 'claim' ? 'Claim text' : `${newKind} title`}</span>
            <textarea
              value={newTitle}
              onChange={event => setNewTitle(event.target.value)}
              rows={3}
              autoFocus
              className={fieldClass}
            />
          </label>

          {newKind === 'question' && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Tags (comma separated)</span>
              <input value={newTags} onChange={event => setNewTags(event.target.value)} className={fieldClass} />
            </label>
          )}

          {newKind === 'claim' && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Parent question</span>
              <select value={newParentId} onChange={event => setNewParentId(event.target.value)} className={fieldClass}>
                <option value="">Select question…</option>
                {questions.map(question => <option key={question.id} value={question.id}>{question.title}</option>)}
              </select>
            </label>
          )}

          {newKind === 'evidence' && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Parent claim</span>
                <select value={newParentId} onChange={event => setNewParentId(event.target.value)} className={fieldClass}>
                  <option value="">Select claim…</option>
                  {claims.map(claim => <option key={claim.id} value={claim.id}>{claim.text}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Origin</span>
                  <select value={newOrigin} onChange={event => setNewOrigin(event.target.value as EvidenceOrigin)} className={fieldClass}>
                    <option value="literature">literature</option>
                    <option value="experiment">experiment</option>
                    <option value="own_reasoning">own_reasoning</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Form</span>
                  <select value={newForm} onChange={event => setNewForm(event.target.value as EvidenceForm)} className={fieldClass}>
                    <option value="measurement">measurement</option>
                    <option value="derivation">derivation</option>
                    <option value="counterexample">counterexample</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Citation</span>
                <input value={newCitation} onChange={event => setNewCitation(event.target.value)} className={fieldClass} />
              </label>
            </>
          )}

          {newKind !== 'question' && (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Link reason (required)</span>
              <textarea
                value={newReason}
                onChange={event => setNewReason(event.target.value)}
                rows={2}
                placeholder="Why does this child answer or support its parent?"
                className={fieldClass}
              />
            </label>
          )}

          {message && <p role="alert" className="text-xs font-mono text-rose-700 dark:text-rose-300">{message}</p>}
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newTitle.trim() || (newKind !== 'question' && (!newParentId || !newReason.trim()))}
            className={`${buttonClass} self-start bg-slate-900 text-white dark:bg-white dark:text-slate-900`}
          >
            Add {newKind}
          </button>
        </div>
      </div>
    );
  }

  const editor = editing && selection ? (
    <div key={selection.entity.id} className="argument-editor-fields flex flex-col gap-6">

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.6875rem] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
            {selection.kind}
          </span>
          <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">{selection.entity.id}</span>
          <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">author: {selection.entity.author}</span>
        </div>

        {selection.kind === 'question' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Question title</span>
              <textarea
                value={selection.entity.title}
                onChange={event => updateQuestion(selection.entity.id, { title: event.target.value })}
                autoFocus
                rows={2}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Tags (comma separated)</span>
              <input
                value={selection.entity.tags.join(', ')}
                onChange={event => updateQuestion(selection.entity.id, {
                  tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                className={fieldClass}
              />
            </label>
          </>
        )}

        {selection.kind === 'claim' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Claim text</span>
              <textarea
                value={selection.entity.text}
                onChange={event => updateClaim(selection.entity.id, { text: event.target.value })}
                autoFocus
                rows={3}
                className={fieldClass}
              />
            </label>
            {selection.entity.rejected && (
              <p className="text-xs text-rose-700 dark:text-rose-300 font-mono">
                Rejected: {selection.entity.rejectionReason || 'no reason recorded'}
              </p>
            )}
          </>
        )}

        {selection.kind === 'evidence' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Evidence title</span>
              <textarea
                value={selection.entity.title}
                onChange={event => updateEvidence(selection.entity.id, { title: event.target.value })}
                autoFocus
                rows={2}
                className={fieldClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Origin</span>
                <select
                  value={selection.entity.origin}
                  onChange={event => updateEvidence(selection.entity.id, { origin: event.target.value as EvidenceOrigin })}
                  className={fieldClass}
                >
                  <option value="literature">literature</option>
                  <option value="experiment">experiment</option>
                  <option value="own_reasoning">own_reasoning</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Form</span>
                <select
                  value={selection.entity.form}
                  onChange={event => updateEvidence(selection.entity.id, { form: event.target.value as EvidenceForm })}
                  className={fieldClass}
                >
                  <option value="measurement">measurement</option>
                  <option value="derivation">derivation</option>
                  <option value="counterexample">counterexample</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Citation</span>
              <input
                value={selection.entity.citation}
                onChange={event => updateEvidence(selection.entity.id, { citation: event.target.value })}
                className={fieldClass}
              />
            </label>
          </>
        )}
      </section>

      {selection.kind === 'claim' && (
        <section className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-5">
          <h2 className={labelClass}>Weakness record</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <input
                value={weakenNote}
                onChange={event => setWeakenNote(event.target.value)}
                placeholder="Scope limit that weakens this claim"
                className={fieldClass}
              />
              <button
                type="button"
                disabled={!weakenNote.trim()}
                onClick={() => {
                  weakenClaim(selection.entity.id, weakenNote.trim());
                  setWeakenNote('');
                  setMessage('Claim weakened; its links are now marked weak.');
                }}
                className={`${buttonClass} flex items-center gap-1.5`}
              >
                <TriangleAlert className="w-3.5 h-3.5" />
                Weaken claim
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                value={rejectReason}
                onChange={event => setRejectReason(event.target.value)}
                placeholder="Reason this claim is rejected"
                className={fieldClass}
              />
              <button
                type="button"
                disabled={!rejectReason.trim() || selection.entity.rejected}
                onClick={() => {
                  rejectClaim(selection.entity.id, rejectReason.trim());
                  setRejectReason('');
                  setMessage('Claim rejected; the record is preserved.');
                }}
                className={`${buttonClass} flex items-center gap-1.5`}
              >
                <Ban className="w-3.5 h-3.5" />
                Reject claim
              </button>
            </div>
          </div>
        </section>
      )}

      {selection.kind !== 'evidence' && (
        <section className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-5">
          <h2 className={labelClass}>
            Connect {selection.kind === 'question' ? 'an existing claim' : 'existing evidence'}
          </h2>
          <select
            value={linkTargetId}
            onChange={event => setLinkTargetId(event.target.value)}
            aria-label="Link target"
            className={fieldClass}
          >
            <option value="">Select target…</option>
            {connectOptions.map(option => (
              <option key={option.id} value={option.id}>
                {'text' in option ? option.text : option.title}
              </option>
            ))}
          </select>
          <textarea
            value={linkReason}
            onChange={event => setLinkReason(event.target.value)}
            rows={2}
            placeholder="Why does the child support the parent? (required)"
            className={fieldClass}
          />
          <button
            type="button"
            disabled={!linkTargetId || !linkReason.trim()}
            onClick={handleConnect}
            className={`${buttonClass} self-start flex items-center gap-1.5`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Create link
          </button>
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-5">
        <h2 className={labelClass}>Links ({relatedLinks.length})</h2>
        {relatedLinks.length === 0 && (
          <p className="text-sm text-[var(--color-ink-muted)]">No links yet.</p>
        )}
        {relatedLinks.map(link => (
          <article key={link.id} className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-mono text-[0.6875rem] uppercase px-2 py-0.5 rounded ${statusPill(link.status)}`}>
                {link.status}
              </span>
              <span className="text-xs text-[var(--color-ink)]">
                {entityLabel(link.parentId)} → {entityLabel(link.childId)}
              </span>
            </div>
            <textarea
              value={reasonDrafts[link.id] ?? link.userReason}
              onChange={event => setReasonDrafts(current => ({ ...current, [link.id]: event.target.value }))}
              rows={2}
              aria-label={`User reason for ${link.id}`}
              className={fieldClass}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => handleSaveReason(link)} className={buttonClass}>
                Save reason
              </button>
              <label className="flex items-center gap-1.5">
                <span className={labelClass}>Status</span>
                <select
                  value={link.status}
                  onChange={event => setLinkStatus(link.id, event.target.value as LinkStatus)}
                  aria-label={`Status for ${link.id}`}
                  className={`${fieldClass} py-1 w-32`}
                >
                  <option value="holds">holds</option>
                  <option value="weak">weak</option>
                  <option value="missing">missing</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  deleteLink(link.id);
                  setMessage(`Link ${link.id} deleted.`);
                }}
                className={`${buttonClass} flex items-center gap-1.5 text-rose-700 dark:text-rose-300`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete link
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  ) : null;

  return (
    <div className="argument-detail" data-editing={Boolean(editor)}>
      {message && <p role="status" className="argument-feedback">{message}</p>}
      <div className="argument-split">
        <div className="argument-tree-pane">
          <ArgumentTree selectedId={editor ? selectedNodeId : null} onMessage={setMessage} onEdit={id => {
            setSelectedNodeId(id);
            setSelectedLinkId(null);
            setLinkTargetId('');
            setLinkReason('');
            setWeakenNote('');
            setRejectReason('');
            setReasonDrafts({});
            setMessage(null);
            setEditing(true);
          }} />
        </div>
        <aside className="argument-inspector" aria-label="Object editor">
          <header className="argument-inspector-header">
            <div><span className="argument-eyebrow">Object inspector</span><h2>{editor ? `Edit ${selection?.kind}` : 'Details & connections'}</h2></div>
            {editor && <button type="button" className="argument-icon-button" aria-label="Close editor" onClick={() => {
              setEditing(false);
              document.querySelector<HTMLButtonElement>(`[data-node-id="${CSS.escape(selectedNodeId ?? '')}"] .argument-title`)?.focus();
            }}><X /></button>}
          </header>
          {editor ?? <div className="argument-empty"><PanelRight /><h3>Keep the argument in view</h3><p>Select an object or choose Edit.<br />Its content and connections open here.</p><span className="argument-eyebrow">One record · every connection</span></div>}
        </aside>
      </div>
    </div>
  );
};
