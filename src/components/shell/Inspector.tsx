import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  FlaskConical,
  Scissors,
  Ban,
  GripVertical
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Link, CheckItemStatus, DerivationValidity } from '../../types';

export const Inspector: React.FC = () => {
  const {
    selectedLinkId,
    setSelectedLinkId,
    links,
    questions,
    claims,
    evidence,
    updateLinkUserReason,
    weakenClaim,
    rejectClaim,
    addExperiment,
    checkLinkWithAssistant,
    setActiveContext,
    addAttachedContext,
    setIsDockOpen
  } = useWorkspace();

  const [isEditingReason, setIsEditingReason] = useState(false);
  const [editedReason, setEditedReason] = useState('');
  const [showWeakenModal, setShowWeakenModal] = useState(false);
  const [weakenNote, setWeakenNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showAddExpModal, setShowAddExpModal] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpTarget, setNewExpTarget] = useState('');
  const [newExpBaseline, setNewExpBaseline] = useState('');
  const [newExpPrediction, setNewExpPrediction] = useState('');
  const [newExpFailure, setNewExpFailure] = useState('');
  const [newExpScope, setNewExpScope] = useState('');

  if (!selectedLinkId) return null;

  const currentLink = links.find(l => l.id === selectedLinkId);
  if (!currentLink) return null;

  // Resolve parent and child entities
  const parentQuestion = questions.find(q => q.id === currentLink.parentId);
  const parentClaim = claims.find(c => c.id === currentLink.parentId);
  const childClaim = claims.find(c => c.id === currentLink.childId);
  const childEvidence = evidence.find(e => e.id === currentLink.childId);

  const parentTitle = parentQuestion?.title || parentClaim?.text || currentLink.parentId;
  const childTitle = childClaim?.text || childEvidence?.title || currentLink.childId;
  const parentType = parentQuestion ? 'QUESTION' : 'CLAIM';
  const childType = childClaim ? 'CLAIM' : 'EVIDENCE';

  // Validity if child is derivation or experiment
  const derivationValidity = childEvidence?.validity;
  const derivationReason = childEvidence?.validityReason;

  const handleSaveReason = () => {
    if (editedReason.trim()) {
      updateLinkUserReason(currentLink.id, editedReason.trim());
      setIsEditingReason(false);
    }
  };

  const handleSendToDock = () => {
    const linkObj = {
      type: 'link' as const,
      id: currentLink.id,
      label: `[LINK] ${parentType} → ${childType}`,
      secondaryLabel: currentLink.userReason ? `Reason: "${currentLink.userReason.slice(0, 40)}..."` : 'No user reason',
      metadata: { linkId: currentLink.id }
    };
    setActiveContext(linkObj);
    addAttachedContext(linkObj);
    setIsDockOpen(true);
  };

  const handleConfirmWeaken = () => {
    if (childClaim) {
      weakenClaim(childClaim.id, weakenNote || 'Scope narrowed under observational constraint');
      setShowWeakenModal(false);
      setWeakenNote('');
    }
  };

  const handleConfirmReject = () => {
    if (childClaim) {
      rejectClaim(childClaim.id, rejectReason || 'Rejected due to irreconcilable type mismatch');
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const handleConfirmAddExp = () => {
    if (childClaim && newExpTitle) {
      addExperiment(childClaim.id, {
        claimId: childClaim.id,
        questionId: currentLink.kind === 'question-claim' ? currentLink.parentId : 'q1',
        title: newExpTitle,
        status: 'planned',
        targetMetric: newExpTarget || 'Direct intervention metric',
        baseline: newExpBaseline || 'Current empirical baseline',
        prediction: newExpPrediction || 'Anticipated effect under formal test',
        failureCondition: newExpFailure || 'Deviation threshold > 10%',
        scope: newExpScope || 'Bounded domain setup'
      });
      setShowAddExpModal(false);
      setNewExpTitle('');
      setNewExpTarget('');
      setNewExpBaseline('');
      setNewExpPrediction('');
      setNewExpFailure('');
      setNewExpScope('');
    }
  };

  const getStatusColor = (status: CheckItemStatus) => {
    switch (status) {
      case 'pass':
        return 'text-[var(--color-holds)]';
      case 'partial':
        return 'text-[var(--color-weak)]';
      case 'mismatch':
        return 'text-[var(--color-missing)]';
      default:
        return 'text-[var(--color-ink-muted)]';
    }
  };

  const getStatusBadge = (status: CheckItemStatus) => {
    switch (status) {
      case 'pass':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 text-[10px] font-mono uppercase font-semibold">
            Pass
          </span>
        );
      case 'partial':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 text-[10px] font-mono uppercase font-semibold">
            Partial
          </span>
        );
      case 'mismatch':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 text-[10px] font-mono uppercase font-semibold">
            Mismatch
          </span>
        );
    }
  };

  return (
    <section
      id="selected-link-inspector"
      aria-label="Selected Link Inspector"
      className="border-t border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-col z-20 shrink-0 max-h-[50vh] min-h-[250px] overflow-y-auto shadow-lg"
    >
      {/* Inspector Header */}
      <div className="px-6 py-3 border-b border-[var(--color-rule)] flex items-center justify-between bg-[var(--color-paper)]/70 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Relationship Inspector
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                currentLink.status === 'holds'
                  ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950'
                  : currentLink.status === 'weak'
                  ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950'
                  : 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950'
              }`}
            />
            <span className="font-mono text-[11px] uppercase font-bold text-slate-800 dark:text-slate-200">
              Link Status: {currentLink.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Grip to Assistant (Click or Drag into Chat) */}
          <button
            id="inspector-send-to-dock-btn"
            draggable={true}
            onDragStart={e => {
              const linkObj = {
                type: 'link' as const,
                id: currentLink.id,
                label: `[LINK] ${parentType} → ${childType}`,
                secondaryLabel: currentLink.userReason ? `Reason: "${currentLink.userReason.slice(0, 40)}..."` : 'No user reason',
                metadata: { linkId: currentLink.id }
              };
              e.dataTransfer.setData('application/json', JSON.stringify(linkObj));
              e.dataTransfer.setData('text/plain', `[LINK] ${parentType} → ${childType}`);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={handleSendToDock}
            title="Drag to Assistant Dock or click to attach"
            className="px-3 py-1 flex items-center gap-1.5 text-[11px] font-mono border border-slate-200 dark:border-slate-800 rounded-full hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-400 transition-all shadow-2xs cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3" />
            <span>+ Attach to Assistant</span>
          </button>

          <button
            id="inspector-close-btn"
            onClick={() => setSelectedLinkId(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Inspector (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Inspector Body in Strict Order */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
        {/* Left 7 cols: Parent/Child, User Reason, Validity */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* 1. Parent and Child */}
          <div className="flex flex-col gap-2.5 p-4 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-lg shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="text-[10px] font-mono tracking-wider text-[var(--color-ink-muted)] uppercase font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--color-rule)]">
                  Parent ({parentType})
                </span>
                <p className="font-serif text-[15px] font-medium text-[var(--color-ink)] leading-snug mt-1.5">
                  {parentTitle}
                </p>
              </div>
            </div>

            <div className="h-[1px] bg-[var(--color-rule)] my-1 flex items-center justify-center">
              <span className="bg-[var(--color-surface)] px-3 font-mono text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest font-semibold">
                supports ↓
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="text-[10px] font-mono tracking-wider text-[var(--color-ink-muted)] uppercase font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--color-rule)]">
                  Child ({childType})
                </span>
                <p className="font-serif text-[15px] font-medium text-[var(--color-ink)] leading-snug mt-1.5">
                  {childTitle}
                </p>
              </div>
            </div>
          </div>

          {/* 2. User Reason (In serif, visually dominant, NEVER written by model) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-ink)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                2. User Reason (Committed)
              </span>
              {!isEditingReason ? (
                <button
                  id="edit-user-reason-btn"
                  onClick={() => {
                    setEditedReason(currentLink.userReason);
                    setIsEditingReason(true);
                  }}
                  className="text-[11px] text-[var(--color-ink)] hover:underline font-mono font-medium"
                >
                  Edit reason
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveReason}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingReason(false)}
                    className="text-[11px] text-[var(--color-ink-muted)] font-mono hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditingReason ? (
              <textarea
                value={editedReason}
                onChange={e => setEditedReason(e.target.value)}
                rows={3}
                className="w-full p-3 font-serif text-[15px] bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-lg text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="Why does the child support the parent? (Required)"
              />
            ) : currentLink.userReason ? (
              <blockquote className="p-4 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg">
                <p className="font-serif text-[16px] text-[var(--color-ink)] leading-relaxed italic">
                  "{currentLink.userReason}"
                </p>
                <span className="block mt-2 font-mono text-[10px] text-[var(--color-ink-muted)] font-medium">
                  Authored by: user • Required before link check
                </span>
              </blockquote>
            ) : (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-dashed border-rose-300 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 font-medium">
                This link has no reason, so it cannot be checked.
              </div>
            )}
          </div>

          {/* 3. Derivation / Run Validity (When applicable) */}
          {derivationValidity && (
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-1.5 text-xs shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-semibold text-slate-500">
                  3. Derivation Validity (Independent of link)
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                    derivationValidity === 'valid'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                      : derivationValidity === 'invalid'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                  }`}
                >
                  {derivationValidity}
                </span>
              </div>
              {derivationReason && (
                <p className="text-[12px] text-slate-700 dark:text-slate-300 font-sans mt-0.5">
                  {derivationReason}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right 5 cols: Model Finding, Table, Actions */}
        <div className="lg:col-span-5 flex flex-col gap-5 border-t lg:border-t-0 lg:border-l lg:pl-6 border-[var(--color-rule)]">
          {/* 4. Model Finding in Mono with Model ID */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              4. Model Finding
            </span>

            {currentLink.check ? (
              <div className="model-hatched p-3.5 bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50">
                    {currentLink.check.modelId}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      currentLink.check.tagColor === 'emerald'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : currentLink.check.tagColor === 'amber'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    [{currentLink.check.tag}]
                  </span>
                </div>
                <p className="font-mono text-[12px] text-slate-800 dark:text-slate-200 leading-relaxed">
                  {currentLink.check.note}
                </p>
              </div>
            ) : currentLink.userReason ? (
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
                <span className="font-mono text-xs text-slate-500">
                  Link not evaluated yet.
                </span>
                <button
                  id="evaluate-link-btn"
                  onClick={() => checkLinkWithAssistant(currentLink.id)}
                  className="px-3 py-1.5 text-xs font-mono bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full transition-colors font-medium shadow-2xs"
                >
                  Run reasoning check
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-500">
                Cannot run check: committed user reason is missing.
              </div>
            )}
          </div>

          {/* 5. Type / Scope / Target Verdicts */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              5. Three-Axis Verdicts
            </span>

            {currentLink.check?.items ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Dimension</th>
                      <th className="px-3 py-2 font-semibold">Verdict</th>
                      <th className="px-3 py-2 font-semibold">Structural Finding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentLink.check.items.map(item => (
                      <tr key={item.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-3 py-2.5 font-mono font-semibold text-[11px]">
                          {item.label}
                        </td>
                        <td className="px-3 py-2.5">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                          {item.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 font-mono">
                Awaiting check results.
              </div>
            )}
          </div>

          {/* 6. Actions: Weaken claim, Add experiment, Reject */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-rule)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              6. Structural Actions
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="action-weaken-claim-btn"
                onClick={() => setShowWeakenModal(true)}
                className="px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-900 dark:text-amber-300 text-xs font-sans flex items-center gap-1.5 transition-all shadow-2xs font-medium"
                title="Weaken claim to match observational scope"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-600" />
                <span>Weaken claim</span>
              </button>

              <button
                id="action-add-experiment-btn"
                onClick={() => setShowAddExpModal(true)}
                className="px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-300 text-xs font-sans flex items-center gap-1.5 transition-all shadow-2xs font-medium"
                title="Add planned experiment to test this link"
              >
                <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add experiment</span>
              </button>

              <button
                id="action-reject-claim-btn"
                onClick={() => setShowRejectModal(true)}
                className="px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-800 dark:text-rose-300 text-xs font-sans flex items-center gap-1.5 transition-all shadow-2xs font-medium"
                title="Reject claim (soft flag, preserves history)"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Weaken Claim */}
      {showWeakenModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 rounded-2xl flex flex-col gap-3.5 shadow-2xl">
            <h3 className="font-mono text-sm uppercase font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-600" />
              Weaken Claim Scope
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              State the qualified boundary or observational condition under which this assertion holds:
            </p>
            <input
              type="text"
              value={weakenNote}
              onChange={e => setWeakenNote(e.target.value)}
              placeholder="e.g. Scope constrained to high-dimensional associative tasks"
              className="p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowWeakenModal(false)}
                className="px-3.5 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWeaken}
                className="px-4 py-1.5 text-xs font-mono bg-amber-600 hover:bg-amber-700 text-white rounded-full font-medium transition-colors shadow-xs"
              >
                Confirm Weaken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Claim */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 rounded-2xl flex flex-col gap-3.5 shadow-2xl">
            <h3 className="font-mono text-sm uppercase font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Reject Claim
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Rejecting preserves full version history (D-014 / §5 Rule 4). State why this claim is rejected:
            </p>
            <textarea
              rows={2}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Disproven by causal manipulation experiments"
              className="p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-mono bg-rose-600 hover:bg-rose-700 text-white rounded-full font-medium transition-colors shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Experiment (Gate 7 Pre-run Contract) */}
      {showAddExpModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 rounded-2xl flex flex-col gap-3.5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-mono text-sm uppercase font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                Pre-Run Contract (Gate 7)
              </h3>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 font-semibold">
                MANDATORY BEFORE RUN
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Before an experiment can create confirmatory evidence, define the target, prediction, and falsification criteria:
            </p>

            <div className="flex flex-col gap-2.5 text-xs">
              <label className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">Experiment Title:</label>
              <input
                type="text"
                value={newExpTitle}
                onChange={e => setNewExpTitle(e.target.value)}
                placeholder="e.g. Causal isolation of vector overlap in Hopfield networks"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />

              <label className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">Target Metric:</label>
              <input
                type="text"
                value={newExpTarget}
                onChange={e => setNewExpTarget(e.target.value)}
                placeholder="e.g. Catastrophic interference rate under fixed overlap"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />

              <label className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">Baseline / Comparison:</label>
              <input
                type="text"
                value={newExpBaseline}
                onChange={e => setNewExpBaseline(e.target.value)}
                placeholder="e.g. Dense unconstrained representation baseline"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />

              <label className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">Prediction / Expected Threshold:</label>
              <input
                type="text"
                value={newExpPrediction}
                onChange={e => setNewExpPrediction(e.target.value)}
                placeholder="e.g. Sparsity penalty reduces overlap by >= 40%"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />

              <label className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">Condition that weakens claim:</label>
              <input
                type="text"
                value={newExpFailure}
                onChange={e => setNewExpFailure(e.target.value)}
                placeholder="e.g. Recall error does not decrease when overlap is held fixed"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowAddExpModal(false)}
                className="px-3.5 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddExp}
                disabled={!newExpTitle}
                className="px-4 py-1.5 text-xs font-mono bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors disabled:opacity-40 shadow-xs"
              >
                Create Planned Experiment
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
