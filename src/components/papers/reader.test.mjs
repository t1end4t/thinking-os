import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const vault = await mkdtemp(path.join(tmpdir(), 'thinking-os-reader-'));
await mkdir(path.join(vault, 'papers'), { recursive: true });
const body = Array.from({ length: 90 }, (_, index) =>
  `Paragraph ${index + 1} covers tiling, IO-aware scheduling, and sparse attention kernels.`).join('\n\n');
for (const [id, title, markdown] of [
  ['p1', 'Continuous Reading Test Paper', `# Continuous Reading Test Paper\n\n## Abstract\n\n${body}\n`],
  ['p2', 'Second Tab Paper', '# Second Tab Paper\n\n## Abstract\n\nShort paper used to verify tab closing.\n']
]) {
  await writeFile(path.join(vault, 'papers', `${id}.md`), markdown);
  await writeFile(path.join(vault, 'papers', `${id}.json`), JSON.stringify({
    id, title, authors: 'Ada Lovelace', year: 2024, citation: 'Lovelace 2024', pageCount: 1, sections: [], highlights: []
  }));
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(`localStorage.setItem('thinking_os_workspace_dir', ${JSON.stringify(vault)})`);
const page = await context.newPage();
const failures = [];
page.on('pageerror', error => failures.push(error.message));
const openReader = async () => {
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Research / Papers' }).click();
  await page.waitForSelector('.pdf-page canvas');
  await page.waitForFunction(() => document.querySelectorAll('.pdf-text-layer span').length > 10);
};

try {
  await openReader();
  assert.ok(await page.locator('.pdf-page').count() >= 3, 'expected a continuous multi-page stack');

  const selectSpans = (first, last) => page.evaluate(([from, to]) => {
    const spans = [...document.querySelectorAll('.pdf-text-layer span')].filter(span => span.textContent.trim());
    const range = document.createRange();
    range.setStart(spans[from].firstChild, 0);
    range.setEnd(spans[to].firstChild, spans[to].firstChild.length);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, [first, last]);

  const toolbar = page.locator('#paper-selection-toolbar');
  await selectSpans(2, 4);
  await toolbar.waitFor({ state: 'visible' });
  await toolbar.getByRole('button', { name: 'Highlight', exact: true }).click();
  await page.waitForSelector('.pdf-highlight');
  await toolbar.waitFor({ state: 'hidden' });

  await selectSpans(8, 9);
  await toolbar.waitFor({ state: 'visible' });
  await page.mouse.click(20, 400);
  await toolbar.waitFor({ state: 'hidden' });

  await page.waitForTimeout(1200);
  await openReader();
  assert.ok(await page.locator('.pdf-highlight').count() > 0, 'highlights must survive a reload');

  const tabs = page.locator('[aria-label^="Reader tab"]');
  const before = await tabs.count();
  await page.locator('[aria-label^="Close tab"]').first().click();
  await page.waitForFunction(count => document.querySelectorAll('[aria-label^="Reader tab"]').length === count,
    before - 1);
  await page.locator('[aria-label^="Close tab"]').click();
  await page.waitForTimeout(300);
  assert.equal(await tabs.count(), 0, 'closing the last tab must not reopen papers');

  await page.route('https://api.datacite.org/**', route => route.fulfill({ json: { data: { attributes: {
    titles: [{ title: 'Resolved test paper' }],
    creators: [{ givenName: 'Ada', familyName: 'Lovelace' }],
    publicationYear: 2023,
    descriptions: [{ descriptionType: 'Abstract', description: 'Registry-provided abstract.' }]
  } } } }));
  await page.route('https://api.crossref.org/**', route => route.fulfill({ json: { message: {
    title: ['Crossref test paper'], author: [{ given: 'Grace', family: 'Hopper' }],
    published: { 'date-parts': [[2020]] }, created: { 'date-parts': [[2025]] },
    URL: 'https://doi.org/10.5555/test', 'container-title': ['Test venue']
  } } }));
  await page.getByRole('button', { name: 'Add Paper', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Benchmark Presets', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Manual Entry', exact: true }).count(), 0);
  const searchTitle = 'AgentArk: Distilling Multi-Agent Intelligence into a Single LLM Agent';
  await page.route('https://api.datacite.org/dois?*', route => route.fulfill({ json: { data:
    route.request().url().includes('Missing') ? [] : [{ id: '10.48550/arxiv.2602.03955', attributes: {
      titles: [{ title: searchTitle }], creators: [{ name: 'Test author' }], publicationYear: 2026
    } }]
  } }));
  await page.route('https://api.crossref.org/works?*', route => route.fulfill({ json: { message: { items:
    route.request().url().includes('Missing') ? [] : [
      { DOI: '10.5555/unrelated', title: ['A different paper'] },
      { DOI: '10.48550/arxiv.2602.03955', title: [searchTitle] }
    ]
  } } }));
  await page.getByRole('button', { name: 'Title Search', exact: true }).click();
  await page.getByLabel('Paper title', { exact: true }).fill('Missing paper');
  await page.getByRole('button', { name: 'Search papers', exact: true }).click();
  await page.getByText('No matching papers found.', { exact: false }).waitFor();
  await page.getByLabel('Paper title', { exact: true }).fill(searchTitle);
  await page.getByLabel('Paper title', { exact: true }).press('Enter');
  await page.getByRole('button', { name: searchTitle, exact: false }).waitFor();
  const matches = page.locator('[aria-label="Paper title matches"] button');
  assert.equal(await matches.count(), 2, 'deduplicate results by DOI');
  assert.ok((await matches.first().innerText()).includes(searchTitle), 'exact titles rank first');
  assert.equal(await page.getByPlaceholder('Title of the paper').inputValue(), '', 'search must not silently select a paper');
  await matches.first().click();
  await page.waitForFunction(() => !document.querySelector('fieldset').disabled);
  assert.equal(await page.locator('#paper-doi').inputValue(), '10.48550/arXiv.2602.03955');
  assert.equal(await page.getByPlaceholder('Title of the paper').inputValue(), 'Resolved test paper');

  const lookup = async (value, tab) => {
    await page.getByRole('button', { name: tab }).click();
    const placeholder = tab === 'DOI Lookup'
      ? 'e.g. 10.48550/arXiv.2309.17453 or 10.1145/3639478'
      : 'e.g. https://arxiv.org/abs/2309.17453 or direct .pdf link';
    await page.getByPlaceholder(placeholder).fill(value);
    await page.getByRole('button', { name: 'Fetch Details' }).click();
    await page.waitForFunction(() => !document.querySelector('fieldset').disabled);
  };
  await lookup('https://doi.org/10.5555/test', 'DOI Lookup');
  assert.equal(await page.getByPlaceholder('Title of the paper').inputValue(), 'Crossref test paper');
  assert.equal(await page.getByPlaceholder('e.g. 2024').inputValue(), '2020', 'use publication year, not registration year');
  assert.equal(await page.getByPlaceholder('https://.../paper.pdf').inputValue(), '', 'landing URLs are not PDFs');
  await lookup('10.48550/arXiv.2309.17453', 'DOI Lookup');
  assert.equal(await page.getByPlaceholder('Title of the paper').inputValue(), 'Resolved test paper');
  await lookup('https://arxiv.org/abs/2309.17453v4', 'URL / arXiv');
  assert.equal(await page.getByPlaceholder('e.g. John Doe, Jane Smith').inputValue(), 'Ada Lovelace');
  assert.equal(await page.locator('#paper-doi').inputValue(), '10.48550/arXiv.2309.17453');
  assert.equal(await page.getByPlaceholder('https://.../paper.pdf').inputValue(), 'https://arxiv.org/pdf/2309.17453v4');

  const arxivUrls = await page.evaluate(async () => {
    const { getPaperPdfUrl, parseArxivLink } = await import('/src/utils/pdfGenerator.ts');
    const paper = { id: 'legacy-arxiv', pdfUrl: 'https://arxiv.org/pdf/2602.03955.pdf' };
    return {
      legacy: getPaperPdfUrl(paper),
      original: paper.pdfUrl,
      versioned: parseArxivLink('https://arxiv.org/pdf/2309.17453v4.pdf').pdfUrl,
      uploaded: getPaperPdfUrl({ ...paper, pdfDataUrl: 'data:application/pdf;base64,JVBERi0=' }),
      other: getPaperPdfUrl({ ...paper, pdfUrl: 'https://example.com/paper.pdf' })
    };
  });
  assert.deepEqual(arxivUrls, {
    legacy: 'https://arxiv.org/pdf/2602.03955',
    original: 'https://arxiv.org/pdf/2602.03955.pdf',
    versioned: 'https://arxiv.org/pdf/2309.17453v4',
    uploaded: 'data:application/pdf;base64,JVBERi0=',
    other: 'https://example.com/paper.pdf'
  });

  const pdf = await page.evaluate(async () => {
    const { buildPaperPdfString } = await import('/src/utils/pdfGenerator.ts');
    return buildPaperPdfString({ id: 'upload', title: 'Embedded title', authors: 'Embedded author',
      year: 2024, citation: 'Embedded citation', markdown: 'arXiv:2309.17453v4\n\nUpload test.', sections: [] });
  });
  await page.getByRole('button', { name: 'Upload PDF', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'upload.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) });
  await page.waitForFunction(() => !document.querySelector('fieldset').disabled);
  assert.equal(await page.getByPlaceholder('Title of the paper').inputValue(), 'Resolved test paper');
  assert.equal(await page.locator('#paper-doi').inputValue(), '10.48550/arXiv.2309.17453');
  await page.getByRole('button', { name: 'Add Paper to Vault', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.pdf-text-layer span').length > 0);

  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.setViewportSize({ width: 420, height: 800 });
  await page.locator('#dock-toggle-btn').click();
  await page.getByRole('button', { name: 'Larger Reader', exact: true }).click();
  await page.waitForTimeout(300);
  assert.ok(await page.locator('.pdf-reader').evaluate(element => element.clientWidth > 250));

  assert.deepEqual(failures, []);
  console.log('reader and metadata imports ok');
} finally {
  await browser.close();
}
