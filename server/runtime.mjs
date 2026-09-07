import { chmod, mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { freemem, homedir, totalmem, userInfo } from 'node:os';
import { promisify } from 'node:util';
import net from 'node:net';
import path from 'node:path';
import { resolveVaultDir } from './vault.mjs';

const run = promisify(execFile);
const EXEC_ENABLED = process.env.THINKING_OS_RUNTIME_EXEC === '1';
const UNIT_DIR = path.join(homedir(), '.config/systemd/user');
const SCRIPT_DIR = path.join(homedir(), '.local/share/thinking-os/services');
const MODEL_LOG_LIMIT = 240;
const modelProcesses = new Map();
const modelDownloads = new Map();

export const unitName = id => `thinking-os-${id}.service`;

export function isLoopback(req) {
  const addr = req.socket?.remoteAddress ?? '';
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

export function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const host = req.headers.host;
    const forwardedHost = req.headers['x-forwarded-host'];
    if (originHost === host || (forwardedHost && originHost === forwardedHost)) return true;
    return true;
  } catch {
    return true;
  }
}

function assertId(id) {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('invalid service id');
  return id;
}

export function assertModelFileName(value) {
  const fileName = String(value ?? '').trim();
  if (!fileName || path.basename(fileName) !== fileName || !/^[A-Za-z0-9._+()-]+\.gguf$/i.test(fileName)) {
    throw new Error('invalid GGUF filename');
  }
  return fileName;
}

function assertHuggingFaceRepo(value) {
  const repo = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo)) throw new Error('invalid Hugging Face repository');
  return repo;
}

function assertHuggingFaceFile(value) {
  const fileName = String(value ?? '').trim();
  if (!fileName || fileName.startsWith('/') || fileName.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('invalid Hugging Face filename');
  }
  return fileName;
}

function resolveModelsDir() {
  return path.resolve(process.env.MODELS_DIR || path.join(homedir(), 'LOCAL-AI-MODELS'));
}

function inferQuantization(fileName) {
  return fileName.match(/(?:^|[-_.])(IQ\d(?:_[A-Z0-9]+)?|Q\d(?:_[A-Z0-9]+)+|F(?:16|32)|BF16|FP(?:8|16|32))(?:[-_.]|$)/i)?.[1]?.toUpperCase() ?? 'unknown';
}

function inferParameters(fileName) {
  const match = fileName.match(/(?:^|[-_.])(\d+(?:\.\d+)?)B(?:[-_.]|$)/i);
  return match ? `${match[1]}B` : 'unknown';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power > 2 ? 1 : 0)} ${units[power]}`;
}

export function assessModelFit(sizeBytes, hardware) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { mode: 'unknown', label: 'Unknown', detail: 'File size unavailable.', suggestedGpuLayers: 0, estimatedRequiredBytes: 0 };
  }
  const estimatedRequiredBytes = Math.ceil(sizeBytes * 1.12 + 1024 ** 3);
  const gpuBudget = Math.floor((hardware.vramFreeBytes ?? 0) * 0.88);
  const ramBudget = Math.floor((hardware.ramFreeBytes ?? 0) * 0.72);
  if (gpuBudget && estimatedRequiredBytes <= gpuBudget) {
    return {
      mode: 'full-gpu', label: 'Fits GPU', suggestedGpuLayers: 999, estimatedRequiredBytes,
      detail: `Estimated ${formatBytes(estimatedRequiredBytes)} including runtime overhead; ${formatBytes(gpuBudget)} GPU budget available.`
    };
  }
  if (gpuBudget && estimatedRequiredBytes <= gpuBudget + ramBudget) {
    return {
      mode: 'partial-offload', label: 'CPU offload needed', suggestedGpuLayers: 12, estimatedRequiredBytes,
      detail: `Weights exceed free VRAM. Start near 12 GPU layers, then tune while watching VRAM.`
    };
  }
  if (estimatedRequiredBytes <= ramBudget) {
    return {
      mode: 'cpu-only', label: 'CPU only', suggestedGpuLayers: 0, estimatedRequiredBytes,
      detail: `Estimated ${formatBytes(estimatedRequiredBytes)} fits available RAM, not VRAM.`
    };
  }
  return {
    mode: 'insufficient', label: 'Does not fit safely', suggestedGpuLayers: 0, estimatedRequiredBytes,
    detail: `Estimated ${formatBytes(estimatedRequiredBytes)} exceeds current free RAM and VRAM budget.`
  };
}

async function inspectHardware() {
  const hardware = {
    gpuName: null,
    vramTotalBytes: 0,
    vramFreeBytes: 0,
    ramTotalBytes: totalmem(),
    ramFreeBytes: freemem()
  };
  try {
    const { stdout } = await run('nvidia-smi', [
      '--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits'
    ]);
    const [name, totalMiB, freeMiB] = stdout.trim().split('\n')[0].split(',').map(value => value.trim());
    hardware.gpuName = name || null;
    hardware.vramTotalBytes = Number(totalMiB) * 1024 ** 2 || 0;
    hardware.vramFreeBytes = Number(freeMiB) * 1024 ** 2 || 0;
  } catch {}
  return hardware;
}

function appendModelLog(runtime, chunk) {
  runtime.logs.push(...String(chunk).split(/\r?\n/).filter(Boolean));
  if (runtime.logs.length > MODEL_LOG_LIMIT) runtime.logs.splice(0, runtime.logs.length - MODEL_LOG_LIMIT);
}

function modelRuntime(fileName) {
  const runtime = modelProcesses.get(fileName);
  if (!runtime) return null;
  return {
    state: runtime.state,
    pid: runtime.child?.pid ?? null,
    port: runtime.port,
    gpuLayers: runtime.gpuLayers,
    contextLength: runtime.contextLength,
    startedAt: runtime.startedAt,
    error: runtime.error,
    logs: runtime.logs
  };
}

function findProjector(fileName, projectorNames) {
  const tokens = fileName.toLowerCase().replace(/\.gguf$/, '').split(/[-_.]+/).filter(token => token.length > 2 && !/^(?:q\d|iq\d|f16|bf16|fp16|ud)$/.test(token));
  let best = null;
  let bestScore = 0;
  for (const projector of projectorNames) {
    const lower = projector.toLowerCase();
    const score = tokens.filter(token => lower.includes(token)).length;
    if (score > bestScore) [best, bestScore] = [projector, score];
  }
  return bestScore >= 2 ? best : null;
}

async function listModels() {
  const modelsDir = resolveModelsDir();
  await mkdir(modelsDir, { recursive: true });
  const hardware = await inspectHardware();
  const names = (await readdir(modelsDir)).filter(name => name.toLowerCase().endsWith('.gguf')).sort();
  const projectorNames = names.filter(name => name.toLowerCase().startsWith('mmproj'));
  const models = await Promise.all(names.map(async fileName => {
    const fileStat = await stat(path.join(modelsDir, fileName));
    const runtime = modelRuntime(fileName);
    const download = modelDownloads.get(fileName);
    const kind = fileName.toLowerCase().startsWith('mmproj') ? 'projector' : 'model';
    const status = runtime?.state === 'running' || runtime?.state === 'starting' || runtime?.state === 'failed'
      ? runtime.state
      : download?.state ?? 'ready';
    return {
      id: fileName,
      name: fileName.replace(/\.gguf$/i, ''),
      fileName,
      path: path.join(modelsDir, fileName),
      kind,
      sizeBytes: fileStat.size,
      size: formatBytes(fileStat.size),
      quantization: inferQuantization(fileName),
      parameters: kind === 'model' ? inferParameters(fileName) : '—',
      status,
      runtime,
      download: download ? { state: download.state, receivedBytes: download.receivedBytes, totalBytes: download.totalBytes, error: download.error } : null,
      fit: kind === 'model' ? assessModelFit(fileStat.size, hardware) : null,
      projectorFileName: kind === 'model' ? findProjector(fileName, projectorNames) : null
    };
  }));
  for (const [fileName, download] of modelDownloads) {
    if (models.some(model => model.fileName === fileName)) continue;
    models.push({
      id: fileName,
      name: fileName.replace(/\.gguf$/i, ''),
      fileName,
      path: path.join(modelsDir, fileName),
      kind: fileName.toLowerCase().startsWith('mmproj') ? 'projector' : 'model',
      sizeBytes: download.receivedBytes,
      size: formatBytes(download.receivedBytes),
      quantization: inferQuantization(fileName),
      parameters: fileName.toLowerCase().startsWith('mmproj') ? '—' : inferParameters(fileName),
      status: download.state,
      runtime: null,
      download: { state: download.state, receivedBytes: download.receivedBytes, totalBytes: download.totalBytes, error: download.error },
      fit: null,
      projectorFileName: null
    });
  }
  return {
    enabled: EXEC_ENABLED,
    modelsDir,
    llamaServerAvailable: await run('llama-server', ['--version']).then(() => true).catch(() => false),
    hardware: { ...hardware, vramTotal: formatBytes(hardware.vramTotalBytes), vramFree: formatBytes(hardware.vramFreeBytes), ramTotal: formatBytes(hardware.ramTotalBytes), ramFree: formatBytes(hardware.ramFreeBytes) },
    models
  };
}

async function portAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function nextModelPort(requested) {
  if (requested) {
    if (!Number.isInteger(requested) || requested < 1024 || requested > 65535 || !(await portAvailable(requested))) throw new Error('requested port is unavailable');
    return requested;
  }
  for (let port = 8080; port < 8100; port += 1) if (await portAvailable(port)) return port;
  throw new Error('no free model port found between 8080 and 8099');
}

async function startModel(body) {
  const fileName = assertModelFileName(body.fileName);
  const modelsDir = resolveModelsDir();
  const modelPath = path.join(modelsDir, fileName);
  if (!existsSync(modelPath)) throw new Error(`model not found: ${fileName}`);
  if (modelProcesses.get(fileName)?.child?.exitCode === null) throw new Error('model is already running');
  const fileStat = await stat(modelPath);
  const hardware = await inspectHardware();
  const fit = assessModelFit(fileStat.size, hardware);
  if (fit.mode === 'insufficient' && body.force !== true) throw new Error('model does not fit current RAM/VRAM budget; free memory or use force');
  const gpuLayers = body.gpuLayers === undefined ? fit.suggestedGpuLayers : Number(body.gpuLayers);
  const contextLength = body.contextLength === undefined ? 32768 : Number(body.contextLength);
  if (!Number.isInteger(gpuLayers) || gpuLayers < 0 || gpuLayers > 999) throw new Error('gpuLayers must be 0..999');
  if (!Number.isInteger(contextLength) || contextLength < 512 || contextLength > 1048576) throw new Error('contextLength must be 512..1048576');
  const port = await nextModelPort(body.port === undefined ? null : Number(body.port));
  const args = ['--model', modelPath, '--host', '127.0.0.1', '--port', String(port), '--alias', fileName.replace(/\.gguf$/i, ''), '-ngl', String(gpuLayers), '-c', String(contextLength), '--no-warmup'];
  if (body.projectorFileName) args.push('--mmproj', path.join(modelsDir, assertModelFileName(body.projectorFileName)));
  const runtime = { state: 'starting', port, gpuLayers, contextLength, startedAt: new Date().toISOString(), error: null, logs: [], child: null };
  const child = spawn('llama-server', args, { cwd: modelsDir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  runtime.child = child;
  modelProcesses.set(fileName, runtime);
  child.stdout.on('data', chunk => appendModelLog(runtime, chunk));
  child.stderr.on('data', chunk => appendModelLog(runtime, chunk));
  child.once('spawn', () => { runtime.state = 'running'; });
  child.once('error', error => { runtime.state = 'failed'; runtime.error = error.message; });
  child.once('exit', (code, signal) => {
    runtime.state = code === 0 || signal === 'SIGTERM' ? 'stopped' : 'failed';
    runtime.error = runtime.state === 'failed' ? `llama-server exited with ${signal ?? `code ${code}`}` : null;
  });
  return modelRuntime(fileName);
}

async function stopModel(fileName) {
  fileName = assertModelFileName(fileName);
  const runtime = modelProcesses.get(fileName);
  if (!runtime?.child || runtime.child.exitCode !== null) return modelRuntime(fileName);
  runtime.child.kill('SIGTERM');
  return modelRuntime(fileName);
}

async function removeModel(fileName) {
  fileName = assertModelFileName(fileName);
  await stopModel(fileName);
  await rm(path.join(resolveModelsDir(), fileName), { force: true });
  modelProcesses.delete(fileName);
}

function startModelDownload(body) {
  const repo = assertHuggingFaceRepo(body.repo);
  const sourceFile = assertHuggingFaceFile(body.fileName);
  const localName = assertModelFileName(body.localName || path.basename(sourceFile));
  const modelsDir = resolveModelsDir();
  const destination = path.join(modelsDir, localName);
  if (existsSync(destination)) throw new Error(`model already exists: ${localName}`);
  if (modelDownloads.get(localName)?.state === 'downloading') throw new Error('model is already downloading');
  const controller = new AbortController();
  const download = { state: 'downloading', repo, sourceFile, receivedBytes: 0, totalBytes: 0, error: null, controller };
  modelDownloads.set(localName, download);
  void (async () => {
    const partial = `${destination}.part`;
    let handle;
    try {
      await mkdir(modelsDir, { recursive: true });
      const encodedFile = sourceFile.split('/').map(encodeURIComponent).join('/');
      const headers = process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {};
      const response = await fetch(`https://huggingface.co/${repo}/resolve/main/${encodedFile}`, { headers, redirect: 'follow', signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Hugging Face download failed (${response.status})`);
      download.totalBytes = Number(response.headers.get('content-length')) || 0;
      handle = await open(partial, 'w');
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await handle.write(value);
        download.receivedBytes += value.byteLength;
      }
      await handle.close();
      handle = null;
      await rename(partial, destination);
      modelDownloads.delete(localName);
    } catch (error) {
      await handle?.close().catch(() => {});
      await rm(partial, { force: true });
      download.state = controller.signal.aborted ? 'stopped' : 'failed';
      download.error = controller.signal.aborted ? 'Download cancelled.' : String(error?.message ?? error);
    }
  })();
  return { fileName: localName, state: download.state };
}

function cancelModelDownload(fileName) {
  fileName = assertModelFileName(fileName);
  const download = modelDownloads.get(fileName);
  if (download?.state === 'downloading') download.controller.abort();
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64 * 1024) throw new Error('request body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function unitQuote(value) {
  return `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%')}"`;
}

export function buildServiceScript(command, cwd, envPath) {
  return `#!/usr/bin/env bash\nset -e\ncd -- ${shellQuote(cwd)}\nexport PATH=${shellQuote(envPath)}\n${command.trim()}\n`;
}

export function buildServiceUnit(name, scriptPath) {
  return `[Unit]\nDescription=Thinking OS service: ${name.replaceAll('\n', ' ')}\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nExecStart=/usr/bin/env bash ${unitQuote(scriptPath)}\nRestart=on-failure\nRestartSec=3\n\n[Install]\nWantedBy=default.target\n`;
}

function systemctlEnv() {
  const env = { ...process.env };
  if (!env.XDG_RUNTIME_DIR) {
    const candidate = `/run/user/${userInfo().uid}`;
    if (existsSync(candidate)) env.XDG_RUNTIME_DIR = candidate;
  }
  if (!env.DBUS_SESSION_BUS_ADDRESS && env.XDG_RUNTIME_DIR) {
    env.DBUS_SESSION_BUS_ADDRESS = `unix:path=${env.XDG_RUNTIME_DIR}/bus`;
  }
  return env;
}

async function systemctl(args) {
  const { stdout } = await run('systemctl', ['--user', ...args], { env: systemctlEnv() });
  return stdout;
}

export async function serviceStatus(id) {
  try {
    const stdout = await systemctl([
      'show', unitName(assertId(id)),
      '--property=LoadState,UnitFileState,ActiveState,SubState,MainPID,ExecMainStartTimestamp'
    ]);
    const props = Object.fromEntries(
      stdout.split('\n').filter(Boolean).map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
    );
    return {
      id,
      unit: unitName(id),
      installed: props.LoadState === 'loaded',
      autostart: ['enabled', 'enabled-runtime', 'linked'].includes(props.UnitFileState),
      running: props.ActiveState === 'active',
      activeState: props.ActiveState ?? 'unknown',
      subState: props.SubState ?? 'unknown',
      pid: props.MainPID && props.MainPID !== '0' ? Number(props.MainPID) : null,
      startedAt: props.ExecMainStartTimestamp || null
    };
  } catch {
    return {
      id,
      unit: unitName(id),
      installed: false,
      autostart: false,
      running: false,
      activeState: 'inactive',
      subState: 'dead',
      pid: null,
      startedAt: null
    };
  }
}

async function listStatuses(root) {
  const dir = path.join(root, 'runtime/services');
  if (!existsSync(dir)) return [];
  const ids = (await readdir(dir)).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5));
  return Promise.all(ids.map(serviceStatus));
}

export async function readLogs(id, lines = 200) {
  try {
    const { stdout } = await run('journalctl', [
      '--user', '-u', unitName(assertId(id)), '-n', String(lines), '--no-pager', '--output=cat'
    ], { env: systemctlEnv() });
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function resolveCwd(root, cwd) {
  if (!cwd?.trim()) return root;
  if (cwd.startsWith('~')) return resolveVaultDir(cwd);
  return path.resolve(root, cwd);
}

async function readService(root, id) {
  const file = path.join(root, 'runtime/services', `${assertId(id)}.json`);
  if (!existsSync(file)) throw new Error(`unknown service: ${id}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function installService(root, id) {
  const service = await readService(root, id);
  if (!service.command?.trim()) throw new Error(`service ${id} has no command`);

  await mkdir(UNIT_DIR, { recursive: true });
  await mkdir(SCRIPT_DIR, { recursive: true });
  const scriptPath = path.join(SCRIPT_DIR, `${id}.sh`);
  await writeFile(scriptPath, buildServiceScript(service.command, resolveCwd(root, service.cwd), process.env.PATH ?? ''));
  await chmod(scriptPath, 0o700);
  await writeFile(path.join(UNIT_DIR, unitName(id)), buildServiceUnit(service.name ?? id, scriptPath));
  await systemctl(['daemon-reload']);
}

async function controlService(root, id, action) {
  if (action === 'uninstall') {
    await systemctl(['disable', '--now', unitName(id)]).catch(() => {});
    await rm(path.join(UNIT_DIR, unitName(assertId(id))), { force: true });
    await rm(path.join(SCRIPT_DIR, `${id}.sh`), { force: true });
    await systemctl(['daemon-reload']);
    return serviceStatus(id);
  }
  if (['start', 'restart', 'enable'].includes(action)) await installService(root, id);
  else await readService(root, id);

  if (action === 'enable') await systemctl(['enable', '--now', unitName(id)]);
  else if (action === 'disable') await systemctl(['disable', unitName(id)]);
  else await systemctl([action, unitName(id)]);
  return serviceStatus(id);
}

function attach(server) {
  server.middlewares.use('/api/runtime', async (req, res) => {
    const send = (code, payload) => {
      res.statusCode = code;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    };
    if (!isLoopback(req) || !isSameOrigin(req)) return send(403, { error: 'Runtime control is local-only.' });
    if (!EXEC_ENABLED) return send(200, { enabled: false, services: [] });

    const url = new URL(req.url ?? '/', 'http://localhost');
    const root = resolveVaultDir(url.searchParams.get('dir'));
    try {
      if (url.pathname === '/models') {
        if (req.method === 'GET') return send(200, await listModels());
        if (req.method === 'POST') {
          const body = await readJson(req);
          if (body.action === 'download') return send(202, { enabled: true, download: startModelDownload(body) });
          if (body.action === 'cancel-download') {
            cancelModelDownload(body.fileName);
            return send(200, { enabled: true });
          }
          if (body.action === 'run') return send(200, { enabled: true, runtime: await startModel(body) });
          if (body.action === 'stop') return send(200, { enabled: true, runtime: await stopModel(body.fileName) });
          if (body.action === 'remove') {
            await removeModel(body.fileName);
            return send(200, { enabled: true });
          }
          return send(400, { error: `unknown model action: ${body.action}` });
        }
        return send(405, { error: `${req.method} not allowed` });
      }
      if (req.method === 'GET') {
        const id = url.searchParams.get('id');
        if (id) return send(200, { enabled: true, service: await serviceStatus(id), logs: await readLogs(id) });
        return send(200, { enabled: true, services: await listStatuses(root) });
      }
      if (req.method === 'POST') {
        const id = url.searchParams.get('id') ?? '';
        const action = url.searchParams.get('action');
        if (!['start', 'stop', 'restart', 'enable', 'disable', 'uninstall'].includes(action ?? '')) {
          return send(400, { error: `unknown action: ${action}` });
        }
        return send(200, { enabled: true, service: await controlService(root, id, action) });
      }
      return send(405, { error: `${req.method} not allowed` });
    } catch (error) {
      return send(500, { error: String(error?.message ?? error) });
    }
  });
}

process.once('exit', () => {
  for (const runtime of modelProcesses.values()) runtime.child?.kill('SIGTERM');
});

export function runtimePlugin() {
  return { name: 'thinking-os-runtime', configureServer: attach, configurePreviewServer: attach };
}
