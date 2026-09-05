import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export const DEFAULT_VAULT = path.join(homedir(), 'second-brain');

const MD_COLLECTIONS = {
  questions: ['questions', 'title'],
  claims: ['claims', 'text'],
  evidence: ['evidence', 'title'],
  openProblems: ['survey/open-problems', 'text'],
  candidateQuestions: ['survey/candidates', 'title'],
  papers: ['papers', 'paper'],
  experiments: ['experiments', 'title'],
  tasks: ['tasks', 'task'],
  services: ['runtime/services', 'name'],
  runs: ['runtime/runs', 'name'],
  models: ['runtime/models', 'name'],
  automations: ['runtime/automations', 'name'],
  targets: ['runtime/targets', 'name']
};

export function resolveVaultDir(raw) {
  const value = (raw || '').trim() || DEFAULT_VAULT;
  const expanded = value.startsWith('~') ? path.join(homedir(), value.slice(1)) : value;
  return path.resolve(expanded);
}

function splitMarkdown(text, kind) {
  const clean = text.trim();
  if (kind === 'task') {
    const [heading = '', ...rest] = clean.split(/\r?\n/);
    return { title: heading.replace(/^#\s*/, '').trim(), description: rest.join('\n').trim() };
  }
  if (kind === 'paper') {
    const [heading = '', ...rest] = clean.split(/\r?\n/);
    return { title: heading.replace(/^#\s*/, '').trim(), markdown: rest.join('\n').trim() };
  }
  return { [kind]: clean.replace(/^#\s*/, '') };
}

function toMarkdown(item, kind) {
  if (kind === 'task') return `# ${item.title}\n\n${item.description}\n`;
  if (kind === 'paper') return `# ${item.title}\n\n${item.markdown}\n`;
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
  const dir = path.join(root, 'links');
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter(name => name.endsWith('.json')).sort();
  return Promise.all(names.map(async name => {
    const id = name.slice(0, -5);
    return normalizeLink(JSON.parse(await readFile(path.join(dir, name), 'utf8')), id);
  }));
}

export async function readVault(root) {
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
    const markdownKeys = kind === 'task' ? ['title', 'description'] : kind === 'paper' ? ['title', 'markdown'] : [kind];
    const meta = Object.fromEntries(Object.entries(item).filter(([key]) => !markdownKeys.includes(key)));
    await writeFile(path.join(dir, `${item.id}.md`), toMarkdown(item, kind));
    await writeFile(path.join(dir, `${item.id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  }
}

async function syncLinks(root, links) {
  const dir = path.join(root, 'links');
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
      if (req.method === 'GET') return send(200, { dir: root, exists: existsSync(root), data: await readVault(root) });
      if (req.method === 'PUT') {
        await mkdir(root, { recursive: true });
        await writeVault(root, JSON.parse(await readBody(req)));
        return send(200, { dir: root, saved: true });
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
