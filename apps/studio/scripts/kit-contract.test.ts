// node --experimental-strip-types --test scripts/kit-contract.test.ts (npm run test:engine -w studio)
// The kit's contract (src/kit/contract.ts): a layer's props reach its scene through a spread, so React's
// own prop names never arrive.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { droppedPropWarnings, type Layer } from '../src/kit/contract.ts';

const require = createRequire(import.meta.url);
const REACT = path.dirname(require.resolve('react/package.json'));

test("React takes `key` out of spread props, in its development and production builds alike; `ref` stays", () => {
  for (const env of ['development', 'production']) {
    const { jsx } = require(path.join(REACT, 'cjs', `react-jsx-runtime.${env}.js`));
    const silent = console.error;
    console.error = () => {};
    try {
      const props = jsx(() => null, { ...{ key: { gain: 2 }, ref: 'r', luma: { gain: 3 } }, manifest: 1 }).props;
      assert.deepEqual(Object.keys(props).sort(), ['luma', 'manifest', 'ref'], env);
    } finally {
      console.error = silent;
    }
  }
});

test('a layer that passes a `key` prop is named in a warning; other layers are not', () => {
  const Scene = () => null;
  const layers: Layer[] = [
    { scene: Scene, at: 'all', props: { luma: { gain: 2 } } },
    { scene: Scene, at: 'all', props: { key: { gain: 2 } }, name: 'overlay 2' },
    { scene: Scene, at: 'all' },
  ];
  const warnings = droppedPropWarnings(layers);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^layer 2 \(overlay 2\): its `key` prop never reaches the scene/);
  assert.match(warnings[0], /`luma`/);
});
