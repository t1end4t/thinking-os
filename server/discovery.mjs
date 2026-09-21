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
  const decodeEntities = text => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
    if (code[0] === '#') {
      const hexadecimal = code[1]?.toLowerCase() === 'x';
      const point = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : entity;
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[code.toLowerCase()];
  });
  const script = (text, characters, prefix) => {
    const content = decodeEntities(text.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    return [...content].every(character => characters[character]) ? [...content].map(character => characters[character]).join('') : `${prefix}${content}`;
  };
  const superscript = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾' };
  const subscript = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎' };
  return decodeEntities(value
    .replace(/<(?:[\w.-]+:)?sup\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?sup>/gi, (_, text) => script(text, superscript, '^'))
    .replace(/<(?:[\w.-]+:)?sub\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?sub>/gi, (_, text) => script(text, subscript, '_'))
    .replace(/<\/(?:[\w.-]+:)?(?:title|p|sec|list-item|disp-quote)>/gi, '\u0000')
    .replace(/<(?:[\w.-]+:)?br\b[^>]*\/?>/gi, '\u0001')
    .replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .replace(/ *\u0000+ */g, '\n\n')
    .replace(/ *\u0001 */g, '\n')
    .replace(/ (?=[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎^_])/g, '')
    .replace(/ +([,.;:!?%)\]])/g, '$1')
    .trim();
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
