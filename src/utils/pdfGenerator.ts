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
  if (paper.pdfUrl) return paper.pdfUrl;

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
    const year = item.created?.['date-parts']?.[0]?.[0] || item.published?.['date-parts']?.[0]?.[0] || new Date().getFullYear();
    const journal = Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'] || '';
    const citation = `${authorsList[0]?.split(' ').pop() || 'Author'} (${year}) ${journal ? `in ${journal}` : ''}`.trim();
    const abstract = (item.abstract || '').replace(/<[^>]+>/g, '').trim();

    return {
      title,
      authors,
      year: Number(year),
      citation,
      doi: cleanDoi,
      url: item.URL || `https://doi.org/${cleanDoi}`,
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
  const match = /(?:arxiv\.org\/(?:abs|pdf)\/|arxiv:)?([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i.exec(input.trim());
  if (!match) return null;
  const arxivId = match[1];
  return {
    arxivId,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
    absUrl: `https://arxiv.org/abs/${arxivId}`
  };
}

/**
 * Seminal benchmark papers available to add with a single click.
 */
export const PRESET_PAPERS: Array<Omit<Paper, 'id'> & { presetId: string }> = [
  {
    presetId: 'preset-attention',
    title: 'Attention Is All You Need',
    authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin',
    year: 2017,
    citation: 'NeurIPS 2017 Oral Presentation',
    pageCount: 15,
    doi: '10.48550/arXiv.1706.03762',
    url: 'https://arxiv.org/abs/1706.03762',
    pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
    markdown: `# Attention Is All You Need

## Abstract
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.

## 1. Introduction
Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling. Recurrent models typically factor computation along the symbol positions of the input and output sequences. This sequentially generates a stream of hidden states, which precludes parallelization within training examples.

## 2. Model Architecture
The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.

### 2.1 Scaled Dot-Product Attention
We call our particular attention "Scaled Dot-Product Attention". The input consists of queries and keys of dimension $d_k$, and values of dimension $d_v$. We compute the matrix of outputs as:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right) V$$

### 2.2 Multi-Head Attention
Instead of performing a single attention function with $d_{\\text{model}}$-dimensional keys, queries and values, we found it beneficial to linearly project the queries, keys and values $h$ times with different, learned linear projections to $d_k$, $d_k$ and $d_v$ dimensions.

## 3. Results & Evaluation
On the WMT 2014 English-to-German translation task, the big transformer model outperforms the best previously reported models (including ensembles) by more than 2.0 BLEU, establishing a new state-of-the-art BLEU score of 28.4.`,
    sections: [
      { id: 'sec-att-1', title: 'Abstract', paragraphs: [{ id: 'par-att-1' }] },
      { id: 'sec-att-2', title: '1. Introduction', paragraphs: [{ id: 'par-att-2' }] },
      { id: 'sec-att-3', title: '2. Model Architecture', paragraphs: [{ id: 'par-att-3' }] },
      { id: 'sec-att-4', title: '3. Results & Evaluation', paragraphs: [{ id: 'par-att-4' }] }
    ],
    highlights: []
  },
  {
    presetId: 'preset-flashattention',
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    authors: 'Tri Dao, Daniel Y. Fu, Stefano Ermon, Atri Rudra, Christopher Ré',
    year: 2022,
    citation: 'NeurIPS 2022 Proceedings',
    pageCount: 16,
    doi: '10.48550/arXiv.2205.14135',
    url: 'https://arxiv.org/abs/2205.14135',
    pdfUrl: 'https://arxiv.org/pdf/2205.14135.pdf',
    abstract: 'Transformers are slow and memory-hungry on long sequences, since the time and memory complexity of self-attention are quadratic in sequence length. Approximate attention methods have attempted to address this, but often trade off model quality. We argue that a missing principle is making attention algorithms IO-aware: accounting for reads and writes between levels of GPU memory.',
    markdown: `# FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness

## Abstract
Transformers are slow and memory-hungry on long sequences, since the time and memory complexity of self-attention are quadratic in sequence length. Approximate attention methods have attempted to address this, but often trade off model quality. We argue that a missing principle is making attention algorithms IO-aware: accounting for reads and writes between levels of GPU memory (SRAM vs. HBM). We propose FlashAttention, an IO-aware exact attention algorithm that uses tiling to reduce the number of memory reads/writes between GPU High Bandwidth Memory (HBM) and GPU on-chip SRAM.

## 1. IO-Aware Hardware Efficiency
On modern GPUs (e.g. A100), compute speed has dramatically outpaced memory bandwidth. Standard attention materializes $N \\times N$ attention matrices in HBM, requiring $O(N^2)$ memory accesses. FlashAttention computes exact softmax in tiled blocks residing entirely in fast SRAM (19 TB/s), avoiding intermediate HBM round-trips.

## 2. Algorithmic Breakthrough: Tiling & Recomputation
FlashAttention splits inputs $Q, K, V$ into blocks, loads them from slow HBM to fast SRAM, and computes attention output with respect to that block. By scaling softmax normalization incrementally via online softmax, it yields mathematical exactness with zero approximation loss. In the backward pass, attention matrices are recomputed on-the-fly from SRAM blocks rather than stored in HBM.

## 3. Benchmarks & Speedups
FlashAttention trains GPT-2 up to 3x faster than Megatron-LM baselines and scales Transformers to 64K sequences with no memory overflow.`,
    sections: [
      { id: 'sec-fa-1', title: 'Abstract', paragraphs: [{ id: 'par-fa-1' }] },
      { id: 'sec-fa-2', title: '1. IO-Aware Hardware Efficiency', paragraphs: [{ id: 'par-fa-2' }] },
      { id: 'sec-fa-3', title: '2. Algorithmic Breakthrough', paragraphs: [{ id: 'par-fa-3' }] }
    ],
    highlights: []
  },
  {
    presetId: 'preset-dpo',
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
    authors: 'Rafael Rafailov, Archit Sharma, Eric Mitchell, Stefano Ermon, Christopher D. Manning, Chelsea Finn',
    year: 2023,
    citation: 'NeurIPS 2023 Outstanding Paper',
    pageCount: 14,
    doi: '10.48550/arXiv.2305.18290',
    url: 'https://arxiv.org/abs/2305.18290',
    pdfUrl: 'https://arxiv.org/pdf/2305.18290.pdf',
    abstract: 'While large-scale unsupervised language models learn broad world knowledge and reasoning skills, steering their behaviors precisely is challenging due to the unconstrained nature of their training. Existing techniques rely on reinforcement learning from human feedback (RLHF), which is complex and often unstable. We introduce Direct Preference Optimization (DPO), an algorithm to implicitly optimize the policy directly on preference data without fitting a separate reward model or sampling during training.',
    markdown: `# Direct Preference Optimization: Your Language Model is Secretly a Reward Model

## Abstract
While large-scale unsupervised language models learn broad world knowledge and reasoning skills, steering their behaviors precisely is challenging due to the unconstrained nature of their training. Existing techniques rely on reinforcement learning from human feedback (RLHF), which is complex and often unstable. We introduce Direct Preference Optimization (DPO), an algorithm to implicitly optimize the policy directly on preference data without fitting a separate reward model or sampling during training.

## 1. Introduction & RLHF Limitations
Standard RLHF pipelines require three stages: (1) Supervised Fine-Tuning (SFT), (2) Fitting a Bradley-Terry reward model on pairwise preferences $y_w \\succ y_l$, and (3) Optimizing the policy via PPO with KL regularization against the reference policy $\\pi_{\\text{ref}}$. PPO is notoriously sensitive to hyperparameter choices, value function collapse, and mode dropping.

## 2. Derivation of DPO
We show that the constrained RL objective has an exact closed-form solution:
$$r^*(x, y) = \\beta \\log \\frac{\\pi^*(y|x)}{\\pi_{\\text{ref}}(y|x)} + \\beta \\log Z(x)$$
Substituting this analytical ground-truth reward into the Bradley-Terry preference likelihood yields the DPO loss:
$$\\mathcal{L}_{\\text{DPO}}(\\pi_\\theta; \\pi_{\\text{ref}}) = -\\mathbb{E}_{(x, y_w, y_l)} \\left[ \\log \\sigma \\left( \\beta \\log \\frac{\\pi_\\theta(y_w|x)}{\\pi_{\\text{ref}}(y_w|x)} - \\beta \\log \\frac{\\pi_\\theta(y_l|x)}{\\pi_{\\text{ref}}(y_l|x)} \\right) \\right]$$

## 3. Results
DPO matches or outperforms PPO on summarization and dialogue while being computationally lightweight and dramatically simpler to implement.`,
    sections: [
      { id: 'sec-dpo-1', title: 'Abstract', paragraphs: [{ id: 'par-dpo-1' }] },
      { id: 'sec-dpo-2', title: '1. Introduction', paragraphs: [{ id: 'par-dpo-2' }] },
      { id: 'sec-dpo-3', title: '2. Derivation of DPO', paragraphs: [{ id: 'par-dpo-3' }] }
    ],
    highlights: []
  }
];
