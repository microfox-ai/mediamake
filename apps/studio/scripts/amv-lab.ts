/**
 * amv-lab: renders AMV engine devices (aura, liquid morph, liquid paint, portal) on a project's footage
 * with the `amv-lab` composition, bundling once for many tests.
 *
 *   mm amv-lab <jobs.json> [--out=<dir>] [--video]
 *
 * jobs.json: [{ "name": "aura-a", "props": { slug, device, a, b?, matte?, params?, frames?, label? },
 *               "frames": [0, 10, 20] }]
 * Writes <out>/<name>-f<N>.jpg per frame and <out>/<name>.jpg (the frames side by side); with --video
 * also <out>/<name>.mp4 (every frame, for motion). <out> defaults to out/<slug>/lab.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { enableTailwind } from '@remotion/tailwind-v4';
import { removeBundle, tempBundle } from './bundle.ts';
import { DIRS, shown } from './paths.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

type Job = { name: string; props: Record<string, unknown> & { slug: string }; frames?: number[] };

const main = async () => {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--'));
  if (!file) throw new Error('usage: mm amv-lab <jobs.json> [--out=<dir>] [--video]');
  const jobs: Job[] = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const video = args.includes('--video');
  const slug = jobs[0].props.slug;
  const outDir = path.resolve(args.find(a => a.startsWith('--out='))?.slice(6) ?? path.join(DIRS.out, slug, 'lab'));
  fs.mkdirSync(outDir, { recursive: true });

  process.env.ONLY_PROJECT ??= slug;
  const serveUrl = await tempBundle({
    entryPoint: path.join(ROOT, 'src/index.ts'),
    publicDir: DIRS.projects,
    webpackOverride: enableTailwind,
  });
  const chromiumOptions = { gl: 'angle' as const };
  for (const job of jobs) {
    const inputProps = job.props;
    const composition = await selectComposition({ serveUrl, id: 'amv-lab', inputProps, chromiumOptions });
    const frames = job.frames ?? [0, Math.floor(composition.durationInFrames / 2), composition.durationInFrames - 1];
    const outs: string[] = [];
    for (const f of frames) {
      const output = path.join(outDir, `${job.name}-f${String(f).padStart(3, '0')}.jpg`);
      await renderStill({ serveUrl, composition, frame: f, output, inputProps, imageFormat: 'jpeg', chromiumOptions, timeoutInMilliseconds: 120000 });
      outs.push(output);
    }
    // the frames side by side, 3 to a row
    const cols = Math.min(3, outs.length);
    const sheet = path.join(outDir, `${job.name}.jpg`);
    if (outs.length === 1) fs.copyFileSync(outs[0], sheet);
    else execFileSync('ffmpeg', [
      '-v', 'error', '-y',
      ...outs.flatMap(o => ['-i', o]),
      '-filter_complex',
      `${outs.map((_, i) => `[${i}:v]scale=960:-2[v${i}]`).join(';')};${outs.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${outs.length}:layout=${outs
        .map((_, i) => `${(i % cols) * 960}_${Math.floor(i / cols) * 540}`)
        .join('|')}:fill=black`,
      '-frames:v', '1', '-q:v', '3', sheet,
    ].filter(Boolean) as string[]);
    console.log(`✔ ${shown(sheet)}`);
    if (video) {
      const mp4 = path.join(outDir, `${job.name}.mp4`);
      await renderMedia({ serveUrl, composition, codec: 'h264', outputLocation: mp4, inputProps, chromiumOptions, muted: true, concurrency: 4, timeoutInMilliseconds: 120000 });
      console.log(`✔ ${shown(mp4)}`);
    }
  }
  removeBundle(serveUrl);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
