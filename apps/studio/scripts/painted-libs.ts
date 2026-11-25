/**
 * The two libraries the painted-cartoon kit runs on (src/painted), as the files its page inlines: p5's
 * browser build and p5.brush's. Neither package's `exports` names them, so the bundles reach them by
 * these names (engineWebpack) and mm painted (scripts/painted.ts) by these paths.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export const PAINTED_LIBS = { p5: '@mediamake/painted-lib/p5.min.js', brush: '@mediamake/painted-lib/p5.brush.js' } as const;

/** Where the studio's p5 and p5.brush keep those files, or null when it has none (a studio from before them). */
export const paintedLibs = (studio: string): { p5: string; brush: string } | null => {
  try {
    const req = createRequire(path.join(studio, 'package.json'));
    // p5's main export is dist/app.js; its browser build is lib/p5.min.js beside dist/
    const p5 = path.join(path.dirname(req.resolve('p5')), '..', 'lib', 'p5.min.js');
    // p5.brush's "require" export is its browser build (UMD)
    const brush = req.resolve('p5.brush');
    return fs.existsSync(p5) && fs.existsSync(brush) ? { p5, brush } : null;
  } catch {
    return null;
  }
};

/** The bundles' names for them (`import src from '@mediamake/painted-lib/p5.min.js?raw'`). */
export const paintedLibAliases = (studio: string): Record<string, string> => {
  const libs = paintedLibs(studio);
  return libs ? { [`${PAINTED_LIBS.p5}$`]: libs.p5, [`${PAINTED_LIBS.brush}$`]: libs.brush } : {};
};
