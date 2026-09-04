import React from 'react';
import { LayoutNode } from './computeLayout';
import { Ban, GripVertical, Plus } from 'lucide-react';

interface NodeCardProps {
  node: LayoutNode;
  zoomLevel: 'shape' | 'structure' | 'working';
  isSelected: boolean;
  isHovered: boolean;
  isRelated: boolean;
  isDimmed: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onAddToContext?: (e: React.MouseEvent) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  zoomLevel,
  isSelected,
  isHovered,
  isRelated,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onAddToContext
}) => {
  // GHOST node: soft unfilled dashed absence, not a normal card
  if (node.isGhost) {
    return (
      <div
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height
        }}
        className={`absolute border border-dashed border-[var(--color-rule)] bg-[var(--color-paper)]/40 rounded-lg p-3 flex items-center justify-center select-none transition-opacity duration-150 ${
          isDimmed ? 'opacity-20' : 'opacity-85'
        }`}
      >
        <span className="font-mono text-[11px] text-[var(--color-ink-muted)] italic tracking-wide">
          [Absence: {node.title}]
        </span>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent) => {
    const contextObj = {
      type: 'node',
      id: node.id,
      label: `[${node.type.toUpperCase()}] ${node.title}`,
      secondaryLabel: node.type === 'evidence' ? node.citation : node.tags?.join(', '),
      metadata: {
        nodeType: node.type,
        nodeId: node.id,
        title: node.title
      }
    };
    e.dataTransfer.setData('application/json', JSON.stringify(contextObj));
    e.dataTransfer.setData('text/plain', `[${node.type.toUpperCase()}] ${node.title}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Determine dynamic visual hierarchy
  let stateClasses = 'border-[var(--color-rule)] hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-xs';
  if (isSelected) {
    stateClasses = 'border-[var(--color-ink)] ring-2 ring-[var(--color-ink)]/20 shadow-md scale-[1.01] z-20';
  } else if (isHovered) {
    stateClasses = 'border-indigo-500 dark:border-indigo-400 ring-3 ring-indigo-500/40 shadow-lg scale-[1.02] z-25 bg-[var(--color-surface)]';
  } else if (isRelated) {
    stateClasses = 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-400/40 shadow-md scale-[1.008] z-15 bg-[var(--color-surface)]';
  }

  const opacityClass = isDimmed ? 'opacity-25 filter grayscale-[50%]' : 'opacity-100';

  return (
    <div
      id={`node-${node.id}`}
      draggable={true}
      onDragStart={handleDragStart}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={e => {
        // Prevent background canvas drag from conflicting with node click/drag
        e.stopPropagation();
      }}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height
      }}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      title={`[${node.type.toUpperCase()}] ${node.title}\nDrag to Assistant Dock to attach context`}
      className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing border rounded-lg transition-all duration-150 select-none overflow-hidden bg-[var(--color-surface)] group ${stateClasses} ${opacityClass}`}
    >
      <div className="p-3.5 flex flex-col justify-between h-full relative">
        {/* Quick Add to Chat Button on Hover (Top Right) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-30">
          {onAddToContext && (
            <button
              onClick={e => {
                e.stopPropagation();
                onAddToContext(e);
              }}
              title="Attach to Assistant context (+ Context)"
              className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-[var(--color-rule)] shadow-2xs transition-colors flex items-center gap-0.5 text-[9px] font-mono font-semibold"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Chat</span>
            </button>
          )}
          <span
            title="Drag and drop to Assistant Dock"
            className="p-1 text-slate-400 cursor-grab hover:text-slate-600"
          >
            <GripVertical className="w-3 h-3" />
          </span>
        </div>

        {/* Header Row: Type tag & identifiers */}
        <div className="flex items-center justify-between gap-1 mb-1 shrink-0 pr-12">
          <span className="font-mono text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-ink-muted)] border border-[var(--color-rule)]">
            {node.type}
          </span>

          {node.tags && node.tags.length > 0 && (
            <div className="flex items-center gap-1 truncate">
              {node.tags.map(t => (
                <span
                  key={t}
                  className="font-mono text-[9px] text-[var(--color-ink-muted)] bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-[var(--color-rule)]"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {node.rejected && (
            <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-mono text-[9px] uppercase font-semibold flex items-center gap-1 shrink-0">
              <Ban className="w-2.5 h-2.5" />
              Rejected
            </span>
          )}
        </div>

        {/* Body Content based on Node Type: Hierarchical Typography */}
        {node.type === 'question' && (
          <div className="flex-1 flex items-center min-h-0 pt-0.5">
            <h3 className="font-serif text-[16px] sm:text-[17px] font-semibold leading-snug line-clamp-3 text-[var(--color-ink)]">
              {node.title}
            </h3>
          </div>
        )}

        {node.type === 'claim' && (
          <div className="flex-1 flex flex-col justify-center min-h-0 pt-0.5">
            <p
              className={`font-serif text-[14px] leading-relaxed line-clamp-3 text-[var(--color-ink)] font-normal ${
                node.rejected ? 'line-through opacity-50 text-[var(--color-ink-muted)]' : ''
              }`}
            >
              {node.title}
            </p>
          </div>
        )}

        {node.type === 'evidence' && (
          <div className="flex-1 flex flex-col justify-between min-h-0 pt-0.5">
            <p className="font-sans text-[12px] font-normal leading-snug line-clamp-2 text-[var(--color-ink)]">
              {node.title}
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-ink-muted)] pt-2 border-t border-[var(--color-rule)] shrink-0">
              <span className="truncate max-w-[150px] font-mono text-[var(--color-ink-muted)]" title={node.citation}>
                {node.citation}
              </span>
              <span className="capitalize px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[var(--color-ink-muted)] rounded border border-[var(--color-rule)] font-mono font-medium shrink-0">
                {node.form}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
