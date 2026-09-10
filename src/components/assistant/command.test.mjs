import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const source = readFileSync(new URL('./AssistantDock.tsx', import.meta.url), 'utf8');
const compiled = await transform(source.slice(source.indexOf('export function shellCommand'), source.indexOf('const ActivityIcon')), { loader: 'ts', format: 'esm' });
const { shellCommand, shellSummary } = await import(`data:text/javascript,${encodeURIComponent(compiled.code)}`);

assert.equal(shellCommand('pwd'), 'pwd');
assert.equal(shellCommand("bash -lc 'first --flag\nsecond'"), 'first --flag\nsecond');
assert.equal(shellCommand(`bash -lc '${'x'.repeat(200)}'`), 'x'.repeat(200));
assert.equal(shellCommand('node -e "console.log(1)"'), 'node -e "console.log(1)"');

assert.equal(shellSummary('pwd'), 'pwd');
assert.equal(shellSummary("/run/current-system/sw/bin/bash -lc 'ls -a; echo ---; cat INDEX.md'"), 'ls -a; echo ---; cat INDEX.md …');
assert.equal(shellSummary('/usr/bin/bash -c "sed -n \'68,94p\' VAULT_OPERATIONS.md"'), "sed -n '68,94p' VAULT_OPERATIONS.md");
assert.equal(shellSummary("bash -lc 'first --flag\nsecond'"), 'first --flag …');
assert.equal(shellSummary(`bash -lc '${'x'.repeat(200)}'`), `${'x'.repeat(63)}…`);
assert.equal(shellSummary('  '), '');
assert.equal(shellSummary('node -e "console.log(1)"'), 'node -e "console.log(1)"');
console.log('shellSummary ok');
