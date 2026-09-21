import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const ENV_ENTRY = {
  id: 'codex-agents',
  agent: 'codex',
  scope: 'global',
  projectId: null,
  projectName: null,
  category: 'instructions',
  label: 'AGENTS.md',
  kind: 'markdown',
  path: '/home/test/.codex/AGENTS.md',
  exists: true,
  sizeBytes: 42,
  modifiedAt: '2026-01-01T00:00:00.000Z'
};

try {
  await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/tab-context-test', data: {}, revision: 'tab-test' } }));
  await page.route('**/api/assistant', route => route.fulfill({ json: { agents: [{ id: 'codex', label: 'Codex' }] } }));
  await page.route('**/api/runtime/services*', route => route.fulfill({ json: { enabled: true, services: [] } }));
  await page.addInitScript(() => {
    localStorage.setItem('thinking_os_vault_dir', '/tmp/tab-context-test');
  });
  const LOCAL_MODEL = {
    id: 'qwen-coder', name: 'Qwen Coder', fileName: 'qwen.gguf', path: '/home/test/LOCAL-AI-MODELS/qwen.gguf',
    kind: 'model', sizeBytes: 4_800_000_000, size: '4.8 GB', quantization: 'Q4_K_M', parameters: '7B',
    status: 'ready', projectorFileName: null, fit: null, runtime: null
  };
  await page.route('**/api/runtime/models*', route => route.fulfill({
    json: { modelsDir: '/home/test/LOCAL-AI-MODELS', llamaServerAvailable: true, hardware: null, models: [LOCAL_MODEL] }
  }));
  await page.route('**/api/agent-env*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('id')) return route.fulfill({ json: { entry: ENV_ENTRY, content: '# Local agent instructions\nBe precise.' } });
    return route.fulfill({ json: { home: '/home/test', projects: [], entries: [ENV_ENTRY] } });
  });

  await page.goto(server.resolvedUrls.local[0]);
  const panel = page.getByRole('complementary', { name: 'Assistant', exact: true });
  await expect(panel).toBeVisible();

  // Tasks tabs: Direction, Pipeline, Weekly Review.
  const taskViews = page.getByRole('navigation', { name: 'Tasks workspace views' });
  for (const [name, chip] of [[/^Direction/, 'Direction tab'], [/^Pipeline/, 'Pipeline tab'], [/^Weekly Review/, 'Weekly Review tab']]) {
    const tab = taskViews.getByRole('button', { name });
    await expect(tab).toHaveAttribute('draggable', 'true');
    await tab.dragTo(panel);
    await expect(panel.getByRole('button', { name: `Remove ${chip}` })).toBeVisible();
  }

  // Runtime tabs: Runtime Engine, LLM Models, Environment.
  await page.locator('#rail-btn-runtime').click();
  const runtimeTabs = page.getByRole('navigation', { name: 'Runtime Engine Subtabs' });
  const serviceCard = page.locator('.service-card').first();
  if (await serviceCard.count()) {
    await expect(serviceCard).toHaveAttribute('draggable', 'true');
    const serviceName = (await serviceCard.locator('.object-name').innerText()).trim();
    await serviceCard.dragTo(panel);
    await expect(panel.getByRole('button', { name: `Remove ${serviceName}` })).toBeVisible();
  }
  for (const [name, chip] of [[/^Services/, 'Runtime Engine tab'], [/^LLM Models/, 'LLM Models tab']]) {
    const tab = runtimeTabs.getByRole('button', { name });
    await expect(tab).toHaveAttribute('draggable', 'true');
    await tab.dragTo(panel);
    await expect(panel.getByRole('button', { name: `Remove ${chip}` })).toBeVisible();
  }

  const envTab = runtimeTabs.getByRole('button', { name: /^Environment/ });
  await runtimeTabs.getByRole('button', { name: /^LLM Models/ }).click();
  const modelCard = page.locator('#llm-model-qwen-coder');
  await expect(modelCard).toHaveAttribute('draggable', 'true');
  await modelCard.dragTo(panel);
  await expect(panel.getByRole('button', { name: 'Remove Qwen Coder' })).toBeVisible();

  await expect(envTab).toHaveAttribute('draggable', 'true');
  await envTab.click();
  await expect(page.getByRole('button', { name: 'Remove AGENTS.md' })).toHaveCount(0);
  await envTab.dragTo(panel);
  await expect(panel.getByRole('button', { name: 'Remove AGENTS.md' })).toBeVisible();

  // Objects INSIDE the tabs must be draggable too, not just the tab buttons.
  const envRow = page.getByRole('button', { name: /AGENTS\.md/ }).first();
  await expect(envRow).toHaveAttribute('draggable', 'true');
  await envRow.dragTo(panel);
  await expect(panel.getByRole('button', { name: 'Remove AGENTS.md' })).toBeVisible();

  await page.locator('#rail-btn-tasks').click();
  await taskViews.getByRole('button', { name: /^Direction/ }).click();
  const goalCard = page.locator('[data-assistant-draggable="goal"]').first();
  await expect(goalCard).toHaveAttribute('draggable', 'true');
  const goalLabel = (await goalCard.getAttribute('data-assistant-label')) ?? '';
  await goalCard.dragTo(panel);
  await expect(panel.getByRole('button', { name: `Remove ${goalLabel}` })).toBeVisible();

  await taskViews.getByRole('button', { name: /^Weekly Review/ }).click();
  const reviewRow = page.locator('[data-assistant-draggable="weekly-review"]').first();
  await expect(reviewRow).toHaveAttribute('draggable', 'true');
  const reviewLabel = (await reviewRow.getAttribute('data-assistant-label')) ?? '';
  await reviewRow.dragTo(panel);
  await expect(panel.getByRole('button', { name: `Remove ${reviewLabel}` })).toBeVisible();

  // Kanban task cards use the shared WorkspaceObject drag payload.
  await taskViews.getByRole('button', { name: /^Pipeline/ }).click();
  const taskCard = page.locator('.kanban-card').first();
  if (await taskCard.count()) {
    await expect(taskCard).toHaveAttribute('draggable', 'true');
    const taskTitle = (await taskCard.locator('.kanban-card-title').first().innerText().catch(() => '')).trim();
    await taskCard.dragTo(panel);
    if (taskTitle) await expect(panel.getByRole('button', { name: `Remove ${taskTitle}` })).toBeVisible();
  }

  await page.screenshot({ path: '/tmp/thinking-os-tab-context.png' });
  assert.deepEqual(errors, [], 'No page errors while attaching tab contexts');
  console.log('tab + object drag-and-drop: pass');
} finally {
  await browser.close();
  await server.close();
}
