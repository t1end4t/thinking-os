import { Codex } from '@openai/codex-sdk';
import { parse } from 'smol-toml';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { resolveVaultDir, withVaultLock } from './vault.mjs';
import { TEMPLATE_DIR } from './agentEnv.mjs';

const BODY_LIMIT = 64 * 1024;
const TURN_TIMEOUT_MS = 10 * 60 * 1000;
const IMAGE_LIMIT = 5 * 1024 * 1024;
const IMAGE_ID = /^[a-f0-9]{64}\.(png|jpg|webp)$/;
const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

const MODES = {
  codex: { templates: ['assistant-codex'] },
  chat: {
    templates: ['assistant-conversation', 'assistant-chat'],
    threadOptions: { sandboxMode: 'read-only', approvalPolicy: 'never' }
  },
  work: {
    templates: ['assistant-conversation', 'assistant-work'],
    threadOptions: { sandboxMode: 'workspace-write', approvalPolicy: 'never' }
  }
};

async function readModeInstructions(templates, templateDir) {
  if (!templates) return '';
  const parts = await Promise.all(templates.map(async slug => {
    const text = await readFile(path.join(templateDir, `${slug}.md`), 'utf8');
    if (!text.trim()) throw new Error(`Instruction template ${slug}.md is empty.`);
    return text.trim();
  }));
  return parts.join('\n\n');
}

function imageExtension(bytes) {
  if (bytes.length < 12) return;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
}

export function parseCodexConfig(toml = '') {
  const config = parse(toml);
  const provider = typeof config.model_provider === 'string' ? config.model_provider : '';
  const providers = Object.entries(config.model_providers ?? {}).map(([id, entry]) => {
    let baseUrl = '';
    try {
      const url = new URL(entry.base_url);
      if (['http:', 'https:'].includes(url.protocol)) baseUrl = `${url.origin}${url.pathname}`;
    } catch {}
    return { id, label: typeof entry.name === 'string' ? entry.name : id, baseUrl };
  });
  if (provider && !providers.some(entry => entry.id === provider)) providers.unshift({ id: provider, label: provider, baseUrl: '' });
  return { model: typeof config.model === 'string' ? config.model : '', provider, providers };
}

export function isLocalRequest(req) {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)) return false;
  try {
    const url = new URL(`http://${req.headers.host}`);
    const isAllowedHost =
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.hostname.endsWith('.run.app') ||
      url.hostname.endsWith('.google.internal') ||
      url.hostname.endsWith('.aistudio.google') ||
      url.hostname.endsWith('.googleusercontent.com');
    if (!isAllowedHost) return false;
    const origin = req.headers.origin;
    return (!origin || origin === url.origin) && req.headers['sec-fetch-site'] !== 'cross-site';
  } catch {
    return false;
  }
}

const OPTIONAL_ID = /^[\w./:-]{1,120}$/;

async function readTurnRequest(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new Error('Message exceeds 64 KiB.');
    chunks.push(chunk);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const optional = value => value === undefined || (typeof value === 'string' && OPTIONAL_ID.test(value));
  if (!body || typeof body !== 'object' ||
      body.agent !== 'codex' ||
      typeof body.message !== 'string' || (!body.message.trim() && !body.images?.length) ||
      (body.images !== undefined && (!Array.isArray(body.images) || body.images.length > 4 ||
        !body.images.every(image => image && typeof image.id === 'string' && IMAGE_ID.test(image.id) &&
          typeof image.name === 'string' && image.name.trim() && image.name.length <= 255))) ||
      typeof body.dir !== 'string' || !body.dir.trim() || body.dir.includes('\0') ||
      typeof body.conversationId !== 'string' || !/^[\da-f-]{36}$/i.test(body.conversationId) ||
      !optional(body.threadId) || !optional(body.model) || !optional(body.provider) ||
      (body.mode !== undefined && (typeof body.mode !== 'string' || !Object.hasOwn(MODES, body.mode)))) {
    throw new Error('Invalid assistant request.');
  }
  return body;
}

export function agentPlugin(createCodex = options => new Codex({ codexPathOverride: 'codex', ...options }), imageDir = path.join(homedir(), '.local', 'share', 'thinking-os', 'assistant-images'), templateDir = TEMPLATE_DIR) {
  const threads = new Map();
  const controllers = new Set();
  const clients = new Map();

  function clientFor(provider, mode, instructions) {
    const key = [provider ?? '', mode ?? 'legacy'].join('\0');
    if (clients.get(key)?.instructions !== instructions) {
      const config = { ...(provider ? { model_provider: provider } : {}), ...(instructions ? { developer_instructions: instructions } : {}) };
      clients.set(key, { instructions, client: createCodex(Object.keys(config).length ? { config } : {}) });
    }
    return clients.get(key).client;
  }

  function shutdown() {
    for (const controller of controllers) controller.abort();
    threads.clear();
  }

  function attach(server) {
    server.httpServer?.once('close', shutdown);
    server.middlewares.use('/api/assistant', async (req, res) => {
      const send = (code, payload) => {
        res.statusCode = code;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(payload));
      };
      if (!isLocalRequest(req)) return send(403, { error: 'The assistant requires a same-origin localhost connection. Open http://localhost:3000.' });

      const pathname = new URL(req.originalUrl || req.url, 'http://localhost').pathname;
      if (pathname.startsWith('/api/assistant/images')) {
        const id = pathname.slice('/api/assistant/images/'.length);
        if (req.method === 'GET' && IMAGE_ID.test(id)) {
          try {
            const bytes = await readFile(path.join(imageDir, id), { flag: constants.O_RDONLY | constants.O_NOFOLLOW });
            res.setHeader('content-type', IMAGE_TYPES[id.split('.').pop()]);
            res.setHeader('x-content-type-options', 'nosniff');
            res.setHeader('cache-control', 'no-store');
            res.setHeader('content-security-policy', "default-src 'none'; sandbox");
            return res.end(bytes);
          } catch { return send(404, { error: 'Image unavailable.' }); }
        }
        if (req.method !== 'POST' || pathname !== '/api/assistant/images') return send(404, { error: 'Image endpoint not found.' });
        const mime = req.headers['content-type']?.split(';')[0];
        if (!Object.values(IMAGE_TYPES).includes(mime)) return send(415, { error: 'Use PNG, JPEG, or WebP images.' });
        if (Number(req.headers['content-length']) > IMAGE_LIMIT) return send(413, { error: 'Images must be 5 MiB or smaller.' });
        try {
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > IMAGE_LIMIT) return send(413, { error: 'Images must be 5 MiB or smaller.' });
            chunks.push(chunk);
          }
          const bytes = Buffer.concat(chunks);
          const extension = imageExtension(bytes);
          if (!extension || IMAGE_TYPES[extension] !== mime) return send(400, { error: 'Image contents do not match a supported format.' });
          const imageId = `${createHash('sha256').update(bytes).digest('hex')}.${extension}`;
          await mkdir(imageDir, { recursive: true, mode: 0o700 });
          try { await writeFile(path.join(imageDir, imageId), bytes, { flag: 'wx', mode: 0o600 }); }
          catch (error) { if (error.code !== 'EEXIST') throw error; }
          return send(201, { id: imageId });
        } catch { return send(500, { error: 'Could not save image. Try again.' }); }
      }

      if (req.method === 'GET') {
        let config = { model: '', provider: '', providers: [] };
        try {
          const home = process.env.CODEX_HOME || path.join(homedir(), '.codex');
          config = parseCodexConfig(await readFile(path.join(home, 'config.toml'), 'utf8'));
        } catch (error) {
          if (error.code !== 'ENOENT') return send(500, { error: 'Could not read local Codex configuration.' });
        }
        return send(200, { agents: [{ id: 'codex', label: 'Codex' }], ...config });
      }
      if (req.method !== 'POST') return send(405, { error: 'Only GET and POST are supported.' });
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(415, { error: 'Expected application/json.' });
      if (Number(req.headers['content-length']) > BODY_LIMIT) return send(413, { error: 'Message exceeds 64 KiB.' });

      let body;
      let dir;
      let images;
      try {
        body = await readTurnRequest(req);
        dir = await realpath(resolveVaultDir(body.dir));
        if (!(await stat(dir)).isDirectory()) throw new Error('Workspace folder must be a directory.');
        images = await Promise.all((body.images ?? []).map(async image => {
          const imagePath = path.join(imageDir, image.id);
          try {
            await readFile(imagePath, { flag: constants.O_RDONLY | constants.O_NOFOLLOW });
          } catch { throw new Error('An attached image is unavailable. Attach it again.'); }
          return { type: 'local_image', path: imagePath };
        }));
      } catch (error) {
        return send(400, { error: String(error.message) });
      }
      if (res.destroyed) return;
      if (controllers.size) return send(409, { error: 'The assistant is already running. Stop it or wait for completion.' });

      const controller = new AbortController();
      controllers.add(controller);
      const abort = () => controller.abort();
      res.once('close', abort);
      const timeout = setTimeout(abort, TURN_TIMEOUT_MS);
      const emit = event => {
        if (!res.destroyed) res.write(`${JSON.stringify(event)}\n`);
      };
      res.setHeader('content-type', 'application/x-ndjson');
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-accel-buffering', 'no');
      res.flushHeaders();
      try {
        await withVaultLock(dir, async () => {
          if (controller.signal.aborted) return;
          const mode = MODES[body.mode ?? 'codex'];
          const instructions = await readModeInstructions(MODES[body.mode]?.templates, templateDir);
          const key = [dir, body.conversationId, body.model ?? '', body.provider ?? '', body.mode ?? 'legacy', instructions].join('\0');
          let thread = threads.get(key);
          if (!thread) {
            const options = {
              workingDirectory: dir,
              skipGitRepoCheck: true,
              ...(body.model ? { model: body.model } : {}),
              ...mode.threadOptions
            };
            const codex = clientFor(body.provider, body.mode, instructions);
            thread = body.threadId ? codex.resumeThread(body.threadId, options) : codex.startThread(options);
            threads.set(key, thread);
          }
          const input = images.length ? [...(body.message.trim() ? [{ type: 'text', text: body.message }] : []), ...images] : body.message;
          const { events } = await thread.runStreamed(input, { signal: controller.signal });
          for await (const event of events) emit(event);
        });
      } catch (error) {
        emit({ type: 'error', message: controller.signal.aborted ? 'The assistant stopped or timed out.' : String(error.message) });
      } finally {
        clearTimeout(timeout);
        res.off('close', abort);
        controllers.delete(controller);
        res.end();
      }
    });
  }

  return { name: 'thinking-os-assistant', configureServer: attach, configurePreviewServer: attach, closeBundle: shutdown };
}
