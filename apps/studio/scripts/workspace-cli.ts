/**
 * mm workspace: where your work is on this machine (scripts/workspace.ts), folder by folder.
 *
 *   mm workspace          every folder, and what set it (MEDIAMAKE_WORKSPACE, the config, or nothing yet)
 *   mm workspace --json   the same as JSON
 */
import fs from 'node:fs';
import { ROOT, shown } from './paths.ts';
import { configFile } from './library/config.ts';
import { DEFAULT_WORKSPACE, WORKSPACE_FOLDERS, workspaceDirs, workspaceRoot, workspaceSetting, type WorkspaceFolder } from './workspace.ts';

const set = workspaceSetting();
const dirs = workspaceDirs(ROOT);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ studio: ROOT, workspace: set?.root ?? null, from: set?.from ?? null, folders: dirs }, null, 2));
  process.exit(0);
}
console.log(`Studio (the framework): ${shown(ROOT) || '.'} → ${ROOT}`);
console.log(
  set
    ? `Workspace: ${shown(set.root)} (from ${set.from === 'env' ? 'MEDIAMAKE_WORKSPACE' : `"workspace" in ${shown(configFile())}`})`
    : `Workspace: none set yet. Projects, renders, brand kits, thumbnail jobs and overlays are in apps/studio; notes, skills and extensions in ${DEFAULT_WORKSPACE}.`,
);
const width = Math.max(...Object.values(WORKSPACE_FOLDERS).map(r => r.length));
for (const name of Object.keys(WORKSPACE_FOLDERS) as WorkspaceFolder[]) {
  const dir = dirs[name];
  console.log(`  ${WORKSPACE_FOLDERS[name].padEnd(width)}  ${shown(dir)}${fs.existsSync(dir) ? '' : '  (not made yet)'}`);
}
if (!set) console.log(`\nWhen a workspace is set, every folder is in it (${shown(workspaceRoot())}/<folder>).`);
