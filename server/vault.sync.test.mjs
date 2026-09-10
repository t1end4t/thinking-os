import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { agentPlugin } from './agent.mjs';
import { vaultPlugin, writeVault } from './vault.mjs';

for (const outcome of ['complete', 'failed', 'stopped']) {
  test(`assistant ${outcome}: reads wait; stale saves cannot erase file changes`, async context => {
    const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-sync-'));
    const alias = `${root}-alias`;
    await symlink(root, alias);
    context.after(async () => { await rm(alias); await rm(root, { recursive: true, force: true }); });
    const task = { id: 'task-original', title: 'Original', description: 'First paragraph.\n\nSecond paragraph.', status: 'backlog', priority: 'medium', tag: 'task', author: 'user', createdAt: '2026-09-10T00:00:00Z' };
    await writeVault(root, { tasks: [task] });
    const changed = { ...task, id: 'task-created', title: 'Created by assistant', author: 'model:test' };
    const ready = Promise.withResolvers();
    const finish = Promise.withResolvers();
    const routes = [];
    const server = createServer((request, response) => {
      const route = routes.find(([prefix]) => request.url.split('?')[0] === prefix);
      if (route) void route[1](request, response);
      else { response.statusCode = 404; response.end(); }
    });
    const host = { httpServer: server, middlewares: { use: (prefix, handler) => routes.push([prefix, handler]) } };
    vaultPlugin().configureServer(host);
    agentPlugin(() => ({ startThread: () => ({
      runStreamed: async (_input, { signal }) => ({ events: (async function* () {
        await writeVault(root, { tasks: [changed] });
        ready.resolve();
        yield { type: 'turn.started' };
        if (outcome === 'stopped') {
          if (!signal.aborted) await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
        } else await finish.promise;
        if (outcome === 'failed') throw new Error('Test failure after a file edit');
        if (outcome === 'complete') yield { type: 'turn.completed', usage: {} };
      })() })
    }) })).configureServer(host);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    context.after(() => { finish.resolve(); server.closeAllConnections(); server.close(); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const endpoint = `${origin}/api/vault?dir=${encodeURIComponent(alias)}`;
    const initial = await (await fetch(endpoint)).json();
    const save = (data, revision) => fetch(endpoint, { method: 'PUT', headers: { 'content-type': 'application/json', ...(revision ? { 'if-match': revision } : {}) }, body: JSON.stringify(data) });
    assert.equal((await save(initial.data)).status, 428);
    const abort = new AbortController();
    const response = await fetch(`${origin}/api/assistant`, { method: 'POST', signal: abort.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ agent: 'codex', dir: root, conversationId: randomUUID(), message: 'Edit a task' }) });
    const stream = response.text().catch(error => error.name);
    await ready.promise;
    let saved = false;
    let loaded = false;
    const staleSave = save(initial.data, initial.revision).then(result => { saved = true; return result; });
    const reload = fetch(endpoint).then(result => { loaded = true; return result.json(); });
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(saved, false, 'Save waits for the assistant, including through a symlink');
    assert.equal(loaded, false, 'Read must not observe a partially edited vault');
    if (outcome === 'stopped') abort.abort(); else finish.resolve();
    await stream;
    assert.equal((await staleSave).status, 409);
    const refreshed = await reload;
    assert.deepEqual(refreshed.data.tasks, [changed]);
    assert.notEqual(refreshed.revision, initial.revision);
    assert.equal(await readFile(path.join(root, 'tasks/pipeline/task-created.md'), 'utf8'), `# ${changed.title}\n\n${changed.description}\n`);
    const updated = { ...refreshed.data, tasks: [{ ...changed, description: 'Edited.\n\nStill multiline.' }] };
    const update = await save(updated, refreshed.revision);
    assert.equal(update.status, 200);
    const updateRevision = (await update.json()).revision;
    assert.equal((await save({ ...updated, tasks: [] }, refreshed.revision)).status, 409);
    assert.equal((await save({ ...updated, tasks: [] }, updateRevision)).status, 200);
    assert.deepEqual((await (await fetch(endpoint)).json()).data.tasks, []);
  });
}
