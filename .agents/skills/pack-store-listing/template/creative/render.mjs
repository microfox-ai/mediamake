// Portal's App Store creative assets (iOS 27 "Header and Search Results"), drawn in HTML and
// rendered at full size with headless Chrome:
//   node creative/render.mjs <out-dir>
// - header-5244x2950.png: the product page header. No text: Apple lays the app's icon, name and Get
//   button over it, and crops it per device, so the focal point (three phones) sits in the middle
//   and the lower part stays dark.
// - search-3840x2560.png: the search results asset, with the screenshots' headline.
// The screens (creative/screens) are raw captures of the app with the sample company (the
// pack-store-listing capture kit's shots). puppeteer-core comes from ~/.cache/pack-store-listing.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || join(here, 'out'));
mkdirSync(out, { recursive: true });
const puppeteer = createRequire(join(process.env.CAPTURE_DEPS || join(homedir(), '.cache', 'pack-store-listing'), 'index.js'))('puppeteer-core');
const screen = (n) => pathToFileURL(join(here, 'screens', n)).href;

const INK = '#0a0a0b';
const CREAM = '#f2f0ea';
const MARK = `<svg viewBox="100 100 800 800" width="100%" height="100%"><circle cx="500" cy="500" r="353" fill="none" stroke="${CREAM}" stroke-width="34.4"/><path d="M500 375h103a22 22 0 0 1 22 22v206a22 22 0 0 1 -22 22h-206a22 22 0 0 1 -22 -22v-206a22 22 0 0 1 22 -22Z" fill="${CREAM}"/></svg>`;

/** A phone at a screen width (CSS px): dark bezel, Dynamic Island, the screen image. */
const phone = (src, w, extra = '') => {
  const h = (w * 960) / 443, b = w * 0.024, r = w * 0.135;
  return `<div style="position:absolute;${extra};width:${w + 2 * b}px;height:${h + 2 * b}px;border-radius:${r + b}px;background:#1c1c1f;padding:${b}px;box-sizing:border-box;box-shadow:inset 0 0 0 ${b * 0.18}px #3a3a3e,0 ${w * 0.08}px ${w * 0.22}px rgba(0,0,0,.6)">
    <div style="position:relative;width:${w}px;height:${h}px;border-radius:${r}px;overflow:hidden;background:${INK}">
      <img src="${src}" style="width:100%;height:100%;display:block"/>
      <div style="position:absolute;top:${w * 0.025}px;left:50%;width:${w * 0.284}px;height:${w * 0.083}px;margin-left:${-w * 0.142}px;border-radius:${w * 0.05}px;background:#000"></div>
    </div></div>`;
};

const ground = (W, H, cx, cy) => `
  <div style="position:absolute;inset:0;background:radial-gradient(${W * 0.55}px ${H * 0.75}px at ${cx}px ${cy}px,#1f1d3d 0%,#121124 38%,${INK} 75%)"></div>
  <svg width="${W}" height="${H}" style="position:absolute;inset:0">
    <circle cx="${cx}" cy="${cy}" r="${H * 0.52}" fill="none" stroke="rgba(242,240,234,.06)" stroke-width="${H * 0.028}"/>
    <circle cx="${cx}" cy="${cy}" r="${H * 0.36}" fill="none" stroke="rgba(242,240,234,.045)" stroke-width="2"/>
  </svg>`;

const page = (W, H, body) => `<!doctype html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@800&family=Inter:wght@400;500&display=block" rel="stylesheet">
  <style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${INK}}</style></head>
  <body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden">${body}</div></body></html>`;

/** Three phones: the home screen in front, two more behind it, centred on cx. */
const trio = (cx, top, w, gap) => `
  ${phone(screen('2-work.png'), w * 0.86, `left:${cx - gap - w * 0.43 - w * 0.03}px;top:${top + w * 0.2}px;opacity:.92;transform:rotate(-4deg)`)}
  ${phone(screen('5-project.png'), w * 0.86, `left:${cx + gap - w * 0.43 - w * 0.03}px;top:${top + w * 0.2}px;opacity:.92;transform:rotate(4deg)`)}
  ${phone(screen('1-home.png'), w, `left:${cx - w / 2 - w * 0.024}px;top:${top}px`)}`;

// The header: 5244x2950 (16:9), drawn at half size and rendered at 2x.
const HW = 2622, HH = 1475;
const header = page(HW, HH, `
  ${ground(HW, HH, HW / 2, HH * 0.46)}
  ${trio(HW / 2, HH * 0.14, 470, 400)}
  <div style="position:absolute;left:0;right:0;bottom:0;height:${HH * 0.42}px;background:linear-gradient(to bottom,rgba(10,10,11,0),${INK} 85%)"></div>
  <div style="position:absolute;left:${HW / 2 - 44}px;top:${HH * 0.045}px;width:88px;height:88px;opacity:.9">${MARK}</div>`);

// Search results: 3840x2560 (3:2), drawn at half size.
const SW = 1920, SH = 1280;
const search = page(SW, SH, `
  ${ground(SW, SH, SW / 2, SH * 0.62)}
  <div style="position:absolute;left:0;right:0;top:${SH * 0.075}px;text-align:center;font:800 104px/1.02 'Inter Tight';letter-spacing:-.035em;color:${CREAM}">Your team’s work,<br>in your pocket.</div>
  <div style="position:absolute;left:0;right:0;top:${SH * 0.075 + 236}px;text-align:center;font:400 40px 'Inter';color:#a8a49b">Tasks, worklogs, projects, goals and chat.</div>
  ${trio(SW / 2, SH * 0.43, 380, 330)}
  <div style="position:absolute;left:0;right:0;bottom:0;height:${SH * 0.12}px;background:linear-gradient(to bottom,rgba(10,10,11,0),${INK})"></div>`);

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
const tab = await browser.newPage();
for (const [name, html, w, h] of [['header-5244x2950.png', header, HW, HH], ['search-3840x2560.png', search, SW, SH]]) {
  await tab.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  // From a file next to the screens, so the page may load them.
  const file = join(here, `.render-${name}.html`);
  writeFileSync(file, html);
  await tab.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
  rmSync(file);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(out, name), clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', join(out, name));
}
await browser.close();
