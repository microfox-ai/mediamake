/**
 * engine: the studio's engine by name. Your code (projects, brand graphics, thumbnail jobs, extensions:
 * the workspace's) imports it as `@mediamake/engine` (the kit: defineProject, layer, hooks) or
 * `@mediamake/engine/<name>/<file>` (`@mediamake/engine/remix/edl.ts`, `@mediamake/engine/lyrics`),
 * never by path (../../../src/kit). A name means the same folder wherever the workspace is, and keeps
 * its meaning when a folder of the engine is renamed or moved: only engine.json changes.
 *
 * engine.json is the one table: `entry` (what @mediamake/engine itself is) and `names` (name → folder
 * of this app), plus the engine's semver `version`. Everything that resolves imports reads it:
 * - the Remotion bundles: engineAliases() (workspace-webpack.ts, golden.ts);
 * - TypeScript: tsconfig.json's `paths`, which mirror it (tsPaths(), checked by engine.test.ts), and a
 *   workspace's tsconfig extends that one;
 * - Node and esbuild, for project code that scripts load (workspace-node.ts);
 * - the editor and live review in the app (apps/mediamake/lib/remotion-editor/compile.ts), from the
 *   engine folder it opens.
 *
 * Pins: a project's input/project.json records the engine it was made with, `"engine": { "version",
 * "commit" }`. mm prepare and mm render write it when a project has none, mm engine codemod for every
 * project; nothing changes it after that but `mm engine pin <slug>`. A breaking change bumps the major
 * version, and a project pinned to another major renders with its own engine, from a kept checkout of
 * its commit (engine-pinned.ts).
 *
 * The codemod (mm engine codemod, and mm migrate) rewrites relative imports of the engine in your code
 * to names, and pins every project. A relative import still works meanwhile: the bundles, TypeScript
 * and Node lay the workspace over the studio (workspace-webpack.ts, workspace-setup.ts,
 * workspace-node.ts).
 *
 * No import.meta here: remotion.config.ts loads this file as CommonJS (through workspace-webpack.ts).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { WORKSPACE_FOLDERS, workspaceDir, workspaceSetting, type WorkspaceFolder } from './workspace.ts';

export const ENGINE = '@mediamake/engine';

export type EngineTable = {
  name: string;
  /** semver: the major changes when a project that worked would break */
  version: string;
  /** what `@mediamake/engine` itself is (a path in the app) */
  entry: string;
  /** `@mediamake/engine/<name>/…` → a folder of the app */
  names: Record<string, string>;
};

export type EnginePin = { version: string; commit?: string };

const posix = (p: string) => p.split(path.sep).join('/');
const isFile = (p: string) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};
const inside = (dir: string, abs: string) => abs === dir || abs.startsWith(dir + path.sep);

/**
 * Files the studio's own git repo tracks under `abs` (the framework's: the example project): the
 * codemod and the pins never touch them. Code outside the checkout is never the framework's, even in a
 * repo of your own.
 */
const trackedIn = (studio: string, abs: string): Set<string> => {
  const repo = path.resolve(studio, '..', '..');
  if (!inside(repo, path.resolve(abs))) return new Set();
  try {
    const out = execFileSync('git', ['-C', repo, 'ls-files', '-z', '--', path.relative(repo, path.resolve(abs)) || '.'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return new Set(out.split('\0').filter(Boolean).map(f => path.join(repo, f)));
  } catch {
    return new Set();
  }
};

/** This studio's engine.json, or null for a studio from before the engine had names. */
export const readEngine = (studio: string): EngineTable | null => {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(studio, 'engine.json'), 'utf8')) as EngineTable;
    return t?.name === ENGINE && typeof t.entry === 'string' && t.names && typeof t.version === 'string' ? t : null;
  } catch {
    return null;
  }
};

/** What an import names, as a path in the app before extensions are tried (remix/edl → src/remix/edl), or null when it isn't the engine. */
export const engineTarget = (spec: string, table: EngineTable): string | null => {
  if (spec === ENGINE) return table.entry;
  if (!spec.startsWith(`${ENGINE}/`)) return null;
  const [name, ...rest] = spec.slice(ENGINE.length + 1).split('/');
  const dir = table.names[name];
  return dir === undefined ? null : [dir, ...rest].filter(Boolean).join('/');
};

const INDEX = /^index\.(ts|tsx|js|jsx|mjs)$|^index$/;
/** A path without a last `index` (a folder's import names its index) */
const noIndex = (rel: string) => {
  const parts = posix(rel).split('/').filter(p => p && p !== '.');
  if (parts.length > 1 && INDEX.test(parts[parts.length - 1])) parts.pop();
  return parts.join('/');
};

/** The name of a path in the app (src/remix/edl.ts → @mediamake/engine/remix/edl.ts, src/kit → @mediamake/engine), or null outside the named folders. */
export const engineSpecifier = (rel: string, table: EngineTable): string | null => {
  const joined = noIndex(rel);
  if (joined === noIndex(table.entry)) return ENGINE;
  const hit = Object.entries(table.names)
    .filter(([, dir]) => joined === dir || joined.startsWith(`${dir}/`))
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (!hit) return null;
  const rest = joined.slice(hit[1].length + 1);
  return rest ? `${ENGINE}/${hit[0]}/${rest}` : `${ENGINE}/${hit[0]}`;
};

/** How an import without an extension finds its file (the bundles' order). */
export const SUFFIXES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'];
export const probe = (abs: string) => SUFFIXES.map(s => abs + s).find(isFile) ?? null;

/** The file an engine import names in this studio, or null. */
export const engineFile = (spec: string, studio: string, table = readEngine(studio)) => {
  const t = table && engineTarget(spec, table);
  return t === null || t === undefined ? null : probe(path.join(path.resolve(studio), ...t.split('/')));
};

/** webpack's resolve.alias for the names: the entry exactly, each name as a folder prefix. */
export const engineAliases = (studio: string, table = readEngine(studio)): Record<string, string> => {
  if (!table) return {};
  const at = (rel: string) => path.join(path.resolve(studio), ...rel.split('/'));
  return {
    [`${ENGINE}$`]: at(table.entry),
    ...Object.fromEntries(Object.entries(table.names).map(([name, dir]) => [`${ENGINE}/${name}`, at(dir)])),
  };
};

/** tsconfig.json's compilerOptions.paths for the names (relative to the app). */
export const tsPaths = (table: EngineTable): Record<string, string[]> => ({
  [ENGINE]: [`./${table.entry}`],
  ...Object.fromEntries(
    Object.entries(table.names).flatMap(([name, dir]) => [
      [`${ENGINE}/${name}`, [`./${dir}`]],
      [`${ENGINE}/${name}/*`, [`./${dir}/*`]],
    ]),
  ),
});

// ── pins

const commits = new Map<string, string | null>();
/** The commit the studio's checkout is at, or null (no git, not a checkout). */
export const engineCommit = (studio: string): string | null => {
  const key = path.resolve(studio);
  if (!commits.has(key)) {
    try {
      commits.set(key, execFileSync('git', ['-C', key, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null);
    } catch {
      commits.set(key, null);
    }
  }
  return commits.get(key)!;
};

/** The pin for this studio's engine as it is now. */
export const currentPin = (studio: string, table = readEngine(studio)): EnginePin | null => {
  if (!table) return null;
  const commit = engineCommit(studio);
  return commit ? { version: table.version, commit } : { version: table.version };
};

const projectJson = (projectDir: string) => path.join(projectDir, 'input', 'project.json');

const readProjectJson = (projectDir: string): Record<string, unknown> | null => {
  try {
    const v = JSON.parse(fs.readFileSync(projectJson(projectDir), 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
};

/** The engine a project records, or null. */
export const projectPin = (projectDir: string): EnginePin | null => {
  const e = readProjectJson(projectDir)?.engine as EnginePin | undefined;
  return e && typeof e.version === 'string' ? e : null;
};

/**
 * Records this studio's engine in the project's input/project.json (made when there is none) when it
 * has no pin, or always with `force`. The pin written, or null when it was left as it was.
 */
export const pinProject = (projectDir: string, studio: string, opts: { force?: boolean; apply?: boolean } = {}): EnginePin | null => {
  const pin = currentPin(studio);
  if (!pin) return null;
  if (trackedIn(studio, projectDir).size) return null; // the framework's example: it always renders with the engine it is in
  const file = projectJson(projectDir);
  const exists = isFile(file);
  const data = readProjectJson(projectDir);
  if (exists && !data) return null; // not JSON we can read: leave it to the user
  const had = data?.engine as EnginePin | undefined;
  if (had && !opts.force) return null;
  if (had && had.version === pin.version && had.commit === pin.commit) return null;
  if (opts.apply !== false) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ ...(data ?? {}), engine: pin }, null, 2)}\n`);
  }
  return pin;
};

const major = (v: string) => Number.parseInt(v.split('.')[0], 10);

/** A line for a project pinned to another major version of the engine than this one, or null. */
export const pinWarning = (projectDir: string, studio: string): string | null => {
  const pin = projectPin(projectDir);
  const table = readEngine(studio);
  if (!pin || !table || major(pin.version) === major(table.version)) return null;
  const slug = path.basename(projectDir);
  return `${slug} was made with engine ${pin.version}${pin.commit ? ` (${pin.commit.slice(0, 7)})` : ''}, and this render uses ${table.version}, another major version. When it looks as it should: mm engine pin ${slug}.`;
};

// ── the codemod

export type ImportChange = { file: string; line: number; from: string; to: string };
export type Unnamed = { file: string; line: number; spec: string; target: string };
export type CodemodPlan = {
  changes: ImportChange[];
  /** relative imports of a studio file that no name covers (left as they are) */
  unnamed: Unnamed[];
  /** file → its text with the names */
  texts: Map<string, string>;
  /** projects that get a pin */
  pins: { dir: string; pin: EnginePin }[];
  /** code files read */
  scanned: number;
};

const CODE = /\.(ts|tsx|js|jsx|mjs|mts|cts)$/;
/** Folders with media, renders or caches, never code */
const NOT_CODE = new Set(['node_modules', 'analysis', 'derived', 'archive', 'out', 'input', 'stems', 'frames', 'cutouts', 'fonts', 'public', 'sound', 'kept', 'assets', 'renders']);
/** An import, export … from, import(), require() or side-effect import: the quote and the specifier */
const SPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"])([^'"\n]+)\2/g;

const walkCode = (dir: string, out: string[] = []) => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!NOT_CODE.has(e.name) && !/^footage/i.test(e.name)) walkCode(p, out);
    } else if (e.isFile() && CODE.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
};

/** Where your code is: each folder of the workspace that holds code, and the folder that plays apps/studio for it. */
export const codeFolders = (studio: string, slugs?: string[]) => {
  const folders: WorkspaceFolder[] = slugs?.length ? ['projects'] : ['projects', 'brands', 'thumbnailJobs', 'extensions'];
  return folders.map(name => {
    const dir = workspaceDir(name, studio);
    const base = path.resolve(dir, ...WORKSPACE_FOLDERS[name].split('/').map(() => '..'));
    const roots = name === 'projects' && slugs?.length ? slugs.map(s => path.join(dir, s)) : [dir];
    return { name, dir, base, roots };
  });
};

/** The projects in a projects folder: folders with video/index.tsx, as the studio's Root takes them. */
export const projectDirs = (projects: string, slugs?: string[]) => {
  let names: string[];
  try {
    names = slugs?.length ? slugs : fs.readdirSync(projects);
  } catch {
    return [];
  }
  return names.filter(n => !/^[_.]/.test(n) && isFile(path.join(projects, n, 'video', 'index.tsx'))).map(n => path.join(projects, n));
};

const ownFolder = (rel: string) => Object.values(WORKSPACE_FOLDERS).some(own => rel === own || rel.startsWith(`${own}/`));

/**
 * What the codemod would change in your code: every relative import that means a file of the studio's
 * engine (from where your code is, as if it were in apps/studio) becomes its name. An import whose file
 * exists where it points (your own) is left alone.
 */
export const planCodemod = (studio: string, opts: { slugs?: string[]; pins?: boolean } = {}): CodemodPlan => {
  const table = readEngine(studio);
  const plan: CodemodPlan = { changes: [], unnamed: [], texts: new Map(), pins: [], scanned: 0 };
  if (!table) return plan;
  const app = path.resolve(studio);
  for (const folder of codeFolders(studio, opts.slugs)) {
    for (const root of folder.roots) {
      const framework = trackedIn(studio, root);
      for (const file of walkCode(root)) {
        if (framework.has(file)) continue;
        plan.scanned++;
        const text = fs.readFileSync(file, 'utf8');
        let changed = false;
        const next = text.replace(SPEC, (whole, lead: string, quote: string, spec: string, at: number) => {
          if (!spec.startsWith('./') && !spec.startsWith('../')) return whole;
          const target = path.resolve(path.dirname(file), spec);
          if (!inside(folder.base, target)) return whole;
          const rel = posix(path.relative(folder.base, target));
          if (ownFolder(rel)) return whole;
          // the file is there (yours, or the studio's own when your code is in apps/studio)
          if (folder.base !== app && probe(target)) return whole;
          if (!probe(path.join(app, ...rel.split('/')))) return whole;
          const line = text.slice(0, at).split('\n').length;
          const name = engineSpecifier(rel, table);
          if (!name) {
            plan.unnamed.push({ file, line, spec, target: rel });
            return whole;
          }
          plan.changes.push({ file, line, from: spec, to: name });
          changed = true;
          return `${lead}${quote}${name}${quote}`;
        });
        if (changed) plan.texts.set(file, next);
      }
    }
  }
  if (opts.pins !== false) {
    const pin = currentPin(studio, table);
    if (pin)
      for (const dir of projectDirs(workspaceDir('projects', studio), opts.slugs))
        if (!projectPin(dir) && !trackedIn(studio, dir).size) plan.pins.push({ dir, pin });
  }
  return plan;
};

/** Writes what planCodemod found. */
export const applyCodemod = (plan: CodemodPlan, studio: string) => {
  for (const [file, text] of plan.texts) fs.writeFileSync(file, text);
  for (const p of plan.pins) pinProject(p.dir, studio);
};

/** Whether a workspace other than the studio is set (relative imports then rely on the overlay). */
export const outsideWorkspace = (studio: string) => {
  const root = workspaceSetting()?.root;
  return Boolean(root && path.resolve(root) !== path.resolve(studio));
};
