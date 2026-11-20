/**
 * chrome: drive a clean Chrome window by code for a recorded demo, and mark every step in the recording.
 *
 * It opens Google Chrome with a profile of its own (a temporary folder: none of the user's tabs, sign-ins
 * or extensions show), places the window, and drives the page over the DevTools protocol: a hover path,
 * then the click; typing a key at a time; smooth scrolling. Each action is marked in the running
 * mac-recorder recording through its inbox, at the moment it happened, with the point (or the field) in
 * screen points. The edit then zooms there and draws a cursor that travels to it. Code moves no real
 * cursor, so record such a demo with `cursor: false`. The window keeps drawing at full speed when other
 * windows cover it (a window recording doesn't need it in front), so the user can keep working.
 *
 *   import { openChrome } from '<skill>/kit/chrome.mjs';
 *   const chrome = await openChrome({ profile: '/tmp/demo-chrome', bounds: { left: 160, top: 80, width: 1440, height: 900 } });
 *   await chrome.goto('https://example.com');
 *   console.log(chrome.pid);            // → list_windows, then start_recording { target: { window_id } }
 *   await chrome.click('text=More information', { name: 'Open the link' });
 *   await chrome.type('input[name=q]', 'screen recorder', { name: 'Search' });
 *   await chrome.scroll(600, { name: 'Read on' });
 *   await chrome.close();               // or leave it open for the next take
 *
 * A second script can take over the same window: openChrome({ profile }) reconnects while it runs.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'];
const STATE = process.env.MAC_RECORDER_STATE ?? path.join(os.homedir(), '.mediamake', 'mac-recorder');
export const INBOX = path.join(STATE, 'inbox');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let markSeq = 0;

/** Mark a step in the running recording; nothing when no recording runs (a rehearsal). */
export function mark(name, extra = {}) {
  if (!fs.existsSync(path.join(STATE, 'current.json'))) return;
  fs.mkdirSync(INBOX, { recursive: true });
  const file = path.join(INBOX, `${Date.now()}-${process.pid}-${String(++markSeq).padStart(4, '0')}.json`);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify({ name, at: Date.now(), ...extra }));
  fs.renameSync(`${file}.tmp`, file);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.waiting = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', e => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.waiting.has(msg.id)) {
        const { resolve, reject } = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result);
      } else if (msg.method) for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error(`Can't reach Chrome at ${url}`)), { once: true });
    });
    return new Cdp(ws);
  }
  send(method, params = {}, ms = 20000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.waiting.delete(id);
        reject(new Error(`Chrome didn't answer ${method} in ${ms / 1000} s`));
      }, ms);
      this.waiting.set(id, { resolve: v => (clearTimeout(t), resolve(v)), reject: e => (clearTimeout(t), reject(e)) });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  once(method, ms = 15000) {
    return new Promise(resolve => {
      const t = setTimeout(() => resolve(null), ms);
      const fn = params => {
        clearTimeout(t);
        this.listeners.set(method, (this.listeners.get(method) ?? []).filter(f => f !== fn));
        resolve(params);
      };
      this.listeners.set(method, [...(this.listeners.get(method) ?? []), fn]);
    });
  }
  close() {
    this.ws.close();
  }
}

async function devtoolsPort(profile) {
  const file = path.join(profile, 'DevToolsActivePort');
  if (!fs.existsSync(file)) return null;
  const port = Number(fs.readFileSync(file, 'utf8').split('\n')[0]);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`);
    return res.ok ? port : null;
  } catch {
    return null;
  }
}

/**
 * Open (or reconnect to) a Chrome window with its own profile. `bounds` in screen points; `app: true`
 * opens the page without tabs or address bar (a clean app window).
 */
export async function openChrome({ profile = path.join(os.tmpdir(), 'mac-recorder-chrome'), bounds, url = 'about:blank', app = false } = {}) {
  fs.mkdirSync(profile, { recursive: true });
  let port = await devtoolsPort(profile);
  let pid;
  if (!port) {
    const bin = CHROME.find(p => fs.existsSync(p));
    if (!bin) throw new Error('Google Chrome is not in /Applications.');
    fs.rmSync(path.join(profile, 'DevToolsActivePort'), { force: true });
    const args = [
      `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
      '--disable-features=Translate,AutofillServerCommunication,MediaRouter', '--disable-sync', '--hide-crash-restore-bubble',
      // keep drawing at full speed when other windows cover it: the recorder captures the window, not the screen
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
      ...(bounds ? [`--window-position=${bounds.left},${bounds.top}`, `--window-size=${bounds.width},${bounds.height}`] : []),
      app ? `--app=${url}` : url,
    ];
    const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
    child.unref();
    pid = child.pid;
    for (let i = 0; i < 100 && !port; i++) {
      await sleep(100);
      port = await devtoolsPort(profile);
    }
    if (!port) throw new Error('Chrome started but its DevTools port never came up.');
  }
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const browser = await Cdp.connect(version.webSocketDebuggerUrl);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const pageTarget = targets.find(t => t.type === 'page') ?? (await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json());
  const page = await Cdp.connect(pageTarget.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  const { windowId } = await browser.send('Browser.getWindowForTarget', { targetId: pageTarget.id });
  if (bounds) await browser.send('Browser.setWindowBounds', { windowId, bounds: { ...bounds, windowState: 'normal' } });
  if (!pid) pid = Number((await browser.send('SystemInfo.getProcessInfo').catch(() => ({ processInfo: [] }))).processInfo?.find(p => p.type === 'browser')?.id) || undefined;
  return new Driver({ browser, page, windowId, port, profile, pid });
}

class Driver {
  constructor({ browser, page, windowId, port, profile, pid }) {
    Object.assign(this, { browser, page, windowId, port, profile, pid });
    this.mouse = null;
  }

  async eval(expression) {
    const res = await this.page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    return res.result.value;
  }

  /** The window's place on screen, in points. */
  async bounds() {
    return (await this.browser.send('Browser.getWindowBounds', { windowId: this.windowId })).bounds;
  }

  async goto(url, { settle = 600 } = {}) {
    const loaded = this.page.once('Page.loadEventFired', 20000);
    await this.page.send('Page.navigate', { url });
    await loaded;
    await sleep(settle);
  }

  /** CSS pixels of the page → screen points (page zoom 100%, as a new profile has it). */
  async origin() {
    return this.eval('({ x: window.screenX + (window.outerWidth - window.innerWidth) / 2, y: window.screenY + window.outerHeight - window.innerHeight, w: innerWidth, h: innerHeight })');
  }

  /** The element: a CSS selector, or text=<words> for the visible link, button or label with those words. */
  async rect(target, { reveal = true } = {}) {
    const find = target.startsWith('text=')
      ? `(() => { const want = ${JSON.stringify(target.slice(5).trim().toLowerCase())};
          const all = [...document.querySelectorAll('a, button, [role=button], [role=tab], [role=link], summary, label, input[type=submit], h1, h2, h3, li, span, div')]
            .filter(e => e.offsetParent !== null && (e.innerText || e.value || '').trim().toLowerCase().replace(/\\s+/g, ' ').includes(want));
          all.sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
          return all[0] || null; })()`
      : `document.querySelector(${JSON.stringify(target)})`;
    const res = await this.eval(`(async () => { const el = ${find}; if (!el) return null;
      const r0 = el.getBoundingClientRect();
      if (${reveal} && (r0.top < 60 || r0.bottom > innerHeight - 40)) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await new Promise(r => setTimeout(r, 700)); }
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
    if (!res) throw new Error(`Nothing on the page matches ${target}`);
    return res;
  }

  /** Move the mouse along an eased path to (x, y) in CSS pixels, for hover effects on the way. */
  async moveTo(x, y, ms = 380) {
    const from = this.mouse ?? { x: x + 160, y: y + 110 };
    const steps = Math.max(6, Math.round(ms / 25));
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const e = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
      await this.page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e });
      await sleep(ms / steps);
    }
    this.mouse = { x, y };
  }

  /** Click an element (selector or text=…) or a point {x, y} in CSS pixels, and mark it. */
  async click(target, { name, note, hover = 380, after = 900 } = {}) {
    const r = typeof target === 'string' ? await this.rect(target) : { ...target, width: 0, height: 0 };
    const x = r.x + r.width / 2;
    const y = r.y + r.height / 2;
    await this.moveTo(x, y, hover);
    const o = await this.origin();
    mark(name ?? (typeof target === 'string' ? target.replace(/^text=/, '') : 'Click'), { kind: 'click', point: { x: o.x + x, y: o.y + y }, ...(note && { note }) });
    await this.page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await sleep(70);
    await this.page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(after);
  }

  /** Click a field, then type into it a key at a time; the edit zooms on the field. */
  async type(target, text, { name, note, delay = [45, 110], after = 700 } = {}) {
    const r = await this.rect(target);
    await this.click({ x: r.x + Math.min(r.width / 2, 40), y: r.y + r.height / 2 }, { name: name ?? `Type “${text}”`, note, after: 200 });
    const o = await this.origin();
    mark(`${name ?? 'Typing'} (field)`, { kind: 'focus', rect: { x: o.x + r.x - 24, y: o.y + r.y - 24, width: r.width + 48, height: r.height + 48 } });
    for (const ch of text) {
      await this.page.send('Input.insertText', { text: ch });
      await sleep(delay[0] + Math.random() * (delay[1] - delay[0]));
    }
    await sleep(after);
  }

  async press(key, { name } = {}) {
    if (name) mark(name);
    const code = { Enter: 13, Tab: 9, Escape: 27 }[key];
    await this.page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code, ...(key === 'Enter' && { text: '\r' }) });
    await this.page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code });
  }

  /** Scroll the page smoothly by dy CSS pixels (positive: down). */
  async scroll(dy, { name, ms = 900, after = 500 } = {}) {
    if (name) mark(name);
    const at = this.mouse ?? { x: 400, y: 400 };
    const steps = Math.max(8, Math.round(ms / 30));
    let done = 0;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const target = dy * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
      await this.page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: 0, deltaY: target - done });
      done = target;
      await sleep(ms / steps);
    }
    await sleep(after);
  }

  mark(name, extra) {
    mark(name, extra);
  }

  async close() {
    await this.browser.send('Browser.close').catch(() => {});
    this.page.close();
    this.browser.close();
  }

  disconnect() {
    this.page.close();
    this.browser.close();
  }
}
