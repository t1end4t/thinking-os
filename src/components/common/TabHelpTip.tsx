import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Lightbulb, MousePointerClick, CornerDownRight, Sparkles } from 'lucide-react';

export interface TabHelpTipProps {
  title: string;
  category?: string;
  summary: string;
  tips: string[];
  shortcut?: string;
  placement?: 'right' | 'bottom' | 'top' | 'left';
  variant?: 'inline' | 'corner' | 'subtle';
  className?: string;
}

export const TabHelpTip: React.FC<TabHelpTipProps> = ({
  title,
  category = 'Interaction Guide',
  summary,
  tips,
  shortcut,
  placement = 'bottom',
  variant = 'inline',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | HTMLSpanElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipEstimatedHeight = 220;
    const padding = 12;

    let top = 0;
    let left = 0;

    if (placement === 'right') {
      top = rect.top + rect.height / 2 - 40;
      left = rect.right + 10;
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2 - 40;
      left = rect.left - tooltipWidth - 10;
    } else if (placement === 'top') {
      top = rect.top - tooltipEstimatedHeight - 8;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else {
      // bottom
      top = rect.bottom + 8;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }

    // Viewport bounding checks
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top + tooltipEstimatedHeight > window.innerHeight - padding) {
      top = window.innerHeight - tooltipEstimatedHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    calculatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
        }}
        aria-label={`Tips for ${title}`}
        className={`inline-flex items-center justify-center transition-all ${
          variant === 'corner'
            ? 'absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-2xs hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:scale-115 cursor-help z-20'
            : variant === 'subtle'
            ? 'w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 cursor-help ml-1 shrink-0'
            : 'w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:scale-110 shadow-2xs cursor-help ml-1 shrink-0'
        } ${className}`}
      >
        ?
      </span>

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '280px',
              zIndex: 99999
            }}
            className="animate-in fade-in zoom-in-95 duration-150 rounded-xl bg-[var(--color-surface)] dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-xl p-3 text-xs text-[var(--color-ink)] select-none pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Lightbulb size={12} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-[0.8125rem] text-[var(--color-ink)] truncate leading-tight">
                    {title}
                  </h4>
                  <span className="text-[0.65rem] font-mono text-indigo-600 dark:text-indigo-400 tracking-wider uppercase font-semibold">
                    {category}
                  </span>
                </div>
              </div>
              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                ?
              </span>
            </div>

            {/* Summary */}
            <p className="text-[0.75rem] text-[var(--color-ink-muted)] mb-2.5 leading-relaxed">
              {summary}
            </p>

            {/* Interaction Tips */}
            <div className="space-y-1.5 mb-2.5">
              <div className="flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-ink)] opacity-80">
                <MousePointerClick size={11} className="text-indigo-500" />
                <span>How to interact</span>
              </div>
              <ul className="space-y-1 pl-1">
                {tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[0.7188rem] leading-snug text-[var(--color-ink)]">
                    <span className="text-indigo-500 dark:text-indigo-400 text-xs font-bold leading-none mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Optional Shortcut or Footer Note */}
            {shortcut && (
              <div className="pt-2 border-t border-[var(--color-rule)] flex items-center justify-between text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                <span>Shortcut / Action</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-[var(--color-rule)] font-bold text-[var(--color-ink)]">
                  {shortcut}
                </span>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
