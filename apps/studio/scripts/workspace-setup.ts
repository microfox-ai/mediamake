/**
 * What a workspace outside the checkout needs next to your folders, so that your projects behave there
 * as they did in apps/studio. `mm migrate` makes it; `mm type-check` keeps it current (after the
 * checkout moves, say).
 *
 * - node_modules: a link to the checkout's node_modules. Anything that looks for packages next to a
 *   file finds the studio's: TypeScript, editors, a script run in the workspace. (The Remotion bundles
 *   don't need it: workspace-webpack.ts gives webpack the same fallback.)
 * - tsconfig.json: the studio's settings (with the engine's names, @mediamake/engine), plus rootDirs, so
 *   that code still importing the engine by path (`../../../src/kit`) means the
 *   studio's src/kit, as it does in the bundles. It is rewritten while it keeps the MARK line; delete
 *   that line and your own edits are kept.
 *
 * A link, not a copy, and only of node_modules: your media stays clones (media use), never links.
 */
import fs from 'node:fs';
import path from 'node:path';

export const MARK = 'Written by mm (apps/studio/scripts/workspace-setup.ts)';

const lstat = (p: string) => {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
};

/** The workspace's tsconfig.json for this studio. */
export const workspaceTsconfig = (studio: string) =>
  JSON.stringify(
    {
      $comment: `${MARK} for the studio in ${studio}. Your projects type-check with its settings and its engine (@mediamake/engine), and imports of it by path (../../../src/kit) mean its src/kit (rootDirs). mm type-check runs it. Delete this line to keep your own edits.`,
      extends: path.join(studio, 'tsconfig.json'),
      compilerOptions: { rootDirs: ['.', studio] },
      include: ['projects', 'brands/*/graphics', 'thumbnails/jobs', 'extensions'],
      exclude: ['node_modules', 'out'],
    },
    null,
    2,
  ) + '\n';

/**
 * What the workspace at `root` still needs, done when `apply` is true. Each line says what (was) done;
 * none when it is all there.
 */
export const setupWorkspace = (root: string, studio: string, apply: boolean): string[] => {
  const done: string[] = [];
  const repoModules = path.join(path.resolve(studio, '..', '..'), 'node_modules');
  const modules = path.join(root, 'node_modules');
  const tsconfig = path.join(root, 'tsconfig.json');

  const link = lstat(modules);
  if (!link || (link.isSymbolicLink() && path.resolve(root, fs.readlinkSync(modules)) !== repoModules)) {
    done.push(`node_modules → ${repoModules} (packages for TypeScript and editors)`);
    if (apply) {
      fs.mkdirSync(root, { recursive: true });
      if (link) fs.unlinkSync(modules);
      fs.symlinkSync(repoModules, modules, process.platform === 'win32' ? 'junction' : 'dir');
    }
  }

  const want = workspaceTsconfig(studio);
  const have = lstat(tsconfig) ? fs.readFileSync(tsconfig, 'utf8') : null;
  if (have === null || (have !== want && have.includes(MARK))) {
    done.push(`tsconfig.json (your projects type-check against ${studio})`);
    if (apply) {
      fs.mkdirSync(root, { recursive: true });
      fs.writeFileSync(tsconfig, want);
    }
  }
  return done;
};
