/**
 * render-tuning: how mm render runs the Remotion CLI on this machine (refactor step B1, P8).
 *
 * - **Concurrency from a benchmark.** Remotion opens half the cores' worth of tabs by default (6 of
 *   12 on the M3 Pro). `mm benchmark [<slug>]` renders the same stretch at a few concurrencies, keeps
 *   the fastest in ~/.mediamake/render-tuning.json (for that project with a slug, else for all), and
 *   every render without --concurrency uses it.
 * - **Previews encode fast.** A preview, a clip, a look or a half-size render is encoded with x264
 *   `veryfast` (the master keeps Remotion's `medium`): about the same picture, encoded in less time.
 * - **macOS memory.** The CLI is started with mac-memory.cjs preloaded, so parallel encoding and
 *   OffthreadVideo's decoding threads are sized from the memory macOS can hand out, not os.freemem().
 *
 * Usage: mm benchmark [<slug>] [--frames=a-b] [--scale=0.5] [--concurrencies=2,4,6,8] [--runs=1]
 *   default: projects/sample-pulse, 10 s from its first chorus, at half size. Prints the table and
 *   saves the fewest tabs within 3 % of the fastest. A project heavy on footage (AMV, remix) may want its own: mm benchmark <slug>.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJsonAtomic } from './locks.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
export const TUNING_FILE = process.env.MM_RENDER_TUNING ?? path.join(os.homedir(), '.mediamake', 'render-tuning.json');

type Measured = { concurrency: number; seconds: number[] };
export type Tuning = {
  schema: 'mediamake.render-tuning/v1';
  /** for every project without its own */
  concurrency?: number;
  projects?: Record<string, number>;
  cpus: number;
  memoryGb: number;
  benchmarks: { at: string; project: string; frames: [number, number]; scale: number; measured: Measured[]; best: number }[];
};

export const readTuning = (): Tuning | null => readJson<Tuning>(TUNING_FILE);

/** The benchmarked concurrency for this project (or for every project), if any. */
export const tunedConcurrency = (slug?: string): number | undefined => {
  const t = readTuning();
  if (!t) return undefined;
  // a benchmark from another machine (a synced home folder) doesn't count
  if (t.cpus !== os.cpus().length) return undefined;
  return (slug && t.projects?.[slug]) || t.concurrency;
};

const REQUIRE = createRequire(import.meta.url);
/** The Remotion CLI's own script, run with node (npx costs a few hundred ms to find it every time). */
export const REMOTION_CLI = path.join(path.dirname(REQUIRE.resolve('@remotion/cli/package.json')), 'remotion-cli.js');

const has = (flags: string[], name: string) => flags.some(f => f === `--${name}` || f.startsWith(`--${name}=`));

/**
 * The flags mm adds to a render, unless already given: the benchmarked concurrency, `veryfast` x264
 * for anything that isn't the master, and the browser from MM_BROWSER (a VPS or a sandbox).
 */
export function tunedFlags(flags: string[], opts: { slug?: string; preview: boolean }): { flags: string[]; notes: string[] } {
  const out = [...flags];
  const notes: string[] = [];
  const concurrency = has(out, 'concurrency') ? undefined : tunedConcurrency(opts.slug);
  if (concurrency) {
    out.push(`--concurrency=${concurrency}`);
    notes.push(`concurrency ${concurrency} (mm benchmark)`);
  }
  if (opts.preview && !has(out, 'x264-preset') && !has(out, 'codec')) {
    out.push('--x264-preset=veryfast');
    notes.push('x264 veryfast');
  }
  if (process.env.MM_BROWSER && !has(out, 'browser-executable')) out.push(`--browser-executable=${process.env.MM_BROWSER}`);
  return { flags: out, notes };
}

/** Runs `remotion render <bundle> <composition> <output> …flags` in the app folder (remotion.config.ts applies). */
export function remotionRender(serveUrl: string, composition: string, output: string, flags: string[], env: Record<string, string> = {}) {
  // quoted: NODE_OPTIONS splits on spaces, and the checkout may sit in a folder with one
  const preload = `--require="${path.join(HERE, 'mac-memory.cjs')}"`;
  const nodeOptions = [process.env.NODE_OPTIONS, process.platform === 'darwin' ? preload : ''].filter(Boolean).join(' ');
  const started = Date.now();
  const r = spawnSync(process.execPath, [REMOTION_CLI, 'render', serveUrl, composition, output, ...flags], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env, NODE_OPTIONS: nodeOptions },
  });
  return { ok: r.status === 0, ms: Date.now() - started, status: r.status };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const [slugArg] = args.filter(a => !a.startsWith('--'));
  const slug = slugArg ?? 'sample-pulse';
  const scale = Number(opt('scale') ?? 0.5);
  const runs = Math.max(1, Number(opt('runs') ?? 1));
  const cpus = os.cpus().length;
  const candidates = (opt('concurrencies')?.split(',').map(Number) ?? [cpus / 4, cpus / 2, (cpus * 3) / 4, cpus].map(Math.round))
    .filter((n, i, all) => n >= 1 && all.indexOf(n) === i);
  const { projectBundle } = await import('./project-bundle.ts');
  const { previewPlan } = await import('./preview.ts');
  const { renderSlot, queueDisabled } = await import('./render-queue.ts');
  const bundle = await projectBundle(slug);
  const frames = opt('frames')
    ? (opt('frames')!.split('-').map(Number) as [number, number])
    : (await previewPlan(slug, bundle.serveUrl, [], { seconds: 10, fallbackOnly: true })).stretches[0].frames;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-benchmark-'));
  const release = await renderSlot(`benchmark ${slug}`, { disabled: queueDisabled(args) });
  const measured: Measured[] = candidates.map(concurrency => ({ concurrency, seconds: [] }));
  try {
    console.log(`Benchmark: ${slug}, frames ${frames[0]}-${frames[1]} at ${Math.round(scale * 100)} %, concurrency ${candidates.join(', ')} (${cpus} cores)\n`);
    for (let run = 0; run < runs; run++) {
      for (const m of measured) {
        const r = remotionRender(bundle.serveUrl, slug, path.join(dir, `c${m.concurrency}.mp4`), [
          `--frames=${frames[0]}-${frames[1]}`, `--scale=${scale}`, `--concurrency=${m.concurrency}`, '--x264-preset=veryfast', '--log=error',
          ...(process.env.MM_BROWSER ? [`--browser-executable=${process.env.MM_BROWSER}`] : []),
        ]);
        if (!r.ok) throw new Error(`the render at concurrency ${m.concurrency} failed`);
        m.seconds.push(r.ms / 1000);
        console.log(`  concurrency ${String(m.concurrency).padStart(2)}: ${(r.ms / 1000).toFixed(1)} s`);
      }
    }
  } finally {
    release();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const mean = (m: Measured) => m.seconds.reduce((a, b) => a + b, 0) / m.seconds.length;
  // the fewest tabs within 3 % of the fastest: the same speed with less memory and a machine that stays usable
  const fastest = Math.min(...measured.map(mean));
  const best = measured.filter(m => mean(m) <= fastest * 1.03).sort((a, b) => a.concurrency - b.concurrency)[0];
  const prior = readTuning();
  const tuning: Tuning = {
    schema: 'mediamake.render-tuning/v1',
    ...(prior?.cpus === cpus ? prior : {}),
    cpus,
    memoryGb: Math.round(os.totalmem() / 2 ** 30),
    benchmarks: [...(prior?.cpus === cpus ? prior.benchmarks : []), { at: new Date().toISOString(), project: slug, frames, scale, measured, best: best.concurrency }].slice(-20),
  };
  if (slugArg) tuning.projects = { ...tuning.projects, [slug]: best.concurrency };
  else tuning.concurrency = best.concurrency;
  writeJsonAtomic(TUNING_FILE, tuning);
  console.log(`\nFastest: concurrency ${best.concurrency} (${mean(best).toFixed(1)} s). Saved in ${TUNING_FILE} for ${slugArg ? slug : 'every project'}.`);
}
