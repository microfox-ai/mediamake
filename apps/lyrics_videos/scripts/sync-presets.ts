/**
 * sync-presets: copies mediamake editor presets into src/mediamake/presets.json, so lyrics
 * videos render captions and waveforms with the exact code the mediamake editor runs.
 *
 * A preset's `presetFunction` is the source of a self-contained function (the editor runs it
 * with `new Function`), so the JSON holds everything needed to run it here. Run this again
 * after a preset changes in apps/mediamake.
 *
 * Usage: npm run sync-presets -w lyrics_videos
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MEDIAMAKE = path.resolve(HERE, '../../mediamake');
const REGISTRY = path.join(MEDIAMAKE, 'components/editor/presets/registry');
const PARAM_META = path.resolve(HERE, '../../../packages/remotion/src/core/param-meta.ts');
const OUT = path.resolve(HERE, '../src/mediamake/presets.json');

/** Presets the lyric and waveform layers use: file → export name. */
const PRESETS: Record<string, string> = {
  'captions/sub-vertical-float.ts': 'subVerticalFloatPreset',
  'captions/sub-fast-rap-static.ts': 'subFastRapStaticPreset',
  'captions/sub-kinetic-motion.ts': 'subKineticMotionPreset',
  'captions/sub-kinetic-gradient-flow.ts': 'subKineticGradientFlowPreset',
  'captions/sub-scrolling-vertical.ts': 'subScrollingVerticalPreset',
  'general/waveform.ts': 'waveformPreset',
  'full/waveform-full.ts': 'waveformPreset',
};

const entry = Object.entries(PRESETS)
  .map(
    ([file, name], i) =>
      `export { ${name} as p${i} } from ${JSON.stringify(path.join(REGISTRY, file))};`,
  )
  .join('\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-presets-'));
const outfile = path.join(tmp, 'presets.mjs');
await build({
  stdin: { contents: entry, resolveDir: MEDIAMAKE, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  alias: { '@': MEDIAMAKE },
  external: ['react', 'remotion'],
  plugins: [
    {
      // Presets only import types from these. The few runtime imports in shared preset files
      // (registries, param metadata) are never called by a preset function, so a stub will do.
      name: 'stub-runtime-packages',
      setup(b) {
        b.onResolve({ filter: /^(@microfox\/|mongodb$)/ }, args =>
          // Plain constants the preset param schemas read at load time: use the real file.
          args.path === '@microfox/remotion/param-meta'
            ? { path: PARAM_META }
            : { path: args.path, namespace: 'stub' },
        );
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents:
            // __esModule makes the CommonJS interop hand the proxy back as is, so any named
            // import resolves to the stub; toPrimitive lets it be used as a property key.
            `const stub = new Proxy(function () {}, {
              get: (_, key) => key === '__esModule' ? true : key === Symbol.toPrimitive ? () => 'stub' : stub,
              apply: () => stub,
              construct: () => stub,
            });
            module.exports = stub;`,
          loader: 'js',
        }));
      },
    },
  ],
  logLevel: 'warning',
});
const mod = await import(pathToFileURL(outfile).href);

type Exported = {
  metadata: { id: string; title: string; description?: string; defaultInputParams?: unknown };
  presetFunction: string;
  presetParams: unknown;
};

const presets: Record<string, unknown> = {};
Object.keys(PRESETS).forEach((_, i) => {
  const preset = mod[`p${i}`] as Exported;
  const { id, title, description, defaultInputParams } = preset.metadata;
  presets[id] = {
    id,
    title,
    description,
    defaultInputParams,
    presetFunction: preset.presetFunction,
    presetParams: preset.presetParams,
  };
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(presets, null, 2) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${Object.keys(presets).join(', ')} → ${path.relative(process.cwd(), OUT)}`);
