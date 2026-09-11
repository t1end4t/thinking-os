// Self-check for src/utils/paths.ts: node src/utils/paths.check.mjs
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: [new URL('./paths.ts', import.meta.url).pathname],
  bundle: true, format: 'esm', write: false
});
const { tildePath } = await import(`data:text/javascript,${encodeURIComponent(bundled.outputFiles[0].text)}`);

assert.equal(tildePath('/home/tiendat'), '~');
assert.equal(tildePath('/home/tiendat/codebases/x'), '~/codebases/x');
assert.equal(tildePath('/Users/ana/notes'), '~/notes');
assert.equal(tildePath('/home/tiendat-backup/x'), '~/x', 'replaces the whole user segment');
assert.equal(tildePath('/var/log'), '/var/log');
assert.equal(tildePath('/homer/x'), '/homer/x');
assert.equal(tildePath(''), '');
console.log('tildePath checks passed.');
