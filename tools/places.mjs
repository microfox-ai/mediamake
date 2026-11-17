/**
 * places: the words for what a step needs and what a place can do, shared by the skills' run sheets
 * (tools/skills.mjs), the access register and the to-do queue (apps/mediamake/docs/cloud-device-runs.md).
 *
 * A place is anywhere a step can run: a shared cloud environment, or a device (a person's computer, reached
 * by its owner or through Remote Control). Each place has a list of what it can do; each step of a skill
 * lists what it needs, in the same words:
 *
 *   render                     can build and render a project (every place set up with `mm cloud` or `mm doctor`)
 *   key:<name>                 that key is set there: key:elevenlabs, key:mediamake, key:fal (the name, never the value)
 *   mcp:<id>                   that MCP is installed there: mcp:browse-hack, mcp:elevenlabs
 *   app:<name>                 that app is installed there: app:reaper, app:blender
 *   browser:<site>[/<account>] a browser there is signed in to that site, as that account when one is named:
 *                              browser:youtube, browser:youtube/atomic-rap, browser:midjourney
 *   media:library              the media library is on that machine
 *
 * A browser sign-in, an app, the media library and an MCP that drives a browser exist only on a device, so a
 * step that needs one never runs in a cloud environment. Everything else runs anywhere that has it.
 *
 * places.json holds what both this file and the app (apps/mediamake/lib/space/places.ts) read: the MCPs
 * that work only on a device, and for each known key the environment variable that carries it, the host
 * it calls and where a person makes one.
 */
import fs from 'node:fs';

const TABLE = JSON.parse(fs.readFileSync(new URL('./places.json', import.meta.url), 'utf8'));

/** One need, as a run sheet and the register write it. */
export const NEED = /^(render|media:library|(key|mcp|app):[a-z0-9][a-z0-9._-]{0,63}|browser:[a-z0-9][a-z0-9.-]{0,63}(\/[\w.@<>-]{1,100})?)$/;

/** MCPs that work only on a person's device: they drive the browser or the apps on it. */
export const DEVICE_MCPS = new Set(TABLE.deviceMcps);

/** The known keys: name → { env, title, host, from }. */
export const KEYS = TABLE.keys;

/** The environment variable that carries `key:<name>`: the known one, else <NAME>_API_KEY. */
export const keyEnv = name => KEYS[name]?.env ?? `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`;

/** True when only a device can have it. */
export const deviceOnly = need => /^(browser|app|media):/.test(need) || (need.startsWith('mcp:') && DEVICE_MCPS.has(need.slice('mcp:'.length)));

/** A "Needs" cell: `nothing`, `-` or empty for none, else needs separated by commas. `bad` holds what isn't one. */
export function parseNeeds(cell) {
  const text = String(cell ?? '').replace(/`/g, '').trim();
  if (!text || /^(-|–|—|none|nothing)$/i.test(text)) return { needs: [], bad: [] };
  const parts = text.split(/\s*,\s*|\s+and\s+/).map(p => p.trim()).filter(Boolean);
  return { needs: [...new Set(parts.filter(p => NEED.test(p)))], bad: parts.filter(p => !NEED.test(p)) };
}

/** A list of needs as an item.json or a report holds it: the known words, each once, `max` at most. */
export const needList = (value, max = 40) => (Array.isArray(value) ? [...new Set(value.filter(n => typeof n === 'string' && NEED.test(n)))].slice(0, max) : []);

/** Does a place that can do `can` have `need`? A sign-in as a named account also covers the site alone. */
export function has(can, need) {
  if (can.includes(need)) return true;
  return need.startsWith('browser:') && !need.includes('/') && can.some(c => c.startsWith(`${need}/`));
}

/** What `needs` asks for that a place with `can` lacks. Empty: it can run the step. */
export const missing = (can, needs) => needs.filter(need => !has(can, need));

/**
 * Where a skill's steps can run, in one word: `anywhere` (no step needs a device), `device` (every step
 * that needs anything needs a device) or `mixed` (some steps need a device: the split the planner may make).
 */
export function runsOf(steps) {
  if (!steps.length) return undefined;
  const device = steps.filter(step => step.needs.some(deviceOnly));
  if (!device.length) return 'anywhere';
  return device.length === steps.length ? 'device' : 'mixed';
}
