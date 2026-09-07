import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Copy, Check, Sparkles, Move } from 'lucide-react';
import { AssistantContextObject } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';

interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
  label?: string;
  description?: string;
  draggable?: boolean;
  showAiAction?: boolean;
  contextId?: string;
}

/**
 * Robust KaTeX mathematical formula renderer.
 * Formats LaTeX beautifully, supports copy-to-clipboard,
 * and allows direct drag-and-drop or one-click prompt into the AI Assistant Dock.
 */
export const MathView: React.FC<MathViewProps> = ({
  math,
  block = false,
  className = '',
  label,
  description,
  draggable = true,
  showAiAction = true,
  contextId
}) => {
  const { addAttachedContext, setIsDockOpen } = useWorkspace();
  const [copied, setCopied] = useState(false);

  // Clean raw LaTeX or strip delimiters if passed with $ or $$
  const cleanLatex = useMemo(() => {
    let raw = (math || '').trim();
    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith('$') && raw.endsWith('$')) {
      raw = raw.slice(1, -1).trim();
    }
    return raw;
  }, [math]);

  // Render to HTML using KaTeX
  const html = useMemo(() => {
    if (!cleanLatex) return null;
    try {
      return katex.renderToString(cleanLatex, {
        displayMode: block,
        throwOnError: false,
        strict: false
      });
    } catch {
      return null;
    }
  }, [cleanLatex, block]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cleanLatex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Drag context payload for AssistantDock
  const handleDragStart = (e: React.DragEvent) => {
    const contextObject: AssistantContextObject = {
      type: 'artifact',
      id: contextId || `math-${Date.now()}`,
      label: label || cleanLatex.slice(0, 30),
      secondaryLabel: 'Mathematical Formula',
      metadata: {
        latex: cleanLatex,
        description: description || ''
      }
    };
    e.dataTransfer.setData('application/json', JSON.stringify(contextObject));
    e.dataTransfer.setData('text/plain', `Formula: ${cleanLatex}\n${description || ''}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleAskAi = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDockOpen(true);
    const contextObject: AssistantContextObject = {
      type: 'artifact',
      id: contextId || `math-${Date.now()}`,
      label: label || cleanLatex.slice(0, 30),
      secondaryLabel: 'Mathematical Formula',
      metadata: {
        latex: cleanLatex,
        description: description || ''
      }
    };
    addAttachedContext(contextObject);
  };

  if (!block) {
    return (
      <span
        draggable={draggable}
        onDragStart={handleDragStart}
        title={draggable ? 'Drag formula into AI Assistant dock' : undefined}
        className={`inline-flex items-center gap-1 font-mono text-[var(--color-ink)] ${
          draggable ? 'cursor-grab active:cursor-grabbing hover:bg-sky-500/10 px-1 py-0.5 rounded transition-colors' : ''
        } ${className}`}
      >
        {html ? (
          <span dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{cleanLatex}</code>
        )}
      </span>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      className={`group relative p-3.5 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)]/80 hover:border-sky-500/50 transition-all ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
    >
      {/* Formula Header if label present */}
      {(label || draggable || showAiAction) && (
        <div className="flex items-center justify-between gap-2 mb-2 select-none border-b border-[var(--color-rule)]/40 pb-1.5">
          <div className="flex items-center gap-1.5 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
            {draggable && <Move size={11} className="text-sky-500/80 shrink-0" />}
            <span className="font-semibold text-sky-700 dark:text-sky-400 truncate max-w-[240px]">
              {label || 'Equation'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {showAiAction && (
              <button
                type="button"
                onClick={handleAskAi}
                title="Send formula to AI Assistant dock"
                className="px-2 py-0.5 rounded text-[0.6875rem] font-mono flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-sky-300/40 dark:border-sky-800/60 transition-colors"
              >
                <Sparkles size={11} />
                <span>Ask AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              title="Copy LaTeX"
              className="p-1 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Rendered Equation */}
      <div className="overflow-x-auto py-1 text-center font-serif text-[var(--color-ink)] text-sm md:text-base leading-relaxed select-text">
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code className="font-mono text-xs">{cleanLatex}</code>
        )}
      </div>

      {/* Optional Description / Intuition */}
      {description && (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)] border-t border-[var(--color-rule)]/30 pt-1.5 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

interface FormattedMathTextProps {
  text: string;
  className?: string;
}

/**
 * Intelligent parser that takes prose mixed with LaTeX tokens (e.g. `q \in \mathbb{R}^{d_k}`)
 * and renders the mathematical segments via KaTeX while keeping prose natural and accessible.
 */
export const FormattedMathText: React.FC<FormattedMathTextProps> = ({ text, className = '' }) => {
  const parts = useMemo(() => {
    if (!text) return [];

    // If explicit $...$ notation is used
    if (text.includes('$')) {
      const tokens = text.split(/(\$[^$]+\$)/g);
      return tokens.map((token, i) => {
        if (token.startsWith('$') && token.endsWith('$')) {
          const math = token.slice(1, -1);
          return { type: 'math' as const, content: math, key: i };
        }
        return { type: 'text' as const, content: token, key: i };
      });
    }

    // Heuristic: identify LaTeX math words containing backslashes or mathematical notation
    // Example: "q \in \mathbb{R}^{d_k} and key matrix K \in \mathbb{R}^{N \times d_k}"
    // Match sequences of tokens that form math expressions (containing \, ^, _, {, })
    const regex = /((?:[a-zA-Z0-9_\-\*\+\=\<\>\/\(\)\{\}\^\,\.\:\;]*\\[a-zA-Z]+[a-zA-Z0-9_\-\*\+\=\<\>\/\(\)\{\}\^\,\.\:\;]*)+|[a-zA-Z]\s*\\in\s*[^\s\,]+|[a-zA-Z]_[a-zA-Z0-9]+|[a-zA-Z]\^[a-zA-Z0-9]+)/g;

    const segments: Array<{ type: 'math' | 'text'; content: string; key: number }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
          key: segments.length
        });
      }
      segments.push({
        type: 'math',
        content: match[0],
        key: segments.length
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex),
        key: segments.length
      });
    }

    return segments;
  }, [text]);

  return (
    <span className={`inline-block leading-relaxed ${className}`}>
      {parts.map(part => {
        if (part.type === 'math') {
          return (
            <MathView
              key={part.key}
              math={part.content}
              block={false}
              draggable={true}
              showAiAction={false}
              className="mx-1"
            />
          );
        }
        return <span key={part.key}>{part.content}</span>;
      })}
    </span>
  );
};
