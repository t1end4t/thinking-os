import React, { useState } from 'react';
import { X, Image, Table2, Lightbulb, StickyNote, Plus, Trash2, Check } from 'lucide-react';
import { SynthesisArtifact, SynthesisArtifactType } from '../../manuscriptTypes';
import { useWorkspace } from '../../context/WorkspaceContext';

interface ArtifactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (artifact: Omit<SynthesisArtifact, 'id' | 'createdAt'>) => void;
}

export const ArtifactModal: React.FC<ArtifactModalProps> = ({ isOpen, onClose, onSave }) => {
  const { claims } = useWorkspace();
  const [type, setType] = useState<SynthesisArtifactType>('figure');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [source, setSource] = useState('');
  const [claimId, setClaimId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Figure specific
  const [figureCaption, setFigureCaption] = useState('');
  const [xAxisLabel, setXAxisLabel] = useState('Position');
  const [yAxisLabel, setYAxisLabel] = useState('Recall (%)');
  const [dataPoints, setDataPoints] = useState<Array<{ label: string; value: number; baseline?: number }>>([
    { label: '0%', value: 98, baseline: 12 },
    { label: '50%', value: 97, baseline: 15 },
    { label: '100%', value: 96, baseline: 10 }
  ]);

  // Table specific
  const [tableHeaders, setTableHeaders] = useState('Method, Memory (GB), Throughput (tok/s), Speedup');
  const [tableRows, setTableRows] = useState(
    'Dense Full KV, 19.2 GB, 5.4 tok/s, 1.0x\nSink Streaming Cache, 2.4 GB, 38.6 tok/s, 7.1x'
  );
  const [tableCaption, setTableCaption] = useState('');

  // Fact specific
  const [factMetric, setFactMetric] = useState('4 tokens = 38.4% Attention Mass');
  const [factContext, setFactContext] = useState('Initial tokens absorb excess non-semantic attention entropy.');

  // Note specific
  const [noteMarkdown, setNoteMarkdown] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const base: Omit<SynthesisArtifact, 'id' | 'createdAt'> = {
      type,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      badge: badge.trim() || (type === 'figure' ? 'Figure' : type === 'table' ? 'Table' : undefined),
      source: source.trim() || undefined,
      claimId: claimId || undefined,
      tags: tags.length > 0 ? tags : undefined
    };

    if (type === 'figure') {
      base.figure = {
        figureType: 'plot',
        caption: figureCaption || title,
        xAxisLabel,
        yAxisLabel,
        dataPoints
      };
    } else if (type === 'table') {
      const headers = tableHeaders.split(',').map(h => h.trim()).filter(Boolean);
      const rows = tableRows
        .split('\n')
        .map(r => r.split(',').map(c => c.trim()))
        .filter(r => r.length > 0 && r[0]);
      base.table = {
        headers,
        rows,
        caption: tableCaption || title
      };
    } else if (type === 'fact') {
      base.factMetric = factMetric;
      base.factContext = factContext;
    } else if (type === 'note') {
      base.noteMarkdown = noteMarkdown;
    }

    onSave(base);
    onClose();
  };

  const addDataPoint = () => {
    setDataPoints([...dataPoints, { label: `Point ${dataPoints.length + 1}`, value: 50, baseline: 20 }]);
  };

  const removeDataPoint = (idx: number) => {
    setDataPoints(dataPoints.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-artifact-title"
        className="bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-rule)] flex items-center justify-between">
          <div>
            <h3 id="modal-add-artifact-title" className="text-base font-semibold text-[var(--color-ink)]">
              Create Synthesis Artifact
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Add empirical figures, comparison tables, verified facts, or notes to your research locker.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-md text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Type Selector */}
        <div className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/50 flex gap-2">
          <button
            type="button"
            onClick={() => setType('figure')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              type === 'figure'
                ? 'bg-[var(--color-surface)] text-indigo-600 dark:text-indigo-400 shadow-xs border border-[var(--color-rule)] font-semibold'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Image size={14} />
            Figure / Plot
          </button>
          <button
            type="button"
            onClick={() => setType('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              type === 'table'
                ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-xs border border-[var(--color-rule)] font-semibold'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Table2 size={14} />
            Data Table
          </button>
          <button
            type="button"
            onClick={() => setType('fact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              type === 'fact'
                ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 shadow-xs border border-[var(--color-rule)] font-semibold'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Lightbulb size={14} />
            Fact / Metric
          </button>
          <button
            type="button"
            onClick={() => setType('note')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              type === 'note'
                ? 'bg-[var(--color-surface)] text-sky-600 dark:text-sky-400 shadow-xs border border-[var(--color-rule)] font-semibold'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <StickyNote size={14} />
            Insight / Derivation
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Artifact Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={type === 'figure' ? 'Figure 1: Needle Recall' : 'Key Finding Title'}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Label / Badge (e.g. Figure 1, Table 2)
              </label>
              <input
                type="text"
                value={badge}
                onChange={e => setBadge(e.target.value)}
                placeholder="Figure 1"
                className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
              Subtitle or Brief Context
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="e.g. Attention-sink preserved cache vs dense full KV"
              className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type-specific inputs */}
          {type === 'figure' && (
            <div className="p-3.5 rounded-lg border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Figure Plot Data & Caption
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">Caption</label>
                <textarea
                  rows={2}
                  value={figureCaption}
                  onChange={e => setFigureCaption(e.target.value)}
                  placeholder="Figure caption explaining axes, conditions, and findings..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[0.7rem] text-[var(--color-ink-muted)] mb-0.5">X Axis Label</label>
                  <input
                    type="text"
                    value={xAxisLabel}
                    onChange={e => setXAxisLabel(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                  />
                </div>
                <div>
                  <label className="block text-[0.7rem] text-[var(--color-ink-muted)] mb-0.5">Y Axis Label</label>
                  <input
                    type="text"
                    value={yAxisLabel}
                    onChange={e => setYAxisLabel(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[var(--color-ink)]">Plot Points</span>
                  <button
                    type="button"
                    onClick={addDataPoint}
                    className="text-[0.7rem] flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-mono hover:underline"
                  >
                    <Plus size={12} /> Add Point
                  </button>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {dataPoints.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <input
                        type="text"
                        value={pt.label}
                        onChange={e => {
                          const copy = [...dataPoints];
                          copy[i].label = e.target.value;
                          setDataPoints(copy);
                        }}
                        placeholder="Label"
                        className="w-24 px-2 py-1 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                      />
                      <input
                        type="number"
                        value={pt.value}
                        onChange={e => {
                          const copy = [...dataPoints];
                          copy[i].value = parseFloat(e.target.value) || 0;
                          setDataPoints(copy);
                        }}
                        placeholder="Value"
                        className="w-20 px-2 py-1 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                      />
                      <input
                        type="number"
                        value={pt.baseline ?? ''}
                        onChange={e => {
                          const copy = [...dataPoints];
                          copy[i].baseline = parseFloat(e.target.value) || undefined;
                          setDataPoints(copy);
                        }}
                        placeholder="Baseline"
                        className="w-20 px-2 py-1 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                      />
                      <button
                        type="button"
                        onClick={() => removeDataPoint(i)}
                        className="p-1 text-[var(--color-ink-muted)] hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'table' && (
            <div className="p-3.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Table Structure & Rows
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                  Columns (comma-separated)
                </label>
                <input
                  type="text"
                  value={tableHeaders}
                  onChange={e => setTableHeaders(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-1.5 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                  Rows (each line is a row, comma-separated values)
                </label>
                <textarea
                  rows={4}
                  value={tableRows}
                  onChange={e => setTableRows(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">Table Caption</label>
                <input
                  type="text"
                  value={tableCaption}
                  onChange={e => setTableCaption(e.target.value)}
                  placeholder="Caption for Table 1..."
                  className="w-full text-xs px-3 py-1.5 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                />
              </div>
            </div>
          )}

          {type === 'fact' && (
            <div className="p-3.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Quantitative Fact & Anchor
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                  Key Quantitative Metric / Finding
                </label>
                <input
                  type="text"
                  value={factMetric}
                  onChange={e => setFactMetric(e.target.value)}
                  placeholder="e.g. 4 tokens = 38.4% Attention Mass"
                  className="w-full text-xs font-mono px-3 py-2 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                  Contextual Explanation & Verification
                </label>
                <textarea
                  rows={2}
                  value={factContext}
                  onChange={e => setFactContext(e.target.value)}
                  placeholder="Explain why this fact holds and how it anchors the argument..."
                  className="w-full text-xs px-3 py-2 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                />
              </div>
            </div>
          )}

          {type === 'note' && (
            <div className="p-3.5 rounded-lg border border-sky-200/60 dark:border-sky-900/40 bg-sky-50/30 dark:bg-sky-950/20 space-y-3">
              <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                Derivation & Mathematical Note
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                  Markdown Content / LaTeX formulas
                </label>
                <textarea
                  rows={4}
                  value={noteMarkdown}
                  onChange={e => setNoteMarkdown(e.target.value)}
                  placeholder="Write derivation lemmas, code coordinates, or notes..."
                  className="w-full text-xs font-mono px-3 py-2 rounded border border-[var(--color-rule)] bg-[var(--color-surface)]"
                />
              </div>
            </div>
          )}

          {/* Linking to Claim & Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-rule)]">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Link to Claim (From Research Map)
              </label>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setClaimId('')}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                    !claimId
                      ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-medium text-[var(--color-ink)]'
                      : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <span>No Claim linked</span>
                  {!claimId && <Check size={13} className="text-[var(--accent-indigo)]" />}
                </button>
                {claims.map(c => {
                  const isSelected = claimId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClaimId(c.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                        isSelected
                          ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-soft)] font-medium text-[var(--color-ink)]'
                          : 'border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[0.625rem] text-teal-600 dark:text-teal-400 font-bold mr-1.5">[{c.id}]</span>
                        <span className="truncate">{c.text}</span>
                      </div>
                      {isSelected && <Check size={13} className="text-[var(--accent-indigo)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Source Experiment / Citation
              </label>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="e.g. Run run-128k-needle-sweep or Xiao et al."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="attention, benchmark, memory"
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)]"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[var(--color-rule)] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs rounded-lg border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Save Artifact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
