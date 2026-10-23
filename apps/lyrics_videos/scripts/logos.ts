/**
 * logos: stills and renders of brand graphics (brands/<brand>/graphics/, run through the shared
 * engine in logoGraphics/). Bundles once per run. Composition ids are `<logo>-<scene>` (e.g.
 * subhodayam-intro-6-tamara); `which` matches ids exactly or by substring, comma-separated, or `all`.
 *
 * Usage: npm run logos -w lyrics_videos -- stills <which> 0.5,1.2,3 [--scale=0.5] [--alpha] [--guides]
 *        npm run logos -w lyrics_videos -- render <which> [--crf=16]
 *   <which> must stay within one brand (use the logo prefix, e.g. subhodayam-intro) unless --all-brands
 *
 * Everything lands in one folder per brand, never loose in out/:
 *   out/brands/<brand>/stills/<scene>/<t>s.jpg         on the brand's preview colour (black by default)
 *   out/brands/<brand>/stills-alpha/<scene>/<t>s.png   transparent, with --alpha
 *   out/brands/<brand>/renders/<scene>.mp4             scenes, with their sound
 *   out/brands/<brand>/renders/<scene>.mov|.webm|.preview.mp4   transparent scenes (ProRes 4444 / VP9 alpha / on the preview colour)
 *   out/brands/<brand>/checks/                         contact sheets and analysis plots (tools/ write here too)
 */
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, renderStill } from '@remotion/renderer';
import { OUT_BRANDS, ROOT, assemblePublic } from './brand-public.ts';

const main = async () => {
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith('--'));
  const [cmd, which, times] = args.filter(a => !a.startsWith('--'));
  const flag = (k: string) => flags.find(f => f.startsWith(`--${k}=`))?.split('=')[1];
  if (!cmd || !which || !['stills', 'render'].includes(cmd)) {
    console.error('Usage: npm run logos -w lyrics_videos -- stills|render <id|all> [seconds,...]');
    process.exit(1);
  }
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'logoGraphics/index.ts'), publicDir: assemblePublic() });
  // ANGLE gives headless Chrome a GPU path (some scenes use WebGL)
  const chromiumOptions = { gl: 'angle' as const };
  const all = await getCompositions(serveUrl, { chromiumOptions });
  const comps = which === 'all' ? all : all.filter(c => which.split(',').some(w => c.id === w || c.id.includes(w)));
  if (!comps.length) throw new Error(`No composition matches "${which}". Have: ${all.map(c => c.id).join(', ')}`);
  const brandOf = (c: (typeof all)[number]) => String(c.defaultProps.brand ?? 'unknown');
  // ids match by substring, so "intro-" would catch other brands' scenes (maybe another session's
  // work): only render across brands when asked to with --all-brands
  const brands = new Set(comps.map(brandOf));
  if (which !== 'all' && brands.size > 1 && !flags.includes('--all-brands')) {
    throw new Error(`"${which}" matches more than one brand (${[...brands].join(', ')}): ${comps.map(c => c.id).join(', ')}.\nUse the logo prefix (e.g. subhodayam-intro), or pass --all-brands on purpose.`);
  }

  for (const composition of comps) {
    const transparent = Boolean(composition.defaultProps.transparent);
    const backdrop = (composition.defaultProps.preview as string | undefined) ?? '#000';
    const dir = path.join(OUT_BRANDS, brandOf(composition));
    const scene = String(composition.defaultProps.scene ?? composition.id);
    const show = (p: string) => console.log(`✔ ${path.relative(ROOT, p)}`);
    if (cmd === 'stills') {
      const alpha = flags.includes('--alpha');
      const outDir = path.join(dir, alpha ? 'stills-alpha' : 'stills', scene);
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(outDir, { recursive: true });
      const props = { ...composition.defaultProps, background: alpha ? undefined : backdrop, guides: flags.includes('--guides') };
      for (const t of (times ?? '').split(',').filter(Boolean).map(Number)) {
        const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
        const output = path.join(outDir, `${t.toFixed(2)}s.${alpha ? 'png' : 'jpg'}`);
        await renderStill({
          serveUrl,
          composition: { ...composition, props },
          frame,
          output,
          imageFormat: alpha ? 'png' : 'jpeg',
          jpegQuality: alpha ? undefined : 88,
          scale: Number(flag('scale') ?? 0.5),
          chromiumOptions,
        });
        show(output);
      }
      continue;
    }
    const renders = path.join(dir, 'renders');
    fs.mkdirSync(renders, { recursive: true });
    const crf = Number(flag('crf') ?? 16);
    if (transparent) {
      const mov = path.join(renders, `${scene}.mov`);
      await renderMedia({ serveUrl, composition, codec: 'prores', proResProfile: '4444', pixelFormat: 'yuva444p10le', imageFormat: 'png', outputLocation: mov, chromiumOptions, muted: true });
      show(mov);
      // small alpha copy for the web and for <OffthreadVideo transparent> in other compositions
      const webm = path.join(renders, `${scene}.webm`);
      await renderMedia({ serveUrl, composition, codec: 'vp9', crf: 18, pixelFormat: 'yuva420p', imageFormat: 'png', outputLocation: webm, chromiumOptions, muted: true });
      show(webm);
    }
    const mp4 = path.join(renders, `${scene}${transparent ? '.preview' : ''}.mp4`);
    await renderMedia({
      serveUrl,
      composition: { ...composition, props: { ...composition.defaultProps, background: backdrop } },
      codec: 'h264',
      crf,
      imageFormat: 'jpeg',
      jpegQuality: 95,
      outputLocation: mp4,
      chromiumOptions,
      // scenes may carry sound (intro sound effects); the transparent logo renders are silent
      muted: transparent,
    });
    show(mp4);
  }
  fs.rmSync(serveUrl, { recursive: true, force: true });
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
