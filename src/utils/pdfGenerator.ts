import { Paper } from '../types';

/**
 * Escapes characters for PDF literal strings in parentheses ( ... )
 */
function escapePdfText(str: string): string {
  // Convert any non-ASCII characters to closest ASCII or clean replacement
  const asciiClean = str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x20-\x7E\n]/g, ' ');

  return asciiClean
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Generates a clean, compliant PDF 1.4 vector document for any paper.
 */
export function buildPaperPdfString(paper: Paper): string {
  const title = paper.title || 'Untitled Paper';
  const authors = paper.authors || 'Unknown Authors';
  const year = paper.year || new Date().getFullYear();
  const citation = paper.citation || `${authors.split(',')[0]} (${year})`;
  const doi = paper.doi ? `DOI: ${paper.doi}` : '';
  const text = paper.markdown || '';

  const catalogIdx = 1;
  const pagesIdx = 2;
  const fontRegularIdx = 3;
  const fontBoldIdx = 4;
  const fontItalicIdx = 5;

  const pageIndices: number[] = [];
  const contentIndices: number[] = [];

  // Split lines and word wrap
  const allLines = text.split(/\r?\n/);
  const linesPerPage = 42;
  const pagesData: string[][] = [];
  let currentLines: string[] = [];

  // Prepend Abstract if provided
  if (paper.abstract && !text.toLowerCase().includes('abstract')) {
    currentLines.push('### Abstract');
    currentLines.push(paper.abstract);
    currentLines.push('');
  }

  for (const rawLine of allLines) {
    const line = rawLine.trimEnd();
    if (line.length > 85) {
      const words = line.split(' ');
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).length > 85) {
          currentLines.push(cur.trim());
          cur = w;
        } else {
          cur += (cur ? ' ' : '') + w;
        }
      }
      if (cur.trim()) currentLines.push(cur.trim());
    } else {
      currentLines.push(line);
    }
    if (currentLines.length >= linesPerPage) {
      pagesData.push(currentLines);
      currentLines = [];
    }
  }
  if (currentLines.length > 0 || pagesData.length === 0) {
    pagesData.push(currentLines);
  }

  const totalPages = pagesData.length;
  let nextObjId = 6;
  for (let i = 0; i < totalPages; i++) {
    pageIndices.push(nextObjId++);
    contentIndices.push(nextObjId++);
  }

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets: number[] = [0];

  function writeObject(id: number, body: string) {
    offsets[id] = new TextEncoder().encode(pdf).length;
    pdf += `${id} 0 obj\n${body}\nendobj\n`;
  }

  // Catalog
  writeObject(catalogIdx, `<< /Type /Catalog /Pages ${pagesIdx} 0 R >>`);
  // Pages
  const kidsStr = pageIndices.map(id => `${id} 0 R`).join(' ');
  writeObject(pagesIdx, `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`);
  // Standard Type 1 fonts
  writeObject(fontRegularIdx, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  writeObject(fontBoldIdx, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  writeObject(fontItalicIdx, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');

  for (let p = 0; p < totalPages; p++) {
    const pageObjId = pageIndices[p];
    const contentObjId = contentIndices[p];

    writeObject(
      pageObjId,
      `<< /Type /Page /Parent ${pagesIdx} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontRegularIdx} 0 R /F2 ${fontBoldIdx} 0 R /F3 ${fontItalicIdx} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );

    let stream = 'BT\n';
    let y = 730;

    // Running Header
    stream += `/F1 8 Tf\n0.4 0.4 0.4 rg\n54 754 Td\n(${escapePdfText(title.slice(0, 55))}${title.length > 55 ? '...' : ''}) Tj\nET\n`;
    stream += '0.5 w 0.8 0.8 0.8 RG 54 746 m 558 746 l S\n';

    // Running Footer
    stream += '0.5 w 0.8 0.8 0.8 RG 54 48 m 558 48 l S\n';
    stream += `BT\n/F1 8 Tf\n0.4 0.4 0.4 rg\n270 36 Td\n(Page ${p + 1} of ${totalPages}) Tj\nET\n`;
    if (citation) {
      stream += `BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n54 36 Td\n(${escapePdfText(citation)}) Tj\nET\n`;
    }

    // Title banner on Page 1
    if (p === 0) {
      const titleLines: string[] = [];
      if (title.length > 55) {
        const words = title.split(' ');
        let l1 = '';
        let l2 = '';
        for (const w of words) {
          if ((l1 + ' ' + w).length <= 50 && !l2) {
            l1 += (l1 ? ' ' : '') + w;
          } else {
            l2 += (l2 ? ' ' : '') + w;
          }
        }
        titleLines.push(l1, l2);
      } else {
        titleLines.push(title);
      }

      for (const tline of titleLines) {
        stream += `BT\n/F2 16 Tf\n0.05 0.1 0.15 rg\n54 ${y} Td\n(${escapePdfText(tline)}) Tj\nET\n`;
        y -= 22;
      }

      y -= 4;
      stream += `BT\n/F2 10 Tf\n0.2 0.25 0.3 rg\n54 ${y} Td\n(${escapePdfText(authors)}) Tj\nET\n`;
      y -= 16;

      const metaSub = [citation, year ? String(year) : '', doi].filter(Boolean).join(' - ');
      stream += `BT\n/F3 9 Tf\n0.35 0.4 0.45 rg\n54 ${y} Td\n(${escapePdfText(metaSub)}) Tj\nET\n`;
      y -= 18;

      stream += `0.75 w 0.7 0.75 0.8 RG 54 ${y} m 558 ${y} l S\n`;
      y -= 16;
    }

    // Body Lines
    const lines = pagesData[p];
    for (const rawLine of lines) {
      if (y < 62) break;
      const clean = rawLine.trim();
      if (!clean) {
        y -= 8;
        continue;
      }
      if (clean.startsWith('### ') || clean.startsWith('## ') || clean.startsWith('# ')) {
        y -= 8;
        const headingText = clean.replace(/^#+\s*/, '');
        stream += `BT\n/F2 11 Tf\n0.1 0.15 0.25 rg\n54 ${y} Td\n(${escapePdfText(headingText)}) Tj\nET\n`;
        y -= 15;
      } else {
        stream += `BT\n/F1 9.5 Tf\n0.12 0.15 0.18 rg\n54 ${y} Td\n(${escapePdfText(clean)}) Tj\nET\n`;
        y -= 12.5;
      }
    }

    const streamBytes = new TextEncoder().encode(stream).length;
    writeObject(contentObjId, `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`);
  }

  const startxref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${nextObjId}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < nextObjId; i++) {
    const offsetStr = String(offsets[i] || 0).padStart(10, '0');
    pdf += `${offsetStr} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${nextObjId} /Root ${catalogIdx} 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return pdf;
}

/**
 * Returns a Blob with application/pdf MIME for any paper.
 */
export function getPaperPdfBlob(paper: Paper): Blob {
  const pdfString = buildPaperPdfString(paper);
  const uint8 = new TextEncoder().encode(pdfString);
  return new Blob([uint8], { type: 'application/pdf' });
}

/**
 * Cache for generated paper object URLs to prevent memory leak and repeated rebuilds.
 */
const pdfUrlCache = new Map<string, string>();

export function getPaperPdfUrl(paper: Paper): string {
  // If paper has uploaded data URL
  if (paper.pdfDataUrl) return paper.pdfDataUrl;
  // If paper has an explicit remote/local PDF url
  if (paper.pdfUrl) return parseArxivLink(paper.pdfUrl)?.pdfUrl || paper.pdfUrl;

  // Generate on the fly and cache
  const cacheKey = `${paper.id}-${paper.markdown.length}-${paper.title}`;
  if (pdfUrlCache.has(cacheKey)) {
    return pdfUrlCache.get(cacheKey)!;
  }
  const blob = getPaperPdfBlob(paper);
  const objectUrl = URL.createObjectURL(blob);
  pdfUrlCache.set(cacheKey, objectUrl);
  return objectUrl;
}

/**
 * Fetches academic paper metadata from CrossRef using a DOI.
 */
export async function fetchCrossrefMetadata(doiRaw: string): Promise<Partial<Paper> | null> {
  const cleanDoi = doiRaw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
  if (!cleanDoi) return null;

  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const item = json.message;
    if (!item) return null;

    const title = Array.isArray(item.title) ? item.title[0] : item.title || cleanDoi;
    const authorsList = (item.author || []).map((a: { given?: string; family?: string; name?: string }) => {
      if (a.family && a.given) return `${a.given} ${a.family}`;
      return a.name || a.family || 'Author';
    });
    const authors = authorsList.join(', ') || 'Unknown Authors';
    const year = item.published?.['date-parts']?.[0]?.[0] || item.issued?.['date-parts']?.[0]?.[0];
    const journal = Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'] || '';
    const citation = `${authorsList[0]?.split(' ').pop() || 'Author'}${year ? ` (${year})` : ''} ${journal ? `in ${journal}` : ''}`.trim();
    const abstract = (item.abstract || '').replace(/<[^>]+>/g, '').trim();

    return {
      title,
      authors,
      year: year ? Number(year) : undefined,
      citation,
      doi: cleanDoi,
      url: item.URL || `https://doi.org/${cleanDoi}`,
      pdfUrl: item.link?.find((link: { 'content-type'?: string; URL?: string }) => link['content-type'] === 'application/pdf')?.URL,
      abstract: abstract || undefined,
      journal: journal || undefined
    };
  } catch (err) {
    console.warn('Failed to fetch from Crossref:', err);
    return null;
  }
}

/**
 * Parses arXiv URL or identifier into canonical arXiv endpoints.
 */
export function parseArxivLink(input: string): { arxivId: string; pdfUrl: string; absUrl: string } | null {
  const match = /^(?:(?:https?:\/\/(?:www\.|export\.)?arxiv\.org\/(?:abs|pdf|html)\/)|(?:https?:\/\/doi\.org\/)?10\.48550\/arxiv\.|arxiv:\s*)?([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?|[a-z-]+(?:\.[a-z-]+)?\/[0-9]{7}(?:v[0-9]+)?)(?:\.pdf)?(?:[?#].*)?$/i.exec(input.trim());
  if (!match) return null;
  const arxivId = match[1];
  return {
    arxivId,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    absUrl: `https://arxiv.org/abs/${arxivId}`
  };
}
