import assert from 'node:assert/strict';
import test from 'node:test';
import { retrieveScoutCandidates } from './scoutRetrieval.mjs';

const brief = {
  question: 'Which TinyML training methods reduce memory use?',
  purpose: 'Choose a reproducible experiment.',
  scope: ['On-device training'], exclusions: [], constraints: [],
  searchDirections: [{ query: 'TinyML on-device training memory', reason: 'Direct terminology' }],
  screeningCriteria: ['Must discuss training'], maxRecommendations: 5,
  createdFrom: { kind: 'user', reference: 'fixture' }, author: 'user',
  id: 'scout-brief-fixture', createdAt: 1, updatedAt: 1
};

const openAlexWork = {
  id: 'https://openalex.org/W123', doi: 'https://doi.org/10.1234/TINY', title: 'Memory-aware TinyML training',
  publication_year: 2025, authorships: [{ author: { display_name: 'Ada Author' } }],
  abstract_inverted_index: { 'Memory-aware': [0], training: [1], works: [2] },
  best_oa_location: { landing_page_url: 'https://example.org/paper' }
};

const arxivFeed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry><id>http://arxiv.org/abs/2501.01234v2</id><updated>2025-02-02T00:00:00Z</updated><published>2025-01-01T00:00:00Z</published>
  <title>Memory-aware TinyML training</title><summary>Training with bounded activation memory.</summary>
  <author><name>Ada Author</name></author><arxiv:doi>10.1234/tiny</arxiv:doi></entry>
</feed>`;

test('retrieval runs lexical, semantic, arXiv, and Crossref lanes then merges provenance', async () => {
  const urls = [];
  const fetchImpl = async input => {
    const url = new URL(input);
    urls.push(url);
    if (url.hostname === 'api.openalex.org') return Response.json({ meta: { count: 1 }, results: [openAlexWork] });
    if (url.hostname === 'export.arxiv.org') return new Response(arxivFeed, { headers: { 'content-type': 'application/atom+xml' } });
    if (url.hostname === 'api.crossref.org') return Response.json({ message: { DOI: '10.1234/tiny', title: ['Memory-aware TinyML training'],
      author: [{ given: 'Ada', family: 'Author' }], published: { 'date-parts': [[2025]] }, abstract: '<p>Verified abstract.</p>' } });
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await retrieveScoutCandidates(brief, { fetchImpl, now: () => 1000, sleep: async () => {} });
  assert.equal(result.candidates.length, 1);
  const candidate = result.candidates[0];
  assert.equal(candidate.title, openAlexWork.title);
  assert.equal(candidate.abstract, 'Verified abstract.');
  assert.deepEqual(candidate.sources.sort(), ['Crossref', 'OpenAlex', 'arXiv']);
  assert.deepEqual(candidate.matchingQueries, ['TinyML on-device training memory', brief.question]);
  assert.equal(candidate.identities.some(identity => identity.kind === 'doi' && identity.value === '10.1234/tiny'), true);
  assert.equal(candidate.identities.some(identity => identity.kind === 'arxiv' && identity.value === '2501.01234'), true);
  assert.equal(candidate.provenance.length, 4);
  assert.equal(result.partial, false);
  assert.equal(urls.filter(url => url.hostname === 'api.openalex.org' && url.searchParams.has('search')).length, 1);
  assert.equal(urls.filter(url => url.hostname === 'api.openalex.org' && url.searchParams.has('search.semantic')).length, 1);
  assert.equal(urls.filter(url => url.hostname === 'api.crossref.org').length, 1);
});

test('retrieval retries transient failures and returns explicit partial coverage', async () => {
  const attempts = new Map();
  const fetchImpl = async input => {
    const url = new URL(input);
    const key = `${url.hostname}:${url.searchParams.has('search.semantic') ? 'semantic' : 'other'}`;
    attempts.set(key, (attempts.get(key) ?? 0) + 1);
    if (url.hostname === 'api.openalex.org' && url.searchParams.has('search.semantic')) return new Response('', { status: 503 });
    if (url.hostname === 'api.openalex.org') return Response.json({ meta: { count: 1 }, results: [openAlexWork] });
    if (url.hostname === 'export.arxiv.org') return new Response(arxivFeed);
    if (url.hostname === 'api.crossref.org') return Response.json({ message: { DOI: '10.1234/tiny', title: ['Memory-aware TinyML training'], author: [], published: { 'date-parts': [[2025]] } } });
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await retrieveScoutCandidates(brief, { fetchImpl, now: () => 1000, sleep: async () => {} });
  assert.equal(attempts.get('api.openalex.org:semantic'), 3);
  assert.equal(result.partial, true);
  assert.match(result.limitations.join(' '), /OpenAlex semantic/);
  assert.equal(result.attempts.some(attempt => attempt.provider === 'OpenAlex' && attempt.status === 'failed'), true);
  assert.equal(result.candidates.length, 1);
});

test('same-title works with conflicting durable identities remain separate', async () => {
  const second = { ...openAlexWork, id: 'https://openalex.org/W999', doi: 'https://doi.org/10.9999/other' };
  const fetchImpl = async input => {
    const url = new URL(input);
    if (url.hostname === 'api.openalex.org') return Response.json({ meta: { count: 2 }, results: [openAlexWork, second] });
    if (url.hostname === 'export.arxiv.org') return new Response('<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>');
    if (url.hostname === 'api.crossref.org') {
      const doi = decodeURIComponent(url.pathname.slice('/works/'.length));
      return Response.json({ message: { DOI: doi, title: ['Memory-aware TinyML training'], author: [], published: { 'date-parts': [[2025]] } } });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  const result = await retrieveScoutCandidates(brief, { fetchImpl, sleep: async () => {} });
  assert.equal(result.candidates.length, 2);
});
