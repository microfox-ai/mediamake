#!/usr/bin/env node
/**
 * run-steps: a take driven by code, in three moves around the recording.
 *
 *   node run-steps.mjs <steps.mjs> --setup [--url <url>] [--bounds left,top,width,height] [--app] [--profile <dir>]
 *        opens (or reuses) the clean Chrome window, goes to the url, prints { pid, bounds } and leaves it open
 *        → list_windows, then start_recording { target: { window_id }, cursor: false }
 *   node run-steps.mjs <steps.mjs> --run [--profile <dir>]
 *        runs the steps; each action is marked in the running recording (nothing records: a rehearsal)
 *        → stop_recording
 *   node run-steps.mjs --close [--profile <dir>]
 *
 * steps.mjs exports one async function (default, or any name) that takes the driver from chrome.mjs:
 *
 *   export default async chrome => {
 *     chrome.mark('The store');
 *     await chrome.click('text=SKILLS', { name: 'Open the skills' });
 *     await chrome.scroll(240, { name: 'Browse the skills' });
 *   };
 *
 * Rehearse first (--run before start_recording): the selectors are checked and nothing is marked.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openChrome } from './chrome.mjs';

const args = process.argv.slice(2);
const opt = k => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find(a => a.endsWith('.mjs') || a.endsWith('.js'));
const profile = opt('profile');

if (args.includes('--close')) {
  const chrome = await openChrome({ ...(profile && { profile }) });
  await chrome.close();
  console.log('closed');
  process.exit(0);
}
if (!file || (!args.includes('--setup') && !args.includes('--run'))) {
  console.error('node run-steps.mjs <steps.mjs> --setup [--url <url>] [--bounds l,t,w,h] [--app] | --run | --close  [--profile <dir>]');
  process.exit(64);
}

if (args.includes('--setup')) {
  const [left, top, width, height] = (opt('bounds') ?? '40,60,1440,810').split(',').map(Number);
  const url = opt('url') ?? 'about:blank';
  const chrome = await openChrome({ ...(profile && { profile }), bounds: { left, top, width, height }, url, app: args.includes('--app') });
  if (url !== 'about:blank' && !args.includes('--app')) await chrome.goto(url, { settle: 1200 });
  console.log(JSON.stringify({ pid: chrome.pid, bounds: await chrome.bounds(), profile: chrome.profile, url: await chrome.eval('location.href') }));
  chrome.disconnect();
  process.exit(0);
}

const mod = await import(pathToFileURL(path.resolve(file)).href);
const steps = typeof mod.default === 'function' ? mod.default : Object.values(mod).find(v => typeof v === 'function');
if (!steps) throw new Error(`${file} exports no function`);
const chrome = await openChrome({ ...(profile && { profile }) });
const started = Date.now();
try {
  const res = await steps(chrome);
  console.log(JSON.stringify({ ok: true, seconds: (Date.now() - started) / 1000, ...(res !== undefined && { result: res }) }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, seconds: (Date.now() - started) / 1000, error: e.message }));
  process.exitCode = 1; // stop_recording anyway, then fix the step and take it again
} finally {
  chrome.disconnect();
}
