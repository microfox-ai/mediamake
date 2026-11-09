/**
 * mm engine: the studio's engine by name (scripts/engine.ts, engine.json).
 *
 *   mm engine                       its version and commit, its names, and where your projects stand
 *   mm engine codemod [<slug>…]     what would change: relative imports of the engine in your code
 *                                   become names, and every project gets a pin (a dry run)
 *   mm engine codemod … --yes       does it
 *   mm engine pin <slug>…           records this engine in the projects' input/project.json, over the
 *                                   pin they have (after checking them with a new major version)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCodemod, currentPin, ENGINE, planCodemod, pinProject, projectDirs, projectPin, readEngine, type CodemodPlan } from './engine.ts';
import { DIRS, ROOT, shown } from './paths.ts';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const [command, ...rest] = args.filter(a => !a.startsWith('--'));

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const short = (commit?: string) => (commit ? ` (${commit.slice(0, 7)})` : '');

/** The codemod's plan, as mm engine codemod and mm migrate print it. */
export const printCodemod = (plan: CodemodPlan, opts: { max?: number } = {}) => {
  const max = opts.max ?? 60;
  const byFile = new Map<string, CodemodPlan['changes']>();
  for (const c of plan.changes) byFile.set(c.file, [...(byFile.get(c.file) ?? []), c]);
  if (byFile.size) {
    console.log(`\nImports of the engine by path, given its names (${plural(plan.changes.length, 'import')} in ${plural(byFile.size, 'file')}):`);
    let n = 0;
    for (const [file, cs] of byFile) {
      if (n++ >= max) {
        console.log(`  … and ${byFile.size - max} more files`);
        break;
      }
      console.log(`  ${shown(file)}`);
      for (const c of cs) console.log(`    ${String(c.line).padStart(4)}  ${c.from}  →  ${c.to}`);
    }
  }
  if (plan.unnamed.length) {
    console.log(`\nImports of engine files no name covers (left as they are; they keep working):`);
    for (const u of plan.unnamed.slice(0, max)) console.log(`  ${shown(u.file)}:${u.line}  ${u.spec}  (${u.target})`);
  }
  if (plan.pins.length) {
    const pin = plan.pins[0].pin;
    const names = plan.pins.map(p => path.basename(p.dir));
    console.log(`\nEngine pins (input/project.json "engine": ${pin.version}${short(pin.commit)}) for ${plural(names.length, 'project')}: ${names.slice(0, 30).join(', ')}${names.length > 30 ? ', …' : ''}`);
  }
};

const status = () => {
  const table = readEngine(ROOT);
  if (!table) throw new Error(`${shown(path.join(ROOT, 'engine.json'))} is missing`);
  const pin = currentPin(ROOT, table)!;
  console.log(`${ENGINE} ${table.version}${short(pin.commit)}  (${shown(path.join(ROOT, 'engine.json'))})\n`);
  console.log(`  ${ENGINE.padEnd(32)}  ${table.entry}`);
  for (const [name, dir] of Object.entries(table.names)) console.log(`  ${`${ENGINE}/${name}/…`.padEnd(32)}  ${dir}/…`);
  const projects = projectDirs(DIRS.projects);
  const pins = projects.map(projectPin);
  const versions = new Map<string, number>();
  for (const p of pins) if (p) versions.set(p.version, (versions.get(p.version) ?? 0) + 1);
  const plan = planCodemod(ROOT, { pins: false });
  const files = new Set(plan.changes.map(c => c.file)).size;
  console.log(`\nYour projects (${shown(DIRS.projects)}): ${plural(projects.length, 'project')}`);
  for (const [v, n] of versions) console.log(`  made with ${v}: ${n}`);
  if (pins.some(p => !p)) console.log(`  no pin yet: ${pins.filter(p => !p).length}`);
  console.log(files ? `  ${plural(files, 'file')} of your code import the engine by path: mm engine codemod lists them.` : '  Your code imports the engine by name.');
};

const codemod = () => {
  const plan = planCodemod(ROOT, { slugs: rest });
  if (!plan.changes.length && !plan.pins.length) {
    printCodemod(plan);
    console.log(`\nNothing to do (${plural(plan.scanned, 'code file')} read).`);
    return;
  }
  printCodemod(plan, { max: yes ? 20 : 60 });
  if (!yes) return console.log(`\nNothing has changed. To do it: mm engine codemod${rest.length ? ` ${rest.join(' ')}` : ''} --yes`);
  applyCodemod(plan, ROOT);
  console.log(`\n✔ ${plural(plan.texts.size, 'file')} rewritten, ${plural(plan.pins.length, 'project')} pinned.`);
};

const pin = () => {
  if (!rest.length) throw new Error('Usage: mm engine pin <slug>…');
  for (const slug of rest) {
    const dir = path.join(DIRS.projects, slug);
    if (!projectDirs(DIRS.projects, [slug]).length) throw new Error(`No project ${slug} (${shown(dir)}/video/index.tsx)`);
    const before = projectPin(dir);
    const after = pinProject(dir, ROOT, { force: true });
    console.log(after ? `✔ ${slug}: ${before ? `${before.version}${short(before.commit)} → ` : ''}${after.version}${short(after.commit)}` : `${slug}: already pinned to this engine`);
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!command) status();
    else if (command === 'codemod') codemod();
    else if (command === 'pin') pin();
    else throw new Error(`No mm engine ${command}: mm engine, mm engine codemod [<slug>…] [--yes], mm engine pin <slug>…`);
  } catch (err) {
    console.error(`engine: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
