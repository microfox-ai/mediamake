/**
 * Opens Remotion Studio on one of the studio's entry points with its public folder in the workspace
 * (scripts/workspace.ts), wherever that is: the thumbnail jobs for thumbnails/, the assembled brand
 * files for logoGraphics/. (`mm preview`, every project, gets its public folder from remotion.config.ts.)
 *
 * Usage: node --experimental-strip-types scripts/remotion-studio.ts <thumbnails | logos> [remotion studio flags…]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { PUBLIC } from './brand-public.ts';
import { DIRS, ROOT } from './paths.ts';

const ENTRIES: Record<string, { entry: string; publicDir: string }> = {
  thumbnails: { entry: 'thumbnails/index.ts', publicDir: DIRS.thumbnailJobs },
  logos: { entry: 'logoGraphics/index.ts', publicDir: PUBLIC },
};

const [which, ...rest] = process.argv.slice(2);
const target = which ? ENTRIES[which] : undefined;
if (!target) {
  console.error(`Usage: remotion-studio.ts <${Object.keys(ENTRIES).join(' | ')}> [remotion studio flags…]`);
  process.exit(1);
}
const r = spawnSync('npx', ['remotion', 'studio', target.entry, `--public-dir=${path.resolve(target.publicDir)}`, ...rest], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
