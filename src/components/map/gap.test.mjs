import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
try {
  for (const colorScheme of ['light', 'dark']) {
    for (const [width, fontSize] of [[1440, 16], [1440, 24], [390, 16], [390, 24]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      await context.addInitScript(size => localStorage.setItem('thinking_os_font_size_px', String(size)), fontSize);
      const page = await context.newPage();
      await page.route('**/api/vault?*', route => route.fulfill({ json: {
        dir: '/tmp/thinking-os-gap-test',
        data: {
          questions: [
            { id: 'q-gap', title: 'Unanswered question', tags: [], author: 'user', createdAt: 1 },
            { id: 'q-linked', title: 'Question with a claim', tags: [], author: 'user', createdAt: 1 }
          ],
          claims: [{ id: 'c-gap', text: 'Unsupported claim', rejected: false, author: 'user', createdAt: 1 }],
          links: [{ id: 'q-linked--c-gap', parentId: 'q-linked', childId: 'c-gap', kind: 'question-claim', status: 'holds', userReason: 'Proposed answer', author: 'user', createdAt: 1 }]
        }
      } }));
      await page.goto(process.env.BASE_URL || 'http://localhost:3000');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Research \/ Argument Map/ }).click();
      const gaps = page.locator('button[id^="node-ghost-"]');
      assert.equal(await gaps.count(), 2);
      for (const gap of await gaps.all()) {
        assert.ok(await gap.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll('span')].every(child => {
            const box = child.getBoundingClientRect();
            return box.top >= bounds.top && box.bottom <= bounds.bottom && box.left >= bounds.left && box.right <= bounds.right;
          });
        }), `gap content must fit: ${colorScheme}, ${width}px, ${fontSize}px font`);
        assert.equal(await gap.evaluate(element => getComputedStyle(element).borderColor),
          await gap.locator('span').first().evaluate(element => getComputedStyle(element).color));
      }
      await gaps.first().focus();
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: 'Map', exact: true }).waitFor();
      assert.equal(await gaps.count(), 0, 'keyboard activation opens Detail');
      await context.close();
    }
  }
  console.log('Argument gap layout, themes, narrow viewport, keyboard: passed');
} finally {
  await browser.close();
}
