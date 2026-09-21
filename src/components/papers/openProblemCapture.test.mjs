import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { readVault, writeVault } from '../../../server/vault.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'thinking-os-problem-capture-'));
const captures = process.env.QA_DIR || path.join(tmpdir(), 'thinking-os-problem-capture-qa');
await mkdir(captures, { recursive: true });
const paper = {
  id: 'capture-paper', title: 'Open Problem Capture Paper', authors: 'Test Author', year: 2026,
  citation: 'Test Author 2026', pageCount: 3, sections: [],
  markdown: '# Open Problem Capture Paper\n\n' + 'Whether this method generalizes remains an open question.\n\n'.repeat(100),
  highlights: [{ id: 'saved-highlight', text: 'An unresolved question.\n\nOriginal author wording.', color: 'amber', pageNumber: 2 },
    { id: 'legacy-highlight', text: 'Legacy excerpt with no recorded page.', color: 'amber' }]
};
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
try {
  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      const vault = path.join(root, `${theme}-${width}`);
      await writeVault(vault, { papers: [paper] });
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      await context.addInitScript(({ vault, theme }) => {
        localStorage.setItem('thinking_os_workspace_dir', vault);
        localStorage.setItem('thinking_os_theme', theme);
      }, { vault, theme });
      const page = await context.newPage();
      const failures = [];
      page.on('pageerror', error => failures.push(error.message));
      try {
        await page.goto(process.env.BASE_URL || 'http://localhost:3000');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Research / Papers' }).click();
        await page.getByText(paper.title, { exact: true }).click();
        await page.locator('.pdf-text-layer span').first().waitFor();
        const headerCapture = page.locator('header').getByRole('button', { name: 'Record open problem', exact: true });
        const dialog = page.getByRole('dialog', { name: 'Record open problem', exact: true });

        await headerCapture.click();
        await expect(page.getByLabel('Problem text', { exact: true })).toBeFocused();
        assert.equal(await page.getByLabel('Source page', { exact: true }).inputValue(), 'Not recorded');
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(headerCapture).toBeFocused();
        assert.equal((await readVault(vault)).openProblems.length, 0);

        const showSidebar = page.getByRole('button', { name: 'Show Sidebar', exact: true });
        if (await showSidebar.count()) await showSidebar.click();
        await page.getByRole('button', { name: /^Notes/ }).click();
        const highlightCapture = page.locator('aside').getByRole('button', { name: 'Record open problem', exact: true });
        await highlightCapture.last().click();
        assert.equal(await page.getByLabel('Source page', { exact: true }).inputValue(), 'Not recorded');
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(highlightCapture.last()).toBeFocused();
        await highlightCapture.first().click();
        assert.equal(await page.getByLabel('Source excerpt', { exact: true }).inputValue(), paper.highlights[0].text);
        assert.equal(await page.getByLabel('Source page', { exact: true }).inputValue(), '2');
        assert.equal(await page.getByLabel('Source excerpt', { exact: true }).getAttribute('readonly'), '');
        await page.getByLabel('Problem text', { exact: true }).fill('Does the method generalize?');
        await page.getByLabel('Attribution', { exact: true }).selectOption('paper-author');
        await page.screenshot({ path: path.join(captures, `${theme}-${width}.png`) });
        const bounds = await dialog.boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.height <= 900);
        await dialog.getByRole('button', { name: 'Save open problem', exact: true }).click();
        await expect.poll(async () => (await readVault(vault)).openProblems.length).toBe(1);
        const saved = (await readVault(vault)).openProblems[0];
        for (const [key, value] of Object.entries({ text: 'Does the method generalize?', paperId: paper.id,
          citation: paper.citation, pageNumber: 2, excerpt: paper.highlights[0].text,
          highlightId: 'saved-highlight', attribution: 'paper-author' })) assert.equal(saved[key], value);

        await page.getByRole('button', { name: 'Larger Reader', exact: true }).click();
        await page.locator('.pdf-text-layer span').first().evaluate(element => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        });
        const toolbar = page.getByRole('toolbar', { name: 'Selected passage actions' });
        await expect(toolbar).toBeVisible();
        const toolbarBounds = await toolbar.boundingBox();
        assert.ok(toolbarBounds && toolbarBounds.x >= 0 && toolbarBounds.x + toolbarBounds.width <= width);
        await toolbar.getByRole('button', { name: 'Record open problem', exact: true }).click();
        const excerpt = await page.getByLabel('Source excerpt', { exact: true }).inputValue();
        assert.ok(excerpt.length > 0);
        const pageNumber = Number(await page.getByLabel('Source page', { exact: true }).inputValue());
        await page.getByLabel('Problem text', { exact: true }).fill('My question from the selection');
        await page.getByLabel('Attribution', { exact: true }).selectOption('user-inference');
        await dialog.getByRole('button', { name: 'Save open problem', exact: true }).click();
        await expect(headerCapture).toBeFocused();
        await expect.poll(async () => (await readVault(vault)).openProblems.length).toBe(2);
        const selected = (await readVault(vault)).openProblems.find(problem => problem.text === 'My question from the selection');
        assert.equal(selected.excerpt, excerpt);
        assert.equal(selected.pageNumber, pageNumber);
        assert.equal(selected.attribution, 'user-inference');
        assert.equal(selected.highlightId, undefined);

        await headerCapture.click();
        await page.getByLabel('Problem text', { exact: true }).fill('   ');
        await page.getByLabel('Attribution', { exact: true }).selectOption('user-inference');
        await dialog.getByRole('button', { name: 'Save open problem', exact: true }).click();
        await expect(dialog.getByRole('alert')).toContainText('Enter an open problem');
        await page.getByLabel('Problem text', { exact: true }).fill('A question without a selected passage');
        await dialog.getByRole('button', { name: 'Save open problem', exact: true }).click();
        await expect.poll(async () => (await readVault(vault)).openProblems.length).toBe(3);
        const manual = (await readVault(vault)).openProblems.find(problem => problem.text === 'A question without a selected passage');
        assert.equal(manual.pageNumber, undefined);
        assert.equal(manual.excerpt, undefined);
        assert.equal(manual.paperId, paper.id);
        assert.deepEqual(failures, []);
      } finally {
        await context.close();
      }
    }
  }
  console.log(`Open problem capture, provenance, validation, focus, themes, responsive layout passed. Screenshots: ${captures}`);
} finally {
  await browser.close();
  await rm(root, { recursive: true, force: true });
}
