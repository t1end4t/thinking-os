import { chmod, copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLoopback, isSameOrigin } from './runtime.mjs';

const MAX_CONTENT_BYTES = 1_000_000;

export const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../templates');

export const AGENT_TEMPLATES = [
  ['shared-core', 'Shared behavior'],
  ['thinking-modes', 'Thinking modes'],
  ['vault-operations', 'Vault operations'],
  ['coding-project', 'Project implementation'],
  ['directory-context', 'Directory AGENTS.md'],
  ['index', 'INDEX.md'],
  ['problem-brief', 'Problem brief']
];

const registryPath = home => path.join(home, '.thinking-os/agent-projects.json');

const GLOBAL_FILES = [
  ['claude-instructions', 'claude', 'Global instructions', '.claude/CLAUDE.md', 'markdown'],
  ['claude-settings', 'claude', 'Settings + hooks', '.claude/settings.json', 'json'],
  ['claude-user-state', 'claude', 'User MCP + project state', '.claude.json', 'json'],
  ['codex-instructions', 'codex', 'Global instructions', '.codex/AGENTS.md', 'markdown'],
  ['codex-config', 'codex', 'Config + MCP servers', '.codex/config.toml', 'toml'],
  ['codex-hooks', 'codex', 'Hooks', '.codex/hooks.json', 'json']
];

const PROJECT_FILES = [
  ['agents', 'shared', 'Project instructions', 'AGENTS.md', 'markdown', 'instructions'],
  ['claude', 'claude', 'Project instructions', 'CLAUDE.md', 'markdown', 'instructions'],
  ['claude-settings', 'claude', 'Project settings', '.claude/settings.json', 'json', 'settings'],
  ['claude-local-settings', 'claude', 'Private project settings', '.claude/settings.local.json', 'json', 'settings'],
  ['codex-config', 'codex', 'Project config', '.codex/config.toml', 'toml', 'settings'],
  ['mcp', 'shared', 'Project MCP servers', '.mcp.json', 'json', 'mcp']
];

const SKILL_DIRS = [
  ['claude', '.claude/skills'],
  ['codex', '.codex/skills'],
  ['shared', '.agents/skills']
];

async function describe(entry) {
  const info = existsSync(entry.path) ? await stat(entry.path).catch(() => null) : null;
  return { ...entry, exists: Boolean(info), sizeBytes: info?.size ?? 0, modifiedAt: info?.mtime.toISOString() ?? null };
}

export async function readProjects(home = homedir()) {
  try {
    const parsed = JSON.parse(await readFile(registryPath(home), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveProjects(projects, home) {
  await mkdir(path.dirname(registryPath(home)), { recursive: true });
  await writeFile(registryPath(home), `${JSON.stringify(projects, null, 2)}\n`, { mode: 0o600 });
  return projects;
}

export async function addProject(projectPath, name, home = homedir()) {
  const resolved = path.resolve(String(projectPath ?? '').replace(/^~(?=$|\/)/, home));
  if (!existsSync(resolved) || !(await stat(resolved)).isDirectory()) throw new Error(`not a directory: ${resolved}`);
  const projects = await readProjects(home);
  if (projects.some(project => project.path === resolved)) throw new Error('project already registered');
  const id = `prj-${path.basename(resolved).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}`;
  const uniqueId = projects.some(project => project.id === id) ? `${id}-${projects.length + 1}` : id;
  return saveProjects([...projects, {
    id: uniqueId,
    name: String(name ?? '').trim() || path.basename(resolved),
    path: resolved,
    addedAt: new Date().toISOString()
  }], home);
}

export async function removeProject(id, home = homedir()) {
  const projects = await readProjects(home);
  if (!projects.some(project => project.id === id)) throw new Error(`unknown project: ${id}`);
  return saveProjects(projects.filter(project => project.id !== id), home);
}

function skillRoot(root, agent) {
  const match = SKILL_DIRS.find(([skillAgent]) => skillAgent === agent);
  if (!match) throw new Error('invalid skill agent');
  return path.join(root, match[1]);
}

async function listSkills(root, scope, project) {
  const entries = [];
  for (const [agent] of SKILL_DIRS) {
    const skillsDir = skillRoot(root, agent);
    if (!existsSync(skillsDir)) continue;
    const names = (await readdir(skillsDir, { withFileTypes: true }))
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(item => item.name)
      .sort();
    for (const name of names) {
      entries.push({
        id: `skill:${scope === 'global' ? 'global' : project.id}:${agent}:${name}`,
        agent,
        scope,
        projectId: project?.id ?? null,
        projectName: project?.name ?? null,
        label: name,
        category: 'skill',
        kind: 'markdown',
        path: path.join(skillsDir, name, 'SKILL.md')
      });
    }
  }
  return entries;
}

export async function listAgentEnv(home = homedir(), templateDir = TEMPLATE_DIR) {
  const projects = await readProjects(home);
  const entries = [
    ...AGENT_TEMPLATES.map(([slug, label]) => ({
      id: `template:${slug}`,
      agent: 'shared',
      label,
      kind: 'markdown',
      category: 'template',
      scope: 'global',
      projectId: null,
      projectName: null,
      path: path.join(templateDir, `${slug}.md`)
    })),
    ...GLOBAL_FILES.map(([id, agent, label, relative, kind]) => ({
      id,
      agent,
      label,
      kind,
      category: id.includes('instructions') ? 'instructions' : ['claude-user-state', 'codex-config'].includes(id) ? 'mcp' : 'settings',
      scope: 'global',
      projectId: null,
      projectName: null,
      path: path.join(home, relative)
    })),
    ...(await listSkills(home, 'global', null))
  ];
  for (const project of projects) {
    entries.push(...PROJECT_FILES.map(([key, agent, label, relative, kind, category]) => ({
      id: `project:${project.id}:${key}`,
      agent,
      label,
      kind,
      category,
      scope: 'project',
      projectId: project.id,
      projectName: project.name,
      path: path.join(project.path, relative)
    })));
    entries.push(...(await listSkills(project.path, 'project', project)));
  }
  return { home, projects, entries: await Promise.all(entries.map(describe)) };
}

async function findEntry(id, home = homedir(), templateDir = TEMPLATE_DIR) {
  const { entries } = await listAgentEnv(home, templateDir);
  const entry = entries.find(item => item.id === id);
  if (!entry) throw new Error(`unknown agent config entry: ${id}`);
  return entry;
}

export async function readAgentEnvFile(id, home = homedir(), templateDir = TEMPLATE_DIR) {
  const entry = await findEntry(id, home, templateDir);
  return { entry, content: entry.exists || entry.category === 'template' ? await readFile(entry.path, 'utf8') : '' };
}

export async function writeAgentEnvFile(id, content, home = homedir(), templateDir = TEMPLATE_DIR) {
  if (typeof content !== 'string') throw new Error('content must be a string');
  if (Buffer.byteLength(content) > MAX_CONTENT_BYTES) throw new Error('content too large');
  const entry = await findEntry(id, home, templateDir);
  if (entry.category === 'skill' && !entry.exists) throw new Error('skill file no longer exists');
  if (entry.kind === 'json' && content.trim()) JSON.parse(content);
  await mkdir(path.dirname(entry.path), { recursive: true });
  const mode = entry.exists ? (await stat(entry.path)).mode : 0o600;
  if (entry.exists) await copyFile(entry.path, `${entry.path}.bak`);
  const temporaryPath = `${entry.path}.thinking-os.tmp`;
  await writeFile(temporaryPath, content, { mode });
  await chmod(temporaryPath, mode);
  await rename(temporaryPath, entry.path);
  return describe(entry);
}

export async function createAgentSkill(target, agent, name, home = homedir()) {
  const slug = String(name ?? '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('skill name must be lowercase kebab-case');
  const project = target === 'global' ? null : (await readProjects(home)).find(item => item.id === target);
  if (target !== 'global' && !project) throw new Error(`unknown project: ${target}`);
  const skillDir = path.join(skillRoot(project ? project.path : home, agent), slug);
  if (existsSync(skillDir)) throw new Error(`skill already exists: ${slug}`);
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), `---\nname: ${slug}\ndescription: Describe when this skill should be used.\n---\n\n# ${slug}\n\nAdd focused instructions here.\n`);
  return readAgentEnvFile(`skill:${target}:${agent}:${slug}`, home);
}

async function readJsonBody(req) {
  return JSON.parse(await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > MAX_CONTENT_BYTES * 2) reject(new Error('payload too large'));
    });
    req.on('end', () => resolve(raw || '{}'));
    req.on('error', reject);
  }));
}

function attach(server) {
  server.middlewares.use('/api/agent-env', async (req, res) => {
    const send = (code, payload) => {
      res.statusCode = code;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    };
    if (!isLoopback(req) || !isSameOrigin(req)) return send(403, { error: 'Agent environment is local-only.' });
    const url = new URL(req.url ?? '/', 'http://localhost');
    const id = url.searchParams.get('id');
    try {
      if (req.method === 'GET') return send(200, id ? await readAgentEnvFile(id) : await listAgentEnv());
      const body = await readJsonBody(req);
      if (req.method === 'PUT') return send(200, { entry: await writeAgentEnvFile(body.id, body.content) });
      if (req.method === 'POST') {
        if (body.action === 'add-project') return send(201, { projects: await addProject(body.path, body.name) });
        if (body.action === 'remove-project') return send(200, { projects: await removeProject(body.id) });
        if (body.action === 'create-skill') return send(201, await createAgentSkill(body.target, body.agent, body.name));
        return send(400, { error: `unknown action: ${body.action}` });
      }
      return send(405, { error: `${req.method} not allowed` });
    } catch (error) {
      return send(400, { error: String(error?.message ?? error) });
    }
  });
}

export function agentEnvPlugin() {
  return { name: 'thinking-os-agent-env', configureServer: attach, configurePreviewServer: attach };
}
