import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const { SAMPLE_SNAPSHOT } = await server.ssrLoadModule('/src/data/sampleVault.ts');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
const evidence = await mkdtemp(join(tmpdir(), 'thinking-os-layout-'));
const cases = [[1440, 'light', 16], [1440, 'dark', 16], [1024, 'light', 16], [1024, 'dark', 16], [390, 'light', 16], [390, 'dark', 16], [390, 'light', 11], [390, 'dark', 24], [1440, 'dark', 24], [1440, 'mocha', 16]];
const captures = [];

async function withinViewport(locator) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  assert.ok(bounds);
  const viewport = locator.page().viewportSize();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1, `${await locator.textContent()} exceeds ${viewport.width}px`);
}

try {
  for (const [width, theme, fontSize] of cases) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    const externalFonts = [];
    let revision = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) externalFonts.push(request.url()); });
    await page.addInitScript(({ theme, fontSize }) => {
      localStorage.setItem('thinking_os_theme', theme === 'light' ? 'light' : 'dark');
      localStorage.setItem('thinking_os_dark_variant', theme === 'mocha' ? 'mocha' : 'claude');
      localStorage.setItem('thinking_os_font_size_px', String(fontSize));
    }, { theme, fontSize });
    await page.route('**/api/vault*', route => route.fulfill({ json: { dir: '/tmp/layout-check-vault', data: SAMPLE_SNAPSHOT, revision: String(++revision) } }));
    await page.route('**/api/assistant*', route => route.fulfill({ json: { model: '', provider: '', providers: [] } }));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
    await expect(page.getByRole('button', { name: 'New Task', exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const capture = async name => {
      const filename = join(evidence, `${width}-${theme}-${fontSize}-${name}.png`);
      await page.screenshot({ path: filename });
      captures.push({ width, theme, fontSize, name, filename });
    };
    const panel = page.getByRole('complementary', { name: 'Assistant', exact: true });
    if (width >= 1024) {
      await expect(panel).toBeVisible();
      assert.ok((await panel.boundingBox()).width <= width * .35 + 1);
      await page.locator('#dock-toggle-btn').click();
    } else await expect(panel).toHaveCount(0);

    await withinViewport(page.getByRole('button', { name: 'New Task', exact: true }));
    await withinViewport(page.locator('#app-settings-btn'));
    assert.ok(await page.locator('#kanban-controls').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
    await page.getByRole('button', { name: 'New Task', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'New task', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    const contrast = await page.locator('.kanban-primary-add-btn').evaluate(element => {
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const style = getComputedStyle(element);
      const values = [luminance(style.color), luminance(style.backgroundColor)].sort((first, second) => second - first);
      return (values[0] + .05) / (values[1] + .05);
    });
    assert.ok(contrast >= 4.5, `Task button contrast: ${contrast}`);
    await capture('tasks');

    await page.locator('#rail-btn-manuscript').click();
    const editor = page.locator('.manuscript-editor');
    await expect(editor).toBeVisible();
    assert.ok((await editor.boundingBox()).width >= Math.min(width - 4 * fontSize, 400) - 1);
    await withinViewport(page.getByRole('button', { name: 'References', exact: true }));
    await withinViewport(page.getByRole('button', { name: 'Preview', exact: true }));
    const prose = editor.locator('textarea').last();
    assert.ok((await prose.boundingBox()).height >= 100, 'Manuscript prose remains visible at the configured font size');
    const details = editor.locator('.manuscript-section-details');
    const wasOpen = await details.evaluate(element => element.open);
    if (!wasOpen) await details.locator('summary').click();
    assert.ok((await prose.boundingBox()).height >= 100, 'Expanded section fields preserve the prose area');
    if (!wasOpen) await details.locator('summary').click();
    await capture('manuscript');
    const outline = page.getByRole('button', { name: 'Outline', exact: true });
    if (await outline.getAttribute('aria-expanded') === 'true') await outline.click();
    await outline.click();
    await expect(page.getByRole('complementary', { name: 'Manuscript outline', exact: true })).toBeVisible();
    assert.equal(await page.locator('#manuscript-outline [class*="--manuscript-metadata-size"]').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize)), fontSize * .6875);
    await capture('outline');
    await page.getByRole('button', { name: 'Close outline', exact: true }).click();
    await expect(outline).toBeFocused();
    const references = page.getByRole('button', { name: 'References', exact: true });
    if (await references.getAttribute('aria-expanded') === 'true') await references.click();
    await references.click();
    await expect(page.getByRole('complementary', { name: 'Manuscript references', exact: true })).toBeVisible();
    await withinViewport(page.getByRole('button', { name: 'New Artifact', exact: true }));
    await page.getByRole('button', { name: /^Citations \(/ }).click();
    await withinViewport(page.getByRole('button', { name: 'Add Ref', exact: true }));
    await capture('references');
    await page.getByRole('button', { name: 'Close references', exact: true }).click();

    await page.locator('#dock-toggle-btn').click();
    await expect(panel).toBeVisible();
    if (width < 1024) {
      assert.equal(await page.locator('.assistant-drawer').evaluate(element => element.matches(':modal')), true);
      await withinViewport(panel);
      assert.ok((await editor.boundingBox()).width >= width - 4 * fontSize - 1);
      await capture('assistant');
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(page.locator('#dock-toggle-btn')).toBeFocused();
    } else {
      await expect.poll(async () => (await editor.boundingBox()).width).toBeGreaterThan(400);
      await capture('assistant');
      await page.locator('#assistant-dock-close-btn').click();
    }

    if (fontSize === 16 && theme !== 'mocha') {
      for (const surface of ['map', 'survey', 'papers', 'experiments']) {
        await page.locator(`#rail-btn-${surface}`).click();
        if (surface === 'map') await withinViewport(page.getByRole('navigation', { name: 'Argument Map View' }));
        await capture(surface);
      }
    }
    await page.locator('#rail-btn-runtime').click();
    await withinViewport(page.getByRole('navigation', { name: 'Runtime Engine Subtabs' }));
    await withinViewport(page.getByRole('button', { name: 'Add service', exact: true }));
    await withinViewport(page.getByPlaceholder('Filter services...'));
    for (const card of await page.locator('.service-card').all()) await withinViewport(card);
    await capture('runtime');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(externalFonts, []);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${width}px ${theme} ${fontSize}px: layout, panels, contrast, local fonts pass`);
  }
  await writeFile(join(evidence, 'captures.json'), JSON.stringify(captures, null, 2));
  console.log(`Evidence: ${evidence}`);
} finally {
  await browser.close();
  await server.close();
}
