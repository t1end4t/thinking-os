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
  color?: 'indigo' | 'amber' | 'emerald' | 'teal' | 'rose' | 'violet' | 'sky' | 'purple';
  className?: string;
}

const COLOR_MAP: Record<string, {
  hoverTrigger: string;
  hoverTriggerCorner: string;
  hoverTriggerSubtle: string;
  border: string;
  iconBg: string;
  categoryText: string;
  badge: string;
  bullet: string;
}> = {
  rose: {
    hoverTrigger: 'hover:bg-rose-600 hover:text-white hover:border-rose-600',
    hoverTriggerCorner: 'hover:bg-rose-600 hover:text-white hover:border-rose-600',
    hoverTriggerSubtle: 'hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60',
    border: 'border-rose-200 dark:border-rose-900/60',
    iconBg: 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400',
    categoryText: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300',
    bullet: 'text-rose-500 dark:text-rose-400',
  },
  violet: {
    hoverTrigger: 'hover:bg-violet-600 hover:text-white hover:border-violet-600',
    hoverTriggerCorner: 'hover:bg-violet-600 hover:text-white hover:border-violet-600',
    hoverTriggerSubtle: 'hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/60',
    border: 'border-violet-200 dark:border-violet-900/60',
    iconBg: 'bg-violet-50 dark:bg-violet-950/80 border-violet-200 dark:border-violet-800/80 text-violet-600 dark:text-violet-400',
    categoryText: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300',
    bullet: 'text-violet-500 dark:text-violet-400',
  },
  amber: {
    hoverTrigger: 'hover:bg-amber-600 hover:text-white hover:border-amber-600',
    hoverTriggerCorner: 'hover:bg-amber-600 hover:text-white hover:border-amber-600',
    hoverTriggerSubtle: 'hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-900/60',
    iconBg: 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400',
    categoryText: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300',
    bullet: 'text-amber-500 dark:text-amber-400',
  },
  emerald: {
    hoverTrigger: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
    hoverTriggerCorner: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
    hoverTriggerSubtle: 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60',
    border: 'border-emerald-200 dark:border-emerald-900/60',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400',
    categoryText: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
    bullet: 'text-emerald-500 dark:text-emerald-400',
  },
  teal: {
    hoverTrigger: 'hover:bg-teal-600 hover:text-white hover:border-teal-600',
    hoverTriggerCorner: 'hover:bg-teal-600 hover:text-white hover:border-teal-600',
    hoverTriggerSubtle: 'hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60',
    border: 'border-teal-200 dark:border-teal-900/60',
    iconBg: 'bg-teal-50 dark:bg-teal-950/80 border-teal-200 dark:border-teal-800/80 text-teal-600 dark:text-teal-400',
    categoryText: 'text-teal-600 dark:text-teal-400',
    badge: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300',
    bullet: 'text-teal-500 dark:text-teal-400',
  },
  sky: {
    hoverTrigger: 'hover:bg-sky-600 hover:text-white hover:border-sky-600',
    hoverTriggerCorner: 'hover:bg-sky-600 hover:text-white hover:border-sky-600',
    hoverTriggerSubtle: 'hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60',
    border: 'border-sky-200 dark:border-sky-900/60',
    iconBg: 'bg-sky-50 dark:bg-sky-950/80 border-sky-200 dark:border-sky-800/80 text-sky-600 dark:text-sky-400',
    categoryText: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300',
    bullet: 'text-sky-500 dark:text-sky-400',
  },
  purple: {
    hoverTrigger: 'hover:bg-purple-600 hover:text-white hover:border-purple-600',
    hoverTriggerCorner: 'hover:bg-purple-600 hover:text-white hover:border-purple-600',
    hoverTriggerSubtle: 'hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/60',
    border: 'border-purple-200 dark:border-purple-900/60',
    iconBg: 'bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-400',
    categoryText: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300',
    bullet: 'text-purple-500 dark:text-purple-400',
  },
  indigo: {
    hoverTrigger: 'hover:bg-indigo-600 hover:text-white hover:border-indigo-600',
    hoverTriggerCorner: 'hover:bg-indigo-600 hover:text-white hover:border-indigo-600',
    hoverTriggerSubtle: 'hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60',
    border: 'border-indigo-200 dark:border-indigo-900/60',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400',
    categoryText: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300',
    bullet: 'text-indigo-500 dark:text-indigo-400',
  }
};

export const TabHelpTip: React.FC<TabHelpTipProps> = ({
  title,
  category = 'Interaction Guide',
  summary,
  tips,
  shortcut,
  placement = 'bottom',
  variant = 'inline',
  color = 'indigo',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | HTMLSpanElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const theme = COLOR_MAP[color] || COLOR_MAP.indigo;

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
            ? `absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-2xs ${theme.hoverTriggerCorner} hover:scale-115 cursor-help z-20`
            : variant === 'subtle'
            ? `w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 ${theme.hoverTriggerSubtle} cursor-help ml-1 shrink-0`
            : `w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 ${theme.hoverTrigger} hover:scale-110 shadow-2xs cursor-help ml-1 shrink-0`
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
            className={`animate-in fade-in zoom-in-95 duration-150 rounded-xl bg-[var(--color-surface)] dark:bg-slate-900 border ${theme.border} shadow-xl p-3 text-xs text-[var(--color-ink)] select-none pointer-events-auto`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                  <Lightbulb size={12} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-[0.8125rem] text-[var(--color-ink)] truncate leading-tight">
                    {title}
                  </h4>
                  <span className={`text-[0.65rem] font-mono tracking-wider uppercase font-semibold ${theme.categoryText}`}>
                    {category}
                  </span>
                </div>
              </div>
              <span className={`w-4 h-4 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${theme.badge}`}>
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
                <MousePointerClick size={11} className={theme.bullet} />
                <span>How to interact</span>
              </div>
              <ul className="space-y-1 pl-1">
                {tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[0.7188rem] leading-snug text-[var(--color-ink)]">
                    <span className={`text-xs font-bold leading-none mt-0.5 ${theme.bullet}`}>•</span>
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
