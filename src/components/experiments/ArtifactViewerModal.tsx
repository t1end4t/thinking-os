import React, { useState } from 'react';
import {
  X,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Info
} from 'lucide-react';
import {
  Experiment,
  ExperimentArtifact,
  ArtifactPlotData,
  ArtifactTableData,
  ArtifactNotesData,
  ArtifactImageData
} from '../../types';
import { tildePath } from '../../utils/paths';

interface ArtifactViewerModalProps {
  experiment: Experiment;
  artifact: ExperimentArtifact;
  onClose: () => void;
  onSaveObservation: (observation: string) => void;
}

export const ArtifactViewerModal: React.FC<ArtifactViewerModalProps> = ({
  experiment,
  artifact,
  onClose,
  onSaveObservation
}) => {
  const [observationText, setObservationText] = useState(artifact.observation || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [hoveredPlotIndex, setHoveredPlotIndex] = useState<number | null>(null);

  const handleSave = () => {
    onSaveObservation(observationText);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Render SVG interactive chart for plotData
  const renderPlot = (data: ArtifactPlotData) => {
    const points = data.points || [];
    if (points.length === 0) {
      return (
        <div className="p-8 text-center text-xs font-mono text-[var(--color-ink-muted)]">
          No data points available for this plot.
        </div>
      );
    }

    // Chart dimensions
    const width = 640;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 50, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Calculate Y domain
    const yValues = points.flatMap(p => [p.y, p.baseline !== undefined ? p.baseline : p.y]);
    const minY = Math.max(0, Math.floor(Math.min(...yValues) * 0.9));
    const maxY = Math.min(100, Math.ceil(Math.max(...yValues) * 1.05)) || 100;

    const getY = (val: number) => {
      const ratio = (val - minY) / (maxY - minY || 1);
      return padding.top + chartH - ratio * chartH;
    };

    const getX = (index: number) => {
      if (points.length <= 1) return padding.left + chartW / 2;
      return padding.left + (index / (points.length - 1)) * chartW;
    };

    // Build SVG paths
    const seriesPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.y)}`)
      .join(' ');

    const hasBaseline = points.some(p => p.baseline !== undefined);
    const baselinePath = hasBaseline
      ? points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.baseline ?? p.y)}`)
          .join(' ')
      : null;

    // Grid ticks (4 vertical steps)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => {
      const val = Math.round(minY + r * (maxY - minY));
      return { val, y: getY(val) };
    });

    const activePoint = hoveredPlotIndex !== null ? points[hoveredPlotIndex] : null;

    return (
      <div className="flex flex-col gap-4">
        {/* Plot Legend & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
              <span className="w-3 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full inline-block" />
              {data.seriesName || 'Series 1'}
            </span>

            {hasBaseline && (
              <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <span className="w-3 h-0.5 border-b border-dashed border-amber-500 inline-block" />
                {data.baselineName || 'Baseline'}
              </span>
            )}

            {data.targetThreshold && (
              <span className="flex items-center gap-1 text-[0.6875rem] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                <TrendingUp size={11} /> Target: {data.targetThreshold}
              </span>
            )}
          </div>

          {activePoint && (
            <div className="text-[0.6875rem] px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
              <span>Position: <strong>{activePoint.x}</strong></span>
              <span>Value: <strong className="text-indigo-600 dark:text-indigo-400">{activePoint.y}%</strong></span>
              {activePoint.baseline !== undefined && (
                <span>Baseline: <strong className="text-amber-600 dark:text-amber-400">{activePoint.baseline}%</strong></span>
              )}
            </div>
          )}
        </div>

        {/* SVG Canvas Container */}
        <div className="w-full overflow-x-auto bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl p-3 shadow-2xs">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map(({ val, y }, idx) => (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartW}
                  y2={y}
                  stroke="var(--color-rule)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="var(--color-ink-muted)"
                >
                  {val}%
                </text>
              </g>
            ))}

            {/* Axes */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + chartH}
              stroke="var(--color-ink-muted)"
              strokeWidth="1.5"
            />
            <line
              x1={padding.left}
              y1={padding.top + chartH}
              x2={padding.left + chartW}
              y2={padding.top + chartH}
              stroke="var(--color-ink-muted)"
              strokeWidth="1.5"
            />

            {/* Baseline Line */}
            {baselinePath && (
              <path
                d={baselinePath}
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeOpacity={0.8}
              />
            )}

            {/* Primary Series Line */}
            <path
              d={seriesPath}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points and Interaction Circles */}
            {points.map((pt, i) => {
              const cx = getX(i);
              const cy = getY(pt.y);
              const isHovered = hoveredPlotIndex === i;

              return (
                <g key={i}>
                  {/* Baseline Dot */}
                  {pt.baseline !== undefined && (
                    <circle
                      cx={cx}
                      cy={getY(pt.baseline)}
                      r={isHovered ? 4 : 2.5}
                      fill="#d97706"
                      stroke="var(--color-surface)"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Primary Point */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4}
                    fill="#6366f1"
                    stroke="var(--color-surface)"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                  />

                  {/* Invisible Hit Area for smooth hover */}
                  <rect
                    x={cx - 15}
                    y={padding.top}
                    width={30}
                    height={chartH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPlotIndex(i)}
                    onMouseLeave={() => setHoveredPlotIndex(null)}
                  />

                  {/* X-axis label */}
                  <text
                    x={cx}
                    y={padding.top + chartH + 18}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fill={isHovered ? 'var(--color-ink)' : 'var(--color-ink-muted)'}
                    fontWeight={isHovered ? 'bold' : 'normal'}
                  >
                    {pt.x}
                  </text>
                </g>
              );
            })}

            {/* Y-axis Label */}
            <text
              transform={`rotate(-90) translate(-${padding.top + chartH / 2}, 15)`}
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fill="var(--color-ink-muted)"
              fontWeight="bold"
            >
              {data.yAxisLabel || 'Metric'}
            </text>

            {/* X-axis Label */}
            <text
              x={padding.left + chartW / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fill="var(--color-ink-muted)"
              fontWeight="bold"
            >
              {data.xAxisLabel || 'Position'}
            </text>
          </svg>
        </div>

        {/* Scientific Caption */}
        {data.caption && (
          <div className="p-3 bg-[var(--color-paper)]/70 border border-[var(--color-rule)] rounded-xl text-xs font-serif text-[var(--color-ink)] leading-relaxed italic">
            {data.caption}
          </div>
        )}
      </div>
    );
  };

  // Render Table for tableData
  const renderTable = (data: ArtifactTableData) => {
    const headers = data.headers || [];
    const rows = (data.rows || []).filter(row =>
      tableSearch.trim() === ''
        ? true
        : row.some(cell => cell.toLowerCase().includes(tableSearch.toLowerCase()))
    );

    return (
      <div className="flex flex-col gap-3">
        {/* Table Search & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--color-ink-muted)]" />
            <input
              type="text"
              placeholder="Search table values..."
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] focus:outline-none focus:border-teal-500"
            />
          </div>
          <span className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
            Showing {rows.length} of {data.rows?.length || 0} entries
          </span>
        </div>

        {/* Table Grid */}
        <div className="w-full overflow-x-auto border border-[var(--color-rule)] rounded-xl bg-[var(--color-surface)] shadow-2xs">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[var(--color-paper)] border-b border-[var(--color-rule)] text-[var(--color-ink-muted)] font-semibold uppercase text-[0.6875rem]">
                {headers.map((h, i) => (
                  <th key={i} className="p-2.5 px-3 border-r border-[var(--color-rule)] last:border-none whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length || 1} className="p-6 text-center text-xs text-[var(--color-ink-muted)]">
                    No matching rows found.
                  </td>
                </tr>
              ) : (
                rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[var(--color-paper)]/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 px-3 border-r border-[var(--color-rule)] last:border-none whitespace-nowrap text-[var(--color-ink)]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Caption & Notes */}
        {(data.caption || data.notes) && (
          <div className="p-3 bg-[var(--color-paper)]/70 border border-[var(--color-rule)] rounded-xl text-xs space-y-1">
            {data.caption && <p className="font-serif italic text-[var(--color-ink)]">{data.caption}</p>}
            {data.notes && <p className="font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">Note: {data.notes}</p>}
          </div>
        )}
      </div>
    );
  };

  // Render Notes / Log for notesData
  const renderNotes = (data: ArtifactNotesData) => {
    const lines = data.content ? data.content.split('\n') : [];

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-[var(--color-ink-muted)] px-1">
          <span className="uppercase text-[0.6875rem] font-semibold flex items-center gap-1.5">
            <FileText size={13} className="text-amber-500" />
            Format: {data.language || 'log'} ({lines.length} lines)
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(data.content);
              alert('Copied log content to clipboard');
            }}
            className="flex items-center gap-1 hover:text-[var(--color-ink)] text-[0.6875rem]"
          >
            <Copy size={12} /> Copy content
          </button>
        </div>

        <div className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto max-h-[380px] border border-slate-800 leading-relaxed shadow-inner">
          <pre className="space-y-0.5">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-slate-900/80 px-1 rounded">
                <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                <span className={
                  line.includes('[STEP') ? 'text-sky-300 font-semibold' :
                  line.includes('[METRIC]') ? 'text-emerald-300 font-bold' :
                  line.includes('[INFO]') ? 'text-slate-300' :
                  line.includes('[ERROR]') ? 'text-rose-400 font-bold' : 'text-slate-400'
                }>
                  {line}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    );
  };

  // Render Image for imageData
  const renderImage = (data: ArtifactImageData) => {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl gap-3">
        {data.url ? (
          <img
            src={data.url}
            alt={data.caption || artifact.name}
            className="max-h-[360px] object-contain rounded-lg shadow-sm"
          />
        ) : (
          <div className="w-full h-48 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex flex-col items-center justify-center text-purple-600 dark:text-purple-300 gap-2">
            <ImageIcon size={36} className="opacity-80" />
            <span className="text-xs font-mono font-medium">{artifact.name}</span>
            <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">Visual graphic artifact</span>
          </div>
        )}
        {data.caption && (
          <p className="text-xs font-serif italic text-[var(--color-ink-muted)] text-center">
            {data.caption}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--color-rule)] flex items-center justify-between bg-[var(--color-paper)]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 flex items-center justify-center border border-sky-300 dark:border-sky-800 shrink-0">
              {artifact.type === 'plot' && <FileBarChart size={20} className="text-indigo-500" />}
              {artifact.type === 'table' && <FileSpreadsheet size={20} className="text-teal-500" />}
              {artifact.type === 'notes' && <FileText size={20} className="text-amber-500" />}
              {artifact.type === 'image' && <ImageIcon size={20} className="text-purple-500" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-[var(--color-ink)] truncate">
                  {artifact.name}
                </h3>
                <span className="text-[0.625rem] font-mono uppercase px-2 py-0.5 rounded-full font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200">
                  {artifact.type}
                </span>
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck size={11} /> Verified Content
                </span>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)] truncate mt-0.5 font-mono">
                Experiment: <strong className="text-[var(--color-ink)]">{experiment.title}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Provenance Banner */}
          <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 text-[var(--color-ink-muted)]">
              <span>Path: <strong className="text-[var(--color-ink)]">{tildePath(artifact.path)}</strong></span>
              <span>Artifact Type: <strong className="text-[var(--color-ink)] uppercase">{artifact.type}</strong></span>
            </div>
            <span className="text-[0.6875rem] px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
              Status: {artifact.status}
            </span>
          </div>

          {/* Core Artifact Visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-[var(--color-ink)] tracking-wider flex items-center gap-1.5">
                {artifact.type === 'plot' && <FileBarChart size={14} className="text-indigo-500" />}
                {artifact.type === 'table' && <FileSpreadsheet size={14} className="text-teal-500" />}
                {artifact.type === 'notes' && <FileText size={14} className="text-amber-500" />}
                {artifact.type === 'image' && <ImageIcon size={14} className="text-purple-500" />}
                Artifact Visualization
              </span>
              <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                Direct view mode
              </span>
            </div>

            {/* Type Switcher */}
            {artifact.type === 'plot' && artifact.plotData && renderPlot(artifact.plotData)}
            {artifact.type === 'table' && artifact.tableData && renderTable(artifact.tableData)}
            {artifact.type === 'notes' && artifact.notesData && renderNotes(artifact.notesData)}
            {artifact.type === 'image' && artifact.imageData && renderImage(artifact.imageData)}

            {/* Fallback if no specific data object is attached */}
            {!artifact.plotData && !artifact.tableData && !artifact.notesData && !artifact.imageData && (
              <div className="p-8 border border-dashed border-[var(--color-rule)] rounded-xl text-center space-y-2 bg-[var(--color-surface)]">
                <Info size={28} className="mx-auto text-[var(--color-ink-muted)] opacity-60" />
                <p className="text-xs font-mono font-semibold text-[var(--color-ink)]">
                  Artifact binary/data recorded on disk
                </p>
                <p className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                  Located at: {tildePath(artifact.path)}
                </p>
              </div>
            )}
          </div>

          {/* Scientific Observation Field (Required for Done status) */}
          <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/30 dark:bg-sky-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs uppercase font-bold text-[var(--color-ink)] flex items-center gap-2">
                <span>What did this show? (Required for Done status):</span>
              </label>
              <span className="font-mono text-[0.6875rem] text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full border border-sky-200/60 font-semibold">
                Authored by: user
              </span>
            </div>

            <textarea
              rows={3}
              value={observationText}
              onChange={e => setObservationText(e.target.value)}
              placeholder="State clearly what physical or computational result was obtained from this artifact..."
              className="w-full p-3 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-lg font-serif text-[0.9375rem] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                {observationText.trim() ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Observation recorded
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    * Observation mandatory for scientific gate
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="font-mono text-xs text-emerald-600 flex items-center gap-1 font-semibold animate-in fade-in">
                    <CheckCircle2 size={13} /> Saved!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!observationText.trim()}
                  className="px-4 py-1.5 font-mono text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-40 shadow-xs"
                >
                  Save Observation
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--color-rule)] bg-[var(--color-paper)]/40 flex items-center justify-between text-xs text-[var(--color-ink-muted)] font-mono shrink-0">
          <span>{artifact.name}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-paper)] font-medium transition-colors shadow-2xs"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
