import { createHash } from 'node:crypto';
import { expandQueries } from './discoveryAgent.mjs';

export function validateSearch(input) {
  if (!input || typeof input !== 'object' || typeof input.brief !== 'string' || !input.brief.trim() || input.brief.length > 4000) throw new Error('brief must contain 1–4000 characters.');
  if (!Array.isArray(input.queries) || input.queries.length > 8 || !input.queries.every(query => typeof query === 'string' && query.trim() && query.length <= 300)) throw new Error('queries must contain at most eight non-empty strings of up to 300 characters.');
  if (typeof input.expand !== 'boolean') throw new Error('expand must be boolean.');
  return { brief: input.brief, queries: [...new Set(input.queries.map(query => query.trim()))], expand: input.expand };
}

function plainText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity]).trim();
}

export function paperFromCrossref(item, query, discoveredAt) {
  if (!item || typeof item !== 'object') return null;
  const doi = typeof item.DOI === 'string' ? item.DOI.toLowerCase().trim() : '';
  const title = Array.isArray(item.title) ? plainText(item.title[0]) : '';
  const year = (item.published ?? item.issued)?.['date-parts']?.[0]?.[0];
  if (!/^10\.\d{4,9}\/[^\s\x00-\x1f]+$/.test(doi) || doi.length > 500 || !title || title.length > 4000 || !Number.isInteger(year) || year < 1000 || year > new Date().getFullYear() + 2) return null;
  const authors = Array.isArray(item.author) ? item.author.slice(0, 200).map(author => plainText(author?.name) || [plainText(author?.given), plainText(author?.family)].filter(Boolean).join(' ')).filter(Boolean).join(', ') : '';
  const abstract = plainText(item.abstract).slice(0, 100_000);
  return {
    id: createHash('sha256').update(doi).digest('hex'), title, authors, year, doi,
    url: `https://doi.org/${doi.split('/').map(encodeURIComponent).join('/')}`,
    ...(abstract ? { abstract } : {}), source: abstract ? 'Crossref metadata/abstract (not full text)' : 'Crossref metadata (abstract unavailable; not full text)',
    queries: [query], discoveredAt
  };
}

async function responseJson(response) {
  if (!response.ok) throw new Error(`Crossref search failed (HTTP ${response.status}).`);
  if (!response.body) throw new Error('Empty Crossref response.');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('Crossref response too large.');
    chunks.push(chunk);
  }
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!Array.isArray(data?.message?.items)) throw new Error('Invalid Crossref response.');
  return data.message.items;
}

export async function searchPapers(input, { fetchImpl = fetch, expand = expandQueries, now = Date.now, signal } = {}) {
  const request = validateSearch(input);
  const additions = request.expand ? await expand(request.brief, request.queries, { signal }) : [];
  if (!Array.isArray(additions) || additions.length > 4 || !additions.every(query => typeof query === 'string' && query.trim() && query.length <= 300)) throw new Error('Invalid expanded queries.');
  const queries = [...new Set([request.brief.trim(), ...request.queries, ...additions.map(query => query.trim())])];
  const papers = new Map();
  for (const query of queries) {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query.bibliographic', query);
    url.searchParams.set('rows', '20');
    const timeout = AbortSignal.timeout(20_000);
    const response = await fetchImpl(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, redirect: 'error', headers: { accept: 'application/json', 'user-agent': 'ThinkingOS/0.1 (local literature discovery)' } });
    for (const item of await responseJson(response)) {
      const paper = paperFromCrossref(item, query, now());
      if (!paper) continue;
      const previous = papers.get(paper.id);
      papers.set(paper.id, previous ? { ...previous, queries: [...new Set([...previous.queries, query])] } : paper);
    }
  }
  return { results: [...papers.values()], queries };
}
