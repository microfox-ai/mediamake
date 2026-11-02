/**
 * Where the media library lives on this Mac: the `library` key of ~/.mediamake/config.json. That
 * file belongs to the machine and is never committed (it names the user's folders); every tool that
 * touches the library reads it: this CLI, Browse Hack's MCP, the Library page's dev routes.
 *
 *   { "library": { "root": "~/Downloads/_LIBRARY", "inbox": "~/Downloads/_INBOX", "deliverRoot": "~/Downloads",
 *                  "channels": { "<channel id>": "<its folder in deliverRoot>" },
 *                  "exclude": ["<folders in deliverRoot the sweep never opens>"] } }
 *
 * MEDIAMAKE_CONFIG points at another file (the tests use a temp one).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type LibraryConfig = {
  root: string;
  inbox: string;
  deliverRoot: string;
  /** channel id (a brand under brands/, or an artist name) → its folder in deliverRoot */
  channels: Record<string, string>;
  /** folders in deliverRoot that are none of the library's business */
  exclude: string[];
};

export const configFile = () => process.env.MEDIAMAKE_CONFIG ?? path.join(os.homedir(), '.mediamake', 'config.json');

const DEFAULTS: LibraryConfig = {
  root: '~/Downloads/_LIBRARY',
  inbox: '~/Downloads/_INBOX',
  deliverRoot: '~/Downloads',
  channels: {},
  exclude: [],
};

export const expandHome = (p: string) => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

const readAll = (): Record<string, unknown> => {
  try {
    return JSON.parse(fs.readFileSync(configFile(), 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const hasConfig = () => fs.existsSync(configFile()) && !!readAll().library;

export const loadConfig = (): LibraryConfig => {
  const raw = (readAll().library ?? {}) as Partial<LibraryConfig>;
  const c = { ...DEFAULTS, ...raw, channels: { ...DEFAULTS.channels, ...raw.channels }, exclude: raw.exclude ?? DEFAULTS.exclude };
  return { ...c, root: expandHome(c.root), inbox: expandHome(c.inbox), deliverRoot: expandHome(c.deliverRoot) };
};

/** Merge into the `library` key, keeping everything else in the file. */
export const saveConfig = (patch: Partial<LibraryConfig>) => {
  const all = readAll();
  const library = { ...DEFAULTS, ...((all.library ?? {}) as Partial<LibraryConfig>), ...patch };
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify({ ...all, library }, null, 2) + '\n');
  return loadConfig();
};

/** The channel whose folder this is (Downloads/AMZ → animemusiczone). */
export const channelOfFolder = (cfg: LibraryConfig, folder: string) =>
  Object.entries(cfg.channels).find(([, f]) => f.toLowerCase() === folder.toLowerCase())?.[0];
