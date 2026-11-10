/**
 * editor-check: will mediamake's hosted Remotion editor open this project? The editor compiles a project in the
 * browser (apps/mediamake/lib/remotion-editor/compile.ts) and can give it only the packages it hosts
 * (host-modules.ts: react, remotion, zod, @remotion/*, three, @react-three/*, @microfox/remotion and Google
 * fonts); an import of anything else (opentype.js, a node module, a package of the studio's own) stops it with
 * "The editor can't provide …". This walks the same import graph from video/index.tsx (the project's files and
 * the engine files they reach) and lists every package outside that list, with the file that imports it.
 *
 * Usage: mm editor-check <slug> [--json]
 *
 * Run by mm preflight too (a warning line). Hollow Soul (2026-11-09) needed opentype.js for its lyrics and the
 * editor showed nothing until the fonts became data (mm glyphs): precompute in a script, import the data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENGINE, engineFile, probe, readEngine } from './engine.ts';
import { DIRS, REPO, ROOT, shown } from './paths.ts';

const HOST_FILE = path.join(REPO, 'apps', 'mediamake', 'lib', 'remotion-editor', 'host-modules.ts');
/** host-modules.ts as of 2026-11-10, for a checkout without the app */
const FALLBACK_HOST = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'remotion',
  'zod',
  '@remotion/media',
  '@remotion/noise',
  '@remotion/paths',
  '@remotion/shapes',
  '@remotion/three',
  '@remotion/google-fonts',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  '@microfox/remotion',
];
const GOOGLE_FONT = /^@remotion\/google-fonts\/[A-Za-z0-9]+$/;

/** The packages the editor hosts, read from the app's host-modules.ts (its HOST table). */
export const editorHostModules = (file = HOST_FILE): string[] => {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const table = text.slice(text.indexOf('const HOST'), text.indexOf('};', text.indexOf('const HOST')));
    const names = [...table.matchAll(/^\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*:/gm)].map(m => m[1] ?? m[2]);
    return names.length ? names : FALLBACK_HOST;
  } catch {
    return FALLBACK_HOST;
  }
};

export const isHosted = (spec: string, host: string[]) => host.includes(spec) || GOOGLE_FONT.test(spec);

/** Every module a file loads at run time: imports and re-exports that aren't type-only, require() and import(). */
export const runtimeImports = (text: string): string[] => {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const specs: string[] = [];
  for (const m of code.matchAll(/\b(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]/g)) {
    if (m[2]) continue;
    // import { type A, type B } from '…' loads nothing either
    const names = m[3].replace(/^\{|\}$/g, '').split(',').map(s => s.trim()).filter(Boolean);
    if (m[3].trim().startsWith('{') && names.length && names.every(n => n.startsWith('type '))) continue;
    specs.push(m[4]);
  }
  for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of code.matchAll(/\b(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
};

export type EditorCheck = {
  entry: string;
  files: number;
  /** a package the editor can't provide, and the files that import it */
  missing: { spec: string; files: string[] }[];
  /** an import that names no file (the editor stops on these too) */
  unresolved: { spec: string; file: string }[];
};

/** Walks the project's import graph from video/index.tsx the way the editor does. */
export const checkEditorImports = (projectDir: string, studio = ROOT): EditorCheck => {
  const entry = path.join(projectDir, 'video', 'index.tsx');
  const table = readEngine(studio);
  const host = editorHostModules();
  const seen = new Set<string>();
  const missing = new Map<string, Set<string>>();
  const unresolved: EditorCheck['unresolved'] = [];
  const name = (abs: string) => shown(abs);
  const queue = fs.existsSync(entry) ? [entry] : [];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.endsWith('.json')) continue;
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const spec of runtimeImports(text)) {
      let target: string | null = null;
      if (spec.startsWith('.')) target = probe(path.resolve(path.dirname(file), spec)) ?? (fs.existsSync(path.resolve(path.dirname(file), spec)) ? path.resolve(path.dirname(file), spec) : null);
      else if (spec === ENGINE || spec.startsWith(`${ENGINE}/`)) target = engineFile(spec, studio, table);
      else {
        if (!isHosted(spec, host)) {
          const at = missing.get(spec) ?? new Set<string>();
          at.add(name(file));
          missing.set(spec, at);
        }
        continue;
      }
      if (target) queue.push(target);
      else unresolved.push({ spec, file: name(file) });
    }
  }
  return {
    entry: name(entry),
    files: seen.size,
    missing: [...missing].map(([spec, files]) => ({ spec, files: [...files].sort() })).sort((a, b) => a.spec.localeCompare(b.spec)),
    unresolved,
  };
};

/** One line per problem, for mm preflight and this command. */
export const editorCheckLines = (r: EditorCheck): string[] => [
  ...r.missing.map(m => `the editor can't provide '${m.spec}' (imported by ${m.files.join(', ')}): precompute it in a script and import the data`),
  ...r.unresolved.map(u => `'${u.spec}' in ${u.file} names no file`),
];

const main = () => {
  const args = process.argv.slice(2);
  const [slug] = args.filter(a => !a.startsWith('--'));
  if (!slug) {
    console.error('Usage: mm editor-check <slug> [--json]');
    process.exit(1);
  }
  const dir = path.join(DIRS.projects, slug);
  if (!fs.existsSync(path.join(dir, 'video', 'index.tsx'))) {
    console.error(`No ${shown(path.join(dir, 'video', 'index.tsx'))}.`);
    process.exit(1);
  }
  const r = checkEditorImports(dir);
  if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    const lines = editorCheckLines(r);
    if (!lines.length) console.log(`Editor check · ${slug}: ${r.files} files, every package is one the editor hosts.`);
    else {
      console.log(`Editor check · ${slug}: ${r.files} files`);
      for (const l of lines) console.log(`  ✗ ${l}`);
      console.log(`  The editor hosts: ${editorHostModules().join(', ')}, @remotion/google-fonts/<Font>.`);
    }
  }
  if (r.missing.length || r.unresolved.length) process.exitCode = 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
