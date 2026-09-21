import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { readVault, writeVault } from '../../../server/vault.mjs';

const vault = await mkdtemp(path.join(tmpdir(), 'thinking-os-sources-'));
const captures = process.env.QA_DIR || path.join(tmpdir(), 'thinking-os-sources-qa');
await mkdir(captures, { recursive: true });
const authored = { author: 'user', createdAt: 1 };
const question = { ...authored, id: 'q-source', title: 'Does caching help?', tags: [] };
const claim = { ...authored, id: 'c-source', text: 'Cache reduces latency by 50%.', rejected: false, failureThreshold: 'Reject if p95 latency exceeds 200 ms.' };
const evidence = [
  { ...authored, id: 'e-paper', title: 'Published measurement', origin: 'literature', form: 'measurement', citation: 'Test author 2026', paperId: 'p-source', pageNumber: 2, excerpt: 'Recorded passage.\n\nSecond paragraph.' },
  { ...authored, id: 'e-experiment', title: 'Local measurement', origin: 'experiment', form: 'measurement', citation: '', experimentId: 'exp-source', artifactId: 'artifact-source' },
  { ...authored, id: 'e-missing', title: 'Unlinked measurement', origin: 'experiment', form: 'measurement', citation: '' },
  { ...authored, id: 'e-reasoning', title: 'Reasoning without external source', origin: 'own_reasoning', form: 'derivation', citation: 'Premise A\nTherefore B' }
];
const fixture = {
  questions: [question], claims: [claim, { ...claim, id: 'c-no-threshold', failureThreshold: undefined }], evidence,
  links: [
    { ...authored, id: 'q-c', kind: 'question-claim', parentId: question.id, childId: claim.id, status: 'holds', userReason: 'Proposed answer.' },
    ...evidence.map(item => ({ ...authored, id: `c-${item.id}`, kind: 'claim-evidence', parentId: claim.id, childId: item.id, status: 'holds', userReason: 'Recorded reason for testing the claim.' }))
  ],
  papers: [{ id: 'p-source', title: 'Source Paper', authors: 'Test author', citation: 'Test author 2026', year: 2026, pageCount: 3, sections: [], markdown: '# Source Paper\n\n' + 'Recorded passage about latency and caching.\n\n'.repeat(150) }],
  experiments: [{ id: 'exp-source', claimId: claim.id, questionId: question.id, title: 'Source Experiment', status: 'done', targetMetric: 'p95 latency', baseline: 'Without caching', prediction: 'Lower latency', failureCondition: 'Over 200 ms', scope: 'Local test', artifacts: [{ id: 'artifact-source', name: 'Latency measurement', type: 'notes', path: '/tmp/measurement.md', contentHash: 'test-hash', observation: 'Observed 120 ms.\n\nRecorded locally.', status: 'present' }] }]
};

const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
try {
  for (const colorScheme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      await writeVault(vault, fixture);
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme });
      await context.addInitScript(directory => localStorage.setItem('thinking_os_workspace_dir', directory), vault);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const capture = async name => page.screenshot({ path: path.join(captures, `${colorScheme}-${width}-${name}.png`), fullPage: true });
      const activateNode = async id => {
        const node = page.locator(`#node-${id} [data-open-node]`);
        await node.focus();
        await page.keyboard.press('Enter');
      };
      await page.goto(process.env.BASE_URL || 'http://localhost:3000');
      await page.waitForLoadState('networkidle');
      await page.keyboard.press('Control+j');
      await page.getByRole('button', { name: /Research \/ Argument Map/ }).click();
      await page.getByRole('button', { name: 'Claims', exact: true }).click();
      await page.getByRole('table').waitFor();
      assert.equal(await page.getByRole('columnheader', { name: 'Instrument', exact: true }).count(), 0);
      assert.equal(await page.getByText('Not declared', { exact: true }).count(), 1);
      assert.equal(await page.getByText(claim.failureThreshold, { exact: true }).count(), 1);
      const firstRow = page.getByRole('row').filter({ hasText: 'c-source' });
      assert.match(await firstRow.innerText(), /Literature: 1/);
      assert.match(await firstRow.innerText(), /Experiment: 2/);
      assert.match(await firstRow.innerText(), /Reasoning: 1/);
      await page.getByLabel('Search claims').fill('c-source');
      assert.equal(await page.getByRole('row').count(), 2);
      await page.getByLabel('Search claims').fill('');
      await capture('claims');
      if (width === 390) {
        await page.getByRole('region', { name: 'Claims table' }).evaluate(element => { element.scrollLeft = element.scrollWidth; });
        await capture('claims-right');
      }
      await page.getByRole('button', { name: 'Map', exact: true }).click();
      await page.getByTitle('Zoom In (Max: 150%)', { exact: true }).click();
      const zoom = await page.locator('#map-zoom-controls').innerText();
      const transform = await page.locator('#node-e-paper').evaluate(element => element.parentElement.style.transform);
      await activateNode('e-paper');
      await page.locator('#papers-surface .pdf-page canvas').first().waitFor();
      await page.getByRole('button', { name: 'Source Paper', exact: true }).waitFor();
      assert.equal(await page.getByLabel('Page number', { exact: true }).inputValue(), '2');
      await page.getByText('Evidence: Published measurement · Page 2', { exact: true }).click();
      assert.match(await page.locator('#papers-surface blockquote').innerText(), /Recorded passage/);
      await capture('paper');
      await page.getByRole('button', { name: 'Back to Graph', exact: true }).click();
      assert.equal(await page.locator('#node-e-paper').evaluate(element => element.parentElement.style.transform), transform);
      assert.equal(await page.locator('#map-zoom-controls').innerText(), zoom);
      assert.match(await page.locator('#node-e-paper').getAttribute('class'), /ring-2/);
      await activateNode('e-experiment');
      const artifact = page.locator('#experiment-artifact-exp-source-artifact-source');
      await artifact.waitFor();
      assert.ok(await artifact.evaluate(element => element === document.activeElement));
      assert.match(await artifact.innerText(), /Observed 120 ms/);
      assert.equal(await page.getByText('What did this show?', { exact: true }).count(), 0);
      await capture('experiment');
      await page.getByRole('button', { name: 'Back to Graph', exact: true }).click();
      await activateNode('e-missing');
      await page.getByText('No source linked. Choose an experiment.', { exact: true }).waitFor();
      assert.equal(await page.getByLabel('Evidence Title', { exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Link source', exact: true }).click();
      await page.getByLabel('Source experiment', { exact: true }).selectOption('exp-source');
      await page.getByLabel('Source artifact (optional)', { exact: true }).selectOption('artifact-source');
      await capture('link-source');
      await page.getByRole('button', { name: 'Open Experiment: Source Experiment', exact: true }).click();
      await artifact.waitFor();
      await page.getByRole('button', { name: 'Back to Graph', exact: true }).click();
      await page.getByRole('button', { name: 'Map', exact: true }).click();
      await activateNode('e-reasoning');
      await page.getByText('Own reasoning. The evidence text and citation record the argument; no external source is linked.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Back to Graph', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Map', exact: true }).click();
      const edit = page.locator('#node-e-paper').getByRole('button', { name: 'Edit', exact: true });
      await edit.focus();
      await page.keyboard.press('Enter');
      await page.getByLabel('Evidence Title', { exact: true }).waitFor();
      await page.getByLabel('Source paper', { exact: true }).selectOption('');
      await page.getByText('No source linked. Choose a paper.', { exact: true }).waitFor();
      await page.waitForTimeout(1300);
      const persisted = await readVault(vault);
      assert.equal(persisted.evidence.find(item => item.id === 'e-missing').artifactId, 'artifact-source');
      const detached = persisted.evidence.find(item => item.id === 'e-paper');
      assert.equal(detached.paperId, undefined);
      assert.equal(detached.pageNumber, undefined);
      assert.equal(detached.excerpt, undefined);
      assert.equal(detached.author, 'user');
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no page-level horizontal overflow');
      await context.close();
    }
  }
  console.log(`Claims, source navigation, attachment, persistence, keyboard, both themes, desktop/narrow: passed. Captures: ${captures}`);
} finally {
  await browser.close();
  await rm(vault, { recursive: true, force: true });
}
