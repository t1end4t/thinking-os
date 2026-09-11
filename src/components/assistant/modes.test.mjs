import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
  const page = await browser.newPage();
  const requests = [];
  await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/assistant-mode-test', data: {}, revision: 'test' } }));
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { model: '', provider: '', providers: [] } });
    requests.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'application/x-ndjson', body: [
      { type: 'thread.started', thread_id: 'mode-test-thread' },
      { type: 'item.completed', item: { id: 'reply', type: 'agent_message', text: 'Conversation preserved.' } },
      { type: 'turn.completed', usage: {} }
    ].map(event => JSON.stringify(event)).join('\n') + '\n' });
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.waitForLoadState('networkidle');
  const panel = page.getByRole('complementary', { name: 'Assistant', exact: true });
  const mode = {
    summary: panel.locator('details.assistant-mode-menu > summary'),
    async select(label) {
      await this.summary.click();
      await panel.getByRole('menuitemradio', { name: new RegExp(`^${label}`) }).click();
      await expect(this.summary).toHaveAttribute('aria-label', `Assistant mode: ${label}`);
    },
    expectCurrent(label) { return expect(this.summary).toHaveAttribute('aria-label', `Assistant mode: ${label}`); }
  };
  const input = panel.getByRole('textbox', { name: 'Message the assistant' });
  await mode.expectCurrent('Chat');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
      await mode.select('Work');
      await expect(panel.getByText('Work through an idea. Work discusses the problem and can change workspace files.')).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Explore an idea', exact: true })).toBeVisible();
      await panel.screenshot({ path: `/tmp/thinking-os-work-${width}-${theme}.png` });
      await mode.select('Codex');
      await expect(panel.getByText('Inspect files, make changes, and check the result.')).toBeVisible();
      await mode.select('Chat');
    }
  }
  await input.fill('Discuss my goal');
  await input.press('Enter');
  await expect(panel.getByText('Conversation preserved.', { exact: true })).toBeVisible();
  await input.fill('Save this goal');
  await mode.select('Work');
  await expect(input).toHaveValue('Save this goal');
  await input.press('Enter');
  await expect(panel.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
  assert.equal(requests[0].mode, 'chat');
  assert.equal(requests[1].mode, 'work');
  assert.equal(requests[1].threadId, 'mode-test-thread');
  await page.reload();
  await mode.expectCurrent('Work');
  await panel.getByRole('button', { name: 'New conversation' }).click();
  await mode.expectCurrent('Work');
  console.log('Mode UI checks passed: both themes, desktop/mobile, drafts, requests, history, reload, preferences.');
} finally {
  await browser?.close();
  await server.close();
}
