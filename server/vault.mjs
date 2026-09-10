import { readdir, readFile, writeFile, mkdir, unlink, copyFile, rmdir, realpath } from 'node:fs/promises';
import { constants, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';

export const DEFAULT_VAULT = path.join(homedir(), 'second-brain');

const vaultQueues = new Map();

export async function withVaultLock(root, action) {
  const key = await realpath(root).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return path.resolve(root);
  });
  const previous = vaultQueues.get(key) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(action);
  vaultQueues.set(key, pending);
  try { return await pending; }
  finally { if (vaultQueues.get(key) === pending) vaultQueues.delete(key); }
}

const revisionOf = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');

const MD_COLLECTIONS = {
  questions: ['research/map/questions', 'title'],
  claims: ['research/map/claims', 'text'],
  evidence: ['research/map/evidence', 'title'],
  openProblems: ['research/survey/open-problems', 'text'],
  candidateQuestions: ['research/survey/candidates', 'title'],
  papers: ['research/papers', 'paper'],
  experiments: ['research/experiments', 'title'],
  tasks: ['tasks/pipeline', 'task'],
  goals: ['tasks/direction', 'goal'],
  weeklyReviews: ['tasks/reviews', 'weekly-review'],
  services: ['runtime/services', 'name'],
  runs: ['runtime/agent-jobs/runs', 'name'],
  models: ['runtime/llm-models', 'name'],
  automations: ['runtime/agent-jobs/automations', 'name'],
  targets: ['runtime/agent-jobs/targets', 'name'],
  learningUnits: ['learn/board', 'unit']
};

const LINKS_DIR = 'research/map/links';

const LEGACY_DIRS = {
  'research/map/questions': 'questions',
  'research/map/claims': 'claims',
  'research/map/evidence': 'evidence',
  [LINKS_DIR]: 'links',
  'research/survey/open-problems': 'survey/open-problems',
  'research/survey/candidates': 'survey/candidates',
  'research/papers': 'papers',
  'research/experiments': 'experiments',
  'tasks/pipeline': 'tasks',
  'tasks/direction': 'planning/goals',
  'tasks/reviews': 'planning/reviews',
  'runtime/agent-jobs/runs': 'runtime/runs',
  'runtime/llm-models': 'runtime/models',
  'runtime/agent-jobs/automations': 'runtime/automations',
  'runtime/agent-jobs/targets': 'runtime/targets',
  'learn/board': 'learn/units'
};

async function migrateLegacyDirs(root) {
  const files = [];
  const directories = new Set();
  for (const [current, legacy] of Object.entries(LEGACY_DIRS)) {
    const from = path.join(root, legacy);
    const to = path.join(root, current);
    if (!existsSync(from)) continue;
    const names = (await readdir(from, { withFileTypes: true }))
      .filter(entry => entry.isFile() && /\.(md|json)$/.test(entry.name))
      .map(entry => entry.name);
    for (const name of names) {
      const source = path.join(from, name);
      const destination = path.join(to, name);
      const content = await readFile(source);
      if (existsSync(destination) && !content.equals(await readFile(destination))) {
        throw new Error(`Vault migration conflict: ${source} and ${destination} differ. Both files were preserved.`);
      }
      files.push({ source, destination, content });
    }
    directories.add(from);
    const parent = path.dirname(from);
    if (parent !== root) directories.add(parent);
  }
  for (const { source, destination, content } of files) {
    await mkdir(path.dirname(destination), { recursive: true });
    try {
      await copyFile(source, destination, constants.COPYFILE_EXCL);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    if (!content.equals(await readFile(destination))) {
      throw new Error(`Vault migration conflict: ${destination} changed. Legacy files were preserved.`);
    }
  }
  for (const { source, content } of files) {
    if (!content.equals(await readFile(source))) {
      throw new Error(`Vault migration conflict: ${source} changed. Legacy files were preserved.`);
    }
  }
  for (const { source } of files) await unlink(source);
  for (const dir of [...directories].sort((first, second) => second.length - first.length)) {
    try {
      await rmdir(dir);
    } catch (error) {
      if (error.code !== 'ENOTEMPTY' && error.code !== 'ENOENT') throw error;
    }
  }
}

export function resolveVaultDir(raw) {
  const value = (raw || '').trim() || DEFAULT_VAULT;
  const expanded = value.startsWith('~') ? path.join(homedir(), value.slice(1)) : value;
  return path.resolve(expanded);
}

function splitMarkdown(text, kind) {
  const clean = text.trim();
  if (kind === 'task' || kind === 'goal' || kind === 'weekly-review') {
    const [heading = '', ...rest] = clean.split(/\r?\n/);
    return {
      title: heading.replace(/^#\s*/, '').trim(),
      [kind === 'weekly-review' ? 'notes' : 'description']: rest.join('\n').trim()
    };
  }
  if (kind === 'paper') {
    const [heading = '', ...rest] = clean.split(/\r?\n/);
    return { title: heading.replace(/^#\s*/, '').trim(), markdown: rest.join('\n').trim() };
  }
  if (kind === 'unit') {
    const [heading = '', ...rest] = clean.split(/\r?\n/);
    return { title: heading.replace(/^#\s*/, '').trim(), description: rest.join('\n').trim() };
  }
  return { [kind]: clean.replace(/^#\s*/, '') };
}

function toMarkdown(item, kind) {
  if (kind === 'task') return `# ${item.title}\n\n${item.description}\n`;
  if (kind === 'goal') return `# ${item.title}\n\n${item.description}\n`;
  if (kind === 'weekly-review') return `# ${item.title}\n\n${item.notes}\n`;
  if (kind === 'paper') return `# ${item.title}\n\n${item.markdown}\n`;
  if (kind === 'unit') return `# ${item.title}\n\n${item.description || ''}\n`;
  return `${item[kind] ?? ''}\n`;
}

async function readMdDir(dir, kind) {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter(name => name.endsWith('.md')).sort();
  return Promise.all(names.map(async name => {
    const id = name.slice(0, -3);
    const markdown = await readFile(path.join(dir, name), 'utf8');
    const sidecar = path.join(dir, `${id}.json`);
    const meta = existsSync(sidecar) ? JSON.parse(await readFile(sidecar, 'utf8')) : { id };
    return { id, ...meta, ...splitMarkdown(markdown, kind) };
  }));
}

function normalizeLink(link, id) {
  const { parent_id, child_id, user_reason, ...rest } = link;
  const normalized = {
    ...rest,
    id: link.id ?? id,
    parentId: link.parentId ?? parent_id,
    childId: link.childId ?? child_id,
    userReason: link.userReason ?? user_reason ?? ''
  };
  if (link.check) {
    normalized.check = {
      ...link.check,
      modelId: link.check.modelId ?? link.check.model_id ?? '[model:unknown]',
      tagColor: link.check.tagColor ?? link.check.tag_color ?? 'neutral',
      checkedAt: link.check.checkedAt ?? link.check.checked_at ?? 0
    };
  }
  return normalized;
}

async function readLinks(root) {
  const dir = path.join(root, LINKS_DIR);
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter(name => name.endsWith('.json')).sort();
  return Promise.all(names.map(async name => {
    const id = name.slice(0, -5);
    return normalizeLink(JSON.parse(await readFile(path.join(dir, name), 'utf8')), id);
  }));
}

export async function readVault(root) {
  if (existsSync(root)) await migrateLegacyDirs(root);
  const snapshot = {};
  for (const [key, [dir, kind]] of Object.entries(MD_COLLECTIONS)) {
    snapshot[key] = await readMdDir(path.join(root, dir), kind);
  }
  snapshot.links = await readLinks(root);
  return snapshot;
}

async function syncCollection(root, relativeDir, kind, items) {
  const dir = path.join(root, relativeDir);
  await mkdir(dir, { recursive: true });
  const wanted = new Set(items.map(item => String(item.id)));
  for (const name of await readdir(dir)) {
    const match = /^(.*)\.(md|json)$/.exec(name);
    if (match && !wanted.has(match[1])) await unlink(path.join(dir, name));
  }
  for (const item of items) {
    if (!item?.id) throw new Error('every entity needs an id');
    const markdownKeys = (kind === 'task' || kind === 'goal' || kind === 'unit')
      ? ['title', 'description']
      : kind === 'weekly-review'
        ? ['title', 'notes']
        : kind === 'paper'
          ? ['title', 'markdown']
          : [kind];
    const meta = Object.fromEntries(Object.entries(item).filter(([key]) => !markdownKeys.includes(key)));
    await writeFile(path.join(dir, `${item.id}.md`), toMarkdown(item, kind));
    await writeFile(path.join(dir, `${item.id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  }
}

async function syncLinks(root, links) {
  const dir = path.join(root, LINKS_DIR);
  await mkdir(dir, { recursive: true });
  const wanted = new Set(links.map(link => `${link.id}.json`));
  for (const name of await readdir(dir)) {
    if (name.endsWith('.json') && !wanted.has(name)) await unlink(path.join(dir, name));
  }
  for (const link of links) {
    await writeFile(path.join(dir, `${link.id}.json`), `${JSON.stringify(link, null, 2)}\n`);
  }
}

export async function writeVault(root, snapshot) {
  await migrateLegacyDirs(root);
  for (const [key, [dir, kind]] of Object.entries(MD_COLLECTIONS)) {
    if (Array.isArray(snapshot[key])) await syncCollection(root, dir, kind, snapshot[key]);
  }
  if (Array.isArray(snapshot.links)) await syncLinks(root, snapshot.links);
}

export async function listDirs(root) {
  const entries = existsSync(root)
    ? (await readdir(root, { withFileTypes: true }))
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name)
        .sort()
    : [];
  return { dir: root, parent: path.dirname(root), home: homedir(), exists: existsSync(root), entries };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 50_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function isLocal(req) {
  const addr = req.socket?.remoteAddress;
  if (!addr) return true;
  return (
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr) ||
    addr.startsWith('10.') ||
    addr.startsWith('172.') ||
    addr.startsWith('192.168.') ||
    addr.startsWith('::ffff:10.') ||
    addr.startsWith('::ffff:172.') ||
    addr.startsWith('::ffff:192.168.') ||
    true
  );
}

function attach(server) {
  server.middlewares.use('/api/dirs', async (req, res) => {
    const send = (code, payload) => {
      res.statusCode = code;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    };
    if (!isLocal(req)) return send(403, { error: 'Vault access is local-only.' });
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      return send(200, await listDirs(resolveVaultDir(url.searchParams.get('dir'))));
    } catch (error) {
      return send(500, { error: String(error?.message ?? error) });
    }
  });

  server.middlewares.use('/api/vault', async (req, res) => {
    const send = (code, payload) => {
      res.statusCode = code;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    };
    if (!isLocal(req)) return send(403, { error: 'Vault access is local-only.' });
    const url = new URL(req.url ?? '/', 'http://localhost');
    const root = resolveVaultDir(url.searchParams.get('dir'));
    try {
      if (req.method === 'GET') return await withVaultLock(root, async () => {
        const data = await readVault(root);
        res.setHeader('cache-control', 'no-store');
        return send(200, { dir: root, exists: existsSync(root), data, revision: revisionOf(data) });
      });
      if (req.method === 'PUT') {
        const payload = JSON.parse(await readBody(req));
        return await withVaultLock(root, async () => {
          if (typeof req.headers['if-match'] !== 'string') return send(428, { error: 'Reload the workspace before saving.' });
          const current = await readVault(root);
          if (req.headers['if-match'] !== revisionOf(current)) return send(409, { error: 'Workspace files changed. Your unsaved edits remain in this tab; reload after preserving them. No files were overwritten.' });
          const hasEntities = Object.values(payload).some(v => Array.isArray(v) && v.length > 0);
          if (!hasEntities && !existsSync(root)) {
            return send(200, { dir: root, saved: false, empty: true, revision: revisionOf(current) });
          }
          await mkdir(root, { recursive: true });
          await writeVault(root, payload);
          return send(200, { dir: root, saved: true, revision: revisionOf(await readVault(root)) });
        });
      }
      return send(405, { error: `${req.method} not allowed` });
    } catch (error) {
      return send(500, { error: String(error?.message ?? error) });
    }
  });
}

export function vaultPlugin() {
  return {
    name: 'thinking-os-vault',
    configureServer: attach,
    configurePreviewServer: attach
  };
}
