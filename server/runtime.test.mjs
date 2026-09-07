import assert from 'node:assert/strict';
import test from 'node:test';
import { assessModelFit, assertModelFileName, buildServiceScript, buildServiceUnit, unitName } from './runtime.mjs';

test('builds persistent user service artifacts without losing command text', () => {
  const command = 'docker run --rm -i --mount type=bind,source="$PWD",target=/workspace image';
  const script = buildServiceScript(command, "/tmp/project's files", '/bin:/usr/bin');
  const unit = buildServiceUnit('Headroom\nService', '/home/user/.local/share/thinking-os/services/srv-headroom.sh');

  assert.equal(unitName('srv-headroom'), 'thinking-os-srv-headroom.service');
  assert.match(script, /cd -- '\/tmp\/project'"'"'s files'/);
  assert.ok(script.includes(command));
  assert.match(unit, /WantedBy=default\.target/);
  assert.match(unit, /Description=Thinking OS service: Headroom Service/);
});

test('unit is wanted by default.target so autostart survives logout', () => {
  const unit = buildServiceUnit('9router', '/home/user/.local/share/thinking-os/services/srv-9router.sh');
  assert.match(unit, /\[Install\]\nWantedBy=default\.target/);
  assert.match(unit, /Restart=on-failure/);
});

test('model filenames cannot escape the configured model directory', () => {
  assert.equal(assertModelFileName('Qwen3-8B-Q4_K_M.gguf'), 'Qwen3-8B-Q4_K_M.gguf');
  assert.throws(() => assertModelFileName('../model.gguf'), /invalid GGUF filename/);
  assert.throws(() => assertModelFileName('model.bin'), /invalid GGUF filename/);
});

test('fit estimate distinguishes full GPU and partial CPU offload', () => {
  const gib = 1024 ** 3;
  const hardware = { vramFreeBytes: 12 * gib, ramFreeBytes: 24 * gib };
  assert.equal(assessModelFit(6 * gib, hardware).mode, 'full-gpu');
  assert.equal(assessModelFit(16 * gib, hardware).mode, 'partial-offload');
  assert.equal(assessModelFit(40 * gib, hardware).mode, 'insufficient');
});
