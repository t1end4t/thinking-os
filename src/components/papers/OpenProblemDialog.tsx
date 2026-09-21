import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Paper } from '../../types';

export type OpenProblemCapture = {
  readonly paper: Paper;
  readonly pageNumber?: number;
  readonly excerpt?: string;
  readonly highlightId?: string;
  readonly returnFocus: HTMLElement;
};

type OpenProblemDialogProps = {
  readonly capture: OpenProblemCapture;
  readonly fallbackFocus: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
};

export function OpenProblemDialog({ capture, fallbackFocus, onClose }: OpenProblemDialogProps) {
  const { addSurveyOpenProblem } = useWorkspace();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(capture.excerpt ?? '');
  const [attribution, setAttribution] = useState<'paper-author' | 'user-inference' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const citation = capture.paper.citation.trim() || `${capture.paper.authors} (${capture.paper.year}). ${capture.paper.title}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      const target = capture.returnFocus.isConnected ? capture.returnFocus : fallbackFocus.current;
      target?.focus();
    };
  }, [capture, fallbackFocus]);

  return (
    <dialog
      ref={dialogRef}
      className="paper-open-problem-dialog"
      aria-labelledby="open-problem-heading"
      aria-describedby="open-problem-help"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}
    >
      <form className="kanban-modal-form" onSubmit={event => {
        event.preventDefault();
        if (!text.trim() || !attribution) {
          setError('Enter an open problem and choose its attribution.');
          return;
        }
        const result = addSurveyOpenProblem(text.trim(), citation, {
          paperId: capture.paper.id,
          pageNumber: capture.pageNumber,
          excerpt: capture.excerpt,
          highlightId: capture.highlightId,
          attribution
        });
        if (!result.success) {
          setError(result.error || 'Could not record the open problem. Your draft is unchanged.');
          return;
        }
        onClose();
      }}>
        <h2 id="open-problem-heading" className="kanban-modal-heading">Record open problem</h2>
        <p id="open-problem-help" className="text-xs text-[var(--color-ink-muted)]">
          Review the excerpt before saving to Survey. Recording a problem does not verify that it is unresolved.
        </p>
        <div className="form-field">
          <label htmlFor="open-problem-text">Problem text</label>
          <textarea id="open-problem-text" autoFocus required rows={4} value={text}
            onChange={event => setText(event.target.value)} />
        </div>
        <div className="form-field">
          <label htmlFor="open-problem-attribution">Attribution</label>
          <select id="open-problem-attribution" required value={attribution} onChange={event => {
            const value = event.target.value;
            if (value === '' || value === 'paper-author' || value === 'user-inference') setAttribution(value);
          }}>
            <option value="">Choose attribution</option>
            <option value="paper-author">Author-stated open problem</option>
            <option value="user-inference">My inference</option>
          </select>
        </div>
        <fieldset className="min-w-0 space-y-2 border-t border-[var(--color-rule)] pt-2">
          <legend className="text-xs font-mono text-[var(--color-ink-muted)]">Source · read only</legend>
          <div className="form-field">
            <label htmlFor="open-problem-paper">Source paper</label>
            <textarea id="open-problem-paper" readOnly rows={2} value={capture.paper.title} />
          </div>
          <div className="form-field">
            <label htmlFor="open-problem-citation">Citation</label>
            <input id="open-problem-citation" readOnly value={citation} />
          </div>
          <div className="form-field">
            <label htmlFor="open-problem-page">Source page</label>
            <input id="open-problem-page" readOnly value={capture.pageNumber ?? 'Not recorded'} />
          </div>
          <div className="form-field">
            <label htmlFor="open-problem-excerpt">Source excerpt</label>
            <textarea id="open-problem-excerpt" readOnly rows={3} value={capture.excerpt ?? ''}
              placeholder="No excerpt selected" />
          </div>
          {capture.highlightId && <p className="text-xs font-mono break-all">Highlight: {capture.highlightId}</p>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-[var(--color-ink)]">{error}</p>}
        <div className="kanban-modal-footer flex-wrap">
          <button type="button" className="kanban-modal-cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="kanban-modal-save-btn">Save open problem</button>
        </div>
      </form>
    </dialog>
  );
}
