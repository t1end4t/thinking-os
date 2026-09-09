import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  Claim,
  Evidence,
  EvidenceForm,
  EvidenceOrigin,
  Link,
  LinkStatus,
  Question
} from '../../types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Ban,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  FileCheck2,
  GitBranch,
  HelpCircle,
  Layers,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Tag,
  Trash2,
  TriangleAlert,
  X
} from 'lucide-react';
import { ArgumentTree } from './ArgumentTree';
import './argument.css';

type Selection =
  | { kind: 'question'; entity: Question }
  | { kind: 'claim'; entity: Claim }
  | { kind: 'evidence'; entity: Evidence };

const statusPill = (status: LinkStatus) =>
  status === 'holds'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-300/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80'
    : status === 'weak'
      ? 'bg-amber-50 text-amber-900 border-amber-300/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80'
      : 'bg-rose-50 text-rose-900 border-rose-300/70 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80';

interface DetailViewProps {
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
  targetKind?: 'question' | 'claim' | 'evidence';
  targetParentId?: string;
  onTargetKindChange?: (kind: 'question' | 'claim' | 'evidence') => void;
  onTargetParentIdChange?: (id: string) => void;
  initialEditMode?: boolean;
  onBackToMap?: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  creating,
  onCreatingChange,
  targetKind,
  targetParentId,
  onTargetKindChange,
  onTargetParentIdChange,
  initialEditMode,
  onBackToMap
}) => {
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
    rejectClaim,
    addAttachedContext
  } = useWorkspace();

  const [newKind, setNewKind] = useState<'question' | 'claim' | 'evidence'>(targetKind || 'question');
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newParentId, setNewParentId] = useState(targetParentId || '');

  useEffect(() => {
    if (targetKind) {
      setNewKind(targetKind);
    }
  }, [targetKind]);

  useEffect(() => {
    if (targetParentId !== undefined) {
      setNewParentId(targetParentId);
    }
  }, [targetParentId]);
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
  const [editing, setEditing] = useState(Boolean(initialEditMode));

  useEffect(() => {
    if (initialEditMode !== undefined) {
      setEditing(initialEditMode);
    }
  }, [initialEditMode, selectedNodeId]);

  // Active selected entity
  const selection: Selection | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const question = questions.find(item => item.id === selectedNodeId);
    if (question) return { kind: 'question', entity: question };
    const claim = claims.find(item => item.id === selectedNodeId);
    if (claim) return { kind: 'claim', entity: claim };
    const item = evidence.find(node => node.id === selectedNodeId);
    if (item) return { kind: 'evidence', entity: item };
    return null;
  }, [claims, evidence, questions, selectedNodeId]);

  // Related links for selected entity
  const relatedLinks = useMemo(
    () => links.filter(link => link.parentId === selectedNodeId || link.childId === selectedNodeId),
    [links, selectedNodeId]
  );

  const entityLabel = (id: string) =>
    questions.find(item => item.id === id)?.title ??
    claims.find(item => item.id === id)?.text ??
    evidence.find(item => item.id === id)?.title ??
    id;

  const connectOptions =
    selection?.kind === 'question'
      ? claims.filter(claim => !links.some(link => link.parentId === selection.entity.id && link.childId === claim.id))
      : selection?.kind === 'claim'
        ? evidence.filter(item => !links.some(link => link.parentId === selection.entity.id && link.childId === item.id))
        : [];

  const handleConnect = () => {
    if (!selection || selection.kind === 'evidence') return;
    if (!linkReason.trim()) {
      setMessage('A link reason is strictly required.');
      return;
    }
    const kind = selection.kind === 'question' ? 'question-claim' : 'claim-evidence';
    const result = connectNodes(kind, selection.entity.id, linkTargetId, linkReason.trim());
    setMessage(result.success ? 'Relationship link created.' : result.error ?? 'Could not create link.');
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
    updateLinkUserReason(link.id, draft.trim());
    setReasonDrafts(current => {
      const next = { ...current };
      delete next[link.id];
      return next;
    });
    setMessage('Link rationale saved.');
  };

  const handleCreate = () => {
    if (!newTitle.trim()) {
      setMessage('Title or text cannot be empty.');
      return;
    }

    if (newKind === 'question') {
      const result = addQuestion(
        newTitle.trim(),
        newTags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
      );
      setMessage(result.success ? 'Question created.' : result.error ?? 'Could not create question.');
      if (result.questionId) {
        setSelectedNodeId(result.questionId);
        setEditing(false);
      }
      if (!result.success) return;
    } else if (newKind === 'claim') {
      if (!newParentId || !newReason.trim()) {
        setMessage('Parent question and link reason are both required.');
        return;
      }
      const result = addClaim(newTitle.trim(), newParentId, newReason.trim());
      setMessage(result.success ? 'Claim created and connected.' : result.error ?? 'Could not create claim.');
      if (result.claimId) {
        setSelectedNodeId(result.claimId);
        setEditing(false);
      }
      if (!result.success) return;
    } else {
      if (!newParentId || !newReason.trim()) {
        setMessage('Parent claim and link reason are both required.');
        return;
      }
      const result = addEvidence(
        {
          title: newTitle.trim(),
          origin: newOrigin,
          form: newForm,
          citation: newCitation.trim()
        },
        newParentId,
        newReason.trim()
      );
      setMessage(result.success ? 'Evidence created and connected.' : result.error ?? 'Could not create evidence.');
      if (result.evidenceId) {
        setSelectedNodeId(result.evidenceId);
        setEditing(false);
      }
      if (!result.success) return;
    }

    setNewTitle('');
    setNewTags('');
    setNewParentId('');
    setNewReason('');
    setNewCitation('');
    onCreatingChange(false);
  };

  const handleSendToDock = (sel: Selection) => {
    addAttachedContext({
      type: 'node',
      id: sel.entity.id,
      label: `[${sel.kind.toUpperCase()}] ${sel.kind === 'claim' ? sel.entity.text : sel.entity.title}`,
      secondaryLabel: sel.kind === 'evidence' ? sel.entity.citation : `Author: ${sel.entity.author}`,
      metadata: {
        nodeType: sel.kind,
        nodeId: sel.entity.id
      }
    });
    setMessage(`Sent ${sel.kind} ${sel.entity.id} to Assistant Dock.`);
  };

  // Metrics for overview when no node is selected
  const linkStats = useMemo(() => {
    let holds = 0;
    let weak = 0;
    let missing = 0;
    for (const l of links) {
      if (l.status === 'holds') holds++;
      else if (l.status === 'weak') weak++;
      else if (l.status === 'missing') missing++;
    }
    const rejectedClaims = claims.filter(c => c.rejected).length;
    return {
      holds,
      weak,
      missing,
      total: links.length,
      rejectedClaims
    };
  }, [links, claims]);

  // Computed argument gaps across the entire graph
  const argumentGaps = useMemo(() => {
    const gaps: Array<{
      id: string;
      title: string;
      kind: 'question' | 'claim' | 'link';
      gapDescription: string;
      actionKind: 'claim' | 'evidence' | 'inspect';
      targetId: string;
    }> = [];

    // Questions with no answering claims
    for (const q of questions) {
      const hasClaims = links.some(l => l.kind === 'question-claim' && l.parentId === q.id);
      if (!hasClaims) {
        gaps.push({
          id: `gap-${q.id}`,
          title: q.title,
          kind: 'question',
          gapDescription: 'Missing answering claims (ungrounded question)',
          actionKind: 'claim',
          targetId: q.id
        });
      }
    }

    // Claims with no grounding evidence
    for (const c of claims) {
      const hasEvidence = links.some(l => l.kind === 'claim-evidence' && l.parentId === c.id);
      if (!hasEvidence) {
        gaps.push({
          id: `gap-${c.id}`,
          title: c.text,
          kind: 'claim',
          gapDescription: 'Missing grounding evidence (unsupported claim)',
          actionKind: 'evidence',
          targetId: c.id
        });
      }
    }

    // Missing links
    for (const l of links) {
      if (l.status === 'missing') {
        const parentTitle = questions.find(q => q.id === l.parentId)?.title ?? claims.find(c => c.id === l.parentId)?.text ?? l.parentId;
        const childTitle = claims.find(c => c.id === l.childId)?.text ?? evidence.find(e => e.id === l.childId)?.title ?? l.childId;
        gaps.push({
          id: `gap-link-${l.id}`,
          title: `${parentTitle} → ${childTitle}`,
          kind: 'link',
          gapDescription: `Status marked as missing: ${l.userReason.slice(0, 35)}...`,
          actionKind: 'inspect',
          targetId: l.parentId
        });
      }
    }

    return gaps;
  }, [questions, claims, evidence, links]);

  return (
    <div className="argument-detail" data-editing={Boolean(selection || creating)}>
      {message && (
        <div role="status" className="argument-feedback">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 hover:opacity-75 transition-opacity"
            aria-label="Dismiss feedback"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="argument-split" data-has-panel={Boolean(selection || creating)}>
        {/* Left Pane: Argument Tree Explorer */}
        <div className="argument-tree-pane">
          <ArgumentTree
            selectedId={selectedNodeId}
            onMessage={setMessage}
            onSelect={id => {
              setSelectedNodeId(id);
              setSelectedLinkId(null);
              setLinkTargetId('');
              setLinkReason('');
              setWeakenNote('');
              setRejectReason('');
              setReasonDrafts({});
              setMessage(null);
              setEditing(false);
              onCreatingChange(false);
            }}
            onEdit={id => {
              setSelectedNodeId(id);
              setSelectedLinkId(null);
              setLinkTargetId('');
              setLinkReason('');
              setWeakenNote('');
              setRejectReason('');
              setReasonDrafts({});
              setMessage(null);
              setEditing(true);
              onCreatingChange(false);
            }}
            onNewChild={(parentId, parentKind) => {
              setNewKind(parentKind === 'question' ? 'claim' : 'evidence');
              setNewParentId(parentId);
              setNewTitle('');
              setNewReason('');
              onCreatingChange(true);
            }}
            onStartCreate={kind => {
              setNewKind(kind);
              setNewTitle('');
              setNewReason('');
              setNewParentId('');
              onCreatingChange(true);
            }}
          />
        </div>

        {/* Right Pane: Object Inspector / Creator / Graph Overview */}
        <aside className="argument-inspector" aria-label="Object editor and inspector">
          {/* Mode 1: Entity Creator */}
          {creating ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Creator Header */}
              <header className="argument-inspector-header">
                <div>
                  <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                    Argument Synthesis
                  </span>
                  <h2 className="text-sm font-bold text-[var(--color-ink)] mt-0.5">
                    Add to Argument Tree
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onCreatingChange(false)}
                  className="argument-micro-btn"
                  aria-label="Cancel creation"
                >
                  <X size={14} />
                  Cancel
                </button>
              </header>

              <div className="argument-inspector-content">
                {/* Kind Selector Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-paper)] border border-[var(--color-rule)] w-fit">
                  {(['question', 'claim', 'evidence'] as const).map(kind => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => {
                        setNewKind(kind);
                        setNewParentId('');
                        setMessage(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                        newKind === kind
                          ? 'bg-[var(--color-ink)] text-[var(--color-surface)] shadow-xs'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {kind === 'question' && <HelpCircle size={12} />}
                      {kind === 'claim' && <GitBranch size={12} />}
                      {kind === 'evidence' && <FileCheck2 size={12} />}
                      <span className="capitalize">{kind}</span>
                    </button>
                  ))}
                </div>

                {/* Helper hint */}
                <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                  {newKind === 'question' &&
                    'Root inquiry. Serves as the epistemological anchor for multiple candidate claims.'}
                  {newKind === 'claim' &&
                    'Falsifiable assertion answering a parent question. Requires an explicit link rationale.'}
                  {newKind === 'evidence' &&
                    'Empirical measurement, derivation, or citation supporting or refuting a parent claim.'}
                </p>

                {/* Title / Text Input */}
                <label className="argument-field-label">
                  <span>{newKind === 'claim' ? 'Claim Proposition' : `${newKind.toUpperCase()} Title`}</span>
                  <textarea
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    rows={newKind === 'claim' ? 3 : 2}
                    autoFocus
                    placeholder={
                      newKind === 'question'
                        ? 'e.g., Does speculative decoding preserve output distribution across reasoning tasks?'
                        : newKind === 'claim'
                          ? 'e.g., Attention-sink preservation maintains 98% perplexity stability up to 128k context.'
                          : 'e.g., Benchmark measurement on LLaMA-3 70B under 4-bit KV cache quantization'
                    }
                    className="argument-textarea"
                  />
                </label>

                {/* Question Tags */}
                {newKind === 'question' && (
                  <label className="argument-field-label">
                    <span>Domain Tags (comma-separated)</span>
                    <input
                      value={newTags}
                      onChange={e => setNewTags(e.target.value)}
                      placeholder="e.g. attention, quantization, memory"
                      className="argument-input"
                    />
                  </label>
                )}

                {/* Parent Question for Claim */}
                {newKind === 'claim' && (
                  <div className="argument-field-label">
                    <span>Parent Question (Required)</span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {questions.length === 0 ? (
                        <p className="text-xs text-[var(--color-ink-muted)]">No questions available to anchor claim.</p>
                      ) : (
                        questions.map(q => {
                          const isSelected = newParentId === q.id;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setNewParentId(q.id)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs text-left transition-all ${
                                isSelected
                                  ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-medium text-[var(--color-ink)] shadow-xs'
                                  : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-slate-400/50'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-mono text-[0.625rem] text-[var(--accent-indigo)] font-bold block">{q.id}</span>
                                <span className="font-sans text-[var(--color-ink)] font-medium line-clamp-2">{q.title}</span>
                              </div>
                              {isSelected && <Check size={14} className="text-[var(--accent-indigo)] shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Evidence Specific Fields */}
                {newKind === 'evidence' && (
                  <>
                    <div className="argument-field-label">
                      <span>Parent Claim (Required)</span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {claims.length === 0 ? (
                          <p className="text-xs text-[var(--color-ink-muted)]">No claims available to anchor evidence.</p>
                        ) : (
                          claims.map(c => {
                            const isSelected = newParentId === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setNewParentId(c.id)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs text-left transition-all ${
                                  isSelected
                                    ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-medium text-[var(--color-ink)] shadow-xs'
                                    : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-slate-400/50'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-mono text-[0.625rem] text-teal-600 dark:text-teal-400 font-bold block">{c.id}</span>
                                  <span className="font-sans text-[var(--color-ink)] font-medium line-clamp-2">{c.text}</span>
                                </div>
                                {isSelected && <Check size={14} className="text-[var(--accent-indigo)] shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="argument-field-label">
                        <span>Origin</span>
                        <div className="grid grid-cols-3 gap-1 pt-1">
                          {(['literature', 'experiment', 'own_reasoning'] as const).map(orig => {
                            const isSelected = newOrigin === orig;
                            const label = orig === 'literature' ? 'Literature' : orig === 'experiment' ? 'Experiment' : 'Own Reason';
                            return (
                              <button
                                key={orig}
                                type="button"
                                onClick={() => setNewOrigin(orig)}
                                className={`px-2 py-1.5 rounded-lg border text-[0.6875rem] font-mono text-center transition-all ${
                                  isSelected
                                    ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-bold text-[var(--color-ink)] shadow-xs'
                                    : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="argument-field-label">
                        <span>Form</span>
                        <div className="grid grid-cols-3 gap-1 pt-1">
                          {(['measurement', 'derivation', 'counterexample'] as const).map(f => {
                            const isSelected = newForm === f;
                            const label = f === 'measurement' ? 'Measurement' : f === 'derivation' ? 'Derivation' : 'Counterex';
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => setNewForm(f)}
                                className={`px-2 py-1.5 rounded-lg border text-[0.6875rem] font-mono text-center transition-all ${
                                  isSelected
                                    ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-bold text-[var(--color-ink)] shadow-xs'
                                    : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <label className="argument-field-label">
                      <span>Citation Reference</span>
                      <input
                        value={newCitation}
                        onChange={e => setNewCitation(e.target.value)}
                        placeholder="e.g. Xiao et al., 2023, NeurIPS, Sec 4.2"
                        className="argument-input"
                      />
                    </label>
                  </>
                )}

                {/* Mandatory Link Reason for non-questions */}
                {newKind !== 'question' && (
                  <label className="argument-field-label">
                    <span>Link Rationale (Required)</span>
                    <textarea
                      value={newReason}
                      onChange={e => setNewReason(e.target.value)}
                      rows={3}
                      placeholder={
                        newKind === 'claim'
                          ? 'Why does this claim answer the chosen question?'
                          : 'Why does this evidence support or test the chosen claim?'
                      }
                      className="argument-textarea"
                    />
                  </label>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={
                      !newTitle.trim() ||
                      (newKind !== 'question' && (!newParentId || !newReason.trim()))
                    }
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-mono font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Plus size={14} />
                    Add {newKind} to Argument
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreatingChange(false)}
                    className="px-3.5 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-xs font-mono text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selection ? (
            /* Mode 2: Node Inspector & Editor */
            <div key={selection.entity.id} className="flex flex-col h-full overflow-y-auto">
              {/* Header */}
              <header className="argument-inspector-header">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-mono font-bold uppercase tracking-wider ${
                      selection.kind === 'question'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : selection.kind === 'claim'
                          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {selection.kind}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {selection.entity.id}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSendToDock(selection)}
                    className="argument-micro-btn"
                    title="Send this object to Assistant Dock chat"
                  >
                    <MessageSquare size={13} />
                    <span className="hidden sm:inline">Ask AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(prev => !prev)}
                    className={`argument-micro-btn ${editing ? 'primary' : ''}`}
                    title={editing ? 'Exit edit mode' : 'Edit this record'}
                  >
                    <Pencil size={13} />
                    <span>{editing ? 'Done' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(null);
                      setEditing(false);
                    }}
                    className="argument-micro-btn"
                    title="Back to hierarchy tree"
                    aria-label="Back to tree"
                  >
                    <ChevronLeft size={13} />
                    <span className="hidden sm:inline">Tree</span>
                  </button>
                  {onBackToMap && (
                    <button
                      type="button"
                      onClick={onBackToMap}
                      className="argument-micro-btn"
                      title="Back to Argument Map canvas"
                      aria-label="Back to Map"
                    >
                      <GitBranch size={13} />
                      <span className="hidden sm:inline">Map</span>
                    </button>
                  )}
                </div>
              </header>

              <div className="argument-inspector-content">
                {/* Rejection / Weakness Banners */}
                {selection.kind === 'claim' && selection.entity.rejected && (
                  <div className="argument-status-banner rejected">
                    <Ban size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <div>
                      <strong className="font-mono uppercase text-[0.6875rem] tracking-wider block font-bold">
                        Claim Falsified / Rejected
                      </strong>
                      <p className="mt-0.5 text-xs">
                        {selection.entity.rejectionReason || 'No rejection reason recorded.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary Content View / Edit Form */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[0.6875rem] font-mono text-[var(--color-ink-muted)] border-b border-[var(--color-rule)] pb-2">
                    <span>Author: {selection.entity.author}</span>
                    <span>Created: {new Date(selection.entity.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Question Fields */}
                  {selection.kind === 'question' &&
                    (editing ? (
                      <>
                        <label className="argument-field-label">
                          <span>Question Title</span>
                          <textarea
                            value={selection.entity.title}
                            onChange={e =>
                              updateQuestion(selection.entity.id, { title: e.target.value })
                            }
                            autoFocus
                            rows={3}
                            className="argument-textarea font-serif text-[0.9375rem]"
                          />
                        </label>
                        <label className="argument-field-label">
                          <span>Tags (comma-separated)</span>
                          <input
                            value={selection.entity.tags.join(', ')}
                            onChange={e =>
                              updateQuestion(selection.entity.id, {
                                tags: e.target.value
                                  .split(',')
                                  .map(t => t.trim())
                                  .filter(Boolean)
                              })
                            }
                            className="argument-input"
                          />
                        </label>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <h2 className="font-serif text-lg font-bold text-[var(--color-ink)] leading-snug">
                          {selection.entity.title}
                        </h2>
                        {selection.entity.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {selection.entity.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                              >
                                <Tag size={10} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Claim Fields */}
                  {selection.kind === 'claim' &&
                    (editing ? (
                      <label className="argument-field-label">
                        <span>Claim Text</span>
                        <textarea
                          value={selection.entity.text}
                          onChange={e =>
                            updateClaim(selection.entity.id, { text: e.target.value })
                          }
                          autoFocus
                          rows={4}
                          className="argument-textarea font-sans text-sm"
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="font-sans text-sm text-[var(--color-ink)] leading-relaxed font-medium">
                          {selection.entity.text}
                        </p>
                      </div>
                    ))}

                  {/* Evidence Fields */}
                  {selection.kind === 'evidence' &&
                    (editing ? (
                      <>
                        <label className="argument-field-label">
                          <span>Evidence Title</span>
                          <textarea
                            value={selection.entity.title}
                            onChange={e =>
                              updateEvidence(selection.entity.id, { title: e.target.value })
                            }
                            autoFocus
                            rows={3}
                            className="argument-textarea font-sans text-sm"
                          />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="argument-field-label">
                            <span>Origin</span>
                            <div className="grid grid-cols-3 gap-1 pt-1">
                              {(['literature', 'experiment', 'own_reasoning'] as const).map(orig => {
                                const isSelected = selection.entity.origin === orig;
                                const label = orig === 'literature' ? 'Literature' : orig === 'experiment' ? 'Experiment' : 'Own Reason';
                                return (
                                  <button
                                    key={orig}
                                    type="button"
                                    onClick={() =>
                                      updateEvidence(selection.entity.id, {
                                        origin: orig
                                      })
                                    }
                                    className={`px-2 py-1.5 rounded-lg border text-[0.6875rem] font-mono text-center transition-all ${
                                      isSelected
                                        ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-bold text-[var(--color-ink)] shadow-xs'
                                        : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="argument-field-label">
                            <span>Form</span>
                            <div className="grid grid-cols-3 gap-1 pt-1">
                              {(['measurement', 'derivation', 'counterexample'] as const).map(f => {
                                const isSelected = selection.entity.form === f;
                                const label = f === 'measurement' ? 'Measurement' : f === 'derivation' ? 'Derivation' : 'Counterex';
                                return (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() =>
                                      updateEvidence(selection.entity.id, {
                                        form: f
                                      })
                                    }
                                    className={`px-2 py-1.5 rounded-lg border text-[0.6875rem] font-mono text-center transition-all ${
                                      isSelected
                                        ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-bold text-[var(--color-ink)] shadow-xs'
                                        : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <label className="argument-field-label">
                          <span>Citation</span>
                          <input
                            value={selection.entity.citation}
                            onChange={e =>
                              updateEvidence(selection.entity.id, { citation: e.target.value })
                            }
                            className="argument-input"
                          />
                        </label>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <h3 className="font-sans text-sm font-semibold text-[var(--color-ink)] leading-snug">
                          {selection.entity.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-[var(--color-ink-muted)]">
                          <span className="px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)]">
                            Origin: {selection.entity.origin}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)]">
                            Form: {selection.entity.form}
                          </span>
                        </div>
                        {selection.entity.citation && (
                          <div className="p-2.5 rounded-lg bg-[var(--color-paper)] border border-[var(--color-rule)] flex items-start gap-2">
                            <BookOpen size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-xs font-sans italic text-[var(--color-ink)]">
                              {selection.entity.citation}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </section>

                {/* Epistemic Controls for Claims: Weaken and Reject */}
                {selection.kind === 'claim' && (
                  <section className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-4">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block">
                      Falsifiability & Scope Boundaries
                    </span>

                    <div className="grid grid-cols-1 gap-3">
                      {/* Weaken Claim */}
                      <div className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-700 dark:text-amber-400">
                          <TriangleAlert size={13} />
                          Weaken Claim Scope
                        </div>
                        <input
                          value={weakenNote}
                          onChange={e => setWeakenNote(e.target.value)}
                          placeholder="Scope limit (e.g. valid only for context < 32k tokens)"
                          className="argument-input"
                        />
                        <button
                          type="button"
                          disabled={!weakenNote.trim()}
                          onClick={() => {
                            weakenClaim(selection.entity.id, weakenNote.trim());
                            setWeakenNote('');
                            setMessage('Claim weakened; incident links are now flagged weak.');
                          }}
                          className="argument-micro-btn self-start"
                        >
                          <TriangleAlert size={12} className="text-amber-600" />
                          Record Weakness
                        </button>
                      </div>

                      {/* Reject Claim */}
                      <div className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-700 dark:text-rose-400">
                          <Ban size={13} />
                          Reject / Falsify Claim
                        </div>
                        <input
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Falsification proof (e.g. refuted by run 4 attention loss)"
                          className="argument-input"
                        />
                        <button
                          type="button"
                          disabled={!rejectReason.trim() || selection.entity.rejected}
                          onClick={() => {
                            rejectClaim(selection.entity.id, rejectReason.trim());
                            setRejectReason('');
                            setMessage('Claim rejected; the record and rejection reason are preserved.');
                          }}
                          className="argument-micro-btn danger self-start"
                        >
                          <Ban size={12} />
                          Reject Claim (Preserve Record)
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* Connect Existing Child Section */}
                {selection.kind !== 'evidence' && (
                  <section className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-4">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold block">
                      Connect Existing {selection.kind === 'question' ? 'Claim' : 'Evidence'}
                    </span>

                    <div className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] flex flex-col gap-2.5">
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        {connectOptions.length === 0 ? (
                          <p className="text-xs text-[var(--color-ink-muted)] py-2">
                            No unlinked {selection.kind === 'question' ? 'claims' : 'evidence'} available to connect.
                          </p>
                        ) : (
                          connectOptions.map(option => {
                            const isSelected = linkTargetId === option.id;
                            const titleText = 'text' in option ? option.text : option.title;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setLinkTargetId(isSelected ? '' : option.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                                  isSelected
                                    ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-medium text-[var(--color-ink)] shadow-xs'
                                    : 'border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-mono text-[0.625rem] text-[var(--accent-indigo)] font-bold mr-1.5">[{option.id}]</span>
                                  <span className="font-sans text-[var(--color-ink)] truncate">{titleText}</span>
                                </div>
                                {isSelected && <Check size={13} className="text-[var(--accent-indigo)] shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>

                      <textarea
                        value={linkReason}
                        onChange={e => setLinkReason(e.target.value)}
                        rows={2}
                        placeholder="Link rationale: Why does this child answer or support the parent? (Required)"
                        className="argument-textarea"
                      />

                      <button
                        type="button"
                        disabled={!linkTargetId || !linkReason.trim()}
                        onClick={handleConnect}
                        className="argument-micro-btn primary self-start"
                      >
                        <Link2 size={12} />
                        Establish Connection
                      </button>
                    </div>
                  </section>
                )}

                {/* Connected Incident Links */}
                <section className="flex flex-col gap-3 border-t border-[var(--color-rule)] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                      Connected Relationships ({relatedLinks.length})
                    </span>
                  </div>

                  {relatedLinks.length === 0 ? (
                    <p className="text-xs text-[var(--color-ink-muted)] italic">
                      No connected relationships yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {relatedLinks.map(link => {
                        const isOutgoing = link.parentId === selection.entity.id;
                        const targetId = isOutgoing ? link.childId : link.parentId;
                        const targetTitle = entityLabel(targetId);
                        const isDraftDirty = reasonDrafts[link.id] !== undefined && reasonDrafts[link.id] !== link.userReason;

                        return (
                          <article
                            key={link.id}
                            className={`rounded-xl border border-[var(--color-rule)] border-l-[3px] bg-[var(--color-surface)] p-3.5 flex flex-col gap-2.5 shadow-2xs transition-all ${
                              link.status === 'holds'
                                ? 'border-l-emerald-500'
                                : link.status === 'weak'
                                  ? 'border-l-amber-500'
                                  : 'border-l-rose-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span
                                className={`font-mono text-[0.6875rem] uppercase px-2 py-0.5 rounded font-semibold inline-flex items-center gap-1.5 border ${statusPill(
                                  link.status
                                )}`}
                              >
                                {link.status === 'holds' ? (
                                  <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                                ) : link.status === 'weak' ? (
                                  <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
                                ) : (
                                  <AlertCircle size={11} className="text-rose-600 dark:text-rose-400" />
                                )}
                                {link.status}
                              </span>

                              <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
                                <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] shrink-0">
                                  {isOutgoing ? 'supports child:' : 'anchored by parent:'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedNodeId(targetId)}
                                  className="font-sans font-semibold text-xs text-[var(--color-ink)] hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline inline-flex items-center gap-1 truncate text-left group cursor-pointer"
                                  title={`Inspect ${targetTitle}`}
                                >
                                  <span className="truncate">{targetTitle}</span>
                                  <ArrowUpRight size={11} className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </button>
                              </div>
                            </div>

                            <label className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[0.6875rem] font-mono uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                                  Epistemic Rationale
                                </span>
                                {isDraftDirty && (
                                  <span className="inline-flex items-center gap-1 text-[0.6875rem] font-mono text-amber-600 dark:text-amber-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Unsaved edits
                                  </span>
                                )}
                              </div>
                              <textarea
                                value={reasonDrafts[link.id] ?? link.userReason}
                                onChange={e =>
                                  setReasonDrafts(curr => ({ ...curr, [link.id]: e.target.value }))
                                }
                                rows={3}
                                placeholder="Explain why this connection holds, is weak, or represents an empirical gap..."
                                className="argument-textarea font-mono text-xs leading-relaxed min-h-[68px] resize-y"
                              />
                            </label>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-rule)]/60">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveReason(link)}
                                  disabled={!isDraftDirty}
                                  className={`h-7 px-3 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all select-none ${
                                    isDraftDirty
                                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer active:scale-95'
                                      : 'bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] opacity-60 cursor-default'
                                  }`}
                                  title={isDraftDirty ? 'Save updated rationale' : 'Rationale is already saved'}
                                >
                                  {isDraftDirty ? (
                                    <>
                                      <Save size={12} />
                                      <span>Save Rationale</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check size={12} className="text-emerald-500" />
                                      <span>Saved</span>
                                    </>
                                  )}
                                </button>
                                <div className="inline-flex rounded-lg border border-[var(--color-rule)] p-0.5 bg-[var(--color-surface)] shrink-0">
                                  {(['holds', 'weak', 'missing'] as const).map(st => {
                                    const isSelected = link.status === st;
                                    const dotColor =
                                      st === 'holds'
                                        ? 'bg-emerald-500'
                                        : st === 'weak'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500';
                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => setLinkStatus(link.id, st)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[0.6875rem] font-mono transition-all ${
                                          isSelected
                                            ? 'bg-white dark:bg-slate-800 text-[var(--color-ink)] font-bold shadow-2xs'
                                            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                                        }`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                        <span>{st}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  deleteLink(link.id);
                                  setMessage(`Link ${link.id} deleted.`);
                                }}
                                className="h-7 w-7 rounded-md border border-[var(--color-rule)] bg-[var(--color-surface)] hover:bg-rose-50 dark:hover:bg-rose-950/60 text-[var(--color-ink-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                title="Delete this connection"
                                aria-label="Delete this connection"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            /* Mode 3: Epistemic Overview & Graph Health (when nothing selected) */
            <div className="flex flex-col h-full overflow-y-auto p-6 gap-6">
              <div>
                <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                  Epistemic Graph Overview
                </span>
                <h2 className="text-base font-bold text-[var(--color-ink)] mt-1">
                  Argument Structure & Validity
                </h2>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1 leading-relaxed">
                  Thinking OS structures knowledge into a strict, falsifiable chain: Questions lead to Claims, and Claims are backed by Evidence.
                </p>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <HelpCircle size={15} />
                    <span className="font-mono text-[0.6875rem] uppercase font-bold tracking-wider">
                      Questions
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-ink)] mt-1">
                    {questions.length}
                  </div>
                  <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Root inquiries
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                    <GitBranch size={15} />
                    <span className="font-mono text-[0.6875rem] uppercase font-bold tracking-wider">
                      Claims
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-ink)] mt-1">
                    {claims.length}
                  </div>
                  <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Propositions
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <FileCheck2 size={15} />
                    <span className="font-mono text-[0.6875rem] uppercase font-bold tracking-wider">
                      Evidence
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-ink)] mt-1">
                    {evidence.length}
                  </div>
                  <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Empirical grounding
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[var(--color-ink-muted)]">
                    <Link2 size={15} />
                    <span className="font-mono text-[0.6875rem] uppercase font-bold tracking-wider">
                      Links
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-ink)] mt-1">
                    {links.length}
                  </div>
                  <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                    Active relationships
                  </span>
                </div>
              </div>

              {/* Link Health Stacked Bar */}
              <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xs flex flex-col gap-3">
                <span className="font-mono text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                  Link Health Audit
                </span>

                {linkStats.total > 0 ? (
                  <>
                    <div className="w-full h-3 rounded-full bg-[var(--color-paper)] overflow-hidden flex">
                      <div
                        style={{ width: `${(linkStats.holds / linkStats.total) * 100}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Holds: ${linkStats.holds}`}
                      />
                      <div
                        style={{ width: `${(linkStats.weak / linkStats.total) * 100}%` }}
                        className="bg-amber-500 h-full transition-all"
                        title={`Weak: ${linkStats.weak}`}
                      />
                      <div
                        style={{ width: `${(linkStats.missing / linkStats.total) * 100}%` }}
                        className="bg-rose-500 h-full transition-all"
                        title={`Missing: ${linkStats.missing}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-[var(--color-ink-muted)] pt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Holds ({linkStats.holds})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Weak ({linkStats.weak})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Missing ({linkStats.missing})
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[var(--color-ink-muted)]">No links created yet.</p>
                )}
              </div>

              {/* Argument Gaps Section */}
              {argumentGaps.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-300/80 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/20 shadow-2xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                      Open Argument Gaps ({argumentGaps.length})
                    </span>
                    <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                      Requires resolution
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                    These items currently lack answering claims or grounding evidence in your argument tree.
                  </p>

                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {argumentGaps.map(gap => (
                      <div
                        key={gap.id}
                        className="p-2.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs hover:border-amber-400 transition-colors"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-[var(--color-ink)] truncate" title={gap.title}>
                            {gap.title}
                          </span>
                          <span className="text-[0.6875rem] font-mono text-amber-700 dark:text-amber-400">
                            {gap.gapDescription}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {gap.actionKind === 'claim' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNodeId(gap.targetId);
                                setNewKind('claim');
                                setNewParentId(gap.targetId);
                                onCreatingChange(true);
                              }}
                              className="argument-micro-btn primary"
                            >
                              <Plus size={11} /> + Add Claim
                            </button>
                          )}
                          {gap.actionKind === 'evidence' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNodeId(gap.targetId);
                                setNewKind('evidence');
                                setNewParentId(gap.targetId);
                                onCreatingChange(true);
                              }}
                              className="argument-micro-btn primary"
                            >
                              <Plus size={11} /> + Add Evidence
                            </button>
                          )}
                          {gap.actionKind === 'inspect' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNodeId(gap.targetId);
                              }}
                              className="argument-micro-btn"
                            >
                              Inspect
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Falsifiability & Negative Results */}
              <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] shadow-2xs flex flex-col gap-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <ShieldAlert size={14} />
                  Falsifiability Invariants
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                  Per research invariants, rejected claims are never erased. They remain in the vault with explicit rejection reasoning to preserve negative results.
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                    Preserved rejected claims: {linkStats.rejectedClaims}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold">
                  Quick Actions
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewKind('question');
                      onCreatingChange(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={12} />
                    New Question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewKind('claim');
                      onCreatingChange(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-100 transition-colors"
                  >
                    <Plus size={12} />
                    New Claim
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewKind('evidence');
                      onCreatingChange(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-100 transition-colors"
                  >
                    <Plus size={12} />
                    New Evidence
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--color-rule)] text-center text-xs text-[var(--color-ink-muted)]">
                Click any node in the hierarchy tree to inspect details, manage links, or edit.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
