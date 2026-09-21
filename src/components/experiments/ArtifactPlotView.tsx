import React, { useState } from 'react';
import { FileBarChart, TrendingUp, Maximize2, Edit3 } from 'lucide-react';
import { ArtifactPlotData } from '../../types';

interface ArtifactPlotViewProps {
  name: string;
  plotData: ArtifactPlotData;
  observation?: string;
  onOpenModal?: () => void;
}

export const ArtifactPlotView: React.FC<ArtifactPlotViewProps> = ({
  name,
  plotData,
  observation,
  onOpenModal
}) => {
  const points = plotData.points || [];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl text-center text-xs font-mono text-[var(--color-ink-muted)]">
        No plot points available for {name}
      </div>
    );
  }

  // Chart dimensions
  const width = 640;
  const height = 250;
  const padding = { top: 25, right: 25, bottom: 42, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Calculate domain
  const yValues = points.flatMap(p => [p.y, p.baseline !== undefined ? p.baseline : p.y]);
  const rawMinY = Math.min(...yValues);
  const rawMaxY = Math.max(...yValues);

  const isPercentage = rawMaxY > 15;
  const minY = isPercentage ? Math.max(0, Math.floor(rawMinY * 0.9)) : Math.max(0, Math.floor(rawMinY * 10) / 10);
  const maxY = isPercentage ? Math.min(100, Math.ceil(rawMaxY * 1.05)) : Math.ceil(rawMaxY * 1.15 * 10) / 10 || 10;

  const getY = (val: number) => {
    const ratio = (val - minY) / (maxY - minY || 1);
    return padding.top + chartH - ratio * chartH;
  };

  const getX = (index: number) => {
    if (points.length <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (points.length - 1)) * chartW;
  };

  // Build SVG path
  const seriesPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.y)}`)
    .join(' ');

  // Gradient area path
  const areaPath = points.length > 0
    ? `${seriesPath} L ${getX(points.length - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`
    : '';

  const hasBaseline = points.some(p => p.baseline !== undefined);
  const baselinePath = hasBaseline
    ? points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.baseline ?? p.y)}`)
        .join(' ')
    : null;

  // 4 horizontal grid ticks
  const yTicks = [0, 0.33, 0.66, 1].map(r => {
    const val = isPercentage
      ? Math.round(minY + r * (maxY - minY))
      : Number((minY + r * (maxY - minY)).toFixed(1));
    return { val, y: getY(val) };
  });

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];
  const formatVal = (v: number) => isPercentage ? `${v}%` : `${v}x`;

  return (
    <div className="w-full bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl overflow-hidden shadow-2xs flex flex-col">
      {/* Plot Top Header & Legend */}
      <div className="px-4 py-3 border-b border-[var(--color-rule)] bg-[var(--color-paper)]/50 flex flex-wrap items-center justify-between gap-2.5 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileBarChart size={14} />
          </div>
          <span className="font-mono text-xs font-bold text-[var(--color-ink)] truncate">
            {name}
          </span>
          <span className="text-[0.625rem] font-mono px-1.5 py-0.5 rounded-full bg-indigo-100/70 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold uppercase">
            plot
          </span>
        </div>

        {/* Action button */}
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1 text-[0.6875rem] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
            title="Inspect in full dialog"
          >
            <Maximize2 size={11} />
            <span>Fullscreen / Edit</span>
          </button>
        )}
      </div>

      {/* Series Metadata & Interactive Value Callout */}
      <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="w-3 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full inline-block" />
            {plotData.seriesName || 'Measured Series'}
          </span>

          {hasBaseline && (
            <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <span className="w-3 h-0.5 border-b border-dashed border-amber-500 inline-block" />
              {plotData.baselineName || 'Baseline'}
            </span>
          )}

          {plotData.targetThreshold && (
            <span className="flex items-center gap-1 text-[0.6875rem] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
              <TrendingUp size={11} /> Target: {plotData.targetThreshold}
            </span>
          )}
        </div>

        {/* Hover / Point Value Tag */}
        {activePoint && (
          <div className="text-[0.6875rem] px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 flex items-center gap-2.5">
            <span>{plotData.xAxisLabel?.split(' ')[0] || 'Pos'}: <strong>{activePoint.x}</strong></span>
            <span>Measured: <strong className="text-indigo-600 dark:text-indigo-400">{formatVal(activePoint.y)}</strong></span>
            {activePoint.baseline !== undefined && (
              <span>Baseline: <strong className="text-amber-600 dark:text-amber-400">{formatVal(activePoint.baseline)}</strong></span>
            )}
          </div>
        )}
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="p-3 w-full overflow-x-auto bg-[var(--color-surface)]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible max-h-72">
          <defs>
            <linearGradient id={`gradient-${name.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y-Axis title label */}
          {plotData.yAxisLabel && (
            <text
              x={padding.left}
              y={padding.top - 10}
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              fill="var(--color-ink-muted)"
            >
              ↑ {plotData.yAxisLabel}
            </text>
          )}

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
                strokeOpacity={0.7}
              />
              <text
                x={padding.left - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fontFamily="monospace"
                fill="var(--color-ink-muted)"
              >
                {formatVal(val)}
              </text>
            </g>
          ))}

          {/* Axes lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartH}
            stroke="var(--color-ink-muted)"
            strokeWidth="1.2"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={padding.left + chartW}
            y2={padding.top + chartH}
            stroke="var(--color-ink-muted)"
            strokeWidth="1.2"
          />

          {/* Gradient Area under curve */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#gradient-${name.replace(/\W/g, '')})`}
            />
          )}

          {/* Baseline Curve */}
          {baselinePath && (
            <path
              d={baselinePath}
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}

          {/* Measured Series Curve */}
          <path
            d={seriesPath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Point Markers */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.y);
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover touch area */}
                <circle cx={cx} cy={cy} r={14} fill="transparent" />

                {/* Point circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all"
                />

                {/* Baseline point circle if applicable */}
                {p.baseline !== undefined && (
                  <circle
                    cx={cx}
                    cy={getY(p.baseline)}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#d97706"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="transition-all"
                  />
                )}

                {/* X-axis Tick Label */}
                <text
                  x={cx}
                  y={padding.top + chartH + 16}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fill={isHovered ? 'var(--color-ink)' : 'var(--color-ink-muted)'}
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {p.x}
                </text>
              </g>
            );
          })}

          {/* X-Axis bottom title */}
          {plotData.xAxisLabel && (
            <text
              x={padding.left + chartW / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize="9.5"
              fontFamily="monospace"
              fill="var(--color-ink-muted)"
            >
              {plotData.xAxisLabel} →
            </text>
          )}
        </svg>
      </div>

      {/* Caption & Qualitative Observation Section */}
      <div className="p-3.5 bg-[var(--color-paper)]/60 border-t border-[var(--color-rule)] flex flex-col gap-2 text-xs">
        {plotData.caption && (
          <p className="text-[0.75rem] text-[var(--color-ink)] leading-relaxed italic border-l-2 border-indigo-500 pl-2.5">
            {plotData.caption}
          </p>
        )}

        {observation ? (
          <div className="text-[0.75rem] bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2.5 text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <span className="font-bold shrink-0 font-mono">✓ Observed:</span>
            <span className="leading-snug">{observation}</span>
          </div>
        ) : (
          <div className="text-[0.75rem] bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-2 text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span className="font-semibold">⚠ Qualitative observation pending</span>
            {onOpenModal && (
              <button
                type="button"
                onClick={onOpenModal}
                className="text-[0.6875rem] underline hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1 font-mono"
              >
                <Edit3 size={11} /> Record observation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
