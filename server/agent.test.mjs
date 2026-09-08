import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, realpath, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { agentPlugin, isLocalRequest, parseCodexConfig } from './agent.mjs';

test('local Codex configuration supplies provider choices without exposing credentials', () => {
  const config = parseCodexConfig(`
model = "combo-codex"
model_provider = "9router"

[model_providers.9router]
name = "9Router"
base_url = "http://127.0.0.1:20128/v1"
env_key = "SECRET_TOKEN"
`);
  assert.deepEqual(config, {
    model: 'combo-codex',
    provider: '9router',
    providers: [{ id: '9router', label: '9Router', baseUrl: 'http://127.0.0.1:20128/v1' }]
  });
  assert.deepEqual(parseCodexConfig('model_provider = "only-declared"').providers, [{ id: 'only-declared', label: 'only-declared', baseUrl: '' }]);
  assert.deepEqual(parseCodexConfig(''), { model: '', provider: '', providers: [] });
  assert.equal(parseCodexConfig('[model_providers."quoted.name"]\nname = \'Provider\'\nbase_url = "https://user:password@example.com/v1?token=secret"').providers[0].baseUrl, 'https://example.com/v1');
});

test('the assistant endpoint stays same-origin and loopback only', () => {
  const request = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } };
  assert.equal(isLocalRequest(request), true);
  assert.equal(isLocalRequest({ ...request, socket: { remoteAddress: '192.168.1.2' } }), false);
  assert.equal(isLocalRequest({ ...request, headers: { host: 'evil.example' } }), false);
  assert.equal(isLocalRequest({ ...request, headers: { ...request.headers, origin: 'https://evil.example' } }), false);
});

async function fixture(context, codex, codexHome, clientOptions = []) {
  const server = createServer();
  const previousHome = process.env.CODEX_HOME;
  if (codexHome) process.env.CODEX_HOME = codexHome;
  agentPlugin(options => { clientOptions.push(options); return codex; }).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => {
    if (previousHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousHome;
    server.closeAllConnections();
    server.close();
  });
  const url = `http://127.0.0.1:${server.address().port}/api/assistant`;
  return {
    get: () => fetch(url),
    post: (body, options = {}) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...options })
  };
}

test('agent, provider, model, and resumed session reach the SDK; only the message is sent', async context => {
  const starts = [];
  const resumes = [];
  const messages = [];
  const thread = {
    runStreamed: async (message, { signal }) => {
      assert.equal(signal.aborted, false);
      messages.push(message);
      return { events: (async function* () {
        yield { type: 'thread.started', thread_id: 'thread-1' };
        yield { type: 'item.completed', item: { id: 'a', type: 'reasoning', text: 'planning' } };
        yield { type: 'item.completed', item: { id: 'b', type: 'agent_message', text: '## Answer' } };
        yield { type: 'turn.completed', usage: {} };
      })() };
    }
  };
  const home = await mkdtemp(path.join(tmpdir(), 'thinking-os-codex-home-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const clientOptions = [];
  await writeFile(path.join(home, 'config.toml'), 'model = "combo-codex"\nmodel_provider = "9router"\n\n[model_providers.9router]\nname = "9Router"\n');
  const { get, post } = await fixture(context, {
    startThread: options => { starts.push(options); return thread; },
    resumeThread: (id, options) => { resumes.push([id, options]); return thread; }
  }, home, clientOptions);

  assert.deepEqual(await (await get()).json(), {
    agents: [{ id: 'codex', label: 'Codex' }],
    model: 'combo-codex',
    provider: '9router',
    providers: [{ id: '9router', label: '9Router', baseUrl: '' }]
  });

  const body = { agent: 'codex', conversationId: randomUUID(), dir: tmpdir(), message: 'hello\nworld', provider: '9router', model: 'combo-codex' };
  const events = (await (await post(body)).text()).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(events.map(event => event.type), ['thread.started', 'item.completed', 'item.completed', 'turn.completed']);
  assert.deepEqual(messages, ['hello\nworld']);
  assert.deepEqual(clientOptions, [{ config: { model_provider: '9router' } }]);
  assert.deepEqual(starts, [{ workingDirectory: await realpath(tmpdir()), sandboxMode: 'read-only', approvalPolicy: 'never', skipGitRepoCheck: true, model: 'combo-codex' }]);

  await (await post({ ...body, conversationId: randomUUID(), threadId: 'thread-1' })).text();
  assert.equal(resumes.length, 1);
  assert.equal(resumes[0][0], 'thread-1');

  await (await post({ ...body, conversationId: randomUUID(), model: 'other-model' })).text();
  assert.equal(starts.length, 2);
  assert.equal(starts[1].model, 'other-model');

  assert.equal((await post({ ...body, agent: 'other' })).status, 400);
  assert.equal((await post({ ...body, message: '' })).status, 400);
  assert.equal((await post({ ...body, provider: 'bad provider!' })).status, 400);
  assert.equal((await post({ ...body, dir: '/nonexistent-thinking-os-folder' })).status, 400);
  assert.equal((await post({ ...body, message: 'x'.repeat(65_536) })).status, 413);
  assert.equal((await post(body, { headers: { 'content-type': 'text/plain' } })).status, 415);
});

test('disconnect aborts the SDK turn and overlapping turns are refused', async context => {
  let reportAborted;
  const aborted = new Promise(resolve => { reportAborted = resolve; });
  let sdkSignal;
  const { post } = await fixture(context, {
    startThread: () => ({
      runStreamed: async (_message, { signal }) => {
        sdkSignal = signal;
        return { events: (async function* () {
          yield { type: 'turn.started' };
          await new Promise(resolve => signal.addEventListener('abort', () => { reportAborted(); resolve(); }, { once: true }));
        })() };
      }
    })
  });
  const body = { agent: 'codex', conversationId: randomUUID(), dir: tmpdir(), message: 'wait' };
  const controller = new AbortController();
  const response = await post(body, { signal: controller.signal });
  await response.body.getReader().read();
  assert.equal((await post(body)).status, 409);
  controller.abort();
  await aborted;
  assert.equal(sdkSignal.aborted, true);
});

test('SDK failures surface as error events instead of invented replies', async context => {
  const { post } = await fixture(context, { startThread: () => ({ runStreamed: async () => { throw new Error('Provider unreachable'); } }) });
  const response = await post({ agent: 'codex', conversationId: randomUUID(), dir: tmpdir(), message: 'hello' });
  assert.deepEqual(JSON.parse(await response.text()), { type: 'error', message: 'Provider unreachable' });
});
