// Node resolve hook for your code: the engine's names, and the workspace laid over the studio. See
// workspace-node.ts, which registers it and holds the same rules for esbuild (engine.ts: engineTarget,
// studioTarget). Plain JavaScript: it runs in Node's loader thread.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ENGINE = '@mediamake/engine';

/**
 * studio: this studio; overlay: { root, studio } of a workspace outside it, or null; own: the
 * workspace's own folders (projects, out, …); engine: engine.json, or null; suffixes: how an import
 * without an extension finds its file.
 */
let at = null;

export function initialize(data) {
  at = data;
}

const inside = (dir, abs) => abs === dir || abs.startsWith(dir + path.sep);
const isFile = p => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

/** engine.ts engineTarget, then the file */
const engineFile = spec => {
  const t = at.engine;
  if (!t) return null;
  let rel = null;
  if (spec === ENGINE) rel = t.entry;
  else if (spec.startsWith(`${ENGINE}/`)) {
    const [name, ...rest] = spec.slice(ENGINE.length + 1).split('/');
    if (t.names[name] !== undefined) rel = [t.names[name], ...rest].filter(Boolean).join('/');
  }
  if (rel === null) return null;
  const base = path.join(at.studio, ...rel.split('/'));
  return at.suffixes.map(s => base + s).find(isFile) ?? null;
};

/** workspace-node.ts studioTarget */
const studioTarget = abs => {
  const { root, studio } = at.overlay;
  if (!inside(root, abs) || abs === root) return null;
  const rel = path.relative(root, abs).split(path.sep);
  if (rel[0].startsWith('.') || rel[0] === 'node_modules') return null;
  const joined = rel.join('/');
  if (at.own.some(own => joined === own || joined.startsWith(`${own}/`))) return null;
  return path.join(studio, ...rel);
};

export async function resolve(specifier, context, next) {
  if (at && (specifier === ENGINE || specifier.startsWith(`${ENGINE}/`))) {
    const file = engineFile(specifier);
    if (!file) {
      const e = new Error(`Cannot find ${specifier} in the engine (${path.join(at.studio, 'engine.json')} names its folders)`);
      e.code = 'ERR_MODULE_NOT_FOUND';
      throw e;
    }
    return next(pathToFileURL(file).href, context);
  }
  try {
    return await next(specifier, context);
  } catch (e) {
    if (!at?.overlay || e?.code !== 'ERR_MODULE_NOT_FOUND' || !context.parentURL?.startsWith('file:')) throw e;
    const parent = fileURLToPath(context.parentURL);
    if (!inside(at.overlay.root, parent)) throw e;
    if (specifier.startsWith('.')) {
      // the engine, imported relatively as if the workspace were apps/studio
      const to = studioTarget(path.resolve(path.dirname(parent), specifier));
      if (!to) throw e;
      return next(pathToFileURL(to).href, context);
    }
    if (specifier.startsWith('/') || /^[a-z]+:/i.test(specifier)) throw e;
    // a package, as the studio finds it
    return next(specifier, { ...context, parentURL: pathToFileURL(path.join(at.overlay.studio, 'package.json')).href });
  }
}
