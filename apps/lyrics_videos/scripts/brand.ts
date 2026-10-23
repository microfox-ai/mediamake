/**
 * brand: build a brand's kit into brands/<brand>/ (gitignored, next to its source in graphics/),
 * from brands/<brand>/graphics/brand/brand.json. Renders every listed scene (videos, transparent
 * videos, stills), writes the vector SVG, copies the docs and downloads the fonts. Bundles once.
 *
 * Usage: npm run brand -w lyrics_videos -- <brand> [--only=intros,youtube] [--resume]
 *   --only    filter by output path    --resume  skip renders whose output already exists
 *
 * brand.json:
 *   folder, name           brands/<folder>/
 *   logoStill              seconds at which the logo is drawn and at rest ("at": "logo")
 *   svg { module, to }     a module in brand/ whose default export returns the logo as SVG markup
 *   docs [path]            files in brand/ copied as-is (same relative path)
 *   fonts [{ family, css }] Google Fonts css2 family spec; every file is saved to fonts/
 *   assets [{ scene, kind, to, at?, alpha?, guides? }]
 *     kind 'video'              → <to> (H.264, with the scene's sound if it has any)
 *     kind 'transparent-video'  → <to>.mov (ProRes 4444 + alpha), <to>.webm (VP9 + alpha), <to>-preview.mp4
 *     kind 'still'              → <to> (.png or .jpg; alpha: transparent; guides: layout guides on)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, renderStill } from '@remotion/renderer';
import { buildSync } from 'esbuild';
import { BRANDS, OUT_BRANDS, ROOT, assemblePublic } from './brand-public.ts';

type Asset = { scene: string; kind: 'video' | 'transparent-video' | 'still'; to: string; at?: number | 'logo'; alpha?: boolean; guides?: boolean };
type BrandConfig = {
  folder: string;
  name: string;
  logoStill: number;
  svg?: { module: string; to: string };
  docs?: string[];
  fonts?: { family: string; css: string }[];
  assets: Asset[];
};

const main = async () => {
  const args = process.argv.slice(2);
  const brand = args.find(a => !a.startsWith('--'));
  const only = args.find(a => a.startsWith('--only='))?.split('=')[1].split(',');
  const resume = args.includes('--resume');
  if (!brand) {
    console.error('Usage: npm run brand -w lyrics_videos -- <brand> [--only=intros,youtube]');
    process.exit(1);
  }
  const src = path.join(BRANDS, brand, 'graphics', 'brand');
  const cfg = JSON.parse(fs.readFileSync(path.join(src, 'brand.json'), 'utf8')) as BrandConfig;
  const OUT = path.join(BRANDS, cfg.folder);
  const want = (to: string) => !only || only.some(o => to.startsWith(o));
  const dest = (to: string) => {
    const p = path.join(OUT, to);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    return p;
  };
  const done = (p: string) => console.log(`✔ ${path.relative(ROOT, p)}`);

  // docs
  for (const doc of cfg.docs ?? []) if (want(doc)) fs.copyFileSync(path.join(src, doc), dest(doc)), done(dest(doc));

  // vector logo
  if (cfg.svg && want(cfg.svg.to)) {
    fs.mkdirSync(path.join(OUT_BRANDS, brand), { recursive: true });
    const tmp = path.join(OUT_BRANDS, brand, '.brand-svg.mjs');
    buildSync({ entryPoints: [path.join(src, cfg.svg.module)], bundle: true, platform: 'node', format: 'esm', outfile: tmp, external: ['remotion'], logLevel: 'error' });
    const mod = (await import(pathToFileURL(tmp).href)) as { default: () => string };
    fs.writeFileSync(dest(cfg.svg.to), mod.default());
    fs.rmSync(tmp);
    done(dest(cfg.svg.to));
  }

  // fonts (Google Fonts serves TTF when asked without a browser user agent)
  for (const f of cfg.fonts ?? []) {
    if (!want('fonts/')) break;
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${f.css}`)).text();
    for (const block of css.split('@font-face').slice(1)) {
      const weight = block.match(/font-weight:\s*(\d+)/)?.[1] ?? '400';
      const url = block.match(/url\((https:[^)]+)\)/)?.[1];
      if (!url) continue;
      const file = dest(`fonts/${f.family.replace(/\s+/g, '')}-${weight}${path.extname(url)}`);
      fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
      done(file);
    }
  }

  // renders
  const assets = cfg.assets.filter(a => want(a.to));
  if (!assets.length) return;
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'logoGraphics/index.ts'), publicDir: assemblePublic() });
  const chromiumOptions = { gl: 'angle' as const };
  // scenes fetch web fonts while they load; give slow networks time
  const timeoutInMilliseconds = 180000;
  const all = await getCompositions(serveUrl, { chromiumOptions, timeoutInMilliseconds });
  for (const a of assets) {
    const composition = all.find(c => c.defaultProps.brand === brand && c.defaultProps.scene === a.scene);
    if (!composition) throw new Error(`No scene ${a.scene} in brands/${brand}/graphics`);
    const backdrop = (composition.defaultProps.preview as string | undefined) ?? '#000';
    const first = a.kind === 'transparent-video' ? `${a.to}.mov` : a.to;
    if (resume && fs.existsSync(path.join(OUT, first))) continue;
    const props = (extra: object) => ({ ...composition, props: { ...composition.defaultProps, ...extra } });
    if (a.kind === 'still') {
      const at = a.at === 'logo' || a.at === undefined ? cfg.logoStill : a.at;
      const png = a.to.endsWith('.png');
      const output = dest(a.to);
      await renderStill({
        serveUrl,
        composition: props({ background: a.alpha ? undefined : backdrop, guides: Boolean(a.guides) }),
        frame: Math.min(composition.durationInFrames - 1, Math.round(at * composition.fps)),
        output,
        imageFormat: png ? 'png' : 'jpeg',
        jpegQuality: png ? undefined : 92,
        chromiumOptions,
        timeoutInMilliseconds,
      });
      done(output);
    } else if (a.kind === 'video') {
      const output = dest(a.to);
      await renderMedia({ serveUrl, composition: props({}), codec: 'h264', crf: 16, imageFormat: 'jpeg', jpegQuality: 95, outputLocation: output, chromiumOptions, timeoutInMilliseconds, audioBitrate: '320k' });
      done(output);
    } else {
      const mov = dest(`${a.to}.mov`);
      await renderMedia({ serveUrl, composition: props({}), codec: 'prores', proResProfile: '4444', pixelFormat: 'yuva444p10le', imageFormat: 'png', outputLocation: mov, chromiumOptions, timeoutInMilliseconds, muted: true });
      done(mov);
      const webm = dest(`${a.to}.webm`);
      await renderMedia({ serveUrl, composition: props({}), codec: 'vp9', crf: 18, pixelFormat: 'yuva420p', imageFormat: 'png', outputLocation: webm, chromiumOptions, timeoutInMilliseconds, muted: true });
      done(webm);
      const mp4 = dest(`${a.to}-preview.mp4`);
      await renderMedia({ serveUrl, composition: props({ background: backdrop }), codec: 'h264', crf: 16, imageFormat: 'jpeg', jpegQuality: 95, outputLocation: mp4, chromiumOptions, timeoutInMilliseconds, muted: true });
      done(mp4);
    }
  }
  fs.rmSync(serveUrl, { recursive: true, force: true });
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
