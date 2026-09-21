import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const failures = [];
page.on('pageerror', error => failures.push(error.message));

const brief = {
  id: 'scout-brief-assistant', question: 'Which TinyML methods make on-device training practical?',
  purpose: 'Choose one measured memory-reduction strategy for an experiment.', scope: ['On-device training', 'Microcontrollers'],
  exclusions: ['Inference-only optimization'], constraints: ['Title and abstract screening'],
  searchDirections: [
    { query: 'TinyML on-device training memory', reason: 'Direct terminology' },
    { query: 'microcontroller neural network training memory optimization', reason: 'Hardware-constrained phrasing' }
  ], screeningCriteria: ['Must discuss training', 'Must expose measured constraints'], maxRecommendations: 5,
  createdFrom: { kind: 'assistant', reference: 'assistant discussion' }, author: 'model:assistant', createdAt: 1, updatedAt: 1
};
const running = {
  id: 'scout-run-assistant', source: { kind: 'brief', id: brief.id }, inputSnapshot: brief,
  state: 'screening', activeStage: 'screening', executedQueries: brief.searchDirections.map(item => item.query), providerAttempts: [],
  counters: { retrieved: 12, normalized: 9, screened: 4 }, checkpoints: ['created', 'retrieval-complete'], startedAt: 2, updatedAt: 3
};
const report = {
  id: running.id, source: running.source, inputSnapshot: brief, status: 'completed',
  summary: 'Nine candidates were screened. One paper was recommended.', sources: ['OpenAlex'], executedQueries: running.executedQueries,
  recommendations: [], uncertain: [], rejectionCounts: { irrelevant: 8 }, limitations: ['arXiv was unavailable during this run.'],
  screening: { model: 'fixture', instructionsVersion: 'v1' }, createdAt: 4
};
const completed = { ...running, state: 'completed', activeStage: 'assembling', counters: { ...running.counters, screened: 9 }, checkpoints: [...running.checkpoints, 'report'], updatedAt: 4, finishedAt: 4, reportId: report.id };
let snapshot = { briefs: [brief], watches: [], runs: [], reports: [] };
let getCountAfterStart = 0;

try {
  await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/assistant-scout-test', data: {}, revision: 'scout-ui' } }));
  await page.route('**/api/literature*', route => route.fulfill({ json: { jobs: [], runs: [], results: [], scheduler: { active: true, timeZone: 'UTC' } } }));
  await page.route('**/api/assistant', route => route.fulfill({ json: { agents: [{ id: 'codex', label: 'Codex' }] } }));
  await page.route('**/api/scouts*', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      if (snapshot.runs.length) {
        getCountAfterStart++;
        if (getCountAfterStart >= 3) snapshot = { ...snapshot, runs: [completed], reports: [report] };
      }
      return route.fulfill({ json: snapshot });
    }
    const body = request.postDataJSON();
    if (body.action === 'save-brief') {
      const saved = { ...body.brief, id: brief.id, createdAt: brief.createdAt, updatedAt: 2 };
      snapshot = { ...snapshot, briefs: [saved] };
      return route.fulfill({ json: { brief: saved } });
    }
    if (body.action === 'start-run') {
      snapshot = { ...snapshot, runs: [running] };
      return route.fulfill({ status: 202, json: { run: running } });
    }
    if (body.action === 'cancel-run') {
      const cancelled = { ...running, state: 'cancelling', updatedAt: 4 };
      snapshot = { ...snapshot, runs: [cancelled] };
      return route.fulfill({ json: { run: cancelled } });
    }
    return route.fulfill({ status: 400, json: { error: 'Unexpected scout action.' } });
  });
  await page.addInitScript(briefId => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, options) => {
      if (url !== '/api/assistant' || options?.method !== 'POST') return originalFetch(url, options);
      const request = JSON.parse(options.body);
      const scout = request.message.toLowerCase().includes('scout');
      const events = [
        { type: 'thread.started', thread_id: request.threadId || `thread-${request.conversationId}` },
        { type: 'turn.started' },
        ...(scout ? [{ type: 'item.completed', item: { id: 'scout-tool', type: 'mcp_tool_call', server: 'thinking_os_scout', tool: 'propose_scout_brief', arguments: {}, status: 'completed', result: { content: [{ type: 'text', text: 'Scout brief ready.' }], structured_content: { kind: 'scout-brief', briefId } } } }] : []),
        { type: 'item.completed', item: { id: 'reply', type: 'agent_message', text: scout ? 'I prepared a brief for review. External search has not started.' : 'The assistant remains usable while the detached scout runs.' } },
        { type: 'turn.completed', usage: {} }
      ];
      const encoder = new TextEncoder();
      return new Response(new ReadableStream({ start(controller) { for (const event of events) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); controller.close(); } }), { headers: { 'content-type': 'application/x-ndjson' } });
    };
  }, brief.id);

  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.waitForLoadState('networkidle');
  const panel = page.getByRole('complementary', { name: 'Assistant', exact: true });
  const input = panel.getByRole('textbox', { name: 'Message the assistant' });
  await input.fill('Scout papers for TinyML on-device training memory.');
  await input.press('Enter');
  console.log('phase: assistant response');
  const card = panel.getByRole('article', { name: 'Scout brief' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading', { name: brief.question })).toBeVisible();
  await expect(card.getByText('External search has not started.')).toHaveCount(0);

  await card.getByRole('button', { name: 'Review brief' }).click();
  console.log('phase: review opened');
  const review = page.getByRole('dialog', { name: 'Review scout brief' });
  await review.getByLabel('Purpose').fill('Choose one reproducible memory strategy for the first experiment.');
  await review.getByRole('button', { name: 'Save brief' }).click();
  console.log('phase: brief saved');
  await expect(review).not.toBeVisible();
  await expect(card.locator('p').first()).toHaveText('Choose one reproducible memory strategy for the first experiment.');

  await card.getByRole('button', { name: 'Run scout' }).click();
  console.log('phase: run started');
  await expect(card.getByText('Screening titles and abstracts')).toBeVisible();
  await input.fill('Can we keep discussing the experiment while it runs?');
  await input.press('Enter');
  console.log('phase: continued chat');
  await expect(panel.getByText('The assistant remains usable while the detached scout runs.')).toBeVisible();
  await expect(card.getByText('Screening titles and abstracts')).toBeVisible();

  await expect(card.getByRole('button', { name: 'Open full report' })).toBeVisible({ timeout: 7000 });
  console.log('phase: report complete');
  await card.getByRole('button', { name: 'Open full report' }).click();
  await expect(page.getByRole('heading', { name: brief.question })).toBeVisible();
  await expect(page.getByText('arXiv was unavailable during this run.')).toBeVisible();
  await page.screenshot({ path: '/tmp/thinking-os-assistant-scout-phase5.png', fullPage: true });
  assert.deepEqual(failures, []);
  console.log('Assistant scout: brief review, explicit run, detached progress, continued chat, and report handoff passed.');
} finally {
  await browser.close();
  await server.close();
}
