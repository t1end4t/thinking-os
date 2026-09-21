import { createHash } from 'node:crypto';

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_BUDGET = { perLane: 20, maxCandidates: 64, crossrefVerifications: 20 };
const MAX_LEXICAL_LANES = 4;

const clean = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const decodeXml = value => clean(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (_, code) => {
  if (code === 'amp') return '&';
  if (code === 'lt') return '<';
  if (code === 'gt') return '>';
  if (code === 'quot') return '"';
  if (code === 'apos') return "'";
  const hexadecimal = code[1]?.toLowerCase() === 'x';
  return String.fromCodePoint(Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10));
}));
const normalizeDoi = value => clean(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase();
const normalizeTitle = value => clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const candidateId = value => createHash('sha256').update(value).digest('hex');

async function readBody(response, provider, limit = 4_000_000) {
  if (!response.ok) throw Object.assign(new Error(`${provider} failed (HTTP ${response.status}).`), { status: response.status });
  if (!response.body) throw new Error(`${provider} returned an empty response.`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error(`${provider} response exceeded ${limit} bytes.`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function request(url, provider, { fetchImpl, signal, sleep }) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000);
      const response = await fetchImpl(url, { signal: requestSignal, headers: { accept: 'application/json, application/atom+xml;q=0.9', 'user-agent': 'Thinking-OS/0.1 paper-scout' } });
      if (response.ok) return { response, attempt };
      if (!TRANSIENT_STATUS.has(response.status) || attempt === 3) {
        throw Object.assign(new Error(`${provider} failed (HTTP ${response.status}).`), { status: response.status, attempts: attempt });
      }
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * (2 ** (attempt - 1)), signal);
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') throw error;
      lastError = Object.assign(error instanceof Error ? error : new Error(String(error)), { attempts: attempt });
      if (attempt === 3) throw error;
      await sleep(250 * (2 ** (attempt - 1)), signal);
    }
  }
  throw lastError ?? new Error(`${provider} request failed.`);
}

function openAlexAbstract(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) return '';
  return Object.entries(index).flatMap(([word, positions]) => Array.isArray(positions) ? positions.map(position => [position, word]) : [])
    .filter(([position]) => Number.isInteger(position)).sort((first, second) => first[0] - second[0]).map(([, word]) => word).join(' ');
}

function openAlexCandidate(work, query, lane, retrievedAt) {
  const title = clean(work?.title);
  const openAlexId = clean(work?.id).split('/').pop();
  const doi = normalizeDoi(work?.doi);
  if (!title || !openAlexId) return null;
  const authors = Array.isArray(work.authorships) ? work.authorships.map(item => clean(item?.author?.display_name)).filter(Boolean).join(', ') : '';
  const abstract = openAlexAbstract(work.abstract_inverted_index);
  const identities = [{ kind: 'openalex', value: openAlexId, source: 'OpenAlex', canonical: !doi }];
  if (doi) identities.unshift({ kind: 'doi', value: doi, source: 'OpenAlex', canonical: true });
  const location = clean(work?.best_oa_location?.landing_page_url);
  if (location) identities.push({ kind: 'url', value: location, source: 'OpenAlex' });
  return { id: candidateId(doi || `openalex:${openAlexId}`), title, authors, ...(Number.isInteger(work.publication_year) ? { year: work.publication_year } : {}),
    ...(abstract ? { abstract } : {}), identities, matchingQueries: [query], sources: ['OpenAlex'],
    provenance: [{ provider: 'OpenAlex', lane, query, retrievedAt }], metadataConflicts: [], limitations: abstract ? [] : ['OpenAlex abstract unavailable.'], assessmentState: 'unscreened' };
}

function tag(entry, name) {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(entry);
  return match ? decodeXml(match[1]) : '';
}

function tags(entry, name) {
  return [...entry.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'gi'))].map(match => decodeXml(match[1])).filter(Boolean);
}

function arxivCandidates(xml, query, retrievedAt) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(match => {
    const entry = match[1];
    const title = tag(entry, 'title');
    const rawId = tag(entry, 'id');
    const arxivId = /\/abs\/([^v]+)(?:v\d+)?$/i.exec(rawId)?.[1];
    if (!title || !arxivId) return null;
    const doi = normalizeDoi(tag(entry, 'arxiv:doi'));
    const identities = [{ kind: 'arxiv', value: arxivId, source: 'arXiv', canonical: !doi }, { kind: 'url', value: rawId, source: 'arXiv' }];
    if (doi) identities.unshift({ kind: 'doi', value: doi, source: 'arXiv', canonical: true });
    const published = Date.parse(tag(entry, 'published'));
    return { id: candidateId(doi || `arxiv:${arxivId}`), title, authors: tags(entry, 'name').join(', '),
      ...(Number.isFinite(published) ? { year: new Date(published).getUTCFullYear() } : {}), abstract: tag(entry, 'summary'), identities,
      matchingQueries: [query], sources: ['arXiv'], provenance: [{ provider: 'arXiv', lane: 'recent-preprint', query, retrievedAt }],
      metadataConflicts: [], limitations: ['arXiv presence does not verify peer review or acceptance.'], assessmentState: 'unscreened' };
  }).filter(Boolean);
}

function crossrefCandidate(message, candidate, retrievedAt) {
  const doi = normalizeDoi(message?.DOI);
  if (!doi) throw new Error('Crossref DOI lookup returned no DOI.');
  const title = clean(Array.isArray(message.title) ? message.title[0] : '');
  const authors = Array.isArray(message.author) ? message.author.map(author => clean(author?.name) || clean(`${author?.given ?? ''} ${author?.family ?? ''}`)).filter(Boolean).join(', ') : '';
  const abstract = decodeXml(message.abstract ?? '');
  const year = message.published?.['date-parts']?.[0]?.[0] ?? message.issued?.['date-parts']?.[0]?.[0];
  const conflicts = [...candidate.metadataConflicts];
  if (title && normalizeTitle(title) !== normalizeTitle(candidate.title)) conflicts.push({ field: 'title', values: [candidate.title, title], sources: ['discovery', 'Crossref'] });
  return { ...candidate, title: title || candidate.title, authors: authors || candidate.authors, ...(Number.isInteger(year) ? { year } : {}),
    ...(abstract ? { abstract } : {}), identities: mergeIdentities(candidate.identities, [{ kind: 'doi', value: doi, source: 'Crossref', canonical: true }]),
    sources: [...new Set([...candidate.sources, 'Crossref'])], provenance: [...candidate.provenance, { provider: 'Crossref', lane: 'doi-verification', query: doi, retrievedAt }],
    metadataConflicts: conflicts, limitations: candidate.limitations.filter(item => !abstract || !item.includes('abstract unavailable')) };
}

const mergeIdentities = (first, second) => [...new Map([...first, ...second].map(identity => [`${identity.kind}:${identity.value.toLowerCase()}`, identity])).values()];
function mergeCandidate(first, second) {
  return { ...first, authors: first.authors || second.authors, ...(first.year ? {} : second.year ? { year: second.year } : {}),
    ...(first.abstract ? {} : second.abstract ? { abstract: second.abstract } : {}), identities: mergeIdentities(first.identities, second.identities),
    matchingQueries: [...new Set([...first.matchingQueries, ...second.matchingQueries])], sources: [...new Set([...first.sources, ...second.sources])],
    provenance: [...first.provenance, ...second.provenance], metadataConflicts: [...first.metadataConflicts, ...second.metadataConflicts],
    limitations: [...new Set([...first.limitations, ...second.limitations])] };
}

function mergeCandidates(candidates) {
  const merged = [];
  for (const candidate of candidates) {
    const durableKeys = candidate.identities.filter(identity => ['doi', 'arxiv', 'openalex'].includes(identity.kind))
      .map(identity => `${identity.kind}:${identity.value.toLowerCase()}`);
    const fallbackKeys = candidate.identities.filter(identity => identity.kind === 'url').map(identity => `url:${identity.value.toLowerCase()}`);
    const durable = durableKeys.length > 0;
    const index = merged.findIndex(item => {
      const itemDurableKeys = item.identities.filter(identity => ['doi', 'arxiv', 'openalex'].includes(identity.kind))
        .map(identity => `${identity.kind}:${identity.value.toLowerCase()}`);
      const itemDurable = itemDurableKeys.length > 0;
      if (durableKeys.some(key => itemDurableKeys.includes(key))) return true;
      if (durable && itemDurable) return false;
      const fallbackMatch = item.identities.some(identity => fallbackKeys.includes(`url:${identity.value.toLowerCase()}`));
      return fallbackMatch || normalizeTitle(item.title) === normalizeTitle(candidate.title);
    });
    if (index < 0) merged.push(candidate);
    else merged[index] = mergeCandidate(merged[index], candidate);
  }
  return merged;
}

export async function retrieveScoutCandidates(brief, { fetchImpl = fetch, now = Date.now, sleep = (milliseconds, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, milliseconds);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); }, { once: true });
}), signal, budget = DEFAULT_BUDGET } = {}) {
  const attempts = [];
  const limitations = [];
  const candidates = [];
  const searchDirections = brief.searchDirections.slice(0, MAX_LEXICAL_LANES);
  if (brief.searchDirections.length > searchDirections.length) limitations.push(`Only the first ${MAX_LEXICAL_LANES} search directions were executed within the initial provider budget.`);
  const lanes = [
    ...searchDirections.map(direction => ({ provider: 'OpenAlex', lane: 'lexical', query: direction.query, parameter: 'search' })),
    { provider: 'OpenAlex', lane: 'semantic', query: brief.question, parameter: 'search.semantic' },
    { provider: 'arXiv', lane: 'recent-preprint', query: brief.searchDirections[0]?.query ?? brief.question }
  ];
  let previousOpenAlexAt = 0;
  for (const lane of lanes) {
    const startedAt = now();
    let attemptCount = 1;
    try {
      if (lane.provider === 'OpenAlex' && previousOpenAlexAt) await sleep(1000, signal);
      const url = lane.provider === 'OpenAlex'
        ? new URL(`https://api.openalex.org/works?${new URLSearchParams({ [lane.parameter]: lane.query, 'per-page': String(budget.perLane) })}`)
        : new URL(`https://export.arxiv.org/api/query?${new URLSearchParams({ search_query: `all:"${lane.query}"`, start: '0', max_results: String(budget.perLane), sortBy: 'submittedDate', sortOrder: 'descending' })}`);
      const { response, attempt } = await request(url, `${lane.provider} ${lane.lane}`, { fetchImpl, signal, sleep });
      attemptCount = attempt;
      const body = await readBody(response, `${lane.provider} ${lane.lane}`);
      const found = lane.provider === 'OpenAlex'
        ? (JSON.parse(body).results ?? []).map(work => openAlexCandidate(work, lane.query, lane.lane, now())).filter(Boolean)
        : arxivCandidates(body, lane.query, now());
      candidates.push(...found);
      if (lane.provider === 'OpenAlex') previousOpenAlexAt = now();
      attempts.push({ provider: lane.provider, lane: lane.lane, query: lane.query, status: 'completed', attempts: attempt, resultCount: found.length, startedAt, completedAt: now(), truncated: found.length >= budget.perLane });
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') throw error;
      attempts.push({ provider: lane.provider, lane: lane.lane, query: lane.query, status: 'failed', attempts: error?.attempts ?? attemptCount, resultCount: 0, startedAt, completedAt: now(), error: error instanceof Error ? error.message : String(error), truncated: false });
      limitations.push(`${lane.provider} ${lane.lane} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  let merged = mergeCandidates(candidates).slice(0, budget.maxCandidates);
  let verificationCount = 0;
  for (const candidate of merged) {
    const doi = candidate.identities.find(identity => identity.kind === 'doi')?.value;
    if (!doi || verificationCount >= budget.crossrefVerifications) continue;
    verificationCount++;
    const startedAt = now();
    let attemptCount = 1;
    try {
      const url = `https://api.crossref.org/works/${doi.split('/').map(encodeURIComponent).join('/')}`;
      const { response, attempt } = await request(url, 'Crossref DOI verification', { fetchImpl, signal, sleep });
      attemptCount = attempt;
      const message = JSON.parse(await readBody(response, 'Crossref DOI verification')).message;
      const updated = crossrefCandidate(message, candidate, now());
      merged = merged.map(item => item.id === candidate.id ? updated : item);
      attempts.push({ provider: 'Crossref', lane: 'doi-verification', query: doi, status: 'completed', attempts: attempt, resultCount: 1, startedAt, completedAt: now(), truncated: false });
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') throw error;
      attempts.push({ provider: 'Crossref', lane: 'doi-verification', query: doi, status: 'failed', attempts: error?.attempts ?? attemptCount, resultCount: 0, startedAt, completedAt: now(), error: error instanceof Error ? error.message : String(error), truncated: false });
      limitations.push(`Crossref DOI verification failed for ${doi}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { candidates: merged, retrievedCount: candidates.length, normalizedCount: merged.length, attempts, limitations,
    partial: limitations.length > 0, executedQueries: [...new Set(lanes.map(lane => lane.query))] };
}
