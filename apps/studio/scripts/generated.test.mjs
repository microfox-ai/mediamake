/**
 * generated.mjs on a throwaway studio folder: the presets are built when missing, rebuilt when an
 * input or an output changed, left alone when current, and a failed build warns (soft) or throws.
 *
 *   mm test:generated
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ensurePresets, presetsStale } from './generated.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const app = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-generated-test-'));
after(() => fs.rmSync(app, { recursive: true, force: true }));

const write = (rel, text) => {
  fs.mkdirSync(path.dirname(path.join(app, rel)), { recursive: true });
  fs.writeFileSync(path.join(app, rel), text);
};
// a stand-in for sync-presets.ts: copies its one input into both outputs and records the hashes, as
// the real one does (FAIL in the input makes it fail)
fs.cpSync(path.join(HERE, 'generated.mjs'), path.join(app, 'scripts', 'generated.mjs'));
write(
  'scripts/sync-presets.ts',
  `import fs from 'node:fs';
import path from 'node:path';
import { PRESETS_INPUTS, PRESETS_OUT, sha } from './generated.mjs';
const app = path.resolve(import.meta.dirname, '..');
const input = fs.readFileSync(path.join(app, 'registry.txt'), 'utf8');
if (input.includes('FAIL')) { console.error('a preset does not build'); process.exit(1); }
const n: number = 1;
for (const rel of PRESETS_OUT) { fs.mkdirSync(path.dirname(path.join(app, rel)), { recursive: true }); fs.writeFileSync(path.join(app, rel), input + n); }
const stamp = { inputs: { 'registry.txt': sha(path.join(app, 'registry.txt')) }, outputs: Object.fromEntries(PRESETS_OUT.map(r => [r, sha(path.join(app, r))])) };
fs.writeFileSync(path.join(app, PRESETS_INPUTS), JSON.stringify(stamp));
`,
);
write('registry.txt', 'v1');
const presets = () => fs.readFileSync(path.join(app, 'src', 'mediamake', 'presets.json'), 'utf8');

test('missing: built; then current, so nothing runs', () => {
  assert.match(presetsStale(app), /presets\.json is missing/);
  assert.deepEqual(ensurePresets(app, { quiet: true }), { built: true, why: 'src/mediamake/presets.json is missing' });
  assert.equal(presets(), 'v11');
  assert.equal(presetsStale(app), null);
  assert.deepEqual(ensurePresets(app, { quiet: true }), { built: false });
});

test('an input that changed, or an output edited by hand, rebuilds', () => {
  write('registry.txt', 'v2');
  assert.equal(presetsStale(app), 'registry.txt changed');
  ensurePresets(app, { quiet: true });
  assert.equal(presets(), 'v21');
  write('src/mediamake/html-text.ts', 'edited');
  assert.equal(presetsStale(app), 'src/mediamake/html-text.ts was edited');
  ensurePresets(app, { quiet: true });
  assert.equal(presetsStale(app), null);
  fs.rmSync(path.join(app, 'src', 'mediamake', '.presets.inputs.json'));
  assert.equal(presetsStale(app), 'no record of what it was built from');
  ensurePresets(app, { quiet: true });
});

test('a build that fails throws, or with soft warns and keeps what was built before', () => {
  write('registry.txt', 'v3 FAIL');
  assert.throws(() => ensurePresets(app, { quiet: true }), /sync-presets failed: a preset does not build/);
  const err = console.error;
  const said = [];
  console.error = m => said.push(m);
  try {
    assert.equal(ensurePresets(app, { soft: true, quiet: true }).failed, true);
  } finally {
    console.error = err;
  }
  assert.match(said.join('\n'), /Rendering with the presets built before/);
  assert.equal(presets(), 'v21');
});
