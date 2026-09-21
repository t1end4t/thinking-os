import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const address = server.httpServer.address();
if (!address || typeof address === 'string') throw new Error('Vite did not expose a TCP port.');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const failures = [];
page.on('pageerror', error => failures.push(error.message));

const watchId = 'topic-watch-ui';
let snapshot = { briefs: [], watches: [], runs: [], reports: [] };

try {
  await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/topic-watch-ui', data: {}, revision: 'topic-watch-ui' } }));
  await page.route('**/api/literature*', route => route.fulfill({ json: { jobs: [], runs: [], results: [], scheduler: { active: true, timeZone: 'UTC' } } }));
  await page.route('**/api/assistant', route => route.fulfill({ json: { agents: [{ id: 'codex', label: 'Codex' }] } }));
  await page.route('**/api/scouts*', async route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: snapshot });
    const body = request.postDataJSON();
    if (body.action === 'save-watch') {
      const previous = snapshot.watches.find(item => item.id === body.id);
      const saved = { ...body.watch, id: body.id ?? watchId, createdAt: previous?.createdAt ?? 1, updatedAt: (previous?.updatedAt ?? 1) + 1,
        ...(body.watch.enabled && body.watch.schedule.cadence === 'daily' ? { nextRunAt: Date.parse('2026-09-22T01:00:00Z') } : {}) };
      snapshot = { ...snapshot, watches: [saved] };
      return route.fulfill({ status: body.id ? 200 : 201, json: { watch: saved } });
    }
    if (body.action === 'start-run' && body.kind === 'watch') {
      const watch = snapshot.watches[0];
      const run = { id: 'scout-run-watch-ui', source: { kind: 'watch', id: watch.id }, inputSnapshot: watch, state: 'completed', activeStage: 'assembling',
        executedQueries: watch.searchDirections.map(item => item.query), providerAttempts: [], counters: { retrieved: 7, normalized: 5, screened: 5 },
        checkpoints: ['created', 'report'], startedAt: 3, updatedAt: 4, finishedAt: 4, reportId: 'scout-run-watch-ui' };
      const report = { id: run.id, source: run.source, inputSnapshot: watch, status: 'completed', summary: 'Five candidates screened; zero passed today’s quality gate.',
        sources: ['OpenAlex'], executedQueries: run.executedQueries, recommendations: [], uncertain: [], rejectionCounts: { 'insufficient-reading-value': 5 },
        limitations: [], screening: { model: 'fixture', instructionsVersion: 'v1' }, createdAt: Date.parse('2026-09-21T08:00:00Z') };
      snapshot = { ...snapshot, runs: [run], reports: [report] };
      return route.fulfill({ status: 202, json: { run } });
    }
    if (body.action === 'delete-watch') {
      snapshot = { ...snapshot, watches: [] };
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ status: 400, json: { error: `Unexpected action ${body.action}` } });
  });

  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Research / Survey' }).click();
  await page.getByRole('heading', { name: 'Topic watches' }).waitFor();

  const newWatchButton = page.getByRole('button', { name: 'New watch' });
  await newWatchButton.click();
  const dialog = page.getByRole('dialog', { name: 'New topic watch' });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  assert.equal(await newWatchButton.evaluate(element => document.activeElement === element), true, 'watch dialog restores focus');
  await newWatchButton.click();
  await dialog.getByLabel('Name').fill('Agent evaluation');
  await dialog.getByLabel('Topic').fill('Evaluation methods for LLM agents');
  await dialog.getByLabel('Purpose').fill('Find reproducible evaluation methods for the current research direction.');
  await dialog.getByLabel('Included scope').fill('Tool-use agents\nLong-horizon evaluation');
  await dialog.getByLabel('Exclusions').fill('Pure chatbot preference studies');
  await dialog.getByLabel('Search directions').fill('LLM agent evaluation benchmark :: Direct benchmark lane\nlong horizon agent reliability :: Reliability lane');
  await dialog.getByRole('button', { name: 'Save watch' }).click();
  await expect(dialog).not.toBeVisible();
  const card = page.locator('.topic-watch-card').filter({ hasText: 'Agent evaluation' });
  await expect(card).toBeVisible();
  await expect(card.getByText(/paused · daily/)).toBeVisible();

  await card.getByRole('button', { name: 'Resume' }).click();
  await expect(card.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(card.getByText(/Next:/)).toBeVisible();
  await card.getByRole('button', { name: 'Pause' }).click();
  await expect(card.getByRole('button', { name: 'Resume' })).toBeVisible();
  await card.getByRole('button', { name: 'Run now' }).click();
  await expect(page.getByText(/Topic watch digest/)).toBeVisible();
  await expect(page.getByText('Five candidates screened; zero passed today’s quality gate.')).toBeVisible();
  await page.screenshot({ path: '/tmp/thinking-os-topic-watches-desktop-light.png', fullPage: true });

  await page.evaluate(() => localStorage.setItem('thinking_os_theme', 'dark'));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Research / Survey' }).click();
  assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), true);
  await page.screenshot({ path: '/tmp/thinking-os-topic-watches-desktop-dark.png', fullPage: true });

  await page.setViewportSize({ width: 375, height: 900 });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.locator('#dock-toggle-btn').click();
  await page.getByRole('button', { name: 'Research / Survey' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `topic watch surface overflowed by ${overflow}px`);
  await page.screenshot({ path: '/tmp/thinking-os-topic-watches-narrow-dark.png', fullPage: true });

  page.once('dialog', prompt => prompt.accept());
  await page.locator('.topic-watch-card').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No topic watch yet. Manual problem-driven scouting remains available.')).toBeVisible();
  await expect(page.getByText(/Topic watch digest/)).toBeVisible();
  assert.deepEqual(failures, []);
  console.log('Topic watches: create, pause, resume, run now, durable digest, delete, dark theme, and narrow layout passed.');
} finally {
  await browser.close();
  await server.close();
}
