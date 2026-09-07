import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
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
