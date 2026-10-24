import { transform } from 'sucrase';
import { hostModuleNames, isHostModule, loadHostModules } from './host-modules';
import type { ProjectSource } from './source';
import type { KitApi, ProjectDefinition } from './types';

/*
 * Compiles a lyric project in the browser. Each file goes through sucrase (TypeScript, JSX,
 * imports → CommonJS) on its own and runs with a small `require`: relative imports load other
 * project files, package imports come from the app (host-modules.ts). The whole of
 * inexorablemaster2 (~60 files) takes well under a second.
 */

export type CompiledProject = {
  slug: string;
  project: ProjectDefinition;
  kit: KitApi;
  /** every file in the module graph → the modified time it was compiled from */
  files: Record<string, number>;
};

export class CompileError extends Error {
  constructor(
    message: string,
    readonly file?: string,
  ) {
    super(message);
    this.name = 'CompileError';
  }
}

const REQUIRE = /\brequire\(\s*(['"])([^'"]+)\1\s*\)/g;
const SUFFIXES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '/index.ts', '/index.tsx', '/index.js'];
const KIT_FILES = ['src/kit/index.ts', 'src/kit/ProjectVideo.tsx'];

const dirname = (p: string) => p.slice(0, Math.max(0, p.lastIndexOf('/')));

const joinPath = (base: string, spec: string) => {
  const parts = base ? base.split('/') : [];
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
};

const toCommonJs = (file: string, text: string) => {
  try {
    return transform(text, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
      disableESTransforms: true,
      filePath: file,
    }).code;
  } catch (e) {
    throw new CompileError(`${file}: ${(e as Error).message}`, file);
  }
};

export async function compileProject(
  source: ProjectSource,
  slug: string,
): Promise<CompiledProject> {
  const mtimes = new Map((await source.listFiles(slug)).map(f => [f.path, f.mtime]));
  const entry = `projects/${slug}/video/index.tsx`;
  for (const f of [entry, ...KIT_FILES]) {
    if (!mtimes.has(f)) throw new CompileError(`Missing ${f}`, f);
  }

  // walk the import graph a level at a time, one request per level
  const code = new Map<string, string>();
  const resolved = new Map<string, string>();
  const packages = new Set<string>();
  let pending = [entry, ...KIT_FILES];
  while (pending.length) {
    const texts = await source.readTexts(pending);
    const next = new Set<string>();
    for (const file of pending) {
      const text = texts[file];
      if (text == null) throw new CompileError(`Could not read ${file}`, file);
      if (file.endsWith('.json')) {
        code.set(file, text);
        continue;
      }
      const out = toCommonJs(file, text);
      code.set(file, out);
      for (const [, , spec] of out.matchAll(REQUIRE)) {
        if (!spec.startsWith('.')) {
          packages.add(spec);
          continue;
        }
        const base = joinPath(dirname(file), spec);
        const target = SUFFIXES.map(s => base + s).find(p => mtimes.has(p));
        if (!target) throw new CompileError(`${file}: cannot find '${spec}'`, file);
        resolved.set(`${file}\0${spec}`, target);
        if (!code.has(target) && !pending.includes(target)) next.add(target);
      }
    }
    pending = [...next];
  }

  const missing = [...packages].filter(p => !isHostModule(p));
  if (missing.length) {
    throw new CompileError(
      `The editor can't provide ${missing.join(', ')}. It has: ${hostModuleNames().join(', ')}.`,
    );
  }
  const host = await loadHostModules(packages, p => source.assetUrl(p));

  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const load = (file: string): Record<string, unknown> => {
    const hit = cache.get(file);
    if (hit) return hit.exports;
    const mod = { exports: {} as Record<string, unknown> };
    cache.set(file, mod);
    const text = code.get(file)!;
    if (file.endsWith('.json')) {
      mod.exports = JSON.parse(text);
      return mod.exports;
    }
    const require = (spec: string) =>
      spec.startsWith('.') ? load(resolved.get(`${file}\0${spec}`)!) : host.get(spec);
    try {
      // the sourceURL names the file in stack traces and the devtools Sources panel
      new Function('require', 'module', 'exports', `${text}\n//# sourceURL=lyrics:///${file}`)(
        require,
        mod,
        mod.exports,
      );
    } catch (e) {
      cache.delete(file);
      if (e instanceof CompileError) throw e;
      throw new CompileError(`${file}: ${(e as Error).message}`, file);
    }
    return mod.exports;
  };

  const project = load(entry).default as ProjectDefinition | undefined;
  if (!project?.layers) {
    throw new CompileError(`${entry} must default-export defineProject({ ... })`, entry);
  }
  const kit = Object.assign({}, ...KIT_FILES.map(load)) as KitApi;
  if (typeof kit.makeProjectVideo !== 'function' || typeof kit.layerKeys !== 'function') {
    throw new CompileError(
      'This lyrics_videos kit has no edit support yet (src/kit/edits.tsx). Update apps/lyrics_videos.',
    );
  }
  return {
    slug,
    project,
    kit,
    files: Object.fromEntries([...code.keys()].map(f => [f, mtimes.get(f) ?? 0])),
  };
}

/** Files of the compiled graph whose modified time on disk (`now`) differs from when it compiled. */
export const changedFiles = (compiled: CompiledProject, now: Map<string, number>): string[] =>
  Object.entries(compiled.files)
    .filter(([file, mtime]) => now.get(file) !== mtime)
    .map(([file]) => file);
