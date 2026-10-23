/**
 * brand-public: where brands live, and the public folder Remotion serves for them.
 *
 * Each brand keeps its static files (sounds, fonts) in brands/<brand>/graphics/public/. Remotion
 * serves one public folder, so this assembles them into out/brands/.public/<brand>/ (scenes use
 * staticFile('<brand>/sfx/…')). Run directly before Studio; logos.ts and brand.ts call it themselves.
 *
 * Usage: node --experimental-strip-types scripts/brand-public.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BRANDS = path.join(ROOT, 'brands');
/** Everything the brand scripts write: out/brands/<brand>/{renders,stills,stills-alpha,checks}/ */
export const OUT_BRANDS = path.join(ROOT, 'out', 'brands');
export const PUBLIC = path.join(OUT_BRANDS, '.public');

/** Brand folders that have graphics (brands/<brand>/graphics/index.tsx). */
export const brandFolders = () =>
  fs.existsSync(BRANDS) ? fs.readdirSync(BRANDS).filter(b => !b.startsWith('_') && !b.startsWith('.') && fs.existsSync(path.join(BRANDS, b, 'graphics', 'index.tsx'))) : [];

/** Copies every brand's graphics/public/ into out/brands/.public/<brand>/ and returns that folder. */
export const assemblePublic = () => {
  fs.rmSync(PUBLIC, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC, { recursive: true });
  for (const b of brandFolders()) {
    const src = path.join(BRANDS, b, 'graphics', 'public');
    if (fs.existsSync(src)) fs.cpSync(src, path.join(PUBLIC, b), { recursive: true });
  }
  return PUBLIC;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assemblePublic();
  console.log(`✔ ${path.relative(ROOT, PUBLIC)} (${brandFolders().join(', ') || 'no brands'})`);
}
