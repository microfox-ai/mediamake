/**
 * studio: Remotion Studio on the projects (mm preview).
 *
 * Usage: mm preview [<slug>] [remotion studio flags, e.g. --port=3001]
 *   with a slug, Studio holds that project alone (its video and shorts): it starts in seconds and
 *   loads no other project's code or fonts (scripts/only-project.ts). Without one, every project is
 *   listed and each loads when its composition is opened (src/Root.tsx).
 *   A project of another major version of the engine opens with its own, as mm render renders it
 *   (scripts/engine-pinned.ts; --engine=pinned | current to choose).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runWithPinnedEngine } from './engine-pinned.ts';
import { DIRS, ROOT } from './paths.ts';
import { REMOTION_CLI } from './render-tuning.ts';

const args = process.argv.slice(2);
const slug = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
const flags = (slug ? args.slice(1) : args).filter(f => !f.startsWith('--engine='));
if (slug && !fs.existsSync(path.join(DIRS.projects, slug, 'video', 'index.tsx'))) {
  console.error(`No project ${slug} (projects/${slug}/video/index.tsx).`);
  process.exit(1);
}
// one project opens with the engine it renders with (engine-pinned.ts)
if (slug) {
  try {
    const status = runWithPinnedEngine('preview', slug, args, { studio: ROOT, projects: DIRS.projects });
    if (status !== null) process.exit(status);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
const r = spawnSync(process.execPath, [REMOTION_CLI, 'studio', 'src/index.ts', ...flags], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, ...(slug ? { ONLY_PROJECT: slug } : {}) },
});
process.exit(r.status ?? 1);
