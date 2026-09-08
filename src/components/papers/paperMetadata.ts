import { Paper } from '../../types';
import { fetchCrossrefMetadata, parseArxivLink } from '../../utils/pdfGenerator';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

export interface PaperTitleMatch {
  doi: string;
  title: string;
  authors: string;
  year?: number;
}

export async function searchPaperTitles(title: string): Promise<PaperTitleMatch[]> {
  const query = title.trim();
  if (query.length < 3 || query.length > 300) throw new Error('Enter a paper title between 3 and 300 characters.');
  const dataciteQuery = new URLSearchParams({
    query: `titles.title:"${query.replace(/["\\]/g, ' ')}"`, 'page[size]': '5'
  });
  const crossrefQuery = new URLSearchParams({ 'query.title': query, rows: '5' });
  const responses = await Promise.allSettled([
    fetch(`https://api.datacite.org/dois?${dataciteQuery}`, { signal: AbortSignal.timeout(12000) })
      .then(async response => {
        if (!response.ok) throw new Error('DataCite title search is unavailable.');
        const payload = await response.json();
        const items: { id?: string; attributes?: { titles?: { title?: string }[]; creators?: { name?: string }[]; publicationYear?: number } }[] =
          Array.isArray(payload.data) ? payload.data : [];
        return items.flatMap(item => typeof item.id === 'string' && typeof item.attributes?.titles?.[0]?.title === 'string'
          ? [{ doi: item.id, title: item.attributes.titles[0].title,
            authors: item.attributes.creators?.map(creator => creator.name).filter(Boolean).join('; ') || '',
            year: item.attributes.publicationYear }] : []);
      }),
    fetch(`https://api.crossref.org/works?${crossrefQuery}`, { signal: AbortSignal.timeout(12000) })
      .then(async response => {
        if (!response.ok) throw new Error('Crossref title search is unavailable.');
        const payload = await response.json();
        const items: { DOI?: string; title?: string[]; author?: { given?: string; family?: string; name?: string }[];
          published?: { 'date-parts'?: number[][] } }[] = Array.isArray(payload.message?.items) ? payload.message.items : [];
        return items.flatMap(item => typeof item.DOI === 'string' && typeof item.title?.[0] === 'string'
          ? [{ doi: item.DOI, title: item.title[0],
            authors: item.author?.map(author => [author.given, author.family].filter(Boolean).join(' ') || author.name).filter(Boolean).join('; ') || '',
            year: item.published?.['date-parts']?.[0]?.[0] }] : []);
      })
  ]);
  const matches = responses.flatMap(response => response.status === 'fulfilled' ? response.value : []);
  if (!matches.length && responses.some(response => response.status === 'rejected')) {
    throw new Error('Title search could not complete. Try again, or import using a DOI or PDF.');
  }
  const unique = new Map(matches.filter(match => paperIdentifier(match.doi)).map(match => [match.doi.toLowerCase(), match]));
  const normalized = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return [...unique.values()].sort((first, second) =>
    Number(normalized(second.title) === normalized(query)) - Number(normalized(first.title) === normalized(query)));
}

export async function readPdfMetadata(source: ArrayBuffer | string): Promise<Partial<Paper>> {
  const task = pdfjsLib.getDocument(typeof source === 'string' ? { url: source } : { data: source });
  try {
    const document = await task.promise;
    const metadata = await document.getMetadata();
    const info = metadata.info as Record<string, unknown>;
    const text: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(2, document.numPages); pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      text.push(content.items.map(item => 'str' in item ? item.str : '').join(' '));
    }
    const embeddedIdentifier = Object.values(info).filter(value => typeof value === 'string').join(' ')
      + ' ' + (metadata.metadata?.getRaw() || '');
    return {
      title: typeof info.Title === 'string' && info.Title.trim() ? info.Title.trim() : undefined,
      authors: typeof info.Author === 'string' && info.Author.trim() ? info.Author.trim() : undefined,
      pageCount: document.numPages,
      doi: identifierFromPdf(embeddedIdentifier) || identifierFromPdf(text.join(' ')) || undefined,
      markdown: `## Extracted opening pages\n\n${text.join('\n\n')}`
    };
  } finally {
    await task.destroy();
  }
}

export function paperIdentifier(input: string): string | null {
  const arxiv = parseArxivLink(input);
  if (arxiv) return `10.48550/arXiv.${arxiv.arxivId.replace(/v\d+$/i, '')}`;
  let value = input.trim().replace(/^doi:\s*/i, '');
  if (/^https?:\/\//i.test(value)) {
    try { value = decodeURIComponent(new URL(value).pathname); } catch { return null; }
  }
  return value.match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/i)?.[0].replace(/[.,;]+$/, '') || null;
}

export function identifierFromPdf(text: string): string | null {
  const doi = paperIdentifier(text);
  if (doi) return doi;
  const arxiv = text.match(/arxiv:\s*([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?|[a-z-]+(?:\.[a-z-]+)?\/[0-9]{7}(?:v[0-9]+)?)/i);
  return arxiv ? paperIdentifier(arxiv[0]) : null;
}

export async function fetchPaperMetadata(input: string): Promise<Partial<Paper>> {
  const doi = paperIdentifier(input);
  if (!doi) {
    if (/^https?:\/\/.+\.pdf(?:[?#].*)?$/i.test(input.trim())) {
      const local = await readPdfMetadata(input.trim());
      const metadata = local.doi ? await fetchPaperMetadata(local.doi) : {};
      return { ...local, ...metadata, pdfUrl: input.trim(), url: metadata.url || input.trim() };
    }
    throw new Error('No DOI or arXiv identifier found. Use a DOI, an arXiv link, or upload the PDF.');
  }
  const arxiv = parseArxivLink(input) || parseArxivLink(doi);
  const crossref = arxiv ? null : await fetchCrossrefMetadata(doi);
  if (crossref) return crossref;
  const response = await fetch(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`, {
    signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Metadata lookup failed (${response.status}). Check the identifier or enter details manually.`);
  const payload = await response.json();
  const data = payload?.data?.attributes;
  if (!data || !Array.isArray(data.titles) || typeof data.titles[0]?.title !== 'string') {
    throw new Error('The metadata service returned no paper title. Enter details manually.');
  }
  const creators: { givenName?: string; familyName?: string; name?: string }[] = Array.isArray(data.creators) ? data.creators : [];
  const names = creators.map(creator => [creator.givenName, creator.familyName].filter(Boolean).join(' ') || creator.name)
    .filter((name): name is string => typeof name === 'string' && !!name);
  const descriptions: { descriptionType?: string; description?: string }[] = Array.isArray(data.descriptions) ? data.descriptions : [];
  const abstract = descriptions.find(description => description.descriptionType === 'Abstract')?.description;
  const year = Number(data.publicationYear);
  return {
    doi,
    title: data.titles[0].title,
    authors: names.join(', ') || undefined,
    year: Number.isInteger(year) && year > 0 ? year : undefined,
    citation: [names[0], Number.isInteger(year) && year > 0 ? `(${year})` : '', arxiv ? 'arXiv' : ''].filter(Boolean).join(' '),
    abstract: typeof abstract === 'string' ? abstract.replace(/<[^>]+>/g, '').trim() : undefined,
    url: arxiv?.absUrl || (typeof data.url === 'string' && /^https?:\/\//i.test(data.url) ? data.url : `https://doi.org/${doi}`),
    pdfUrl: arxiv?.pdfUrl
  };
}
