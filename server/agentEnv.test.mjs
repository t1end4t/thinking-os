import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  AGENT_TEMPLATES,
  TEMPLATE_DIR,
  addProject,
  createAgentSkill,
  listAgentEnv,
  readAgentEnvFile,
  readProjects,
  removeProject,
  writeAgentEnvFile
} from './agentEnv.mjs';

async function fixture(label) {
  const root = await mkdtemp(path.join(tmpdir(), `thinking-os-${label}-`));
  const home = path.join(root, 'home');
  const project = path.join(root, 'codebases/dotcode');
  await mkdir(home, { recursive: true });
  await mkdir(project, { recursive: true });
  return { root, home, project };
}

test('registered projects expose their own instruction files', async t => {
  const { root, home, project } = await fixture('project');
  t.after(() => rm(root, { recursive: true, force: true }));

  await addProject(project, 'dotcode', home);
  const { entries, projects } = await listAgentEnv(home);
  const projectId = projects[0].id;

  assert.equal(projects.length, 1);
  assert.equal(projects[0].path, project);
  assert.ok(entries.some(entry => entry.id === `project:${projectId}:agents` && entry.path === path.join(project, 'AGENTS.md')));
  assert.ok(!entries.some(entry => entry.scope === 'workspace'));

  for (const [key, filename] of [['vault-operations', 'VAULT_OPERATIONS.md'], ['index', 'INDEX.md']]) {
    const entryId = `project:${projectId}:${key}`;
    assert.ok(entries.some(entry => entry.id === entryId && entry.path === path.join(project, filename)));
    const content = '# Workspace\n\nFirst paragraph.\n\nSecond paragraph.\n';
    await writeAgentEnvFile(entryId, content, home);
    assert.equal((await readAgentEnvFile(entryId, home)).content, content);
    await writeFile(path.join(project, filename), `${content}External edit.\n`);
    assert.equal((await readAgentEnvFile(entryId, home)).content, `${content}External edit.\n`);
  }

  await writeAgentEnvFile(`project:${projectId}:agents`, 'first\nline\n', home);
  await writeAgentEnvFile(`project:${projectId}:agents`, 'second\nline\n', home);
  assert.equal((await readAgentEnvFile(`project:${projectId}:agents`, home)).content, 'second\nline\n');
  assert.equal(await readFile(path.join(project, 'AGENTS.md.bak'), 'utf8'), 'first\nline\n');
});

test('skills are created per project or globally and JSON stays valid', async t => {
  const { root, home, project } = await fixture('skill');
  t.after(() => rm(root, { recursive: true, force: true }));

  const projectId = (await addProject(project, 'dotcode', home))[0].id;
  const projectSkill = await createAgentSkill(projectId, 'claude', 'paper-review', home);
  const globalSkill = await createAgentSkill('global', 'shared', 'lit-triage', home);

  assert.equal(projectSkill.entry.path, path.join(project, '.claude/skills/paper-review/SKILL.md'));
  assert.equal(globalSkill.entry.path, path.join(home, '.agents/skills/lit-triage/SKILL.md'));
  await assert.rejects(() => createAgentSkill(projectId, 'claude', 'paper-review', home), /already exists/);
  await assert.rejects(() => createAgentSkill('prj-missing', 'claude', 'x', home), /unknown project/);

  await writeFile(path.join(home, '.claude.json'), '{}');
  await assert.rejects(() => writeAgentEnvFile('claude-user-state', '{broken', home), /JSON/);
});

test('project registry rejects duplicates and non-directories, and removal keeps files', async t => {
  const { root, home, project } = await fixture('registry');
  t.after(() => rm(root, { recursive: true, force: true }));

  const projectId = (await addProject(project, '', home))[0].id;
  await writeAgentEnvFile(`project:${projectId}:agents`, 'keep me\n', home);

  await assert.rejects(() => addProject(project, 'dup', home), /already registered/);
  await assert.rejects(() => addProject(path.join(root, 'nope'), 'x', home), /not a directory/);
  await assert.rejects(() => removeProject('prj-missing', home), /unknown project/);

  assert.deepEqual(await removeProject(projectId, home), []);
  assert.deepEqual(await readProjects(home), []);
  assert.equal(await readFile(path.join(project, 'AGENTS.md'), 'utf8'), 'keep me\n');
  await assert.rejects(() => readAgentEnvFile(`project:${projectId}:agents`, home), /unknown agent config entry/);
});

test('templates read and save repository files without touching active instructions or legacy copies', async t => {
  const { root, home, project } = await fixture('template');
  t.after(() => rm(root, { recursive: true, force: true }));
  const templateDir = path.join(root, 'templates');
  await cp(TEMPLATE_DIR, templateDir, { recursive: true });
  const readTemplate = id => readAgentEnvFile(id, home, templateDir);
  const writeTemplate = (id, content) => writeAgentEnvFile(id, content, home, templateDir);
  const legacyDir = path.join(home, '.thinking-os/templates');
  await mkdir(legacyDir, { recursive: true });
  await writeFile(path.join(legacyDir, 'thinking-modes.md'), 'legacy personal copy\n');

  const projectId = (await addProject(project, 'dotcode', home))[0].id;
  await writeAgentEnvFile('codex-instructions', 'existing global instructions\n', home);
  await writeAgentEnvFile(`project:${projectId}:agents`, 'existing project instructions\n', home);
  const defaults = await listAgentEnv(home);
  assert.ok(defaults.entries.filter(entry => entry.category === 'template').every(entry =>
    entry.exists && path.dirname(entry.path) === TEMPLATE_DIR
  ));
  const { entries } = await listAgentEnv(home, templateDir);
  const templates = entries.filter(entry => entry.category === 'template');

  assert.equal(templates.length, AGENT_TEMPLATES.length);
  assert.ok(templates.every(entry => entry.exists && path.dirname(entry.path) === templateDir));

  const starter = await readTemplate('template:thinking-modes');
  assert.match(starter.content, /## Explore/);
  assert.match(starter.content, /Before creating, editing, or deleting any vault record, read VAULT_OPERATIONS\.md/);
  assert.ok(!starter.content.includes('tasks/pipeline/<id>.json'));
  const operations = await readTemplate('template:vault-operations');
  assert.match(operations.content, /Save this template as VAULT_OPERATIONS\.md/);
  assert.match(operations.content, /tasks\/pipeline\/<id>\.json/);
  assert.match(operations.content, /papers\/<id>\.json/);
  assert.match(operations.content, /Do not ask to close tabs/);
  for (const [slug] of AGENT_TEMPLATES) {
    const content = await readFile(path.join(templateDir, `${slug}.md`), 'utf8');
    assert.equal((await readTemplate(`template:${slug}`)).content, content);
    assert.ok(content.startsWith('# '));
    assert.ok(!content.includes('\\`'), `${slug} must render Markdown code normally`);
  }

  const savedOperations = await writeTemplate('template:vault-operations', operations.content);
  assert.equal(savedOperations.path, path.join(templateDir, 'vault-operations.md'));
  assert.equal((await readTemplate('template:vault-operations')).content, operations.content);
  assert.ok(!existsSync(path.join(project, 'VAULT_OPERATIONS.md')));

  await writeTemplate('template:thinking-modes', 'my modes\nline two\n');
  assert.equal((await readTemplate('template:thinking-modes')).content, 'my modes\nline two\n');
  assert.equal(
    await readFile(path.join(templateDir, 'thinking-modes.md'), 'utf8'),
    'my modes\nline two\n'
  );
  const updated = 'Updated\n\n## Evidence\n\n- First line\n- Second line\n\n```text\nkeep spacing\n```\n';
  const savedEntry = await writeTemplate('template:thinking-modes', updated);
  assert.equal(savedEntry.exists, true);
  assert.equal(await readFile(`${savedEntry.path}.bak`, 'utf8'), 'my modes\nline two\n');
  assert.equal((await readTemplate('template:thinking-modes')).content, updated);
  assert.equal((await readAgentEnvFile('codex-instructions', home)).content, 'existing global instructions\n');
  assert.equal((await readAgentEnvFile(`project:${projectId}:agents`, home)).content, 'existing project instructions\n');

  await assert.rejects(() => writeTemplate('template:../../AGENTS', 'bad'), /unknown agent config entry/);
  await assert.rejects(() => writeTemplate('template:thinking-modes', {}), /content must be a string/);
  await assert.rejects(() => writeTemplate('template:thinking-modes', 'x'.repeat(1_000_001)), /content too large/);
  assert.equal((await readTemplate('template:thinking-modes')).content, updated);
  assert.equal(await readFile(path.join(legacyDir, 'thinking-modes.md'), 'utf8'), 'legacy personal copy\n');
  assert.ok(!existsSync(path.join(legacyDir, 'vault-operations.md')));

  await rm(savedEntry.path);
  await assert.rejects(() => readTemplate('template:thinking-modes'), { code: 'ENOENT' });
});
