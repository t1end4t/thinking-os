import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  Pencil,
  Play,
  Square,
  X,
  Bot,
  Check,
  ChevronDown,
} from 'lucide-react';
import type { ScoutBrief, ScoutBriefInput, ScoutReport, ScoutRun, ScoutRunState } from '../../scoutTypes';

export type AgentKind = 'scout' | 'research' | 'writer' | 'data-analysis' | 'synthesis';

const ACTIVE_STAGES: Readonly<Partial<Record<ScoutRunState, string>>> = {
  queued: 'Preparing queries',
  retrieving: 'Searching sources',
  normalizing: 'Deduplicating candidates',
  screening: 'Screening titles and abstracts',
  assembling: 'Building the shortlist',
  cancelling: 'Cancelling the run'
};

export type Draft = {
  readonly question: string;
  readonly purpose: string;
  readonly scope: string;
  readonly exclusions: string;
  readonly constraints: string;
  readonly directions: string;
  readonly criteria: string;
  readonly maxRecommendations: number;
};

export function draftOf(brief: ScoutBrief): Draft {
  return {
    question: brief.question,
    purpose: brief.purpose,
    scope: brief.scope.join('\n'),
    exclusions: brief.exclusions.join('\n'),
    constraints: brief.constraints.join('\n'),
    directions: brief.searchDirections.map(direction => `${direction.query} :: ${direction.reason}`).join('\n'),
    criteria: brief.screeningCriteria.join('\n'),
    maxRecommendations: brief.maxRecommendations
  };
}

function lines(value: string): string[] {
  return value.split('\n').map(line => line.trim()).filter(Boolean);
}

export function inputOf(brief: ScoutBrief, draft: Draft): ScoutBriefInput | null {
  const searchDirections = lines(draft.directions).map(line => {
    const separator = line.indexOf('::');
    return separator < 0 ? null : { query: line.slice(0, separator).trim(), reason: line.slice(separator + 2).trim() };
  });
  if (!draft.question.trim() || !draft.purpose.trim() || !searchDirections.length || searchDirections.some(direction => !direction?.query || !direction.reason)) return null;
  return {
    question: draft.question.trim(),
    purpose: draft.purpose.trim(),
    scope: lines(draft.scope),
    exclusions: lines(draft.exclusions),
    constraints: lines(draft.constraints),
    searchDirections: searchDirections.filter((direction): direction is NonNullable<typeof direction> => Boolean(direction)),
    screeningCriteria: lines(draft.criteria),
    maxRecommendations: draft.maxRecommendations,
    createdFrom: brief.createdFrom,
    author: 'user'
  };
}

export interface AgentRunCardProps {
  readonly brief: ScoutBrief;
  readonly run?: ScoutRun;
  readonly report?: ScoutReport;
  readonly busy: boolean;
  readonly agentKind?: AgentKind;
  readonly agentTitle?: string;
  readonly onSave: (input: ScoutBriefInput) => Promise<boolean>;
  readonly onRun: () => Promise<boolean>;
  readonly onCancel: () => Promise<boolean>;
  readonly onOpenReport: () => void;
}

export interface AgentRunCardFrameProps {
  readonly agentKind: AgentKind;
  readonly agentTitle: string;
  readonly status: string;
  readonly active?: boolean;
  readonly editable?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly onEdit?: () => void;
  readonly children: React.ReactNode;
}

export function AgentRunCardFrame({
  agentKind,
  agentTitle,
  status,
  active = false,
  editable = false,
  className = '',
  ariaLabel,
  onEdit,
  children
}: AgentRunCardFrameProps) {
  return (
    <article
      className={`agent-run-card ${className}`.trim()}
      aria-label={ariaLabel ?? `${agentTitle} run card`}
      data-agent-kind={agentKind}
    >
      <header className="agent-run-header">
        <div className="agent-identity">
          <span className="agent-avatar">
            <Bot size={13} className="text-[var(--accent-indigo)]" />
          </span>
          <div className="agent-meta">
            <span className="agent-title">{agentTitle}</span>
            <span className="agent-type-badge">Agent Run Card</span>
          </div>
        </div>

        <div className="agent-status-cluster">
          <span className={`agent-status-badge ${active ? 'running' : status}`}>
            {active && <span className="agent-status-dot animate-pulse" />}
            {status}
          </span>
          {editable && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="agent-quick-edit-btn"
              title="Edit parameters directly on this card"
              aria-label="Quick edit parameters"
            >
              <Pencil size={11} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </header>

      {children}
    </article>
  );
}

export function AgentRunCard({
  brief,
  run,
  report,
  busy,
  agentKind = 'scout',
  agentTitle = 'Literature Scout Agent',
  onSave,
  onRun,
  onCancel,
  onOpenReport
}: AgentRunCardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(() => draftOf(brief));
  const [validation, setValidation] = useState('');
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const stage = run ? ACTIVE_STAGES[run.state] : undefined;
  const active = Boolean(stage);
  const status = report ? 'completed' : run?.state ?? 'draft';

  useEffect(() => {
    setDraft(draftOf(brief));
  }, [brief]);

  const closeDialog = () => {
    dialog.current?.close();
    requestAnimationFrame(() => reviewButton.current?.focus());
  };

  const saveFromDialog = async () => {
    const input = inputOf(brief, draft);
    if (!input) {
      setValidation('Question, purpose, and every “query :: reason” line are required.');
      return;
    }
    setValidation('');
    if (await onSave(input)) closeDialog();
  };

  const saveInline = async () => {
    const input = inputOf(brief, draft);
    if (!input) {
      setValidation('Question, purpose, and every “query :: reason” line are required.');
      return;
    }
    setValidation('');
    const success = await onSave(input);
    if (success) {
      setIsInlineEditing(false);
    }
  };

  const cancelInlineEdit = () => {
    setDraft(draftOf(brief));
    setValidation('');
    setIsInlineEditing(false);
  };

  return (
    <AgentRunCardFrame
      agentKind={agentKind}
      agentTitle={agentTitle}
      status={status}
      active={active}
      editable={!active && !isInlineEditing}
      className="assistant-scout-card"
      ariaLabel="Scout brief"
      onEdit={() => setIsInlineEditing(true)}
    >
      {/* Main Content: Display or Inline Editor */}
      {isInlineEditing ? (
        <div className="agent-inline-editor">
          <div className="agent-editor-row">
            <label className="agent-editor-label">
              <span>Research Question / Goal</span>
              <textarea
                rows={2}
                value={draft.question}
                onChange={e => setDraft(curr => ({ ...curr, question: e.target.value }))}
                className="agent-editor-input"
                placeholder="What specific question should this agent answer?"
                autoFocus
              />
            </label>
          </div>

          <div className="agent-editor-row">
            <label className="agent-editor-label">
              <span>Target Purpose</span>
              <textarea
                rows={2}
                value={draft.purpose}
                onChange={e => setDraft(curr => ({ ...curr, purpose: e.target.value }))}
                className="agent-editor-input"
                placeholder="Why is this research important? What will it unlock?"
              />
            </label>
          </div>

          <div className="agent-editor-row">
            <label className="agent-editor-label">
              <span>Search Directions (one per line: query :: reason)</span>
              <textarea
                rows={3}
                value={draft.directions}
                onChange={e => setDraft(curr => ({ ...curr, directions: e.target.value }))}
                className="agent-editor-input font-mono text-[0.75rem]"
                placeholder="TinyML on-device training :: Direct phrasing"
              />
            </label>
          </div>

          {showAdvanced ? (
            <div className="agent-editor-advanced">
              <label className="agent-editor-label">
                <span>Included Scope (one per line)</span>
                <textarea
                  rows={2}
                  value={draft.scope}
                  onChange={e => setDraft(curr => ({ ...curr, scope: e.target.value }))}
                  className="agent-editor-input"
                  placeholder="Microcontrollers, Edge TPU"
                />
              </label>

              <label className="agent-editor-label">
                <span>Exclusions (one per line)</span>
                <textarea
                  rows={2}
                  value={draft.exclusions}
                  onChange={e => setDraft(curr => ({ ...curr, exclusions: e.target.value }))}
                  className="agent-editor-input"
                  placeholder="Inference only, Simulation only"
                />
              </label>

              <label className="agent-editor-label">
                <span>Screening Criteria (one per line)</span>
                <textarea
                  rows={2}
                  value={draft.criteria}
                  onChange={e => setDraft(curr => ({ ...curr, criteria: e.target.value }))}
                  className="agent-editor-input"
                  placeholder="Must contain empirical evaluations"
                />
              </label>

              <label className="agent-editor-label">
                <span>Max Recommendations (1 - 5)</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={draft.maxRecommendations}
                  onChange={e => setDraft(curr => ({ ...curr, maxRecommendations: Number(e.target.value) }))}
                  className="agent-editor-input w-24"
                />
              </label>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="agent-toggle-advanced-btn"
            >
              <ChevronDown size={12} />
              <span>Show Scope, Exclusions & Criteria</span>
            </button>
          )}

          {validation && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {validation}
            </p>
          )}

          <div className="agent-inline-editor-actions">
            <button
              type="button"
              onClick={cancelInlineEdit}
              className="agent-btn-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={saveInline}
              className="agent-btn-save"
            >
              <Check size={12} />
              <span>Save parameters</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="agent-run-body">
          <h3 className="agent-run-goal">{brief.question}</h3>
          <p className="agent-run-purpose">{brief.purpose}</p>

          <dl className="agent-run-specs">
            <div>
              <dt>Scope</dt>
              <dd>{brief.scope.join(' · ') || 'No narrow scope recorded'}</dd>
            </div>
            <div>
              <dt>Exclusions</dt>
              <dd>{brief.exclusions.join(' · ') || 'None recorded'}</dd>
            </div>
            <div>
              <dt>Search directions</dt>
              <dd>{brief.searchDirections.length} queries</dd>
            </div>
            <div>
              <dt>Screening</dt>
              <dd>{brief.screeningCriteria.join(' · ') || 'Title and abstract relevance'}</dd>
            </div>
            <div>
              <dt>Target limit</dt>
              <dd>{brief.maxRecommendations} recommended papers</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Progress Telemetry: Active run indicator */}
      {run && stage && (
        <div className="agent-run-progress assistant-scout-progress" role="status">
          <div className="flex items-center gap-2">
            <Loader2 size={13} className="animate-spin text-[var(--accent-indigo)] shrink-0" />
            <span className="font-semibold text-xs text-[var(--color-ink)]">{stage}</span>
          </div>
          <small className="text-[0.6875rem] text-[var(--color-ink-muted)]">
            {run.counters.screened
              ? `${run.counters.screened} screened of ${run.counters.retrieved} retrieved`
              : 'Detached autonomous run; assistant remains available for chat'}
          </small>
        </div>
      )}

      {/* Result Deliverable: Completed Report Preview */}
      {report && (
        <section className="agent-run-result assistant-scout-result" aria-label="Scout result summary">
          <div className="flex items-center justify-between">
            <strong className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              <span>{report.recommendations.length} recommended · {report.uncertain.length} uncertain</span>
            </strong>
            <span className="text-[0.625rem] font-mono text-[var(--color-ink-muted)]">
              {report.sources.join(', ')}
            </span>
          </div>

          <div className="agent-result-papers">
            {report.recommendations.slice(0, 3).map(candidate => (
              <div key={candidate.id} className="agent-result-item">
                <span className="agent-result-bullet">•</span>
                <span className="agent-result-title">{candidate.title}</span>
                {candidate.year && (
                  <span className="agent-result-year">({candidate.year})</span>
                )}
              </div>
            ))}
            {report.recommendations.length > 3 && (
              <p className="text-[0.6875rem] text-[var(--color-ink-muted)] italic pl-3">
                +{report.recommendations.length - 3} more recommended papers in full report
              </p>
            )}
          </div>

          {report.limitations[0] && (
            <small className="text-[0.6875rem] text-[var(--color-ink-muted)] border-t border-[var(--color-rule)] pt-1.5 mt-0.5">
              Note: {report.limitations[0]}
            </small>
          )}
        </section>
      )}

      {/* Action Controls */}
      <div className="agent-run-actions assistant-scout-actions">
        {/* Review Brief button: opens dialog for deep review or backward compatibility */}
        <button
          ref={reviewButton}
          type="button"
          onClick={() => dialog.current?.showModal()}
          disabled={busy || active}
          title="Review all brief fields in dialog"
        >
          <Pencil size={12} />
          <span>Review brief</span>
        </button>

        {/* Run Agent / Scout Button */}
        {!active && !report && (
          <button
            type="button"
            className="primary"
            onClick={() => void onRun()}
            disabled={busy || isInlineEditing}
          >
            <Play size={12} />
            <span>Run scout</span>
          </button>
        )}

        {/* Cancel Button */}
        {run && active && (
          <button
            type="button"
            onClick={() => void onCancel()}
            disabled={busy || run.state === 'cancelling'}
            className="text-rose-600 dark:text-rose-400 hover:border-rose-400"
          >
            <Square size={11} />
            <span>Cancel</span>
          </button>
        )}

        {/* Open Report Button */}
        {report && (
          <button
            type="button"
            className="primary"
            onClick={onOpenReport}
          >
            <BookOpen size={12} />
            <span>Open full report</span>
          </button>
        )}
      </div>

      {/* Modal Dialog for Deep Review (full backward-compatible with tests) */}
      <dialog
        ref={dialog}
        className="assistant-scout-dialog"
        aria-labelledby={`scout-review-${brief.id}`}
        onCancel={closeDialog}
      >
        <form
          method="dialog"
          onSubmit={event => {
            event.preventDefault();
            void saveFromDialog();
          }}
        >
          <header>
            <h2 id={`scout-review-${brief.id}`}>Review scout brief</h2>
            <button type="button" onClick={closeDialog} aria-label="Close scout brief review">
              <X size={15} />
            </button>
          </header>

          <label>
            Research question
            <textarea
              rows={3}
              value={draft.question}
              onChange={event => setDraft(current => ({ ...current, question: event.target.value }))}
            />
          </label>

          <label>
            Purpose
            <textarea
              rows={2}
              value={draft.purpose}
              onChange={event => setDraft(current => ({ ...current, purpose: event.target.value }))}
            />
          </label>

          <label>
            Included scope
            <textarea
              rows={2}
              value={draft.scope}
              onChange={event => setDraft(current => ({ ...current, scope: event.target.value }))}
              placeholder="One item per line"
            />
          </label>

          <label>
            Exclusions
            <textarea
              rows={2}
              value={draft.exclusions}
              onChange={event => setDraft(current => ({ ...current, exclusions: event.target.value }))}
              placeholder="One item per line"
            />
          </label>

          <label>
            Constraints
            <textarea
              rows={2}
              value={draft.constraints}
              onChange={event => setDraft(current => ({ ...current, constraints: event.target.value }))}
              placeholder="One item per line"
            />
          </label>

          <label>
            Search directions
            <textarea
              rows={4}
              value={draft.directions}
              onChange={event => setDraft(current => ({ ...current, directions: event.target.value }))}
              placeholder="query :: reason"
            />
          </label>

          <label>
            Screening criteria
            <textarea
              rows={3}
              value={draft.criteria}
              onChange={event => setDraft(current => ({ ...current, criteria: event.target.value }))}
              placeholder="One criterion per line"
            />
          </label>

          <label>
            Maximum recommendations
            <input
              type="number"
              min={1}
              max={5}
              value={draft.maxRecommendations}
              onChange={event => setDraft(current => ({ ...current, maxRecommendations: Number(event.target.value) }))}
            />
          </label>

          {validation && <p role="alert">{validation}</p>}

          <footer>
            <button type="button" onClick={closeDialog}>Cancel</button>
            <button type="submit" className="primary" disabled={busy}>Save brief</button>
          </footer>
        </form>
      </dialog>
    </AgentRunCardFrame>
  );
}
