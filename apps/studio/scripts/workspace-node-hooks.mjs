// Node resolve hook for code in a workspace outside the checkout: see workspace-node.ts, which registers
// it and holds the same rule (studioTarget) for esbuild. Plain JavaScript: it runs in Node's loader thread.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** { root, studio, own }: the workspace, the studio, the workspace's own folders (projects, out, …). */
let at = null;

export function initialize(data) {
  at = data;
}

const inside = (dir, abs) => abs === dir || abs.startsWith(dir + path.sep);

const studioTarget = abs => {
  if (!inside(at.root, abs) || abs === at.root) return null;
  const rel = path.relative(at.root, abs).split(path.sep);
  if (rel[0].startsWith('.') || rel[0] === 'node_modules') return null;
  const joined = rel.join('/');
  if (at.own.some(own => joined === own || joined.startsWith(`${own}/`))) return null;
  return path.join(at.studio, ...rel);
};

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (e) {
    if (!at || e?.code !== 'ERR_MODULE_NOT_FOUND' || !context.parentURL?.startsWith('file:')) throw e;
    const parent = fileURLToPath(context.parentURL);
    if (!inside(at.root, parent)) throw e;
    if (specifier.startsWith('.')) {
      // the engine, imported relatively as if the workspace were apps/studio
      const to = studioTarget(path.resolve(path.dirname(parent), specifier));
      if (!to) throw e;
      return next(pathToFileURL(to).href, context);
    }
    if (specifier.startsWith('/') || /^[a-z]+:/i.test(specifier)) throw e;
    // a package, as the studio finds it
    return next(specifier, { ...context, parentURL: pathToFileURL(path.join(at.studio, 'package.json')).href });
  }
}
