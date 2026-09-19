import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { agentPlugin, buildTurnMessage, isLocalRequest } from './agent.mjs';

test('the assistant endpoint stays same-origin and loopback only', () => {
  const request = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } };
  assert.equal(isLocalRequest(request), true);
  assert.equal(isLocalRequest({ ...request, socket: { remoteAddress: '192.168.1.2' } }), false);
  assert.equal(isLocalRequest({ ...request, headers: { host: 'evil.example' } }), false);
  assert.equal(isLocalRequest({ ...request, headers: { ...request.headers, origin: 'https://evil.example' } }), false);
});

async function fixture(context, codex, codexHome, clientOptions = [], imageDir) {
  const server = createServer();
  const previousHome = process.env.CODEX_HOME;
  if (codexHome) process.env.CODEX_HOME = codexHome;
  agentPlugin(options => { clientOptions.push(options); return codex; }, imageDir).configureServer({ httpServer: server, middlewares: { use: (_route, handler) => server.on('request', handler) } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => {
    if (previousHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousHome;
    server.closeAllConnections();
    server.close();
  });
  const url = `http://127.0.0.1:${server.address().port}/api/assistant`;
  return {
    url,
    get: () => fetch(url),
    post: (body, options = {}) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...options })
  };
}

test('uploaded images round-trip locally and reach the SDK with text or alone', async context => {
  const imageDir = await mkdtemp(path.join(tmpdir(), 'thinking-os-images-'));
  context.after(() => rm(imageDir, { recursive: true, force: true }));
  const inputs = [];
  const { url, post } = await fixture(context, { startThread: () => ({
    runStreamed: async input => {
      inputs.push(input);
      return { events: (async function* () { yield { type: 'turn.completed', usage: {} }; })() };
    }
  }) }, undefined, [], imageDir);
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8AAAAMBAQDgYqciAAAAAElFTkSuQmCC', 'base64');
  const upload = (body, type = 'image/png') => fetch(`${url}/images`, { method: 'POST', headers: { 'content-type': type }, body });
  const response = await upload(bytes);
  assert.equal(response.status, 201);
  const image = { ...(await response.json()), name: 'diagram.png' };
  assert.match(image.id, /^[a-f0-9]{64}\.png$/);
  const stored = await fetch(`${url}/images/${image.id}`);
  assert.equal(stored.headers.get('content-type'), 'image/png');
  assert.equal(stored.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await stored.arrayBuffer()), bytes);
  assert.equal((await (await upload(bytes)).json()).id, image.id);
  for (const message of ['Describe this image', '']) {
    const turn = await post({ agent: 'codex', conversationId: randomUUID(), dir: tmpdir(), message, images: [image] });
    assert.equal(turn.status, 200);
    await turn.text();
  }
  const localImage = { type: 'local_image', path: path.join(imageDir, image.id) };
  assert.deepEqual(inputs, [[{ type: 'text', text: 'Describe this image' }, localImage], [localImage]]);
  assert.deepEqual(await readFile(localImage.path), bytes);
  assert.equal((await upload(bytes, 'image/svg+xml')).status, 415);
  assert.equal((await upload(Buffer.from('not really a PNG image'))).status, 400);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  const body = { agent: 'codex', conversationId: randomUUID(), dir: tmpdir(), message: '', images: [image] };
  assert.equal((await post({ ...body, images: Array(5).fill(image) })).status, 400);
  assert.equal((await post({ ...body, images: [{ ...image, id: '../secret.png' }] })).status, 400);
  assert.equal((await post({ ...body, images: [{ ...image, id: `${'f'.repeat(64)}.png` }] })).status, 400);
});

test('agent, fixed 9router provider, context, and resumed session reach the SDK', async context => {
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
  const clientOptions = [];
  const { get, post } = await fixture(context, {
    startThread: options => { starts.push(options); return thread; },
    resumeThread: (id, options) => { resumes.push([id, options]); return thread; }
  }, undefined, clientOptions);

  assert.deepEqual(await (await get()).json(), { agents: [{ id: 'codex', label: 'Codex' }] });

  const attached = [{ type: 'node', id: 'claim-1', label: 'Claim one', sourceId: 'claim-1', kind: 'claim' }];
  const body = { agent: 'codex', conversationId: randomUUID(), dir: tmpdir(), mode: 'chat', message: 'hello\nworld', contexts: attached };
  const events = (await (await post(body)).text()).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(events.map(event => event.type), ['thread.started', 'item.completed', 'item.completed', 'turn.completed']);
  assert.deepEqual(messages, [buildTurnMessage('hello\nworld', attached, 'chat')]);
  assert.deepEqual(clientOptions, [{ config: { model_provider: '9router' } }]);
  assert.deepEqual(starts, [{ workingDirectory: await realpath(tmpdir()), skipGitRepoCheck: true }]);

  const rawConversation = randomUUID();
  await (await post({ ...body, conversationId: rawConversation, mode: 'codex' })).text();
  assert.equal(messages.at(-1), 'hello\nworld', 'Codex mode sends the message unchanged');
  await (await post({ ...body, conversationId: randomUUID(), mode: undefined, contexts: undefined })).text();
  assert.equal(messages.at(-1), 'hello\nworld', 'Legacy requests without a mode stay unchanged');

  await (await post({ ...body, conversationId: randomUUID(), threadId: 'thread-1' })).text();
  assert.equal(resumes.length, 1);
  assert.equal(resumes[0][0], 'thread-1');

  await (await post({ ...body, conversationId: randomUUID(), provider: 'ignored', model: 'ignored', baseUrl: 'https://example.com/v1' })).text();
  assert.deepEqual(clientOptions, [{ config: { model_provider: '9router' } }], 'One 9Router client serves every turn');
  assert.equal(starts.at(-1).model, undefined, 'Client routing fields never reach the SDK');

  assert.equal((await post({ ...body, agent: 'other' })).status, 400);
  assert.equal((await post({ ...body, message: '', contexts: undefined })).status, 400);
  assert.equal((await post({ ...body, contexts: [{ ...attached[0], type: 'unknown' }] })).status, 400);
  assert.equal((await post({ ...body, contexts: Array(13).fill(attached[0]) })).status, 400);
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
