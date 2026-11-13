// Records an app's flows (takes) for store videos, and shoots its screens for screenshots.
//
//   node record.mjs <app-config.mjs> <out-dir> [take|shots …]
//
// The config (one per app, kept in its MediaMake project, e.g. projects/<slug>/capture/app.mjs) exports:
//   base      the mock API + web build ('http://localhost:4545')
//   clock     '2026-11-12T09:41:00+05:30', timezone 'Asia/Kolkata'
//   tabs      [{ name, route, icon }] for phoneChrome (or [] when the app draws its own)
//   signIn(page, kit)              gets past sign-in to the first screen
//   takes: { <name>: { start?(page, kit), warm?(page, kit), run(page, r, kit) } }
//   shots: [{ name, go(page, kit) }]   screens for the screenshots, in store order
// `kit` is drive.mjs (tap, scroll, longPress, typeInto, tapLabel, sleep). In run(), call r.mark(kind,
// label) just before each tap that changes the screen ('push', 'sheet', 'close', 'tab', 'tap'); the
// edit cuts and animates on those.
//
// Each take is <out>/<take>.mp4 (the screen at 2x, 30 fps, from Chrome's screencast, trimmed to the take)
// and <take>.json (its length and events in seconds). Shots are <out>/shots/<n>-<name>.png, full screen
// with the status bar. A take starts from a fresh browser, signed in, on the start screen, with every
// screen it pushes to opened once first (warm), so no push shows a loading frame.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as kit from './drive.mjs';

const [configPath, outArg, ...only] = process.argv.slice(2);
const app = await import(pathToFileURL(resolve(configPath)).href);
const OUT = resolve(outArg);
mkdirSync(OUT, { recursive: true });

async function recorder(page, name) {
  const dir = join(OUT, `${name}-frames`);
  mkdirSync(dir, { recursive: true });
  const cdp = await page.createCDPSession();
  const frames = [];
  const events = [];
  // Frames carry wall-clock seconds; events use the same clock.
  const wall0 = Date.now();
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp - wall0 / 1000 });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const vp = page.viewport();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 96, maxWidth: vp.width * vp.deviceScaleFactor, maxHeight: vp.height * vp.deviceScaleFactor, everyNthFrame: 1 });
  await kit.sleep(300);
  return {
    mark: (kind, label) => events.push({ t: (Date.now() - wall0) / 1000, kind, label }),
    async stop() {
      await kit.sleep(200);
      await cdp.send('Page.stopScreencast');
      const end = (Date.now() - wall0) / 1000;
      // The screencast only sends a frame when the screen changes: each frame holds until the next.
      frames.sort((a, b) => a.t - b.t);
      const firstAfter = frames.findIndex((f) => f.t > 0);
      const kept = frames.slice(Math.max(0, (firstAfter < 0 ? frames.length : firstAfter) - 1)).map((f, i) => (i === 0 ? { ...f, t: 0 } : f));
      const list = kept.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, (kept[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join('\n') + `\nfile '${kept.at(-1).file}'\n`;
      writeFileSync(join(OUT, `${name}.txt`), list);
      const w = vp.width * vp.deviceScaleFactor, h = vp.height * vp.deviceScaleFactor;
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(OUT, `${name}.txt`),
        '-vf', `fps=30,scale=${w}:${h}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '12', '-preset', 'slow',
        '-t', end.toFixed(3), '-movflags', '+faststart', join(OUT, `${name}.mp4`)]);
      writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ duration: end, frames: frames.length, events }, null, 1));
      console.log(`${name}: ${end.toFixed(1)} s, ${frames.length} frames, ${events.length} events`);
    },
  };
}

async function session(fn, { hideStatus }) {
  const { browser, page } = await kit.launch({ base: app.base, clock: app.clock, timezone: app.timezone, dark: app.dark ?? true });
  try {
    await app.signIn(page, kit);
    await kit.phoneChrome(page, { tabs: app.tabs ?? [], bg: app.bg, fg: app.fg, hideStatus });
    await fn(page);
  } catch (e) {
    console.log('failed:', e.message);
    await page.screenshot({ path: join(OUT, `error-${Date.now()}.png`) });
  }
  await browser.close();
}

for (const [name, take] of Object.entries(app.takes ?? {})) {
  if (only.length && !only.includes(name)) continue;
  // The edit draws the status bar, so pushes slide under a still one.
  await session(async (page) => {
    await take.start?.(page, kit);
    await kit.sleep(800);
    await take.warm?.(page, kit);
    await kit.sleep(700);
    const r = await recorder(page, name);
    await take.run(page, r, kit);
    await r.stop();
  }, { hideStatus: true });
}

if (app.shots?.length && (!only.length || only.includes('shots'))) {
  mkdirSync(join(OUT, 'shots'), { recursive: true });
  await session(async (page) => {
    for (const [i, shot] of app.shots.entries()) {
      await shot.go(page, kit);
      await kit.sleep(900);
      const file = join(OUT, 'shots', `${i + 1}-${shot.name}.png`);
      await page.screenshot({ path: file });
      console.log('shot', file);
    }
  }, { hideStatus: false });
}
