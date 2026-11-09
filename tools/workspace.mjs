/**
 * The workspace rule (apps/studio/scripts/workspace.ts says why) for the plain-JS tools that run before
 * anything TypeScript can load: tools/git-health.mjs (the session-start check) and apps/studio/bin/mm.mjs.
 * Only what they ask: is a workspace set, and is there still work of yours in a folder it replaced.
 * apps/studio/scripts/workspace.test.ts checks it against the TypeScript.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const expandHome = p => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

/** The workspace named by MEDIAMAKE_WORKSPACE or "workspace" in ~/.mediamake/config.json, or null. */
export function workspaceSetting() {
  const env = process.env.MEDIAMAKE_WORKSPACE?.trim();
  if (env) return { root: path.resolve(expandHome(env)), from: 'env' };
  const file = process.env.MEDIAMAKE_CONFIG ?? path.join(os.homedir(), '.mediamake', 'config.json');
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'))?.workspace;
  } catch {
    return null;
  }
  return typeof value === 'string' && value.trim() ? { root: path.resolve(expandHome(value.trim())), from: 'config' } : null;
}

/** Your folders in apps/studio, which the workspace takes over once one is set. */
export const STUDIO_FOLDERS = ['projects', 'out', 'brands', 'thumbnails/jobs', 'overlays'];
/** In those folders but not your work: dotfiles, and what `ignore` names (the framework's example, mm migrate's note). */
export const NOT_WORK = ['sample-pulse', 'MOVED.md'];

/** Which of `dirs` (relative to `root`) hold anything but dotfiles and the `ignore` names. */
export function withWork(root, dirs, ignore = []) {
  return dirs.filter(d => {
    try {
      return fs.readdirSync(path.join(root, d)).some(n => !n.startsWith('.') && !ignore.includes(n));
    } catch {
      return false;
    }
  });
}
