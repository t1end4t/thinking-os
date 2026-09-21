import assert from 'node:assert/strict';
import test from 'node:test';
import { searchPapers } from './discovery.mjs';
import { expandQueries } from './discoveryAgent.mjs';

const work = { DOI: '10.1234/PAPER', title: ['A real API record'], author: [{ given: 'Ada', family: 'Author' }], published: { 'date-parts': [[2024]] }, abstract: '<jats:p>First line.\nSecond line.</jats:p>' };

test('search uses the brief and explicit queries, validates metadata, and merges provenance', async () => {
  const requests = [];
  const fetchImpl = async url => {
    requests.push(new URL(url));
    return Response.json({ message: { items: [work, { ...work, DOI: '../bad' }, { ...work, title: [] }] } });
  };
  const response = await searchPapers({ brief: 'Ocean ecology', queries: ['coral adaptation'], expand: false }, { fetchImpl, now: () => 123 });
  assert.deepEqual(response.queries, ['Ocean ecology', 'coral adaptation']);
  assert.deepEqual(requests.map(url => url.searchParams.get('query.bibliographic')), response.queries);
  assert.equal(response.results.length, 1);
  assert.deepEqual(response.results[0], { id: response.results[0].id, title: work.title[0], authors: 'Ada Author', year: 2024, doi: '10.1234/paper', url: 'https://doi.org/10.1234/paper', abstract: 'First line.\nSecond line.', source: 'Crossref metadata/abstract (not full text)', queries: response.queries, discoveredAt: 123 });
});

test('search rejects malformed input, provider errors, oversized bodies, and malformed responses', async () => {
  await assert.rejects(searchPapers({ brief: '', queries: [], expand: false }), /brief/);
  await assert.rejects(searchPapers({ brief: 'valid', queries: [''], expand: false }), /queries/);
  await assert.rejects(searchPapers({ brief: 'valid', queries: [], expand: 'yes' }), /expand/);
  const input = { brief: 'valid', queries: [], expand: false };
  await assert.rejects(searchPapers(input, { fetchImpl: async () => new Response('', { status: 429 }) }), /429/);
  await assert.rejects(searchPapers(input, { fetchImpl: async () => Response.json({}) }), /response/);
  await assert.rejects(searchPapers(input, { fetchImpl: async () => new Response('a'.repeat(2_000_001)) }), /large/);
});

test('optional agent expansion only adds validated search queries', async () => {
  const response = await searchPapers({ brief: 'Ocean ecology', queries: [], expand: true }, {
    expand: async () => ['marine ecosystem'], fetchImpl: async () => Response.json({ message: { items: [work] } })
  });
  assert.deepEqual(response.queries, ['Ocean ecology', 'marine ecosystem']);
  let settings;
  let options;
  const queries = await expandQueries('Ocean ecology', [], { createCodex: value => {
    settings = value;
    return { startThread: value => { options = value; return { run: async () => ({ finalResponse: '{"queries":["marine ecosystem"]}' }) }; } };
  } });
  assert.deepEqual(queries, ['marine ecosystem']);
  assert.equal(settings.codexPathOverride, 'codex');
  assert.equal(settings.config.model_provider, '9router');
  assert.equal(options.sandboxMode, 'read-only');
  assert.equal(options.approvalPolicy, 'never');
  assert.equal(options.networkAccessEnabled, false);
  assert.match(options.workingDirectory, /thinking-os-discovery-/);
});
