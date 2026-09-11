import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  const vaultRequests = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/vault') vaultRequests.push(new URL(request.url()).searchParams.get('dir')); });
  await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/assistant-ui-test', data: {}, revision: 'ui-test' } }));
  await page.route('**/api/dirs?*', route => {
    const dir = new URL(route.request().url()).searchParams.get('dir');
    if (dir === '/denied') return route.fulfill({ status: 403, json: { error: 'Folder access denied.' } });
    return route.fulfill({ json: { dir, parent: '/tmp', home: '/home/test', exists: dir !== '/missing', entries: dir === '/tmp' ? ['project-one', 'assistant-ui-test'] : [] } });
  });
  await page.route('**/api/assistant', route => route.fulfill({ json: {
    model: 'combo-codex', provider: '9router', providers: [{ id: '9router', label: '9Router', baseUrl: 'http://127.0.0.1:20128/v1' }]
  } }));
  const uploads = [];
  const imageId = `${'a'.repeat(64)}.png`;
  await page.route('**/api/assistant/images', async route => {
    uploads.push({ type: route.request().headers()['content-type'], size: (route.request().postDataBuffer() ?? Buffer.alloc(0)).length });
    return route.fulfill({ status: 201, json: { id: imageId } });
  });
  await page.route(`**/api/assistant/images/${imageId}`, route => route.fulfill({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8AAAAMBAQDgYqciAAAAAElFTkSuQmCC', 'base64')
  }));
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
        { type: 'item.completed', item: { id: 'progress', type: 'agent_message', text: 'Reading the workspace before running checks.' } },
        { type: 'item.started', item: { id: 'command', type: 'command_execution', command: 'pwd', status: 'in_progress', aggregated_output: '' } },
        { type: 'item.completed', item: { id: 'command', type: 'command_execution', command: 'pwd', status: 'completed', aggregated_output: '/tmp/assistant-ui-test', exit_code: 0 } },
        { type: 'item.completed', item: { id: 'warning', type: 'error', message: 'Nonfatal provider metadata notice.' } },
        { type: 'item.completed', item: { id: 'interim', type: 'agent_message', text: 'Interim update before the final answer.' } },
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
  const mode = {
    summary: panel.locator('details.assistant-mode-menu > summary'),
    async select(label) {
      await this.summary.click();
      await panel.getByRole('menuitemradio', { name: new RegExp(`^${label}`) }).click();
      await expect(this.summary).toHaveAttribute('aria-label', `Assistant mode: ${label}`);
    },
    expectCurrent(label) { return expect(this.summary).toHaveAttribute('aria-label', `Assistant mode: ${label}`); }
  };
  await expect(panel).toBeVisible();
  await mode.expectCurrent('Chat');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
      await expect(mode.summary).toBeVisible();
      await mode.select('Codex');
      await expect(panel.getByText('Inspect files, make changes, and check the result.')).toBeVisible();
      await mode.select('Work');
      await expect(panel.getByText('Work through an idea. Work discusses the problem and can change workspace files.')).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Explore an idea', exact: true })).toBeVisible();
      await mode.select('Chat');
      await panel.screenshot({ path: `/tmp/thinking-os-chat-${width}-${theme}.png` });
      const empty = await panel.getByText('Start a conversation').evaluate(element => {
        const bounds = element.parentElement.getBoundingClientRect();
        const container = element.closest('[role="log"]').getBoundingClientRect();
        return { horizontal: bounds.x + bounds.width / 2 - container.x - container.width / 2, vertical: bounds.y + bounds.height / 2 - container.y - container.height / 2 };
      });
      assert.ok(Math.abs(empty.horizontal) < 2 && Math.abs(empty.vertical) < 2, `Empty conversation is centered at ${width}px in ${theme} mode`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const tabs = panel.getByRole('tablist', { name: 'Conversations' });
  const browse = panel.getByRole('button', { name: 'Browse conversations' });
  const history = page.getByRole('dialog', { name: 'Conversations', exact: true });
  await expect(panel.getByRole('combobox')).toHaveCount(0);
  for (const locator of [input, panel.locator('header summary > span'), tabs.getByRole('tab').first(), panel.getByText('Start a conversation'), panel.getByText('Enter to send · Shift+Enter for newline')]) {
    assert.match(await locator.evaluate(element => getComputedStyle(element).fontFamily), /^system-ui/);
  }
  assert.ok(parseFloat(await panel.getByText('Enter to send · Shift+Enter for newline').evaluate(element => getComputedStyle(element).fontSize)) >= 12);
  await panel.screenshot({ path: '/tmp/thinking-os-assistant-empty.png' });
  await browse.click();
  await expect(history.getByText('No saved conversations yet.')).toBeVisible();
  await expect(history.getByRole('textbox', { name: 'Search conversations' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(history).not.toBeVisible();
  await expect(browse).toBeFocused();
  assert.equal(await page.getByRole('button', { name: 'Move assistant panel' }).count(), 0);

  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.setData('application/json', JSON.stringify({ type: 'node', id: 'private-claim', label: 'Private claim', metadata: { secret: 'never-send-this' } }));
    return data;
  });
  await panel.dispatchEvent('drop', { dataTransfer: transfer });
  await expect(panel.getByRole('button', { name: 'Remove Private claim' })).toBeVisible();
  const png = Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }));
  await panel.getByLabel('Choose images').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(panel.getByRole('alert')).toContainText('5 MiB');
  await panel.getByLabel('Choose images').setInputFiles(Array.from({ length: 5 }, (_, index) => ({ name: `${index}.png`, mimeType: 'image/png', buffer: png })));
  await expect(panel.getByRole('alert')).toContainText('up to 4 images');
  await panel.getByLabel('Choose images').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('nope') });
  await expect(panel.getByRole('alert')).toContainText('Use PNG, JPEG, or WebP images.');
  await page.evaluate(async bytes => {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([Uint8Array.from(bytes)], { type: 'image/png' }) })]);
  }, [...png]);
  await input.focus();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(panel.getByRole('button', { name: 'Remove image image.png' })).toBeVisible();
  await panel.getByRole('button', { name: 'Remove image image.png' }).click();
  const imageTransfer = await page.evaluateHandle(bytes => {
    const data = new DataTransfer();
    data.items.add(new File([Uint8Array.from(bytes)], 'pasted.png', { type: 'image/png' }));
    return data;
  }, [...png]);
  await panel.dispatchEvent('drop', { dataTransfer: imageTransfer });
  await expect(panel.getByRole('button', { name: 'Remove image pasted.png' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Remove Private claim' })).toBeVisible();
  await panel.getByRole('button', { name: 'Remove image pasted.png' }).click();
  await panel.getByLabel('Choose images').setInputFiles({ name: 'diagram.png', mimeType: 'image/png', buffer: png });
  await expect(panel.getByRole('button', { name: 'Remove image diagram.png' })).toBeVisible();
  await expect(send).toBeEnabled();
  await input.fill('Render Markdown');
  await input.press('Enter');
  await expect(panel.getByRole('status')).toBeVisible();
  await expect(mode.summary).toHaveAttribute('aria-disabled', 'true');
  const syncBanner = page.getByRole('status', { name: 'Workspace sync' });
  await expect(syncBanner).toBeVisible();
  assert.ok(await page.locator('#kanban-board-grid').evaluate(element => Boolean(element.closest('[inert]'))), 'Workspace surfaces are inert while the assistant runs');
  await expect(transcript.getByRole('status')).toHaveCount(1);
  await expect(transcript.getByRole('status')).toHaveText('Thinking…');
  await expect(transcript.locator('.animate-spin')).toHaveCount(1);
  const progress = transcript.getByText('Reading the workspace before running checks.');
  await expect(progress).toBeVisible();
  await expect(transcript.locator('.assistant-activity-group').getByText('Reading the workspace before running checks.')).toBeVisible();
  await panel.getByText('View steps', { exact: true }).click();
  await expect(progress).toBeHidden();
  await expect(send).toBeVisible({ timeout: 15000 });
  await expect(syncBanner).toBeHidden();
  assert.ok(vaultRequests.length >= 2, 'The assistant reloads the vault after a turn');
  const steps = panel.getByText(/^Worked for \d+s$/);
  await expect(steps).toBeVisible();
  await expect(panel.getByRole('button', { name: /Reasoning summary/ })).toBeHidden();
  await steps.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: '/tmp/thinking-os-assistant-steps-collapsed.png' });
  await expect(transcript.getByText('Interim update before the final answer.')).toBeHidden();
  await steps.click();
  await expect(panel.getByRole('button', { name: /Reasoning summary/ })).toBeVisible();
  await expect(transcript.getByText('Interim update before the final answer.')).toBeVisible();
  await expect(transcript.getByText('Reading the workspace before running checks.')).toBeVisible();
  assert.deepEqual(await transcript.locator('.assistant-activity-group > div').evaluate(element =>
    [...element.children].map(child => child.textContent)), [
    'Reasoning summarycomplete', 'Reading the workspace before running checks.', 'Ran pwd',
    'Nonfatal provider metadata notice.', 'Interim update before the final answer.'
  ]);
  await panel.screenshot({ path: '/tmp/thinking-os-assistant-steps-expanded.png' });
  await steps.press('Enter');
  await expect(panel.getByRole('button', { name: /Reasoning summary/ })).toBeHidden();
  await expect(transcript.getByText('Interim update before the final answer.')).toBeHidden();
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  await steps.press('Enter');
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  assert.equal(await transcript.locator('strong').first().innerText(), 'Review');
  assert.equal(await transcript.locator('pre code').innerText(), 'print("hello")');
  assert.match(await transcript.locator('pre code').evaluate(element => getComputedStyle(element).fontFamily), /monospace/);
  assert.equal(await transcript.locator('table').count(), 1);
  assert.equal(await transcript.locator('a[href^="javascript:"]').count(), 0);
  assert.equal(await transcript.locator('script').count(), 0);
  assert.ok(await transcript.locator('pre code .hljs-string').count() > 0, 'Code blocks are syntax highlighted');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    const color = await transcript.locator('pre code .hljs-string').first().evaluate(element => getComputedStyle(element).color);
    const ink = await transcript.locator('pre code').first().evaluate(element => getComputedStyle(element).color);
    assert.notEqual(color, ink, `Highlighting differs from body text in ${theme} mode`);
  }
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await transcript.getByRole('button', { name: 'Copy python code' }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'print("hello")');
  await transcript.getByRole('button', { name: 'Copy response' }).last().click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^## Capabilities/);
  await transcript.getByRole('button', { name: 'Copy question' }).last().click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Render Markdown');
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('Permission denied')) }));
  await transcript.getByRole('button', { name: 'Copy response' }).last().click();
  await expect(transcript.getByRole('button', { name: 'Copy response' }).last()).toHaveText('Copy failed');
  await page.evaluate(() => delete navigator.clipboard.writeText);
  await input.fill('Keep this draft');
  page.once('dialog', dialog => dialog.dismiss());
  await transcript.getByRole('button', { name: 'Edit question' }).last().click();
  await expect(input).toHaveValue('Keep this draft');
  page.once('dialog', dialog => dialog.accept());
  await transcript.getByRole('button', { name: 'Edit question' }).last().click();
  await expect(input).toHaveValue('Render Markdown');
  await expect(input).toBeFocused();
  await expect(transcript.getByText('Render Markdown')).toHaveCount(1);
  await expect(panel.getByRole('button', { name: 'Remove image diagram.png' })).toBeVisible();
  await panel.getByRole('button', { name: 'Remove image diagram.png' }).click();
  await input.fill('');
  const withImage = await page.evaluate(() => window.assistantRequests.at(-1));
  assert.deepEqual(withImage.images, [{ id: `${'a'.repeat(64)}.png`, name: 'diagram.png' }]);
  assert.equal(withImage.message, 'Render Markdown');
  assert.deepEqual(uploads, Array.from({ length: 3 }, () => ({ type: 'image/png', size: png.length })));
  await expect(transcript.getByRole('img', { name: 'diagram.png' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Remove image diagram.png' })).toHaveCount(0);
  await panel.getByRole('button', { name: /Ran pwd/ }).click();
  await expect(transcript.getByText('Shell', { exact: true })).toBeVisible();
  await expect(transcript.getByText('Success', { exact: true })).toBeVisible();
  assert.match(await transcript.locator('.assistant-activity-shell-output').innerText(), /^\$ pwd\n\n\/tmp\/assistant-ui-test$/);
  assert.equal(await page.getByRole('alert').count(), 0);
  const request = await page.evaluate(() => window.assistantRequests[0]);
  assert.equal(request.mode, 'chat');
  assert.equal(request.message, 'Render Markdown');
  assert.equal(JSON.stringify(request).includes('never-send-this'), false);
  assert.equal(JSON.stringify(request).includes('private-claim'), false);

  const firstTab = tabs.getByRole('tab').first();
  const firstTitle = await firstTab.innerText();
  await panel.getByRole('button', { name: 'New conversation' }).click();
  await expect(transcript.getByRole('heading')).toHaveCount(0);
  await expect(tabs.getByRole('tab')).toHaveCount(2);
  await browse.click();
  await history.getByRole('textbox', { name: 'Search conversations' }).fill('no matching title');
  await expect(history.getByText('No matching conversations.')).toBeVisible();
  await history.getByRole('textbox', { name: 'Search conversations' }).fill('render');
  await expect(history.getByRole('button', { name: /^Open conversation:/ })).toHaveCount(1);
  await history.getByRole('button', { name: `Open conversation: ${firstTitle}`, exact: true }).click();
  await expect(history).not.toBeVisible();
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  assert.equal(await tabs.getByRole('tab', { name: firstTitle, exact: true }).getAttribute('aria-selected'), 'true');
  await input.fill('Keep this draft');
  await mode.select('Work');
  await expect(input).toHaveValue('Keep this draft');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await mode.expectCurrent('Work');
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  await expect(transcript.getByRole('img', { name: 'diagram.png' })).toBeVisible();
  await expect(panel.getByText(/^Worked for \d+s$/)).toBeVisible();
  await expect(panel.getByRole('button', { name: /Reasoning summary/ })).toBeHidden();
  await expect(transcript.getByText('Interim update before the final answer.')).toBeHidden();
  await input.fill('Continue the previous conversation');
  await input.press('Enter');
  await expect(send).toBeVisible({ timeout: 15000 });
  const selectedId = await tabs.getByRole('tab', { name: firstTitle, exact: true }).evaluate(element => element.id.replace('assistant-tab-', ''));
  assert.equal((await page.evaluate(() => window.assistantRequests[0])).threadId, `thread-${selectedId}`);
  assert.equal((await page.evaluate(() => window.assistantRequests[0])).mode, 'work');
  await mode.select('Chat');

  await firstTab.focus();
  await page.keyboard.press('End');
  assert.equal(await tabs.getByRole('tab').last().getAttribute('aria-selected'), 'true');
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab').first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.getByRole('tab').last()).toBeFocused();
  await expect(tabs.getByRole('button', { name: /^Delete conversation:/ })).toHaveCount(0);
  await tabs.getByRole('button', { name: /^Close conversation:/ }).first().click();
  await expect(tabs.getByRole('tab')).toHaveCount(1);
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toHaveCount(2);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(tabs.getByRole('tab')).toHaveCount(1);
  await browse.click();
  await expect(history.getByRole('button', { name: /^Open conversation:/ })).toHaveCount(2);
  await history.getByRole('button', { name: 'Open conversation: New conversation', exact: true }).click();
  await expect(tabs.getByRole('tab')).toHaveCount(2);
  await expect(tabs.getByRole('tab', { name: 'New conversation', exact: true })).toHaveAttribute('aria-selected', 'true');
  await tabs.getByRole('button', { name: 'Close conversation: New conversation', exact: true }).click();
  await expect(tabs.getByRole('tab', { name: firstTitle, exact: true })).toHaveAttribute('aria-selected', 'true');
  await browse.click();
  page.once('dialog', dialog => dialog.dismiss());
  await history.getByRole('button', { name: 'Delete conversation: New conversation', exact: true }).click();
  await expect(history.getByRole('button', { name: /^Open conversation:/ })).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept());
  await history.getByRole('button', { name: 'Delete conversation: New conversation', exact: true }).click();
  await expect(history.getByRole('button', { name: /^Open conversation:/ })).toHaveCount(1);
  await page.keyboard.press('Escape');

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
    assert.ok((await tabs.boundingBox()).width > 150, 'Conversation tabs should remain usable');
    assert.ok((await tabs.getByRole('tab').first().boundingBox()).height >= 24, 'Tabs should stay tappable');
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
  for (const width of [1440, 420]) {
    await page.setViewportSize({ width, height: 1000 });
    await browse.click();
    await expect(history.getByRole('button', { name: /^Open conversation:/ })).toHaveCount(2);
    const bounds = await history.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, 'History stays inside viewport');
    await page.screenshot({ path: `/tmp/thinking-os-assistant-history-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(browse).toBeFocused();
  }
  await input.fill('Stop this request');
  await input.press('Enter');
  await expect(tabs.getByRole('tab').first()).toBeDisabled();
  await expect(tabs.getByRole('button', { name: /^Close conversation:/ }).first()).toBeDisabled();
  await expect(transcript.locator('.assistant-activity-group').last().locator('button').first()).toBeAttached();
  await panel.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Stopped.');
  await expect(panel.locator('summary').last()).toHaveText('Stopped');
  await browse.click();
  page.once('dialog', dialog => dialog.accept());
  await history.getByRole('button', { name: 'Delete conversation: Use the selected provider', exact: true }).click();
  await expect(history.getByRole('textbox', { name: 'Search conversations' })).toBeFocused();
  await expect(history.getByRole('button', { name: /^Open conversation:/ })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(tabs.getByRole('tab', { name: firstTitle, exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toHaveCount(2);
  await tabs.getByRole('button', { name: /^Close conversation:/ }).click();
  await expect(panel.getByText('Start a conversation')).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'New conversation', exact: true })).toBeFocused();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(panel.getByText('Start a conversation')).toBeVisible();
  await browse.click();
  await expect(history.getByRole('button', { name: /^Open conversation:/ })).toHaveCount(1);
  await history.getByRole('button', { name: `Open conversation: ${firstTitle}`, exact: true }).click();
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toHaveCount(2);
  await expect(tabs.getByRole('tab')).toHaveCount(1);
  await browse.click();
  page.once('dialog', dialog => dialog.accept());
  await history.getByRole('button', { name: `Delete conversation: ${firstTitle}`, exact: true }).click();
  await expect(history.getByText('No saved conversations yet.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(panel.getByText('Start a conversation')).toBeVisible();
  await browse.click();
  await expect(history.getByText('No saved conversations yet.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => localStorage.setItem('thinking_os_assistant_sessions_v1:/tmp/assistant-ui-test', JSON.stringify({ selectedId: 'legacy', sessions: [{ id: 'legacy', title: 'Legacy chat', messages: [
    { id: 'old-user', role: 'user', content: 'List files' },
    { id: 'old-progress', role: 'assistant', content: 'Legacy intermediate update.' },
    { id: 'old-command', role: 'assistant', kind: 'command', label: 'ls', content: 'legacy.txt', state: 'complete' },
    { id: 'old-failed-command', role: 'assistant', kind: 'command', label: 'false', content: '', state: 'failed' },
    { id: 'old-reply', role: 'assistant', content: 'Legacy answer preserved.' }
  ] }] })));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(panel.getByText('Legacy answer preserved.')).toBeVisible();
  await expect(panel.getByText('Legacy intermediate update.')).toBeHidden();
  await expect(panel.getByRole('button', { name: /^Ran ls/ })).toBeHidden();
  await panel.getByText('View steps', { exact: true }).click();
  await expect(panel.getByText('Legacy intermediate update.')).toBeVisible();
  await panel.getByRole('button', { name: /^Ran ls/ }).click();
  await expect(transcript.locator('.assistant-activity-shell-output')).toHaveText('$ ls\n\nlegacy.txt');
  await panel.getByRole('button', { name: /^Ran ls/ }).click();
  await panel.getByRole('button', { name: 'Ran false', exact: true }).click();
  await expect(transcript.locator('.assistant-activity-shell-status')).toHaveText('Failed');
  await expect(transcript.locator('.assistant-activity-shell-output')).toHaveText('$ false\n\n');
  await panel.getByRole('button', { name: 'Ran false', exact: true }).click();

  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    for (const width of [1440, 420]) {
      await page.setViewportSize({ width, height: 1000 });
      await panel.getByRole('button', { name: /^Ran ls/ }).click();
      const group = transcript.locator('.assistant-activity-group').last();
      await expect.poll(() => group.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      await expect(transcript.locator('.assistant-activity-shell-output')).toBeVisible();
      await page.screenshot({ path: `/tmp/thinking-os-steps-${dark}-${width}.png` });
      await panel.getByText('View steps', { exact: true }).click();
      await expect(panel.getByText('Legacy intermediate update.')).toBeHidden();
      await expect(transcript.locator('.assistant-activity-shell-output')).toBeHidden();
      await expect(panel.getByText('Legacy answer preserved.')).toBeVisible();
      await panel.getByText('View steps', { exact: true }).click();
      await panel.getByRole('button', { name: /^Ran ls/ }).click();
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  const switcher = panel.locator('.assistant-switcher > summary');
  const openSwitcher = async () => { if (!await panel.getByRole('navigation', { name: 'Assistant projects' }).isVisible()) await switcher.click(); };
  await expect(panel.getByRole('navigation', { name: 'Assistant projects' })).toBeHidden();
  await switcher.focus();
  await switcher.press('Enter');
  await expect(panel.getByRole('navigation', { name: 'Assistant projects' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel.getByRole('navigation', { name: 'Assistant projects' })).toBeHidden();
  await expect(switcher).toBeFocused();
  await openSwitcher();
  await input.click();
  await expect(panel.getByRole('navigation', { name: 'Assistant projects' })).toBeHidden();
  await openSwitcher();
  const projectList = panel.getByRole('navigation', { name: 'Assistant projects' });
  const defaultProject = projectList.getByRole('button', { name: 'Select project: /tmp/assistant-ui-test', exact: true });
  const extraProject = projectList.getByRole('button', { name: 'Select project: /tmp/project-one', exact: true });
  const addFolder = panel.getByRole('button', { name: 'Add folder', exact: true });
  const picker = page.getByRole('dialog', { name: 'Choose project folder' });
  const folderPath = picker.getByRole('textbox', { name: 'Project folder path' });
  const choose = picker.getByRole('button', { name: 'Choose this folder' });
  await expect(defaultProject).toHaveAttribute('aria-current', 'true');
  await expect(defaultProject).toContainText('Workspace');
  await expect(defaultProject).toContainText('/tmp/assistant-ui-test');
  await expect(panel.getByText(/^Codex · /)).toBeVisible();
  await expect(projectList.getByRole('button', { name: /^Remove project:/ })).toHaveCount(0);
  const vaultCount = vaultRequests.length;
  await addFolder.click();
  await expect(choose).toBeEnabled();
  await folderPath.fill('/missing');
  await expect(choose).toBeDisabled();
  await folderPath.press('Enter');
  await expect(picker.getByRole('alert')).toContainText('Folder does not exist');
  await expect(choose).toBeDisabled();
  await folderPath.fill('/denied');
  await folderPath.press('Enter');
  await expect(picker.getByRole('alert')).toHaveText('Folder access denied.');
  await expect(choose).toBeDisabled();
  await folderPath.fill('/tmp');
  await folderPath.press('Enter');
  await picker.getByRole('button', { name: 'project-one', exact: true }).click();
  await expect(folderPath).toHaveValue('/tmp/project-one');
  await choose.click();
  await expect(picker).not.toBeVisible();
  await expect(switcher).toBeFocused();
  await openSwitcher();
  await expect(extraProject).toHaveAttribute('aria-current', 'true');
  await expect(panel.getByText('Start a conversation')).toBeVisible();
  await expect(page.locator('#workspace-dir-btn')).toHaveText('/tmp/assistant-ui-test');
  await expect(switcher).toHaveText('project-one');
  await expect(projectList.getByText('/tmp/project-one', { exact: true })).toBeVisible();
  await browse.click();
  await expect(history.getByText('No saved conversations yet.')).toBeVisible();
  await page.keyboard.press('Escape');
  await input.fill('Project-specific conversation');
  await input.press('Enter');
  await openSwitcher();
  await expect(defaultProject).toBeDisabled();
  await expect(addFolder).toBeDisabled();
  await expect(projectList.getByRole('button', { name: 'Remove project: /tmp/project-one', exact: true })).toBeDisabled();
  await expect(send).toBeVisible({ timeout: 15000 });
  const projectRequest = await page.evaluate(() => window.assistantRequests.at(-1));
  assert.equal(projectRequest.dir, '/tmp/project-one');
  assert.equal(projectRequest.threadId, undefined);
  await defaultProject.click();
  await expect(panel.getByText('Legacy answer preserved.')).toBeVisible();
  await openSwitcher();
  await extraProject.click();
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toBeVisible();
  await input.fill('Continue project conversation');
  await input.press('Enter');
  await expect(send).toBeVisible({ timeout: 15000 });
  const resumed = await page.evaluate(() => window.assistantRequests.at(-1));
  assert.equal(resumed.dir, '/tmp/project-one');
  assert.equal(resumed.threadId, `thread-${projectRequest.conversationId}`);
  assert.equal(vaultRequests.length, vaultCount, 'Changing projects must not load or save a vault');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await openSwitcher();
  await expect(defaultProject).toHaveAttribute('aria-current', 'true');
  await expect(extraProject).toBeVisible();
  await expect(panel.getByText('Legacy answer preserved.')).toBeVisible();
  await openSwitcher();
  await extraProject.click();
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toHaveCount(2);
  await openSwitcher();
  await projectList.getByRole('button', { name: 'Remove project: /tmp/project-one', exact: true }).click();
  await expect(extraProject).toHaveCount(0);
  await expect(defaultProject).toHaveAttribute('aria-current', 'true');
  assert.match(await page.evaluate(() => localStorage.getItem('thinking_os_assistant_sessions_v1:/tmp/project-one')), /Project-specific conversation/);
  await addFolder.click();
  await expect(choose).toBeEnabled();
  await folderPath.fill('/tmp/project-one');
  await folderPath.press('Enter');
  await choose.click();
  await expect(transcript.getByRole('heading', { name: 'Capabilities' })).toHaveCount(2);
  await openSwitcher();
  await addFolder.click();
  await choose.click();
  await openSwitcher();
  await expect(extraProject).toHaveCount(1);

  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => localStorage.setItem('thinking_os_theme', theme), theme);
    await page.reload();
    await page.waitForLoadState('networkidle');
    for (const width of [1440, 420]) {
      await page.setViewportSize({ width, height: 1000 });
      const header = panel.locator('header');
      assert.ok(await header.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Header fits at ${width}`);
      assert.ok(await header.evaluate(element => element.getBoundingClientRect().height <= parseFloat(getComputedStyle(element).fontSize) * 3), 'Header stays compact at the chosen font size');
      await page.screenshot({ path: `/tmp/thinking-os-header-${theme}-${width}.png` });
      await openSwitcher();
      await expect(defaultProject).toBeVisible();
      const menu = panel.locator('.assistant-switcher-menu');
      const menuBox = await menu.boundingBox();
      assert.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= width, `Project menu fits at ${width}`);
      await page.screenshot({ path: `/tmp/thinking-os-projects-${theme}-${width}.png` });
      await addFolder.click();
      await expect(choose).toBeEnabled();
      const bounds = await picker.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, 'Folder picker fits the viewport');
      await page.screenshot({ path: `/tmp/thinking-os-project-picker-${theme}-${width}.png` });
      await page.keyboard.press('Escape');
      await expect(picker).not.toBeVisible();
      await expect(switcher).toBeFocused();
    }
  }

  await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/new-workspace', data: {} } }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openSwitcher();
  await extraProject.click();
  await page.locator('#workspace-dir-btn').click();
  await page.getByRole('dialog', { name: 'Choose workspace folder' }).getByRole('button', { name: 'Choose this folder' }).click();
  await openSwitcher();
  await expect(projectList.getByRole('button', { name: 'Select project: /tmp/new-workspace', exact: true })).toHaveAttribute('aria-current', 'true');
  await expect(extraProject).toBeVisible();
  await page.evaluate(() => localStorage.setItem('thinking_os_assistant_projects_v1', '{invalid'));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await openSwitcher();
  await expect(panel.getByRole('alert')).toContainText('Saved projects could not be read');
  await expect(addFolder).toBeDisabled();
  assert.equal(await page.evaluate(() => localStorage.getItem('thinking_os_assistant_projects_v1')), '{invalid');
  assert.deepEqual(errors, []);
  console.log('Assistant UI checks passed: Markdown, grouped steps, display-only attachments, conversation tabs/delete, sessions/resume, settings, fonts, themes, narrow layout, cancellation, project routing/isolation/persistence/removal, folder picker errors, default workspace.');
} catch (error) {
  await page.screenshot({ path: '/tmp/thinking-os-assistant-test-failure.png' });
  throw error;
} finally {
  await browser.close();
  await server.close();
}
