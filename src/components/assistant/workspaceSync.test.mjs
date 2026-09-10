import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const command = "/run/current-system/sw/bin/bash -lc 'ls -a; cat INDEX.md'";
try {
  for (const [width, theme, outcome] of [[1440, 'light', 'complete'], [390, 'dark', 'complete'], [1440, 'dark', 'failed'], [390, 'light', 'stopped'], [1440, 'light', 'reload-failed']]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let data = { tasks: [] };
    let revision = 0;
    const requests = [];
    const releaseSave = Promise.withResolvers();
    const turnStarted = Promise.withResolvers();
    const releaseTurn = Promise.withResolvers();
    let changed = false;
    await page.route('**/api/vault*', async route => {
      const method = route.request().method();
      requests.push(method);
      if (method === 'PUT') {
        assert.equal(route.request().headers()['if-match'], String(revision));
        assert.equal(changed, false, 'No stale snapshot may save after the assistant edits files');
        await releaseSave.promise;
        data = route.request().postDataJSON();
        revision++;
      }
      if (changed && outcome === 'reload-failed') return route.fulfill({ status: 500, json: { error: 'Test unreadable vault' } });
      await route.fulfill({ json: { dir: '/tmp/sync-ui', data, revision: String(revision) } });
    });
    await page.route('**/api/assistant', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { model: '', provider: '', providers: [] } });
      assert.equal(route.request().postDataJSON().mode, 'codex');
      assert.equal(data.tasks.length, 1, 'The pending manual edit is saved before the assistant starts');
      requests.push('ASSISTANT');
      data.tasks.push({ id: 'task-agent', title: 'Assistant-created task', description: 'First paragraph.\n\nSecond paragraph.', status: 'backlog', priority: 'medium', tag: 'task', author: 'model:test', lastEditedBy: 'model:test', createdAt: '2026-09-10T00:00:00Z' });
      changed = true;
      revision++;
      turnStarted.resolve();
      await releaseTurn.promise;
      const events = [
        { type: 'turn.started' },
        { type: 'item.completed', item: { id: 'command', type: 'command_execution', command, status: 'completed', aggregated_output: 'INDEX.md\n', exit_code: 0 } },
        { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: 'Files saved.' } },
        outcome === 'failed' ? { type: 'turn.failed', error: { message: 'Test interrupted turn' } } : { type: 'turn.completed', usage: {} }
      ];
      await route.fulfill({ contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event)).join('\n') + '\n' }).catch(() => {});
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
    await page.waitForLoadState('networkidle');
    requests.length = 0;
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    const panel = page.getByRole('complementary', { name: 'Assistant', exact: true });
    const input = panel.getByRole('textbox', { name: 'Message the assistant' });
    await panel.getByRole('combobox', { name: 'Assistant mode' }).selectOption('codex');
    await page.locator('#add-task-col-backlog').click();
    await page.locator('#task-title-input').fill('Manual pending task');
    await page.getByRole('button', { name: 'Create task', exact: true }).click();
    await input.fill('Create a backlog task');
    await input.press('Enter');
    await expect(page.getByRole('status', { name: 'Workspace sync' })).toBeVisible();
    await expect.poll(() => requests.filter(method => method === 'PUT').length).toBe(1);
    assert.equal(requests.includes('ASSISTANT'), false, 'Assistant waits for the in-flight save');
    releaseSave.resolve();
    await turnStarted.promise;
    assert.ok(await page.locator('#kanban-board-grid').evaluate(element => Boolean(element.closest('[inert]'))));
    await expect(page.getByText('Assistant-created task', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `/tmp/thinking-os-sync-${width}-${theme}-${outcome}.png` });
    if (outcome === 'stopped') await panel.getByRole('button', { name: 'Stop', exact: true }).click();
    releaseTurn.resolve();
    await expect(panel.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Workspace sync' })).toBeHidden();
    await expect(page.getByText('Manual pending task', { exact: true })).toBeVisible();
    if (outcome === 'reload-failed') {
      await expect(panel.getByRole('alert')).toContainText('Test unreadable vault');
      await expect(page.getByText('Assistant-created task', { exact: true })).toHaveCount(0);
    } else await expect(page.getByText('Assistant-created task', { exact: true })).toBeVisible();
    if (outcome === 'complete') {
      await panel.locator('summary').filter({ hasText: /^Worked for/ }).click();
      const row = panel.getByRole('button', { name: 'Ran ls -a; cat INDEX.md …', exact: true });
      await expect(row).toBeVisible();
      await row.click();
      await expect(panel.locator('.assistant-activity-shell-output')).toHaveText(`$ ${command}\n\nINDEX.md\n`);
    }
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.deepEqual(requests, ['PUT', 'ASSISTANT', 'GET']);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${width}px ${theme}: ${outcome} preserves files and refreshes safely`);
  }
} finally {
  await browser.close();
  await server.close();
}
