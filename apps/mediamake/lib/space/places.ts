/**
 * The words for what an item needs to run, as the tools write them (tools/places.mjs, a skill's run sheet):
 * `render`, `key:<name>`, `mcp:<id>`, `app:<name>`, `browser:<site>[/<account>]`, `media:library`. A
 * need names a thing, never a secret: a key by its name, a sign-in by its site and account.
 *
 * tools/places.json is the one table both sides read: the MCPs that work only on a device, and for each
 * known key the environment variable that carries it, the host it calls and where a person makes one.
 */
import table from '../../../../tools/places.json';

/** One need, as a run sheet and a report write it. */
export const NEED = /^(render|media:library|(key|mcp|app):[a-z0-9][a-z0-9._-]{0,63}|browser:[a-z0-9][a-z0-9.-]{0,63}(\/[\w.@<>-]{1,100})?)$/;

/** How many needs one item may report. */
export const MAX_NEEDS = 40;

/** A list of needs as a report holds it: the known words, each once. Anything else is left out. */
export const needList = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((need): need is string => typeof need === 'string' && NEED.test(need)))].slice(0, MAX_NEEDS) : [];

const DEVICE_MCPS = new Set<string>(table.deviceMcps);

/** True when only a device can have it: a browser sign-in, an app, the media library, an MCP that drives a browser. */
export const deviceOnly = (need: string): boolean => /^(browser|app|media):/.test(need) || (need.startsWith('mcp:') && DEVICE_MCPS.has(need.slice('mcp:'.length)));

/**
 * Does a step wait for a place that has what it needs? Yes when its "Without it" is empty or starts
 * with "a to-do". Any other "Without it" says what a place that lacks the need does instead, there.
 * The same rule as tools/places.mjs.
 */
export const waitsWithout = (without?: string): boolean => !without || /^(a\s+)?to-?do\b/i.test(without.trim());

export interface KeyInfo {
  /** As a run sheet names it: `elevenlabs`. */
  name: string;
  /** The environment variable that carries it: `ELEVENLABS_API_KEY`. */
  env: string;
  /** For people: `ElevenLabs`. */
  title: string;
  /** The host it calls, for an environment that allows only named domains. */
  host?: string;
  /** Where a person makes one. */
  from?: string;
}

const KEYS = table.keys as Record<string, Omit<KeyInfo, 'name'>>;

/** A key by its name: the known one, else `<NAME>_API_KEY` and the name as its title. */
export function keyInfo(name: string): KeyInfo {
  const known = Object.hasOwn(KEYS, name) ? KEYS[name] : undefined;
  return known ? { name, ...known } : { name, env: `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`, title: name };
}
