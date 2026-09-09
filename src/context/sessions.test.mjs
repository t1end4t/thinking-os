import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const source = readFileSync(new URL('./useCodexAssistant.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const { parseSessions, parseProjects } = await import(`data:text/javascript,${encodeURIComponent(compiled.code.replace(/^import[^;]+;/gm, ''))}`);

test('missing storage yields an empty conversation list', () => {
  assert.deepEqual(parseSessions(null), { selectedId: '', openIds: [], sessions: [] });
});

test('saved projects deduplicate and reject unreadable storage', () => {
  assert.deepEqual(parseProjects(null), []);
  assert.deepEqual(parseProjects('["/home/a","/home/b","/home/a"]'), ['/home/a', '/home/b']);
  for (const raw of ['{}', '[1]', '[""]', '["  "]', '["a\\u0000b"]']) {
    assert.throws(() => parseProjects(raw), /Saved projects could not be read/);
  }
  assert.throws(() => parseProjects('not json'));
});

test('stored conversations reload, drop stale progress, and repair the selection', () => {
  const stored = JSON.stringify({
    selectedId: 'gone',
    sessions: [{
      id: 'a', title: 'Attention sinks', threadId: 'thread-1', provider: '9router', model: 'combo-codex',
      messages: [
        { id: 'm1', role: 'user', content: 'why?' },
        { id: 'm2', role: 'assistant', content: '## Because' },
        { id: 'm3', role: 'assistant', content: 'ls', kind: 'command', label: 'ls', state: 'running' }
      ]
    }]
  });
  const parsed = parseSessions(stored);
  assert.equal(parsed.selectedId, 'a');
  assert.deepEqual(parsed.openIds, ['a']);
  assert.equal(parsed.sessions[0].threadId, 'thread-1');
  assert.deepEqual(parsed.sessions[0].messages.map(entry => entry.state), [undefined, undefined, 'stopped']);
});

test('closed tabs stay closed without losing saved conversations', () => {
  const sessions = [{ id: 'a', title: 'Saved chat', threadId: 'thread-a', messages: [{ id: 'message', role: 'user', content: 'Keep me' }] }];
  const closed = parseSessions(JSON.stringify({ selectedId: '', openIds: [], sessions }));
  assert.equal(closed.selectedId, '');
  assert.deepEqual(closed.openIds, []);
  assert.deepEqual(closed.sessions, sessions);
  const repaired = parseSessions(JSON.stringify({ selectedId: 'gone', openIds: ['gone', 'a', 'a'], sessions }));
  assert.equal(repaired.selectedId, 'a');
  assert.deepEqual(repaired.openIds, ['a']);
  for (const openIds of [null, 'a', [1]]) {
    assert.throws(() => parseSessions(JSON.stringify({ selectedId: '', openIds, sessions })), /Saved conversations could not be read/);
  }
});

test('unreadable storage raises rather than silently discarding conversations', () => {
  for (const raw of ['{"sessions":[{"id":1}],"selectedId":""}', '{"sessions":{}}', '{"selectedId":"a"}']) {
    assert.throws(() => parseSessions(raw), /Saved conversations could not be read/);
  }
  assert.throws(() => parseSessions('not json'));
});

test('turn timing survives reload and rejects invalid stored durations', () => {
  const stored = { selectedId: 'a', sessions: [{ id: 'a', title: 'Timed turn', messages: [
    { id: 'turn', role: 'user', content: 'hello', state: 'complete', durationMs: 5123 }
  ] }] };
  assert.equal(parseSessions(JSON.stringify(stored)).sessions[0].messages[0].durationMs, 5123);
  for (const durationMs of [-1, '5', null]) {
    stored.sessions[0].messages[0].durationMs = durationMs;
    assert.throws(() => parseSessions(JSON.stringify(stored)), /Saved conversations could not be read/);
  }
});
