import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { saveScoutBrief, saveScoutReport, saveScoutRun } from '../../../server/scoutStore.mjs';
import { readVault, writeVault } from '../../../server/vault.mjs';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const vault = await mkdtemp(path.join(tmpdir(), 'thinking-os-scout-ui-'));
await mkdir(vault, { recursive: true });
const now = Date.now();
const brief = await saveScoutBrief(vault, {
  question: 'Which TinyML methods make autonomous research agents viable on constrained hardware?',
  purpose: 'Choose papers that connect agent autonomy with measured edge-device constraints.',
  scope: ['TinyML', 'autonomous research agents'],
  exclusions: ['Cloud-only inference'],
  constraints: ['Title and abstract screening only'],
  searchDirections: [{ query: 'TinyML autonomous agents edge inference', reason: 'Direct intersection of the problem terms.' }],
  screeningCriteria: ['Direct relevance', 'Visible empirical setting'],
  maxRecommendations: 5,
  createdFrom: { kind: 'user', reference: 'browser-fixture' },
  author: 'user'
}, undefined, now - 2000);

const recommended = {
  id: 'candidate-edge-agents', title: 'Edge Agents for Autonomous Scientific Discovery', authors: 'Ada Researcher, Grace Engineer', year: 2026,
  abstract: 'We evaluate an autonomous discovery loop on constrained edge hardware and report latency, memory, and energy measurements.',
  identities: [{ kind: 'doi', value: '10.5555/edge-agents', source: 'Crossref', canonical: true }],
  matchingQueries: ['TinyML autonomous agents edge inference'], sources: ['OpenAlex', 'Crossref'],
  provenance: [{ provider: 'OpenAlex', lane: 'lexical', query: 'TinyML autonomous agents edge inference', retrievedAt: now - 1800 }],
  metadataConflicts: [], relevance: 'direct', evidenceExcerpt: 'constrained edge hardware',
  relevanceAssessment: 'Directly tests an autonomous discovery loop under the target hardware constraint.',
  expectedValue: 'Provides measured latency, memory, and energy trade-offs for architecture selection.', qualityConfidence: 'medium',
  qualityEvidence: ['report latency, memory, and energy measurements'], limitations: ['Only title and abstract were screened.'],
  outcome: 'recommend', recommendationReason: 'The paper connects the target workflow and deployment constraint with explicit measurements.',
  coverageTags: ['edge-evaluation'], suggestedNextAction: 'save', assessmentState: 'screened'
};
const uncertain = {
  id: 'candidate-agent-survey', title: 'A Survey of Autonomous Research Agents', authors: 'Lin Scholar', year: 2025,
  abstract: 'This survey organizes autonomous research-agent architectures but does not describe edge deployment.',
  identities: [{ kind: 'url', value: 'https://example.test/agent-survey', source: 'OpenAlex', canonical: true }],
  matchingQueries: ['TinyML autonomous agents edge inference'], sources: ['OpenAlex'],
  provenance: [{ provider: 'OpenAlex', lane: 'semantic', query: 'TinyML autonomous agents edge inference', retrievedAt: now - 1700 }],
  metadataConflicts: [], relevance: 'background', evidenceExcerpt: 'organizes autonomous research-agent architectures',
  relevanceAssessment: 'Useful background for agent architectures, but the hardware constraint is absent.',
  expectedValue: 'May provide taxonomy terms for a later search.', qualityConfidence: 'low', qualityEvidence: ['survey'],
  limitations: ['No edge deployment evidence is visible in the abstract.'], outcome: 'uncertain',
  recommendationReason: 'Potential vocabulary source, not yet a direct answer.', coverageTags: ['agent-taxonomy'],
  suggestedNextAction: 'compare', assessmentState: 'screened'
};
const report = {
  id: 'scout-run-ui-test', source: { kind: 'brief', id: brief.id }, inputSnapshot: brief, status: 'partial',
  summary: 'Three candidates screened; one recommended and one uncertain.', sources: ['OpenAlex', 'Crossref'],
  executedQueries: ['TinyML autonomous agents edge inference'], recommendations: [recommended], uncertain: [uncertain],
  rejectionCounts: { irrelevant: 1 }, limitations: ['arXiv was unavailable during this run.'],
  screening: { model: 'fixture-screening-model', instructionsVersion: 'scout-screening-v1' }, createdAt: now - 1000
};
await saveScoutReport(vault, report);
await saveScoutRun(vault, {
  id: report.id, source: report.source, inputSnapshot: brief, state: 'partial', executedQueries: report.executedQueries,
  providerAttempts: [{ provider: 'OpenAlex', lane: 'lexical', query: report.executedQueries[0], status: 'completed', attempts: 1, resultCount: 3, startedAt: now - 1900, completedAt: now - 1600, truncated: false },
    { provider: 'arXiv', lane: 'recent', query: report.executedQueries[0], status: 'failed', attempts: 2, resultCount: 0, startedAt: now - 1550, completedAt: now - 1400, truncated: false, error: 'Fixture outage' }],
  counters: { retrieved: 3, normalized: 3, screened: 3 }, checkpoints: ['retrieval-complete', 'screening-complete', 'report'],
  startedAt: now - 2000, updatedAt: now - 1000, finishedAt: now - 1000, reportId: report.id
});
await writeVault(vault, { papers: [{
  id: 'p-existing-edge-agents', title: recommended.title, authors: recommended.authors, year: recommended.year,
  citation: 'Researcher (2026)', pageCount: 1, markdown: '# Existing paper', sections: [], doi: '10.5555/edge-agents', highlights: []
}] });

const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
await context.addInitScript(({ dir }) => {
  localStorage.setItem('thinking_os_workspace_dir', dir);
}, { dir: vault });
const page = await context.newPage();
const failures = [];
page.on('pageerror', error => failures.push(error.message));

async function openSurvey() {
  await page.getByRole('button', { name: 'Research / Survey' }).click();
  await page.getByRole('heading', { name: brief.question }).waitFor();
}

try {
  await page.goto(baseUrl);
  await page.waitForLoadState('networkidle');
  await openSurvey();
  await page.getByRole('heading', { name: /^Recommended/ }).waitFor();
  const advancedRetrieval = page.locator('details.legacy-retrieval');
  assert.equal(await advancedRetrieval.getAttribute('open'), null, 'advanced direct retrieval starts collapsed');
  assert.equal(await page.getByRole('button', { name: 'Schedule job' }).count(), 0, 'Discovery does not duplicate legacy scheduling controls');
  await advancedRetrieval.locator('summary').click();
  await page.getByRole('button', { name: 'Search metadata' }).waitFor();
  await advancedRetrieval.locator('summary').click();
  assert.match(await page.getByText('Rejection summary').locator('..').textContent(), /irrelevant: 1/);
  assert.match(await page.getByText('Run limitations').locator('..').textContent(), /arXiv was unavailable/);

  const recommendedCard = page.locator('.scout-candidate-card').filter({ hasText: recommended.title });
  const uncertainCard = page.locator('.scout-candidate-card').filter({ hasText: uncertain.title });
  await recommendedCard.getByText('Abstract and provenance').click();
  await recommendedCard.getByText(recommended.abstract).waitFor();
  assert.equal(await recommendedCard.getByRole('link', { name: 'Open source' }).getAttribute('href'), 'https://doi.org/10.5555/edge-agents');

  await recommendedCard.getByRole('button', { name: 'Compare', exact: true }).click();
  await uncertainCard.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name: 'Compare selected (2)' }).click();
  const comparison = page.getByRole('dialog', { name: 'Candidate comparison' });
  await comparison.waitFor();
  await comparison.getByText('Relation to question').waitFor();
  await page.keyboard.press('Escape');
  await comparison.waitFor({ state: 'hidden' });

  await recommendedCard.getByRole('button', { name: 'Inspect deeper' }).click();
  await recommendedCard.getByRole('button', { name: 'Inspection requested' }).waitFor();

  const dismissButton = uncertainCard.getByRole('button', { name: 'Dismiss', exact: true });
  await dismissButton.click();
  const dismissal = page.getByRole('dialog', { name: 'Dismiss candidate' });
  await dismissal.waitFor();
  await page.keyboard.press('Escape');
  await dismissal.waitFor({ state: 'hidden' });
  assert.equal(await dismissButton.evaluate(element => document.activeElement === element), true, 'dismissal dialog restores focus');
  await dismissButton.click();
  await dismissal.getByLabel('Reason').selectOption('not-useful-now');
  await dismissal.getByLabel('Optional note').fill('Useful after the deployment scope broadens.');
  await dismissal.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await uncertainCard.getByRole('button', { name: 'Dismissed' }).waitFor();

  await recommendedCard.getByRole('button', { name: 'Save to Papers' }).click();
  await recommendedCard.getByRole('button', { name: 'Open in Papers' }).waitFor();
  await page.waitForTimeout(500);
  const saved = await readVault(vault);
  assert.equal(saved.papers.length, 1, 'saving a matching DOI must not duplicate the paper');
  assert.equal(saved.papers[0].id, 'p-existing-edge-agents');
  assert.equal(saved.papers[0].discoveryContexts.length, 1);
  assert.equal(saved.papers[0].discoveryContexts[0].reportId, report.id);
  assert.equal(saved.papers[0].discoveryContexts[0].decisionSource, 'user');

  await recommendedCard.getByRole('button', { name: 'Open in Papers' }).click();
  await page.getByRole('heading', { name: recommended.title, exact: true }).waitFor();
  await openSurvey();
  await page.reload();
  await page.waitForLoadState('networkidle');
  await openSurvey();
  await page.locator('.scout-candidate-card').filter({ hasText: recommended.title }).getByRole('button', { name: 'Open in Papers' }).waitFor();
  await page.locator('.scout-candidate-card').filter({ hasText: uncertain.title }).getByRole('button', { name: 'Dismissed' }).waitFor();
  await page.screenshot({ path: '/tmp/thinking-os-scout-report-desktop-light.png', fullPage: true });

  await page.evaluate(() => localStorage.setItem('thinking_os_theme', 'dark'));
  await page.reload();
  await page.waitForLoadState('networkidle');
  await openSurvey();
  assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), true);
  await page.screenshot({ path: '/tmp/thinking-os-scout-report-desktop-dark.png', fullPage: true });

  await page.setViewportSize({ width: 620, height: 900 });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.locator('#dock-toggle-btn').click();
  await openSurvey();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `narrow report overflowed by ${overflow}px`);
  await page.screenshot({ path: '/tmp/thinking-os-scout-report-narrow-dark.png', fullPage: true });
  assert.deepEqual(failures, []);
  console.log('Scout reports: report, compare, dismiss, inspect, deduplicated save, persistence, themes, and narrow layout passed.');
} finally {
  await browser.close();
}
