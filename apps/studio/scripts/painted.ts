/**
 * mm painted: painted cartoons (src/painted, the make-painted-cartoon skill). It starts a project, and it
 * is the kit's own review loop (upstream's render.mjs): headless Chrome draws chosen frames of the
 * project into one image, fast, so every shot is looked at before anything renders. The video itself
 * renders through Remotion like any project: mm render <slug> --preview, then mm render <slug>.
 *
 *   Start one:
 *     mm painted new <slug> [--seconds=15]       projects/<slug>: a silent track of that length (unless input/ has a
 *                                                song), video/index.tsx, video/painted.json, a starter scene,
 *                                                STORYBOARD.md; then mm prepare
 *     mm painted length <slug> <seconds>         a new length: rewrites the silent track and prepares again
 *   Look at it (open the images):
 *     mm painted <slug> --sheet=0.5,1,1.5,2 [--cols=4] [--w=480]          contact sheet of chosen times
 *     mm painted <slug> --strip=2.0:2.5 [--cols=6] [--w=320]              EVERY frame in a stretch (motion)
 *     mm painted <slug> --sheet=2.1,2.2 --crop=760,300,400,400 --w=600   full-resolution crops (details)
 *     mm painted <slug> --strip=2.0:2.5 --crop-at=960,780,500,400        crops of a fixed WORLD point through each
 *         frame's camera (w,h in screen px). x,y may be expressions, worked out once per sheet in the page: they
 *         see the kit's names and what a scene puts on window (a name inside a scene's IIFE isn't there)
 *     mm painted <slug> --stills=1.2,3.4                                   full-size PNGs
 *     mm painted <slug> --gpu                                              the GPU the page draws on
 *   Standalone loops (LOOPS in the page: the model sheets 'emotions' and 'views', or the project's own):
 *     add --loop=<name> to any of the above (times are loop times), or
 *     mm painted <slug> --loop=emotions --png [--range=a:b] [--workers=3]  one cycle as PNGs (for GIFs)
 *   Every image goes to out/<slug>/check/ unless --out says where (a file, or a folder for --stills/--png).
 *   Browser: MM_BROWSER or --chrome=<path>, else Remotion's Chrome Headless Shell, else Chrome. --soft-gl
 *   renders WebGL in software (no GPU at all); --gpu-angle=vulkan|gl-egl for headless Linux on an NVIDIA GPU.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { FPS, paintedPage, parseConfig, settingsFor, type ManifestTiming, type PageSources } from '../src/painted/page.ts';
import { paintedLibs } from './painted-libs.ts';
import { DIRS, ROOT, shown } from './paths.ts';

const KIT = path.join(ROOT, 'src', 'painted', 'kit');
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i;
const SILENCE = 'silence.wav';

const [first, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
})) as Record<string, string | true>;
const words = rest.filter(a => !a.startsWith('--'));
const die = (msg: string): never => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};
const str = (k: string) => (typeof args[k] === 'string' ? (args[k] as string) : undefined);
const num = (k: string, d: number) => (str(k) !== undefined ? Number(str(k)) : d);
const times = (s: string) => s.split(',').map(Number);
const span = (s: string) => s.split(':').map(Number) as [number, number];
// comma-separated fields, keeping commas inside parentheses ('PLK.MX(1.38),PLK.WL,500,300'); numbers stay numbers
const fields = (s: string) => {
  const out: string[] = [];
  let d = 0, cur = '';
  for (const ch of s) {
    if (ch === ',' && !d) { out.push(cur); cur = ''; continue; }
    d += ch === '(' ? 1 : ch === ')' ? -1 : 0;
    cur += ch;
  }
  out.push(cur);
  return out.map(v => (isNaN(+v) ? v : +v));
};
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const projectDir = (slug: string) => path.join(DIRS.projects, slug);

// ---------- new, length ----------

const writeSilence = (file: string, seconds: number) => {
  execFileSync(ffmpeg.path, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(seconds), '-c:a', 'pcm_s16le', file]);
};
const prepare = (slug: string) => {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', path.join(ROOT, 'scripts', 'prepare.ts'), slug], { stdio: 'inherit' });
  if (r.status) die(`mm prepare ${slug} failed`);
};
const songIn = (input: string) => (fs.existsSync(input) ? fs.readdirSync(input).filter(f => AUDIO_EXT.test(f)) : []);

const STARTER = `// A placeholder, so the project renders before its first shot is built. Replace it with your shots
// (STORYBOARD.md first), one file per scene or one for the whole video, listed in video/painted.json.
(() => {
  function waiting(t, lt, dur) {
    camBegin(960 + 18 * Math.sin(lt * .5), 540, 1 + .015 * lt);
    boilSeed('wash');
    paint(ellPts(960, 560, 620, 330, 30, 18), { fill: PAL.sky, fillOp: 80, bleed: .25, ink: null });
    boilSeed('ground');
    paint(ellPts(960, 1120, 1300, 330, 40, 2), { wash: PAL.sap, ink: PAL.ink, sw: 1 });
    clawd(960, 860, 24, emotions(lt, [[0, 'sleepy'], [Math.min(1.4, dur * .4), 'surprised'], [Math.min(2, dur * .55), 'happy']]));
    const at = toScreen(960, 860 - 4 * 24);
    camEnd();
    if (lt < .45) iris(...at, lerp(0, 1500, easeIn(lt / .45)));
    if (lt > dur - .6) iris(...at, lerp(1500, 0, ease((lt - (dur - .6)) / .6)));
  }
  shots([[0, waiting]]);
})();
`;

const STORYBOARD = `# Storyboard

Logline: one sentence. Clawd wants ___, but ___, so ___.
World: setting, a small palette, light, how the colour changes across the video.
Motif: the thing that recurs and pays off.
Clawd's arc: the emotion keys across the whole video.
Shots:
  A  start–end  [transition in: ___]  what's seen · the EVENT · Clawd's reaction · camera
     reads:  start–end  the first thing the viewer must understand
             start–end  the next one (where is the viewer's eye when it starts?)
  B  start–end  [transition: ___]  ...
  [transition out: ___]
`;

const newProject = (slug: string) => {
  if (!slug || !SLUG.test(slug)) die('mm painted new <slug>: lower-case words joined by hyphens');
  const dir = projectDir(slug), video = path.join(dir, 'video'), input = path.join(dir, 'input');
  if (fs.existsSync(path.join(video, 'index.tsx'))) die(`${shown(dir)} already has a video/index.tsx: open it instead (mm painted length ${slug} <seconds> changes its length)`);
  const seconds = num('seconds', 15);
  if (!(seconds > 0 && seconds <= 600)) die('--seconds: 1 to 600');
  fs.mkdirSync(path.join(video, 'scenes'), { recursive: true });
  fs.mkdirSync(input, { recursive: true });
  const song = songIn(input);
  if (!song.length) writeSilence(path.join(input, SILENCE), seconds);
  if (!fs.existsSync(path.join(input, 'lyrics.json'))) fs.writeFileSync(path.join(input, 'lyrics.json'), '[]\n');
  fs.writeFileSync(path.join(video, 'index.tsx'), `import { paintedProject } from '@mediamake/engine/painted';\n\n// A painted cartoon (make-painted-cartoon): its shots are the files video/painted.json lists.\nexport default paintedProject({ id: '${slug}' });\n`);
  // a silent cartoon's beat is written out, so it's there to change; a song's comes from its analysis
  fs.writeFileSync(path.join(video, 'painted.json'), JSON.stringify(song.length ? { scenes: ['scenes/main.js'] } : { scenes: ['scenes/main.js'], bpm: 120, offset: 0 }, null, 2) + '\n');
  fs.writeFileSync(path.join(video, 'scenes', 'main.js'), STARTER);
  if (!fs.existsSync(path.join(dir, 'STORYBOARD.md'))) fs.writeFileSync(path.join(dir, 'STORYBOARD.md'), STORYBOARD);
  prepare(slug);
  const length = (JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as ManifestTiming).audio.duration;
  const peek = [0.15, 0.5, 0.85].map(k => +(k * length).toFixed(1)).join(',');
  console.log(`\n✔ ${shown(dir)}: ${song.length ? `the song ${song[0]}, ${length} s` : `${length} s, silent`}, 1920×1080 at ${FPS} fps`);
  console.log(`  write STORYBOARD.md, then the shots in video/scenes/ (painted.json lists them, in order)`);
  console.log(`  mm painted ${slug} --sheet=${peek}   looks at it; mm preview ${slug} scrubs it; mm render ${slug} --preview renders 10 s`);
};

const setLength = (slug: string, secondsText: string | undefined) => {
  const dir = projectDir(slug), input = path.join(dir, 'input');
  if (!fs.existsSync(path.join(dir, 'video', 'painted.json'))) die(`${slug} is not a painted cartoon (no video/painted.json): mm painted new ${slug}`);
  const seconds = Number(secondsText);
  if (!(seconds > 0 && seconds <= 600)) die(`mm painted length ${slug} <seconds>: 1 to 600`);
  const songs = songIn(input).filter(f => f !== SILENCE);
  if (songs.length) die(`${slug} plays ${songs[0]}: its length is the song's (cut the song, or set a window)`);
  writeSilence(path.join(input, SILENCE), seconds);
  prepare(slug);
  console.log(`✔ ${slug}: ${seconds} s`);
};

// ---------- the page ----------

const readSources = (): PageSources => {
  const libs = paintedLibs(ROOT) ?? die('p5 and p5.brush are missing: npm ci');
  return {
  p5: fs.readFileSync(libs.p5, 'utf8'),
  brush: fs.readFileSync(libs.brush, 'utf8'),
  kit: Object.fromEntries(['core', 'clawd', 'timeline', 'sheets'].map(k => [k, fs.readFileSync(path.join(KIT, `${k}.js`), 'utf8')])) as PageSources['kit'],
  };
};

const pageFor = (slug: string, loop: string | null) => {
  const dir = projectDir(slug);
  const configFile = path.join(dir, 'video', 'painted.json');
  if (!fs.existsSync(configFile)) die(`${slug} is not a painted cartoon (no video/painted.json): mm painted new ${slug}`);
  const manifestFile = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestFile)) die(`no manifest for ${slug}: mm prepare ${slug}`);
  const config = parseConfig(fs.readFileSync(configFile, 'utf8'), `${slug}/video/painted.json`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as ManifestTiming;
  const scenes = config.scenes.map(name => {
    const file = path.join(dir, 'video', name);
    if (!fs.existsSync(file)) die(`${slug}/video/painted.json lists ${name}, which isn't there`);
    return { name, src: fs.readFileSync(file, 'utf8') };
  });
  return paintedPage({ sources: readSources(), settings: settingsFor(config, manifest), scenes, loop });
};

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const findChrome = async () => {
  const named = str('chrome') ?? process.env.MM_BROWSER ?? process.env.CHROME_PATH;
  if (named) return fs.existsSync(named) ? named : die(`no browser at ${named}`);
  try {
    const { ensureBrowser } = await import('@remotion/renderer');
    const status = await ensureBrowser();
    if ('path' in status && fs.existsSync(status.path)) return status.path;
  } catch {
    // no Remotion browser: a Chrome on the machine
  }
  return CHROMES.find(p => fs.existsSync(p)) ?? die('no browser: pass --chrome=<path> or set MM_BROWSER');
};

const ANGLE: Record<string, string[]> = { vulkan: ['--use-angle=vulkan', '--enable-features=Vulkan'], 'gl-egl': ['--use-angle=gl-egl'] };
const gpuFlags = () => {
  const angle = str('gpu-angle');
  if (angle && !ANGLE[angle]) die(`--gpu-angle is one of ${Object.keys(ANGLE).join(', ')}`);
  if (args['soft-gl']) return ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  if (angle) return ANGLE[angle];
  return process.platform === 'win32' ? ['--use-angle=d3d11'] : process.platform === 'darwin' ? ['--use-angle=metal'] : ['--use-gl=angle'];
};

let browser: Browser | null = null;
const openPage = async (html: string, tag = ''): Promise<Page> => {
  browser ??= await puppeteer.launch({
    executablePath: await findChrome(),
    headless: true,
    protocolTimeout: 0,
    args: [
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
      '--ignore-gpu-blocklist',
      ...gpuFlags(),
      '--enable-gpu-rasterization',
      '--window-size=1920,1080',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  page.on('console', m => {
    // p5.brush's five WebGL INVALID_OPERATION warnings on some scenes are harmless (kit's guide)
    if (['error', 'warn'].includes(m.type()) && !/INVALID_OPERATION/.test(m.text())) console.log(`[page${tag}]`, m.text());
  });
  page.on('pageerror', e => console.log(`[page error${tag}]`, (e as Error).message));
  await page.setContent(html, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.ready === true || !!window.paintedError', { timeout: 120000 });
  const failed = await page.evaluate('window.paintedError');
  if (failed) die(`the page stopped: ${failed}`);
  return page;
};
const dataOf = (url: string) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const frameOf = async (page: Page, t: number, type = 'image/png', q = 0.92) => dataOf(await page.evaluate((t, type, q) => (window as any).renderAt(t, type, q), t, type, q));
const failedAt = async (page: Page, what: string) => {
  const failed = await page.evaluate('window.paintedError');
  if (failed) die(`${what}: ${failed}`);
};

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
const checkDir = (slug: string) => path.join(DIRS.out, slug, 'check');
const outFile = (slug: string, mode: string, ext: string) => path.resolve(str('out') ?? path.join(checkDir(slug), `${mode}-${stamp()}.${ext}`));

// ---------- the checks ----------

const check = async (slug: string) => {
  if (!SLUG.test(slug)) die(`no project "${slug}"`);
  const loop = str('loop') ?? null;
  const html = pageFor(slug, loop);
  const fps = num('fps', FPS);
  const lengthOf = (page: Page) => page.evaluate('window.loopLength()') as Promise<number>;

  if (args.gpu) {
    const page = await openPage(html);
    console.log('GPU:', await page.evaluate('window.gpuInfo()'));
  } else if (str('sheet') || str('strip')) {
    const page = await openPage(html);
    let ts: number[];
    if (str('strip')) {
      const [a, b] = span(str('strip')!);
      ts = [];
      for (let i = Math.round(a * fps); i <= Math.round(b * fps); i++) ts.push(i / fps);
    } else ts = times(str('sheet')!);
    const crop = str('crop') ? times(str('crop')!) : null;
    const at = str('crop-at') ? fields(str('crop-at')!) : null;
    const cols = num('cols', str('strip') ? 6 : 3), w = num('w', str('strip') ? 320 : 640);
    const out = outFile(slug, str('strip') ? 'strip' : 'sheet', 'jpg');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const { url, ms } = (await page.evaluate((ts, c, w, crop, at) => (window as any).renderSheet(ts, c, w, crop, at), ts, cols, w, crop, at)) as { url: string; ms: number[] };
    await failedAt(page, 'drawing the sheet');
    fs.writeFileSync(out, dataOf(url));
    console.log(`${shown(out)}  (${ts.length} frames)  ms/frame: ${ms.join(' ')}`);
  } else if (str('stills')) {
    const page = await openPage(html);
    const out = path.resolve(str('out') ?? path.join(checkDir(slug), `stills-${stamp()}`));
    fs.mkdirSync(out, { recursive: true });
    console.log('GPU:', await page.evaluate('window.gpuInfo()'));
    for (const s of times(str('stills')!)) {
      const t0 = Date.now(), buf = await frameOf(page, s);
      await failedAt(page, `frame ${s}s`);
      const f = path.join(out, `t${s.toFixed(2).replace('.', '_')}.png`);
      fs.writeFileSync(f, buf);
      console.log(`${shown(f)}  ${Date.now() - t0} ms`);
    }
  } else if (args.png) {
    // a loop's full cycle (frame n equals frame 0, so it isn't drawn), or --range=a:b
    const probe = await openPage(html);
    const len = await lengthOf(probe);
    await probe.close();
    const [a, b] = str('range') ? span(str('range')!) : [0, len];
    const n = Math.round((b - a) * fps), workers = Math.max(1, num('workers', 3));
    const out = path.resolve(str('out') ?? path.join(checkDir(slug), `${loop ? `loop-${loop}` : 'png'}-${stamp()}`));
    fs.mkdirSync(out, { recursive: true });
    let next = 0;
    const start = Date.now();
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const page = await openPage(html, `#${w}`);
      while (next < n) {
        const i = next++;
        fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.png`), await frameOf(page, a + i / fps));
      }
      await failedAt(page, 'drawing the frames');
    }));
    console.log(`${n} frames → ${shown(out)}  (${((Date.now() - start) / Math.max(1, n)).toFixed(0)} ms/frame)`);
  } else {
    die('nothing to do: --sheet, --strip, --stills, --png or --gpu (the top of scripts/painted.ts has them all)');
  }
};

try {
  if (!first || first === 'help' || first === '--help') {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*\n/, '').replace(/^ \* ?/gm, ''));
  } else if (first === 'new') newProject(words[0]);
  else if (first === 'length') setLength(words[0], words[1]);
  else await check(first);
} catch (e) {
  // a scene's error, or an expression the page couldn't work out: its message, not puppeteer's stack
  const msg = (e as Error).message ?? String(e);
  console.error(`✖ ${msg.split('\n')[0]}${/ReferenceError|is not defined/.test(msg) && str('crop-at') ? '\n  a --crop-at expression sees only the page\'s globals: set window.<name> in the scene to use one of its own' : ''}`);
  process.exitCode = 1;
} finally {
  // set inside openPage, so TypeScript would read it as never here
  await (browser as Browser | null)?.close();
}
