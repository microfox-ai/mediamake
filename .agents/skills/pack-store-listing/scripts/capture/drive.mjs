// Drives an app's web build like a phone, for store screenshots and videos.
//
//   const { browser, page } = await launch({ base, clock: '2026-11-12T09:41:00+05:30', timezone: 'Asia/Kolkata' });
//
// - iPhone 6.9" size: 443 x 960 points at 2x, so screenshots and screencast frames are 886 x 1920
//   (the App Store preview size); pass { width, height, scale } for other phones.
// - A fixed clock that starts at `clock` and keeps running (the status bar and the app say 9:41).
// - Nothing leaves the machine: every request that isn't to `base` (the mock API and the build) is
//   blocked and logged, so a take can never touch real data or a live server.
// - phoneChrome() adds the iOS status bar, a bottom tab bar that taps the app's own tabs (web builds
//   often put tabs at the top) and the home indicator, and room for both.
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

// puppeteer-core lives outside the skill (skills are public and stay free of node_modules):
// npm install --prefix ~/.cache/pack-store-listing --no-package-lock puppeteer-core
const DEPS = process.env.CAPTURE_DEPS || join(homedir(), '.cache', 'pack-store-listing');
let puppeteer;
try {
  puppeteer = createRequire(join(DEPS, 'index.js'))('puppeteer-core');
} catch {
  throw new Error(`puppeteer-core isn't installed: npm install --prefix ${DEPS} --no-package-lock puppeteer-core`);
}

export const IPHONE = { width: 443, height: 960, scale: 2, insets: { top: 62, bottom: 34 } };
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ base, clock, timezone = 'UTC', dark = true, phone = IPHONE, headless = true } = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless,
    args: [`--window-size=${phone.width},${phone.height}`, '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: phone.width, height: phone.height, deviceScaleFactor: phone.scale, isMobile: true, hasTouch: true });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1');
  await page.emulateTimezone(timezone);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]);
  if (clock) {
    await page.evaluateOnNewDocument((at) => {
      const RealDate = Date;
      const offset = at - RealDate.now();
      class FakeDate extends RealDate {
        constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + offset); }
        static now() { return RealDate.now() + offset; }
      }
      globalThis.Date = FakeDate;
    }, Date.parse(clock));
  }
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (/^(data|blob):/.test(url) || url.startsWith(base)) return void req.continue();
    console.log('[blocked]', url.slice(0, 120));
    void req.abort('blockedbyclient');
  });
  return { browser, page };
}

/**
 * The phone around the app. `tabs`: [{ name, route, icon }] with icon an SVG body for a 24x24 box,
 * matched to the app's own tab buttons ([role=tab]) by name. `hideStatus`: leave the status bar's
 * text and the home indicator out (a video edit draws them, so pushes slide under a still bar).
 */
export async function phoneChrome(page, { tabs = [], bg = '#0a0a0b', fg = '#f3f1ea', phone = IPHONE, hideStatus = false } = {}) {
  await page.evaluate((tabs, bg, fg, insets, hideStatus) => {
    const { top, bottom } = insets;
    const css = document.createElement('style');
    css.textContent = `
      html, body { background: ${bg} !important; }
      #root { position: fixed !important; left: 0; right: 0; top: ${top}px; bottom: ${bottom}px; height: auto !important; }
      ${tabs.length ? '[role=tablist] { display: none !important; }' : ''}
      *:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }
      *::-webkit-scrollbar { display: none; }
      body.tabs [class*=tabContent] { padding-bottom: 49px; box-sizing: border-box; }
      #pc-status { position: fixed; z-index: 99999; left: 0; right: 0; top: 0; height: ${top}px; background: ${bg};
        display: flex; align-items: center; justify-content: space-between; padding: 6px 34px 0 50px; box-sizing: border-box;
        font: 600 17px -apple-system, 'SF Pro Text', system-ui; color: #fff; pointer-events: none; }
      #pc-status .r { display: flex; gap: 7px; align-items: center; }
      ${hideStatus ? '#pc-status > *, #pc-home { visibility: hidden !important; }' : ''}
      #pc-tabs { position: fixed; z-index: 99998; left: 0; right: 0; bottom: 0; height: ${49 + bottom}px; background: ${bg};
        border-top: 0.5px solid rgba(255,255,255,0.12); display: none; padding-top: 7px; box-sizing: border-box; }
      body.tabs #pc-tabs { display: flex; }
      #pc-tabs .t { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; color: #8e8e93;
        font: 500 10.5px -apple-system, 'SF Pro Text', system-ui; position: relative; }
      #pc-tabs .t.on { color: ${fg}; }
      #pc-tabs .b { position: absolute; top: -3px; left: 50%; margin-left: 6px; min-width: 18px; height: 18px; border-radius: 9px;
        background: #ff3b30; color: #fff; font: 600 12px/18px -apple-system, system-ui; text-align: center; padding: 0 5px; box-sizing: border-box; }
      #pc-home { position: fixed; z-index: 99999; left: 50%; bottom: 8px; width: 140px; height: 5px; margin-left: -70px; border-radius: 3px; background: #fff; pointer-events: none; }`;
    document.head.appendChild(css);
    const status = document.createElement('div');
    status.id = 'pc-status';
    status.innerHTML = `<span>9:41</span><span class="r">
      <svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3.2" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3.2" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3.2" height="9" rx="1" fill="#fff"/><rect x="15" y="0" width="3.2" height="12" rx="1" fill="#fff"/></svg>
      <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.3c2.4 0 4.6.9 6.2 2.5l1.2-1.2C14 1.7 11.4.6 8.5.6S3 1.7 1.1 3.6l1.2 1.2C3.9 3.2 6.1 2.3 8.5 2.3zm0 3.4c1.5 0 2.8.6 3.8 1.5l1.2-1.2C12.2 4.8 10.4 4 8.5 4S4.8 4.8 3.5 6l1.2 1.2c1-.9 2.3-1.5 3.8-1.5zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.2 7 9.7c.4-.4.9-.6 1.5-.6z" fill="#fff"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="#fff" stroke-opacity=".4" fill="none"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="#fff"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="#fff" fill-opacity=".4"/></svg></span>`;
    document.body.appendChild(status);
    const home = document.createElement('div');
    home.id = 'pc-home';
    document.body.appendChild(home);
    if (!tabs.length) return;
    const appTab = (name) => [...document.querySelectorAll('[role=tab]')].find((b) => b.textContent.replace(/\d+/g, '').trim().startsWith(name));
    const bar = document.createElement('div');
    bar.id = 'pc-tabs';
    for (const tab of tabs) {
      const t = document.createElement('div');
      t.className = 't';
      t.dataset.tab = tab.name;
      t.innerHTML = `<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${tab.icon}</svg><span>${tab.name}</span>`;
      t.addEventListener('click', () => {
        const btn = appTab(tab.name);
        if (!btn) return;
        // Web tab libraries listen to pointer events, not click alone.
        for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])
          btn.dispatchEvent(new (type.startsWith('pointer') ? PointerEvent : MouseEvent)(type, { bubbles: true, cancelable: true, button: 0, pointerType: 'mouse', isPrimary: true }));
      });
      bar.appendChild(t);
    }
    document.body.appendChild(bar);
    const sync = () => {
      const path = location.pathname.replace(/\/$/, '') || '/';
      document.body.classList.toggle('tabs', tabs.some((t) => t.route === path));
      for (const t of bar.children) {
        const tab = tabs.find((x) => x.name === t.dataset.tab);
        t.classList.toggle('on', tab.route === path);
        const n = appTab(tab.name)?.textContent.match(/\d+/)?.[0];
        let badge = t.querySelector('.b');
        if (n && !badge) { badge = document.createElement('span'); badge.className = 'b'; t.appendChild(badge); }
        if (badge) { if (n) badge.textContent = n; else badge.remove(); }
      }
    };
    sync();
    setInterval(sync, 50);
  }, tabs, bg, fg, phone.insets, hideStatus);
}

/** Taps the visible element whose own text is `t` (nth: -1 for the last one, e.g. a bottom bar). */
export async function tap(page, t, { exact = true, nth = 0, wait = 4000 } = {}) {
  const handle = await page.waitForFunction(
    (t, exact, nth) => {
      const all = [...document.querySelectorAll('div,span,a,button,[role=button]')].filter((el) => {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (exact ? own === t : own.includes(t));
      });
      return (nth < 0 ? all[all.length + nth] : all[nth]) || null;
    },
    { timeout: wait },
    t, exact, nth,
  );
  const box = await handle.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return box;
}

/** Taps the element with this accessibility label (icon buttons: Send, Close…). */
export async function tapLabel(page, label) {
  const el = await page.waitForSelector(`[aria-label="${label}"]`, { visible: true });
  const b = await el.boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}

/** A long press (React Native Web takes it from the mouse, not touch). */
export async function longPress(page, t, ms = 650) {
  const handle = await page.waitForFunction((t) => [...document.querySelectorAll('div,span')].find((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === t)), {}, t);
  const b = await handle.boundingBox();
  await page.mouse.move(b.x + Math.min(b.width / 2, 120), b.y + b.height / 2);
  await page.mouse.down();
  await sleep(ms);
  await page.mouse.up();
}

/** Taps a field by its placeholder and types at a person's pace. */
export async function typeInto(page, placeholder, text) {
  const el = await page.waitForSelector(`[placeholder="${placeholder}"]`, { visible: true });
  const b = await el.boundingBox();
  await page.touchscreen.tap(b.x + 30, b.y + b.height / 2);
  await sleep(350);
  for (const ch of text) { await page.keyboard.sendCharacter(ch); await sleep(ch === ' ' ? 70 : 48); }
}

/** Scrolls the scroll view under a point of the screen (0–1 of its height) with an ease, like a flick. */
export async function scroll(page, dy, ms = 1100, at = 0.5) {
  await page.evaluate((dy, ms, at) => new Promise((done) => {
    let el = document.elementFromPoint(innerWidth / 2, innerHeight * at);
    while (el && !(el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    if (!el) return done();
    const from = el.scrollTop;
    const t0 = performance.now();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now) => {
      const x = Math.min(1, (now - t0) / ms);
      el.scrollTop = from + dy * ease(x);
      if (x < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  }), dy, ms, at);
}
