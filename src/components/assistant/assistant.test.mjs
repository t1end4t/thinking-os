import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/assistant-ui-test', data: {} } }));
  await page.route('**/api/assistant', route => route.fulfill({ json: {
    model: 'combo-codex', provider: '9router', providers: [{ id: '9router', label: '9Router', baseUrl: 'http://127.0.0.1:20128/v1' }]
  } }));
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.assistantRequests = [];
    window.fetch = async (url, options) => {
      if (url !== '/api/assistant' || options?.method !== 'POST') return originalFetch(url, options);
      const request = JSON.parse(options.body);
      window.assistantRequests.push(request);
      const encoder = new TextEncoder();
      const events = [
        { type: 'thread.started', thread_id: request.threadId || `thread-${request.conversationId}` },
        { type: 'turn.started' },
        { type: 'item.started', item: { id: 'reasoning', type: 'reasoning', text: 'Checking the available evidence.' } },
        { type: 'item.completed', item: { id: 'reasoning', type: 'reasoning', text: 'Checked the available evidence.' } },
        { type: 'item.started', item: { id: 'command', type: 'command_execution', command: 'pwd', status: 'in_progress', aggregated_output: '' } },
        { type: 'item.completed', item: { id: 'command', type: 'command_execution', command: 'pwd', status: 'completed', aggregated_output: '/tmp/assistant-ui-test', exit_code: 0 } },
        { type: 'item.completed', item: { id: 'warning', type: 'error', message: 'Nonfatal provider metadata notice.' } },
        { type: 'item.completed', item: { id: 'reply', type: 'agent_message', text: '## Capabilities\n\n**Review** code safely.\n\n- Read files\n- Run checks\n\n```python\nprint("hello")\n```\n\n| Task | Status |\n| --- | --- |\n| Review | Ready |\n\n[Safe](https://example.com) [Unsafe](javascript:alert)\n\n<script>alert("bad")</script>' } },
        { type: 'turn.completed', usage: {} }
      ];
      return new Response(new ReadableStream({
        start(controller) {
          let index = 0;
          const timer = setInterval(() => {
            if (options.signal?.aborted) { clearInterval(timer); controller.error(new DOMException('Aborted', 'AbortError')); return; }
            if (index === events.length) { clearInterval(timer); controller.close(); return; }
            const bytes = encoder.encode(JSON.stringify(events[index++]) + '\n');
            controller.enqueue(bytes.slice(0, 7));
            controller.enqueue(bytes.slice(7));
          }, 180);
        }
      }), { headers: { 'content-type': 'application/x-ndjson' } });
    };
  });

  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.waitForLoadState('networkidle');
  const panel = page.getByRole('complementary', { name: 'Assistant', exact: true });
  const transcript = page.getByRole('log', { name: 'Assistant conversation' });
  const input = page.getByRole('textbox', { name: 'Message the assistant' });
  const send = page.getByRole('button', { name: 'Send message', exact: true });
  await expect(panel).toBeVisible();
  assert.equal(await page.getByRole('button', { name: 'Move assistant panel' }).count(), 0);

  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData('application/json', JSON.stringify({ type: 'node', id: 'private-claim', label: 'Private claim', metadata: { secret: 'never-send-this' } }));
    return data;
  });
  await panel.dispatchEvent('drop', { dataTransfer: transfer });
  await expect(panel.getByRole('button', { name: 'Remove Private claim' })).toBeVisible();
  await input.fill('Render Markdown');
  await input.press('Enter');
  await expect(page.getByRole('status')).toBeVisible();
  await expect(panel.getByRole('button', { name: /Reasoning summary/ })).toBeVisible();
  await expect(send).toBeVisible({ timeout: 15000 });
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  assert.equal(await transcript.locator('strong').first().innerText(), 'Review');
  assert.equal(await transcript.locator('pre code').innerText(), 'print("hello")');
  assert.equal(await transcript.locator('table').count(), 1);
  assert.equal(await transcript.locator('a[href^="javascript:"]').count(), 0);
  assert.equal(await transcript.locator('script').count(), 0);
  await panel.getByRole('button', { name: /pwd/ }).click();
  await expect(panel.getByText('/tmp/assistant-ui-test', { exact: true })).toBeVisible();
  assert.equal(await page.getByRole('alert').count(), 0);
  const request = await page.evaluate(() => window.assistantRequests[0]);
  assert.equal(request.message, 'Render Markdown');
  assert.equal(JSON.stringify(request).includes('never-send-this'), false);
  assert.equal(JSON.stringify(request).includes('private-claim'), false);

  const firstId = await page.getByLabel('Conversation', { exact: true }).inputValue();
  await panel.getByRole('button', { name: 'New conversation' }).click();
  await expect(transcript.getByRole('heading')).toHaveCount(0);
  await page.getByLabel('Conversation', { exact: true }).selectOption(firstId);
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  await input.fill('Continue the previous conversation');
  await input.press('Enter');
  await expect(send).toBeVisible({ timeout: 15000 });
  assert.equal((await page.evaluate(() => window.assistantRequests[0])).threadId, `thread-${firstId}`);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(settings).toBeVisible();
  await page.getByLabel('Assistant panel font size').focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < 9; step++) await page.keyboard.press('ArrowRight');
  await settings.getByRole('button', { name: '18', exact: true }).click();
  await settings.getByLabel('Provider', { exact: true }).selectOption('9router');
  await settings.getByLabel('Model', { exact: true }).fill('another-model');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), '18px');
  assert.equal(await input.evaluate(element => getComputedStyle(element).fontSize), '20px');
  await page.keyboard.press('Escape');
  await expect(settings).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();

  await panel.getByRole('button', { name: 'New conversation' }).click();
  await input.fill('Use the selected provider');
  await input.press('Enter');
  await expect(send).toBeVisible({ timeout: 15000 });
  const overridden = await page.evaluate(() => window.assistantRequests.at(-1));
  assert.equal(overridden.provider, '9router');
  assert.equal(overridden.model, 'another-model');

  for (const width of [1440, 420]) {
    await page.setViewportSize({ width, height: 1000 });
    const bounds = await panel.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `Panel overflow at ${width}`);
    assert.ok((await page.getByLabel('Conversation', { exact: true }).boundingBox()).width > 150, 'Conversation selector should remain usable');
    await page.screenshot({ path: `/tmp/thinking-os-assistant-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await settings.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await settings.getByRole('button', { name: 'mocha', exact: true }).click();
  await page.screenshot({ path: '/tmp/thinking-os-assistant-settings.png' });
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForLoadState('networkidle');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark') && document.documentElement.classList.contains('mocha')), true);
  assert.equal(await input.evaluate(element => getComputedStyle(element).fontSize), '20px');
  await page.screenshot({ path: '/tmp/thinking-os-assistant-dark.png' });
  await input.fill('Stop this request');
  await input.press('Enter');
  await panel.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Stopped.');
  assert.deepEqual(errors, []);
  console.log('Assistant UI checks passed: Markdown, activity, display-only attachments, sessions/resume, settings, fonts, themes, narrow layout, cancellation.');
} catch (error) {
  await page.screenshot({ path: '/tmp/thinking-os-assistant-test-failure.png' });
  throw error;
} finally {
  await browser.close();
  await server.close();
}
