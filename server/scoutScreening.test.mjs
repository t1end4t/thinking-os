import assert from 'node:assert/strict';
import test from 'node:test';
import { assembleScoutReport, invokeScreeningModel, screenScoutCandidates } from './scoutScreening.mjs';

const brief = {
  id: 'scout-brief-screen', question: 'Which methods reduce activation memory during on-device training?',
  purpose: 'Choose a reproducible experiment.', scope: ['On-device training'], exclusions: ['Inference-only'], constraints: [],
  searchDirections: [{ query: 'on-device training activation memory', reason: 'Direct terminology' }],
  screeningCriteria: ['Must concern training'], maxRecommendations: 2,
  createdFrom: { kind: 'user', reference: 'fixture' }, author: 'user', createdAt: 1, updatedAt: 1
};

const candidate = (id, title, abstract) => ({
  id, title, authors: 'Ada Author', year: 2025, ...(abstract === undefined ? {} : { abstract }),
  identities: [{ kind: 'openalex', value: id, source: 'OpenAlex', canonical: true }], matchingQueries: ['query'], sources: ['OpenAlex'],
  provenance: [{ provider: 'OpenAlex', lane: 'lexical', query: 'query', retrievedAt: 1 }], metadataConflicts: [],
  limitations: abstract === undefined ? ['OpenAlex abstract unavailable.'] : [], assessmentState: 'unscreened'
});

const candidates = [
  candidate('candidate-a', 'Activation checkpointing for on-device training', 'Activation checkpointing reduces peak memory during training.'),
  candidate('candidate-b', 'Quantized optimizer states for tiny training', 'Quantized optimizer states reduce optimizer memory on microcontrollers.'),
  candidate('candidate-c', 'Efficient neural inference', undefined)
];

const assessment = (item, overrides = {}) => ({
  id: item.id, relevance: 'direct', evidenceExcerpt: item.abstract ?? item.title,
  relevanceAssessment: 'The available text directly addresses memory use during training.',
  expectedValue: 'It provides a method to compare in a reproduction experiment.', qualityConfidence: item.abstract ? 'medium' : 'low',
  qualityEvidence: item.abstract ? [item.abstract] : [item.title],
  limitations: item.abstract ? ['Full text was not inspected.'] : ['Abstract unavailable; assessment uses title only.'],
  outcome: item.abstract ? 'recommend' : 'uncertain', recommendationReason: item.abstract ? 'Directly useful method.' : 'Potentially relevant but underspecified.',
  coverageTags: [item.id === 'candidate-a' ? 'activation-memory' : item.id === 'candidate-b' ? 'optimizer-memory' : 'inference'],
  suggestedNextAction: item.abstract ? 'inspect full text' : 'open abstract', ...overrides
});

test('screening uses bounded batches and deterministic coverage-aware assembly', async () => {
  const calls = [];
  const result = await screenScoutCandidates(brief, candidates, { batchSize: 2, screenBatch: async (_brief, batch) => {
    calls.push(batch.map(item => item.id));
    return { assessments: batch.map(item => assessment(item)) };
  } });
  assert.deepEqual(calls, [['candidate-a', 'candidate-b'], ['candidate-c']]);
  assert.equal(result.assessed.length, 3);
  assert.equal(result.unscreened.length, 0);
  assert.equal(result.assessed.find(item => item.id === 'candidate-c').qualityConfidence, 'low');

  const report = assembleScoutReport({ brief, source: { kind: 'brief', id: brief.id }, runId: 'scout-run-screen',
    retrieval: { attempts: [], executedQueries: ['query'], limitations: [], partial: false }, screening: result, createdAt: 10 });
  assert.equal(report.status, 'completed');
  assert.deepEqual(report.recommendations.map(item => item.id), ['candidate-a', 'candidate-b']);
  assert.deepEqual(report.uncertain.map(item => item.id), ['candidate-c']);
});

test('one malformed screening response is repaired once', async () => {
  let calls = 0;
  const result = await screenScoutCandidates(brief, [candidates[0]], { screenBatch: async (_brief, batch, options) => {
    calls++;
    if (!options.repairError) return { assessments: [{ ...assessment(batch[0]), id: 'unknown-candidate' }] };
    assert.match(options.repairError, /unknown candidate/);
    return { assessments: [assessment(batch[0])] };
  } });
  assert.equal(calls, 2);
  assert.equal(result.assessed.length, 1);
  assert.equal(result.failures.length, 0);
});

test('repeated malformed output leaves the batch unscreened and report partial', async () => {
  const result = await screenScoutCandidates(brief, [candidates[0]], { screenBatch: async () => ({ assessments: [] }) });
  assert.equal(result.assessed.length, 0);
  assert.deepEqual(result.unscreened.map(item => item.id), ['candidate-a']);
  assert.equal(result.failures.length, 1);
  const report = assembleScoutReport({ brief, source: { kind: 'brief', id: brief.id }, runId: 'scout-run-partial',
    retrieval: { attempts: [], executedQueries: ['query'], limitations: [], partial: false }, screening: result, createdAt: 10 });
  assert.equal(report.status, 'partial');
  assert.equal(report.uncertain[0].assessmentState, 'unscreened');
});

test('screening rejects ungrounded excerpts and high confidence without an abstract', async () => {
  const wrongExcerpt = await screenScoutCandidates(brief, [candidates[0]], { screenBatch: async (_brief, batch) => ({ assessments: [assessment(batch[0], { evidenceExcerpt: 'Invented result' })] }) });
  assert.equal(wrongExcerpt.assessed.length, 0);
  const wrongConfidence = await screenScoutCandidates(brief, [candidates[2]], { screenBatch: async (_brief, batch) => ({ assessments: [assessment(batch[0], { qualityConfidence: 'high' })] }) });
  assert.equal(wrongConfidence.assessed.length, 0);
});

test('assembly does not fill the shortlist with redundant coverage', async () => {
  const duplicate = candidate('candidate-d', 'Another checkpointing method', 'Activation checkpointing also reduces peak memory during training.');
  const result = await screenScoutCandidates(brief, [candidates[0], duplicate], { screenBatch: async (_brief, batch) => ({ assessments: batch.map(item => assessment(item, { coverageTags: ['activation-memory'] })) }) });
  const report = assembleScoutReport({ brief, source: { kind: 'brief', id: brief.id }, runId: 'scout-run-coverage',
    retrieval: { attempts: [], executedQueries: ['query'], limitations: [], partial: false }, screening: result, createdAt: 10 });
  assert.equal(report.recommendations.length, 1);
  assert.equal(report.rejectionCounts['redundant-or-shortlist-budget'], 1);
});

test('topic watch quality threshold moves low-confidence recommendations to uncertain', () => {
  const lowConfidence = { ...candidates[0], ...assessment(candidates[0], { qualityConfidence: 'low' }), assessmentState: 'screened' };
  const watch = { ...brief, name: 'Daily TinyML', topic: brief.question, qualityThreshold: 'medium', maxRecommendations: 3 };
  const report = assembleScoutReport({ brief: watch, source: { kind: 'watch', id: 'topic-watch-quality' }, runId: 'scout-run-quality',
    retrieval: { attempts: [], executedQueries: ['query'], limitations: [], partial: false },
    screening: { assessed: [lowConfidence], unscreened: [], failures: [], model: 'fixture', instructionsVersion: 'v1' }, createdAt: 10 });
  assert.equal(report.recommendations.length, 0);
  assert.deepEqual(report.uncertain.map(item => item.id), [lowConfidence.id]);
  assert.deepEqual(report.rejectionCounts, {});
});

test('screening cancellation aborts without repair', async () => {
  const controller = new AbortController();
  const promise = screenScoutCandidates(brief, [candidates[0]], { signal: controller.signal, screenBatch: async (_brief, _batch, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }) });
  controller.abort(new DOMException('Cancelled', 'AbortError'));
  await assert.rejects(promise, /Cancelled/);
});

test('Codex screening invocation uses an isolated read-only thread and JSON schema', async () => {
  let clientOptions;
  let threadOptions;
  let turnOptions;
  const response = await invokeScreeningModel(brief, [candidates[0]], { createCodex: options => {
    clientOptions = options;
    return { startThread: options => { threadOptions = options; return { run: async (_prompt, options) => {
      turnOptions = options;
      return { finalResponse: JSON.stringify({ assessments: [assessment(candidates[0])] }) };
    } }; } };
  } });
  assert.equal(response.assessments.length, 1);
  assert.equal(clientOptions.config.model_provider, '9router');
  assert.equal(threadOptions.sandboxMode, 'read-only');
  assert.equal(threadOptions.approvalPolicy, 'never');
  assert.equal(threadOptions.networkAccessEnabled, false);
  assert.equal(turnOptions.outputSchema.additionalProperties, false);
});
