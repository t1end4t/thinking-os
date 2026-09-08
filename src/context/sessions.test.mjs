import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const source = readFileSync(new URL('./useCodexAssistant.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const { parseSessions } = await import(`data:text/javascript,${encodeURIComponent(compiled.code.replace(/^import[^;]+;/gm, ''))}`);

test('missing storage yields an empty conversation list', () => {
  assert.deepEqual(parseSessions(null), { selectedId: '', sessions: [] });
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
  assert.equal(parsed.sessions[0].threadId, 'thread-1');
  assert.deepEqual(parsed.sessions[0].messages.map(entry => entry.state), [undefined, undefined, 'stopped']);
});

test('unreadable storage raises rather than silently discarding conversations', () => {
  for (const raw of ['{"sessions":[{"id":1}],"selectedId":""}', '{"sessions":{}}', '{"selectedId":"a"}']) {
    assert.throws(() => parseSessions(raw), /Saved conversations could not be read/);
  }
  assert.throws(() => parseSessions('not json'));
});
