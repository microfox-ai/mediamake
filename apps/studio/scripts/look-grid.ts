/**
 * look-grid: two to four look previews of the same stretch in one labelled grid video, so the user
 * compares them side by side in the Revisions screen and names a pick by the label on screen
 * (revise-video › Previews or the whole video). Label the tiles with the look IDs the user will say.
 *
 * Usage: mm look-grid <clip> <clip> [<clip> <clip>] [--labels=L1,L2,L3,L4] [--out=<file.mp4>]
 *   two clips side by side, three or four in a 2×2 grid (an empty tile for three). Tiles keep the clips' own
 *   size unless the grid would pass 1920×1080 (1080×1920 for vertical clips). The sound is the first clip's,
 *   the length the shortest clip's. Labels default to short file names (A.mp4 → A), else A–D.
 *   Output: grid-<labels>.mp4 beside the first clip, with a copy of the first clip's shot map so the grid's
 *   timeline in the Revisions screen shows the same shots. Paths are relative to apps/studio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpegLog, probeMedia } from './ff.ts';
import { baseName, reviewLink } from './revision-files.ts';
import { DIRS, shown } from './paths.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** a bold sans the label can use; drawtext without a font file needs ffmpeg built with fontconfig */
const FONTS = [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/System/Library/Fonts/Helvetica.ttc',
  '/Library/Fonts/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
];

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export function lookGrid(clips: string[], opts: { labels?: string[]; out?: string } = {}): string {
  if (clips.length < 2 || clips.length > 4) throw new Error(`look-grid takes 2 to 4 clips, got ${clips.length}`);
  for (const c of clips) if (!fs.existsSync(c)) throw new Error(`No clip at ${c}`);
  const infos = clips.map(c => probeMedia(c));
  const first = infos[0].video;
  if (!first || infos.some(i => !i.video)) throw new Error('every clip needs a picture');
  const names = clips.map(c => baseName(c));
  const labels = (opts.labels ?? (names.every(n => n.length <= 12) ? names : ['A', 'B', 'C', 'D']))
    .slice(0, clips.length)
    // drawtext's own escaping is fragile: keep labels to plain characters
    .map(l => l.replace(/[^\w .+-]/g, '').trim() || '?');
  const out = opts.out ?? path.join(path.dirname(clips[0]), `grid-${labels.join('-').replace(/\s+/g, '_')}.mp4`);

  const { width: W, height: H, fps } = first;
  const cols = 2;
  const rows = clips.length === 2 ? 1 : 2;
  const [maxW, maxH] = W >= H ? [1920, 1080] : [1080, 1920];
  const scale = Math.min(1, maxW / (cols * W), maxH / (rows * H));
  const tw = even(W * scale);
  const th = even(H * scale);
  const duration = Math.min(...infos.map(i => i.video!.duration || i.duration));
  const fontSize = Math.max(14, Math.round(th / 9));
  const font = FONTS.find(f => fs.existsSync(f));

  const build = (withLabels: boolean, withFont: boolean) => {
    const tiles = clips.map((_, i) => {
      const label = withLabels
        ? `,drawtext=${withFont && font ? `fontfile='${font}':` : ''}text='${labels[i]}':x=${Math.round(fontSize * 0.6)}:y=${Math.round(fontSize * 0.5)}` +
          `:fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=${Math.round(fontSize / 4)}`
        : '';
      return `[${i}:v]scale=${tw}:${th}:force_original_aspect_ratio=decrease,pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS${label}[t${i}]`;
    });
    if (clips.length === 3) tiles.push(`color=c=black:s=${tw}x${th}:r=${fps}:d=${duration.toFixed(3)}[t3]`);
    const n = clips.length === 2 ? 2 : 4;
    const layout = n === 2 ? '0_0|w0_0' : '0_0|w0_0|0_h0|w0_h0';
    const inputs = Array.from({ length: n }, (_, i) => `[t${i}]`).join('');
    return [
      ...clips.flatMap(c => ['-i', c]),
      '-filter_complex', `${tiles.join(';')};${inputs}xstack=inputs=${n}:layout=${layout}[v]`,
      '-map', '[v]', '-map', '0:a?',
      '-t', duration.toFixed(3),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      '-y', out,
    ];
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  // labels with a font file, then with ffmpeg's default font, then none
  const attempts = [...(font ? [{ labels: true, font: true }] : []), { labels: true, font: false }, { labels: false, font: false }];
  for (const [i, a] of attempts.entries()) {
    try {
      ffmpegLog(['-v', 'error', ...build(a.labels, a.font)]);
      if (!a.labels) console.warn(`look-grid: this ffmpeg cannot draw text, so the tiles are unlabelled: ${labels.join(', ')}, left to right, top to bottom.`);
      break;
    } catch (err) {
      if (i === attempts.length - 1) throw err;
    }
  }

  // the tiles all show the same stretch, so the first clip's shots fit the grid's timeline
  const firstMap = path.join(path.dirname(clips[0]), `${baseName(clips[0])}.map.json`);
  if (fs.existsSync(firstMap)) {
    try {
      const map = JSON.parse(fs.readFileSync(firstMap, 'utf8'));
      if (map && !Array.isArray(map)) map.video = path.basename(out);
      fs.writeFileSync(path.join(path.dirname(out), `${baseName(out)}.map.json`), `${JSON.stringify(map, null, 2)}\n`);
    } catch {
      // no map for the grid: its timeline shows no shots
    }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const clips = args.filter(a => !a.startsWith('--')).map(c => path.resolve(ROOT, c));
  if (clips.length < 2 || clips.length > 4) {
    console.error('Usage: mm look-grid <clip> <clip> [<clip> <clip>] [--labels=A,B,C,D] [--out=file.mp4]');
    process.exit(1);
  }
  const out = lookGrid(clips, {
    labels: opt('labels')?.split(',').map(s => s.trim()),
    out: opt('out') ? path.resolve(ROOT, opt('out')!) : undefined,
  });
  console.log(`✔ ${shown(out)}`);
  if (!path.relative(DIRS.out, out).startsWith('..')) console.log(`Review link: ${reviewLink(out)}`);
}
