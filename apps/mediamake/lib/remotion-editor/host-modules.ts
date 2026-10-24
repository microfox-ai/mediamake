import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as JsxRuntime from 'react/jsx-runtime';
import * as Remotion from 'remotion';
import * as Zod from 'zod';

/*
 * The packages a compiled lyric project may import, provided by this app instead of bundled
 * with the project. React, Remotion and three must be the app's own copies: a second React
 * breaks hooks, and a second three breaks @react-three/fiber. Heavy ones load on first use.
 */

type Loader = () => unknown | Promise<unknown>;

const HOST: Record<string, Loader> = {
  react: () => React,
  'react/jsx-runtime': () => JsxRuntime,
  'react-dom': () => ReactDOM,
  remotion: () => Remotion,
  zod: () => Zod,
  '@remotion/media': () => import('@remotion/media'),
  '@remotion/noise': () => import('@remotion/noise'),
  '@remotion/paths': () => import('@remotion/paths'),
  '@remotion/shapes': () => import('@remotion/shapes'),
  '@remotion/three': () => import('@remotion/three'),
  '@remotion/google-fonts': () => import('@remotion/google-fonts'),
  three: () => import('three'),
  '@react-three/fiber': () => import('@react-three/fiber'),
  '@react-three/drei': () => import('@react-three/drei'),
  '@microfox/remotion': () => import('@microfox/remotion'),
};

const GOOGLE_FONT = /^@remotion\/google-fonts\/([A-Za-z0-9]+)$/;

export const isHostModule = (spec: string) => spec in HOST || GOOGLE_FONT.test(spec);

export const hostModuleNames = () => [...Object.keys(HOST), '@remotion/google-fonts/<Font>'];

async function loadGoogleFont(importName: string) {
  const { getAvailableFonts } = await import('@remotion/google-fonts');
  const entry = getAvailableFonts().find(f => f.importName === importName);
  if (!entry) throw new Error(`Unknown font module @remotion/google-fonts/${importName}`);
  return entry.load();
}

/**
 * What `require()` returns to sucrase's CommonJS output: named exports as properties, the
 * default export as `.default`, and `__esModule` so default imports don't get wrapped twice.
 */
const asCommonJs = (ns: unknown): Record<string, unknown> => {
  const mod = ns as Record<string, unknown>;
  if (mod.__esModule) return mod;
  const out: Record<string, unknown> = { __esModule: true };
  for (const key of Object.keys(mod)) out[key] = mod[key];
  out.default = 'default' in mod ? mod.default : mod;
  return out;
};

/**
 * Loads the host modules a project imports. `staticFile` replaces Remotion's own, so project code
 * that calls it gets URLs this page can fetch.
 */
export async function loadHostModules(
  specs: Iterable<string>,
  staticFile: (path: string) => string,
): Promise<Map<string, Record<string, unknown>>> {
  const out = new Map<string, Record<string, unknown>>();
  await Promise.all(
    [...new Set(specs)].map(async spec => {
      const font = spec.match(GOOGLE_FONT);
      const ns = font ? await loadGoogleFont(font[1]) : await HOST[spec]?.();
      if (!ns) throw new Error(`"${spec}" is not available in the editor`);
      const mod = asCommonJs(ns);
      // a spread drops the non-enumerable __esModule flag, so it is set again
      out.set(spec, spec === 'remotion' ? { ...mod, __esModule: true, staticFile } : mod);
    }),
  );
  return out;
}
