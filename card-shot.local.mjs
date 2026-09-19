import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.route('**/api/vault*', r => r.fulfill({ json: { dir: '/tmp/card-shot', data: {}, revision: 'x' } }));
await page.route('**/api/dirs?*', r => r.fulfill({ json: { dir: '/tmp/card-shot', parent: '/tmp', home: '/home/t', exists: true, entries: [] } }));
await page.route('**/api/assistant', r => r.fulfill({ json: { model: 'm', provider: 'p', providers: [] } }));
const imageId = `${'a'.repeat(64)}.png`;
await page.route('**/api/assistant/images', r => r.fulfill({ status: 201, json: { id: imageId } }));
await page.route(`**/api/assistant/images/${imageId}`, r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8AAAAMBAQDgYqciAAAAAElFTkSuQmCC', 'base64') }));
await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
const panel = page.getByRole('complementary', { name: 'Assistant' });
await panel.waitFor();

const png = Buffer.from(await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const b = await new Promise(res => c.toBlob(res));
  return [...new Uint8Array(await b.arrayBuffer())];
}));
await panel.getByLabel('Choose images').setInputFiles({ name: 'figure-3.png', mimeType: 'image/png', buffer: png });
await panel.getByRole('button', { name: 'Remove image figure-3.png' }).waitFor();

for (const ctx of [
  { type: 'node', id: 'claim-1', label: 'Sink tokens absorb excess attention mass', secondaryLabel: 'claim · c-142' },
  { type: 'service', id: 'svc-1', label: 'headroom', secondaryLabel: 'Port :8787' },
  { type: 'task', id: 'task-1', label: 'Reproduce baseline eval', secondaryLabel: 'in-progress' }
]) {
  const t = await page.evaluateHandle(payload => { const d = new DataTransfer(); d.setData('application/json', JSON.stringify(payload)); return d; }, ctx);
  await panel.dispatchEvent('drop', { dataTransfer: t });
}
await page.waitForTimeout(200);
for (const theme of ['dark', 'light']) {
  await page.evaluate(t => document.documentElement.classList.toggle('dark', t === 'dark'), theme);
  await page.waitForTimeout(150);
  await panel.screenshot({ path: `/tmp/row-${theme}.png` });
}
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.setViewportSize({ width: 420, height: 900 });
await page.waitForTimeout(250);
await page.screenshot({ path: '/tmp/row-narrow.png' });
await browser.close();
await server.close();
console.log('ok');
