import React from 'react';
import { LayoutNode } from './computeLayout';
import { AlertCircle, ArrowRight, Ban, GripVertical, Pencil, Plus } from 'lucide-react';

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
  // GHOST node: interactive argument gap card leading to Detail view
  if (node.isGhost) {
    return (
      <button
        type="button"
        id={`node-${node.id}`}
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height
        }}
        onMouseDown={e => {
          e.stopPropagation();
        }}
        onPointerDown={e => {
          e.stopPropagation();
        }}
        onClick={e => {
          e.stopPropagation();
          onClick();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        title="Argument Gap: Click to resolve and edit in Detail tab"
        className={`absolute border-2 border-dashed border-[var(--color-missing)] bg-[var(--accent-rose-soft)] rounded-xl p-3 flex flex-col justify-between gap-2 text-left cursor-pointer select-none transition-shadow duration-150 group shadow-2xs hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-missing)] pointer-events-auto z-10 ${
          isDimmed ? 'opacity-25' : ''
        }`}
      >
        <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-missing)] shrink-0">
          <AlertCircle size={12} className="shrink-0" />
          Argument Gap
        </span>

        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-[var(--color-ink)] font-semibold leading-tight">
            {node.title}
          </span>
          <span className="text-[0.7188rem] text-[var(--color-ink-muted)]">
            Needs {node.ghostType === 'claim' ? 'answering claim' : 'grounding evidence'}
          </span>
        </span>

        <span className="w-full pt-1.5 border-t border-[var(--color-missing)]/25 flex items-center justify-between gap-2 shrink-0 text-[0.6875rem] font-mono">
          <span className="inline-flex items-center gap-1 text-[var(--color-missing)] font-semibold group-hover:underline">
            <Plus size={12} className="shrink-0" /> Add {node.ghostType === 'claim' ? 'Claim' : 'Evidence'}
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--color-ink-muted)]">
            Open Detail <ArrowRight size={11} className="shrink-0" />
          </span>
        </span>
      </button>
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
      onPointerDown={e => {
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
      title={`[${node.type.toUpperCase()}] ${node.title}\nClick to edit in Detail view | Drag to Assistant Dock`}
      className={`absolute pointer-events-auto cursor-pointer border rounded-lg transition-all duration-150 select-none overflow-hidden bg-[var(--color-surface)] group ${stateClasses} ${opacityClass}`}
    >
      <div className="p-3 flex flex-col justify-between h-full relative">
        {/* Quick Action Buttons on Hover (Top Right) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-30">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onClick();
            }}
            title="Edit in Detail view"
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-[var(--color-rule)] shadow-2xs transition-colors flex items-center gap-0.5 text-[0.7188rem] font-mono font-semibold cursor-pointer"
          >
            <Pencil className="w-2.5 h-2.5" />
            <span>Edit</span>
          </button>
          {onAddToContext && (
            <button
              onClick={e => {
                e.stopPropagation();
                onAddToContext(e);
              }}
              title="Attach to Assistant context (+ Context)"
              className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-[var(--color-rule)] shadow-2xs transition-colors flex items-center gap-0.5 text-[0.7188rem] font-mono font-semibold cursor-pointer"
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
        <div className="flex items-center justify-between gap-1 mb-1.5 shrink-0 pr-12">
          <span className="font-mono text-[0.7188rem] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[var(--color-ink-muted)] border border-[var(--color-rule)]">
            {node.type}
          </span>

          {node.type !== 'question' && node.tags && node.tags.length > 0 && (
            <div className="flex items-center gap-1 truncate">
              {node.tags.map(t => (
                <span
                  key={t}
                  className="font-mono text-[0.7188rem] text-[var(--color-ink-muted)] bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-[var(--color-rule)]"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {node.rejected && (
            <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-mono text-[0.7188rem] uppercase font-semibold flex items-center gap-1 shrink-0">
              <Ban className="w-2.5 h-2.5" />
              Rejected
            </span>
          )}
        </div>

        {/* Body Content based on Node Type: Hierarchical Typography */}
        {node.type === 'question' && (
          <div className="flex-1 flex flex-col justify-between min-h-0 pt-0.5">
            <h3 className="font-serif text-[1.0625rem] sm:text-[1.125rem] font-semibold leading-snug line-clamp-2 text-[var(--color-ink)]" title={node.title}>
              {node.title}
            </h3>

            {node.tags && node.tags.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1.5 mt-auto border-t border-[var(--color-rule)]/60 flex-wrap shrink-0">
                {node.tags.map(t => (
                  <span
                    key={t}
                    className="font-mono text-[0.7188rem] text-[var(--color-ink-muted)] bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-[var(--color-rule)]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {node.type === 'claim' && (
          <div className="flex-1 flex flex-col justify-center min-h-0 pt-0.5">
            <p
              className={`font-serif text-[0.9375rem] sm:text-[0.9688rem] leading-snug line-clamp-3 text-[var(--color-ink)] font-normal ${
                node.rejected ? 'line-through opacity-50 text-[var(--color-ink-muted)]' : ''
              }`}
              title={node.title}
            >
              {node.title}
            </p>
          </div>
        )}

        {node.type === 'evidence' && (
          <div className="flex-1 flex flex-col justify-between min-h-0 pt-0.5">
            <p
              className="font-sans text-[0.8125rem] sm:text-[0.8438rem] font-normal leading-snug line-clamp-2 text-[var(--color-ink)]"
              title={node.title}
            >
              {node.title}
            </p>

            <div className="flex items-center justify-between text-[0.7188rem] font-mono text-[var(--color-ink-muted)] pt-1.5 border-t border-[var(--color-rule)] shrink-0 mt-auto">
              <span className="truncate max-w-[170px] font-mono text-[var(--color-ink-muted)]" title={node.citation}>
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
