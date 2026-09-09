import React, { useMemo } from 'react';
import { common, createLowlight } from 'lowlight';
import { CopyButton } from './CopyButton';
import './markdown.css';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const lowlight = createLowlight(common);

function renderTokens(nodes: ReturnType<typeof lowlight.highlight>['children']): React.ReactNode {
  return nodes.map((node, index) => node.type === 'text' ? node.value : node.type === 'element'
    ? <span key={index} className={Array.isArray(node.properties.className) ? node.properties.className.join(' ') : undefined}>{renderTokens(node.children)}</span>
    : null);
}

const HighlightedCode: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const highlighted = useMemo(() => lowlight.registered(language.toLowerCase()) && code.length <= 100000
    ? renderTokens(lowlight.highlight(language.toLowerCase(), code).children) : code, [code, language]);
  return <code className="syntax-code">{highlighted}</code>;
};

interface TableData {
  headers: string[];
  rows: string[][];
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = '' }) => {
  const blocks = useMemo(() => {
    if (!content.trim()) return [];

    const lines = content.split('\n');
    const result: Array<
      | { type: 'heading'; level: number; text: string }
      | { type: 'code'; language: string; code: string }
      | { type: 'blockquote'; text: string }
      | { type: 'bullet-list'; items: string[] }
      | { type: 'ordered-list'; items: string[] }
      | { type: 'table'; data: TableData }
      | { type: 'hr' }
      | { type: 'paragraph'; text: string }
    > = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Code block
      if (line.trim().startsWith('```')) {
        const language = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        result.push({
          type: 'code',
          language: language || 'text',
          code: codeLines.join('\n')
        });
        continue;
      }

      // Horizontal rule
      if (/^(---|___|\*\*\*)\s*$/.test(line.trim())) {
        result.push({ type: 'hr' });
        i++;
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        result.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2].trim()
        });
        i++;
        continue;
      }

      // Blockquotes
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() && !lines[i].startsWith('#')))) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        result.push({
          type: 'blockquote',
          text: quoteLines.join('\n')
        });
        continue;
      }

      // Unordered list
      if (/^(\s*)[-*+]\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^(\s*)[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^(\s*)[-*+]\s+/, ''));
          i++;
        }
        result.push({
          type: 'bullet-list',
          items
        });
        continue;
      }

      // Ordered list
      if (/^(\s*)\d+\.\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^(\s*)\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^(\s*)\d+\.\s+/, ''));
          i++;
        }
        result.push({
          type: 'ordered-list',
          items
        });
        continue;
      }

      // Table detection
      if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s-:|]+\|?\s*$/.test(lines[i + 1])) {
        const parseRow = (rowStr: string) =>
          rowStr
            .split('|')
            .map(s => s.trim())
            .filter((s, idx, arr) => (idx !== 0 || s) && (idx !== arr.length - 1 || s));

        const headers = parseRow(line);
        i += 2; // skip header and divider
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        result.push({
          type: 'table',
          data: { headers, rows }
        });
        continue;
      }

      // Empty line
      if (!line.trim()) {
        i++;
        continue;
      }

      // Paragraph (accumulate until blank line or block)
      const pLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].match(/^(#{1,6})\s+/) &&
        !lines[i].startsWith('>') &&
        !/^(\s*)[-*+]\s+/.test(lines[i]) &&
        !/^(\s*)\d+\.\s+/.test(lines[i]) &&
        !/^(---|___|\*\*\*)\s*$/.test(lines[i].trim())
      ) {
        pLines.push(lines[i]);
        i++;
      }
      result.push({
        type: 'paragraph',
        text: pLines.join(' ')
      });
    }

    return result;
  }, [content]);

  // Helper to format inline markdown (bold, italic, code, link)
  const renderInline = (text: string) => {
    // Break down inline tokens
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);

    return parts.map((part, idx) => {
      if (!part) return null;

      // Inline code
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded text-[0.8125rem] font-mono bg-[var(--color-rule)]/60 text-[var(--color-ink)] border border-[var(--color-rule)]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Bold
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={idx} className="font-semibold text-[var(--color-ink)]">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={idx} className="italic text-[var(--color-ink)]">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Link
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        try {
          if (!['http:', 'https:', 'mailto:'].includes(new URL(linkMatch[2], 'http://localhost').protocol)) return <span key={idx}>{linkMatch[1]}</span>;
        } catch { return <span key={idx}>{linkMatch[1]}</span>; }
        return (
          <a
            key={idx}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-indigo)] hover:underline font-medium inline-flex items-center gap-0.5"
          >
            {linkMatch[1]}
          </a>
        );
      }

      return <span key={idx}>{part}</span>;
    });
  };

  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center p-12 text-[var(--color-ink-muted)] font-mono text-xs">
        Document is empty
      </div>
    );
  }

  return (
    <div className={`space-y-4 text-[var(--color-ink)] font-sans text-sm leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h1
                  key={idx}
                  className="font-mono text-xl font-bold tracking-tight text-[var(--color-ink)] pb-2 border-b border-[var(--color-rule)] pt-2"
                >
                  {renderInline(block.text)}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={idx}
                  className="font-mono text-base font-bold tracking-tight text-[var(--color-ink)] pb-1.5 border-b border-[var(--color-rule)]/70 pt-3"
                >
                  {renderInline(block.text)}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3 key={idx} className="font-mono text-sm font-semibold text-[var(--color-ink)] pt-2">
                  {renderInline(block.text)}
                </h3>
              );
            }
            return (
              <h4 key={idx} className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] pt-1">
                {renderInline(block.text)}
              </h4>
            );
          }

          case 'code':
            return (
              <div key={idx} className="rounded-lg border border-[var(--color-rule)] overflow-hidden bg-[var(--color-paper)]">
                <div className="flex items-center justify-between gap-2 px-3 py-1 border-b border-[var(--color-rule)] bg-[var(--color-surface)]/60 text-[0.6875rem] font-mono text-[var(--color-ink-muted)]">
                  <span className="uppercase font-semibold tracking-wider">{block.language}</span>
                  <span className="flex items-center gap-1">
                    <span>{block.code.split('\n').length} lines</span>
                    <CopyButton value={block.code} label={`Copy ${block.language} code`} />
                  </span>
                </div>
                <pre className="p-3.5 text-[0.8125rem] font-mono overflow-x-auto text-[var(--color-ink)] leading-normal selection:bg-[var(--accent-indigo-soft)]">
                  <HighlightedCode code={block.code} language={block.language} />
                </pre>
              </div>
            );

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="border-l-3 border-[var(--accent-indigo)] pl-3.5 py-1 text-[var(--color-ink-muted)] italic bg-[var(--accent-indigo-soft)]/20 rounded-r"
              >
                {renderInline(block.text)}
              </blockquote>
            );

          case 'bullet-list':
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5 text-[0.875rem]">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );

          case 'ordered-list':
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1.5 text-[0.875rem]">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            );

          case 'table':
            return (
              <div key={idx} className="overflow-x-auto rounded-lg border border-[var(--color-rule)] my-2">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface)] border-b border-[var(--color-rule)]">
                      {block.data.headers.map((header, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 font-semibold text-[var(--color-ink)]">
                          {renderInline(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.data.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-[var(--color-rule)]/50 last:border-0 hover:bg-[var(--color-paper)]"
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-[var(--color-ink)]">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'hr':
            return <hr key={idx} className="border-t border-[var(--color-rule)] my-4" />;

          case 'paragraph':
          default:
            return (
              <p key={idx} className="text-[0.875rem] leading-relaxed text-[var(--color-ink)]">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
};
