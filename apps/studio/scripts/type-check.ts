/**
 * mm type-check: the studio (its tsconfig.json: the engine, the scripts and any project still in
 * apps/studio), then, once your work is in a workspace outside the checkout, the projects there
 * (<workspace>/tsconfig.json, brought up to date first by workspace-setup.ts).
 *
 *   mm type-check            both
 *   mm type-check --studio   the studio only (what a framework PR needs)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { DIRS, ROOT, shown } from './paths.ts';
import { setupWorkspace } from './workspace-setup.ts';
import { workspaceSetting } from './workspace.ts';

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const check = (project: string) => spawnSync(process.execPath, [tsc, '--noEmit', '-p', project], { stdio: 'inherit' }).status === 0;

let ok = check(ROOT);
const set = workspaceSetting();
if (!process.argv.includes('--studio') && set && set.root !== ROOT && fs.existsSync(DIRS.projects)) {
  for (const line of setupWorkspace(set.root, ROOT, true)) console.log(`workspace: ${line}`);
  console.log(`Type-checking the projects in ${shown(set.root)}`);
  ok = check(path.join(set.root, 'tsconfig.json')) && ok;
}
process.exit(ok ? 0 : 1);
