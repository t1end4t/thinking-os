import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Columns,
  Square,
  Printer,
  ExternalLink,
  BookMarked,
  Image,
  Table2,
  Lightbulb
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const PreprintView: React.FC = () => {
  const { manuscript } = useWorkspace();
  const [twoColumn, setTwoColumn] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<'tex' | 'md' | null>(null);

  const { meta, sections, artifacts, citations } = manuscript;

  // Generate LaTeX document
  const generateLatex = () => {
    let tex = `\\documentclass[10pt,twocolumn,letterpaper]{article}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{hyperref}

\\title{${meta.title}}
\\author{
${meta.authors.map(a => `  ${a.name} \\\\ \\small ${a.affiliation}`).join(' \\and\n')}
}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
${meta.abstract}
\\end{abstract}

\\textbf{Keywords:} ${meta.keywords.join(', ')}

`;

    sections.forEach(sec => {
      tex += `\\section{${sec.title}}\n`;
      tex += `${sec.content}\n\n`;
    });

    tex += `\\bibliographystyle{plain}\n\\bibliography{references}\n\\end{document}\n`;
    return tex;
  };

  // Generate Markdown document
  const generateMarkdown = () => {
    let md = `# ${meta.title}\n\n`;
    if (meta.subtitle) md += `*${meta.subtitle}*\n\n`;
    md += `**Authors:** ${meta.authors.map(a => `${a.name} (${a.affiliation})`).join(', ')}\n\n`;
    md += `**Target Venue:** ${meta.targetVenue} | **Status:** ${meta.status}\n\n`;
    md += `## Abstract\n${meta.abstract}\n\n`;
    md += `**Keywords:** ${meta.keywords.join(', ')}\n\n---\n\n`;

    sections.forEach(sec => {
      md += `## ${sec.sectionNumber} ${sec.title}\n\n`;
      md += `${sec.content}\n\n`;
    });

    md += `## References\n\n`;
    citations.forEach(c => {
      md += `- [${c.key}] **${c.authors}** (${c.year}). *${c.title}*. ${c.venue}.${c.doi ? ` DOI: ${c.doi}` : ''}\n`;
    });

    return md;
  };

  const copyLatex = () => {
    navigator.clipboard.writeText(generateLatex());
    setCopiedFormat('tex');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopiedFormat('md');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-paper)]/50 overflow-hidden">
      {/* Top Bar for Preprint Controls */}
      <div className="px-6 py-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex items-center justify-between gap-4 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[0.7rem] font-mono font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
            {meta.targetVenue}
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">
            Preprint Reader Mode · {sections.length} Sections
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Column toggle */}
          <button
            onClick={() => setTwoColumn(!twoColumn)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-[var(--color-rule)] transition-colors ${
              twoColumn
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
            }`}
            title="Toggle 2-column academic layout"
          >
            {twoColumn ? <Columns size={13} /> : <Square size={13} />}
            {twoColumn ? '2-Column' : '1-Column'}
          </button>

          {/* Copy Markdown */}
          <button
            onClick={copyMarkdown}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)] hover:bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors"
          >
            {copiedFormat === 'md' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            Copy Markdown
          </button>

          {/* Download LaTeX */}
          <button
            onClick={() => downloadFile(generateLatex(), 'manuscript.tex', 'text/x-tex')}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs font-medium transition-colors"
          >
            <Download size={13} />
            Export .tex
          </button>
        </div>
      </div>

      {/* Main Manuscript Paper Sheet */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <article
          id="academic-preprint-sheet"
          className="max-w-4xl mx-auto bg-[var(--color-surface)] border border-[var(--color-rule)] rounded-xl shadow-lg p-8 md:p-14 space-y-8"
        >
          {/* Title & Metadata Block */}
          <header className="text-center space-y-4 pb-6 border-b border-[var(--color-rule)]">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[var(--color-ink)] tracking-tight leading-tight">
              {meta.title}
            </h1>
            {meta.subtitle && (
              <p className="font-serif text-base text-[var(--color-ink-muted)] italic max-w-2xl mx-auto">
                {meta.subtitle}
              </p>
            )}

            {/* Authors */}
            <div className="flex flex-wrap justify-center gap-6 pt-2">
              {meta.authors.map((author, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-xs font-semibold text-[var(--color-ink)]">{author.name}</div>
                  <div className="text-[0.7rem] text-[var(--color-ink-muted)]">{author.affiliation}</div>
                  {author.email && (
                    <div className="text-[0.65rem] font-mono text-[var(--color-ink-muted)]">{author.email}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="inline-block px-3 py-1 rounded-full text-[0.68rem] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-[var(--color-ink-muted)]">
              Target: {meta.targetVenue} · Status: {meta.status.toUpperCase()}
            </div>
          </header>

          {/* Abstract Block */}
          <section className="max-w-2xl mx-auto px-4 py-4 rounded-xl bg-[var(--color-paper)]/60 border border-[var(--color-rule)] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-center text-[var(--color-ink)] font-mono">
              Abstract
            </h3>
            <p className="font-serif text-xs md:text-sm text-[var(--color-ink)] leading-relaxed text-justify">
              {meta.abstract}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-1.5 justify-center">
              <span className="text-[0.68rem] font-mono font-semibold text-[var(--color-ink-muted)]">Keywords:</span>
              {meta.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-[0.65rem] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-rule)] text-[var(--color-ink)]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </section>

          {/* Sections List (with 1-column or 2-column styling) */}
          <div className={`space-y-8 ${twoColumn ? 'md:columns-2 md:gap-8' : ''}`}>
            {sections.map(sec => {
              const secArtifacts = artifacts.filter(a => sec.attachedArtifactIds.includes(a.id));

              return (
                <section
                  key={sec.id}
                  className="space-y-4 break-inside-avoid-column"
                >
                  {/* Section Title */}
                  <div className="border-b border-[var(--color-rule)]/60 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {sec.sectionNumber}
                      </span>
                      <h2 className="font-serif text-lg font-bold text-[var(--color-ink)]">
                        {sec.title}
                      </h2>
                    </div>
                  </div>

                  {/* Body text */}
                  <div className="font-serif text-xs md:text-sm leading-relaxed text-[var(--color-ink)] space-y-3 whitespace-pre-wrap">
                    {sec.content}
                  </div>

                  {/* Embedded Artifacts for this section */}
                  {secArtifacts.length > 0 && (
                    <div className="my-4 space-y-4 not-prose">
                      {secArtifacts.map(art => (
                        <div
                          key={art.id}
                          className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper)]/40 space-y-3"
                        >
                          {/* Figure rendering */}
                          {art.type === 'figure' && art.figure && (
                            <div className="space-y-2">
                              <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-rule)]">
                                <div className="h-28 flex items-end gap-3 px-3 pt-3 border-b border-[var(--color-rule)]">
                                  {art.figure.dataPoints?.map((pt, i) => {
                                    const heightPct = Math.min(100, Math.max(12, (pt.value / 100) * 100));
                                    const baselineHeight = pt.baseline
                                      ? Math.min(100, Math.max(8, (pt.baseline / 100) * 100))
                                      : null;
                                    return (
                                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                        <div className="w-full flex items-end justify-center gap-1 h-20">
                                          {baselineHeight !== null && (
                                            <div
                                              style={{ height: `${baselineHeight}%` }}
                                              className="w-3 bg-slate-300 dark:bg-slate-700 rounded-t-xs"
                                              title={`Baseline: ${pt.baseline}`}
                                            />
                                          )}
                                          <div
                                            style={{ height: `${heightPct}%` }}
                                            className="w-4 bg-indigo-600 rounded-t-xs"
                                            title={`Value: ${pt.value}`}
                                          />
                                        </div>
                                        <span className="text-[0.62rem] font-mono text-[var(--color-ink-muted)]">
                                          {pt.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex justify-between items-center text-[0.65rem] text-[var(--color-ink-muted)] px-2 pt-1 font-mono">
                                  <span>{art.figure.xAxisLabel}</span>
                                  <span>{art.figure.yAxisLabel}</span>
                                </div>
                              </div>

                              <figcaption className="text-xs text-[var(--color-ink)] font-serif italic text-center">
                                <strong className="font-semibold not-italic font-mono">{art.badge || 'Figure'}:</strong>{' '}
                                {art.figure.caption}
                              </figcaption>
                            </div>
                          )}

                          {/* Table rendering */}
                          {art.type === 'table' && art.table && (
                            <div className="space-y-2">
                              <div className="overflow-x-auto rounded-lg border border-[var(--color-rule)] bg-[var(--color-surface)]">
                                <table className="w-full text-xs font-mono">
                                  <thead>
                                    <tr className="bg-[var(--color-paper)] border-b border-[var(--color-rule)] text-[var(--color-ink)]">
                                      {art.table.headers.map((h, i) => (
                                        <th key={i} className="p-2 text-left font-semibold">
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {art.table.rows.map((row, ri) => (
                                      <tr
                                        key={ri}
                                        className="border-b border-[var(--color-rule)]/50 hover:bg-[var(--color-paper)]/30"
                                      >
                                        {row.map((cell, ci) => (
                                          <td key={ci} className="p-2 text-[var(--color-ink)]">
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <caption className="block text-xs text-[var(--color-ink)] font-serif italic text-center">
                                <strong className="font-semibold not-italic font-mono">{art.badge || 'Table'}:</strong>{' '}
                                {art.table.caption}
                              </caption>
                            </div>
                          )}

                          {/* Fact callout rendering */}
                          {art.type === 'fact' && art.factMetric && (
                            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border-l-4 border-amber-500 space-y-1">
                              <div className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                                📌 {art.title}: {art.factMetric}
                              </div>
                              {art.factContext && (
                                <p className="text-xs font-serif text-[var(--color-ink)]">
                                  {art.factContext}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* References / Bibliography Section */}
          <footer className="pt-8 border-t border-[var(--color-rule)] space-y-4">
            <h2 className="font-serif text-lg font-bold text-[var(--color-ink)]">
              References
            </h2>
            <div className="space-y-3 font-serif text-xs leading-relaxed">
              {citations.map((cit, idx) => (
                <div key={cit.key} className="flex gap-2">
                  <span className="font-mono text-[var(--color-ink-muted)] shrink-0 select-none">
                    [{idx + 1}]
                  </span>
                  <div>
                    <span className="font-semibold text-[var(--color-ink)]">{cit.authors}</span> ({cit.year}).{' '}
                    <span className="italic">{cit.title}</span>. In <em>{cit.venue}</em>.{' '}
                    {cit.doi && (
                      <span className="font-mono text-[0.68rem] text-teal-600 dark:text-teal-400">
                        doi:{cit.doi}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
};
