import assert from 'node:assert/strict';
import test from 'node:test';
import { callScoutTool, handleScoutMcpMessage } from './scoutMcp.mjs';

const brief = {
  id: 'scout-brief-test', question: 'Which methods reduce TinyML training memory?', purpose: 'Choose an experiment direction.',
  scope: ['On-device training'], exclusions: ['Inference only'], constraints: ['Open metadata'],
  searchDirections: [{ query: 'TinyML training memory', reason: 'Direct terminology' }],
  screeningCriteria: ['Must discuss training'], maxRecommendations: 5,
  createdFrom: { kind: 'assistant', reference: 'assistant discussion' }, author: 'model:assistant', createdAt: 1, updatedAt: 1
};

function fixture() {
  const calls = [];
  let state = { briefs: [], watches: [], runs: [], reports: [] };
  const request = async (_url, options) => {
    const body = options?.body ? JSON.parse(options.body) : undefined;
    calls.push(body ?? { action: 'load' });
    if (body?.action === 'save-brief') {
      const saved = { ...body.brief, id: body.id ?? brief.id, createdAt: 1, updatedAt: 2 };
      state = { ...state, briefs: [...state.briefs.filter(item => item.id !== saved.id), saved] };
      return new Response(JSON.stringify({ brief: saved }), { status: body.id ? 200 : 201, headers: { 'content-type': 'application/json' } });
    }
    if (body?.action === 'cancel-run') {
      state = { ...state, runs: state.runs.map(run => run.id === body.id ? { ...run, state: 'cancelling' } : run) };
      return Response.json({ run: state.runs.find(run => run.id === body.id) });
    }
    return Response.json(state);
  };
  return { calls, request, setState: value => { state = value; } };
}

test('scout MCP exposes narrow tools and keeps run start behind the visible card', async () => {
  const harness = fixture();
  const listed = await handleScoutMcpMessage('/vault', 'http://127.0.0.1:3000', { jsonrpc: '2.0', id: 1, method: 'tools/list' }, harness.request);
  assert.deepEqual(listed.result.tools.map(tool => tool.name), [
    'propose_scout_brief', 'revise_scout_brief', 'start_scout_run', 'get_scout_run', 'cancel_scout_run', 'open_scout_report'
  ]);

  const proposed = await callScoutTool('/vault', 'http://127.0.0.1:3000', 'propose_scout_brief', brief, harness.request);
  assert.deepEqual(proposed.structuredContent, { kind: 'scout-brief', briefId: brief.id });
  assert.equal(harness.calls[0].action, 'save-brief');
  assert.equal(harness.calls[0].brief.author, 'model:assistant');

  const callCount = harness.calls.length;
  const prepared = await callScoutTool('/vault', 'http://127.0.0.1:3000', 'start_scout_run', { briefId: brief.id }, harness.request);
  assert.match(prepared.content[0].text, /must press Run scout/);
  assert.deepEqual(harness.calls.slice(callCount), [{ action: 'load' }], 'model tool must not start retrieval');
});

test('scout MCP inspects and cancels the active run through the local endpoint', async () => {
  const harness = fixture();
  const run = { id: 'scout-run-test', source: { kind: 'brief', id: brief.id }, state: 'screening', startedAt: 5 };
  harness.setState({ briefs: [brief], watches: [], runs: [run], reports: [] });
  const inspected = await callScoutTool('/vault', 'http://127.0.0.1:3000', 'get_scout_run', { briefId: brief.id }, harness.request);
  assert.match(inspected.content[0].text, /latest run screening/);
  const cancelled = await callScoutTool('/vault', 'http://127.0.0.1:3000', 'cancel_scout_run', { briefId: brief.id }, harness.request);
  assert.match(cancelled.content[0].text, /cancellation was requested/);
  assert.equal(harness.calls.at(-1).action, 'cancel-run');
});
