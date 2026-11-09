/**
 * Where the media library lives on this Mac: the `library` key of ~/.mediamake/config.json. That
 * file belongs to the machine and is never committed (it names the user's folders); every tool that
 * touches the library reads it: this CLI, Browse Hack's MCP, the Library page's dev routes.
 *
 *   { "url": "<the MediaMake site>",
 *     "library": { "root": "~/Downloads/_LIBRARY", "inbox": "~/Downloads/_INBOX", "deliverRoot": "~/Downloads",
 *                  "channels": { "<channel id>": "<its folder in deliverRoot>" | { "folder": "…", "projectId": "<cloud project>" } },
 *                  "exclude": ["<folders in deliverRoot the sweep never opens>"] } }
 *
 * A channel linked to a MediaMake cloud project (`media channel link`) is shared with its team
 * (`media sync`). The API key is never kept here: it comes from MEDIAMAKE_API_KEY or the Keychain
 * (cloud.ts). MEDIAMAKE_CONFIG points at another file (the tests use a temp one).
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
  /** channel id → the MediaMake cloud project its team shares (linked channels only) */
  links: Record<string, string>;
  /** folders in deliverRoot that are none of the library's business */
  exclude: string[];
};

/** A channel as the file has it: its folder, or its folder and cloud project. */
type ChannelValue = string | { folder?: string; projectId?: string };

export const configFile = () => process.env.MEDIAMAKE_CONFIG ?? path.join(os.homedir(), '.mediamake', 'config.json');

const DEFAULTS = {
  root: '~/Downloads/_LIBRARY',
  inbox: '~/Downloads/_INBOX',
  deliverRoot: '~/Downloads',
  channels: {} as Record<string, ChannelValue>,
  exclude: [] as string[],
};

export const expandHome = (p: string) => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

const readAll = (): Record<string, unknown> => {
  try {
    return JSON.parse(fs.readFileSync(configFile(), 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const writeAll = (all: Record<string, unknown>) => {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(all, null, 2) + '\n');
};

export const hasConfig = () => fs.existsSync(configFile()) && !!readAll().library;

const folderOf = (id: string, v: ChannelValue | undefined) => (typeof v === 'string' ? v : v?.folder || id);

export const loadConfig = (): LibraryConfig => {
  const raw = (readAll().library ?? {}) as Partial<typeof DEFAULTS>;
  const values = { ...DEFAULTS.channels, ...raw.channels };
  const channels = Object.fromEntries(Object.entries(values).map(([id, v]) => [id, folderOf(id, v)]));
  const links = Object.fromEntries(Object.entries(values).flatMap(([id, v]) => (typeof v === 'object' && v?.projectId ? [[id, v.projectId]] : [])));
  const c = { ...DEFAULTS, ...raw, exclude: raw.exclude ?? DEFAULTS.exclude };
  return { root: expandHome(c.root), inbox: expandHome(c.inbox), deliverRoot: expandHome(c.deliverRoot), channels, links, exclude: c.exclude };
};

/** Merge into the `library` key, keeping everything else in the file (a linked channel keeps its project). */
export const saveConfig = (patch: Partial<Omit<LibraryConfig, 'links'>>) => {
  const all = readAll();
  const cur = (all.library ?? {}) as Partial<typeof DEFAULTS>;
  const library: Record<string, unknown> = { ...DEFAULTS, ...cur, ...patch };
  if (patch.channels) {
    const had = cur.channels ?? {};
    library.channels = Object.fromEntries(
      Object.entries(patch.channels).map(([id, folder]) => {
        const old = had[id];
        return [id, typeof old === 'object' && old?.projectId ? { ...old, folder } : folder];
      }),
    );
  }
  writeAll({ ...all, library });
  return loadConfig();
};

/** Link a channel to its team's cloud project (null unlinks it); its folder stays as it was. */
export const linkChannel = (channel: string, projectId: string | null) => {
  const all = readAll();
  const library = (all.library ?? {}) as Partial<typeof DEFAULTS>;
  const channels = { ...library.channels };
  if (!(channel in channels)) throw new Error(`Unknown channel "${channel}". Known: ${Object.keys(channels).join(', ') || 'none yet'} (add it to ${configFile()})`);
  const folder = folderOf(channel, channels[channel]);
  channels[channel] = projectId ? { folder, projectId } : folder;
  writeAll({ ...all, library: { ...library, channels } });
  return loadConfig();
};

/** The MediaMake site this machine talks to: MEDIAMAKE_API_URL, else `url` in the config. */
export const cloudUrl = () => {
  const url = process.env.MEDIAMAKE_API_URL?.trim() || readAll().url;
  return typeof url === 'string' && url.trim() ? url.trim().replace(/\/+$/, '') : null;
};

export const saveCloudUrl = (url: string) => writeAll({ ...readAll(), url: url.trim().replace(/\/+$/, '') });

/** The channel whose folder this is (Downloads/AMZ → animemusiczone). */
export const channelOfFolder = (cfg: LibraryConfig, folder: string) =>
  Object.entries(cfg.channels).find(([, f]) => f.toLowerCase() === folder.toLowerCase())?.[0];

/** A channel by its id or its folder (animemusiczone, AMZ). */
export const channelNamed = (cfg: LibraryConfig, name: string | undefined) => (!name ? undefined : name in cfg.channels ? name : channelOfFolder(cfg, name));
