/**
 * What a Claude cloud environment (a cloud session, a routine) needs to run a space: the repos to add to
 * it, the keys to set in it, and what stays on a device. Pure: read from what the space's computers
 * reported (each item's needs, lib/space/places.ts), so it names keys and never holds one.
 * docs/cloud-device-runs.md is the guide; `mm cloud` checks the same list inside the session.
 */
import { deviceOnly, keyInfo, type KeyInfo } from './places';

/** MediaMake itself: the studio, `mm` and the renders. Every environment needs it. */
export const FRAMEWORK_REPO = 'microfox-ai/mediamake';

/** An item as the setup reads it: a space's own, or a linked one. */
export interface SetupItem {
  kind: string;
  name: string;
  title: string;
  /** Left out when the item doesn't say (a skill with no run sheet yet). */
  needs?: string[];
}

export interface SetupRepo {
  repo: string;
  url?: string;
  /** What it brings, in a few words. */
  why: string;
}

export interface SetupKey extends KeyInfo {
  /** The items that need it, by title. Empty for MediaMake's own. */
  usedBy: string[];
  why?: string;
}

export interface CloudSetup {
  repos: SetupRepo[];
  keys: SetupKey[];
  /** The hosts the keys call, and MediaMake's file storage, for an environment that allows only named domains. */
  hosts: string[];
  /** What only a device has: those steps never run in the cloud. */
  device: { need: string; label: string; usedBy: string[] }[];
  /** Skills that don't say what they need yet (no run sheet): their keys aren't in the list. */
  unknown: string[];
}

const github = (repo: string) => (repo.split('/').length === 2 ? `https://github.com/${repo}` : undefined);

/** A need in plain words: `browser:youtube/atomic-rap` → "a browser signed in to youtube as atomic-rap". */
export function needLabel(need: string): string {
  const [kind, ...rest] = need.split(':');
  const what = rest.join(':');
  if (kind === 'key') return `the ${keyInfo(what).title} key`;
  if (kind === 'mcp') return `the ${what} MCP`;
  if (kind === 'app') return `the ${what} app`;
  if (kind === 'media') return 'the media library';
  if (kind === 'browser') {
    const [site, account] = what.split('/');
    return `a browser signed in to ${site}${account ? ` as ${account}` : ''}`;
  }
  return 'a place that renders';
}

/**
 * The setup for one space. `space`: its repo and items (null until a computer reported it); `linked`: the
 * items linked to it, each in a repo of its own.
 */
export function cloudSetup(input: {
  personal?: boolean;
  space: { repo: string; repoUrl?: string; items: SetupItem[] } | null;
  linked?: { repo: string; repoUrl?: string; title: string; items: SetupItem[] }[];
  /** The host of MediaMake's file storage, where a run saves and fetches productions and releases. */
  storage?: string;
}): CloudSetup {
  const { personal = false, space, linked = [], storage } = input;
  const repos: SetupRepo[] = [{ repo: FRAMEWORK_REPO, url: github(FRAMEWORK_REPO), why: 'MediaMake itself: the studio, mm and the renders' }];
  if (space) repos.push({ repo: space.repo, url: space.repoUrl ?? github(space.repo), why: personal ? 'Your space: your skills, MCPs and apps' : "This space: the project's skills, MCPs and apps" });
  for (const item of linked) if (!repos.some(r => r.repo === item.repo)) repos.push({ repo: item.repo, url: item.repoUrl ?? github(item.repo), why: `Linked: ${item.title}` });

  const keys = new Map<string, string[]>([['mediamake', []]]);
  const device = new Map<string, string[]>();
  const unknown: string[] = [];
  const add = (into: Map<string, string[]>, key: string, title: string) => {
    const by = into.get(key) ?? [];
    if (!by.includes(title)) by.push(title);
    into.set(key, by);
  };
  for (const item of [...(space?.items ?? []), ...linked.flatMap(l => l.items)]) {
    if (!item.needs) {
      if (item.kind === 'skill' && !unknown.includes(item.title)) unknown.push(item.title);
      continue;
    }
    for (const need of item.needs) {
      if (need.startsWith('key:')) add(keys, need.slice('key:'.length), item.title);
      else if (deviceOnly(need)) add(device, need, item.title);
    }
  }
  const list = [...keys].map(
    ([name, usedBy]): SetupKey => ({
      ...keyInfo(name),
      usedBy,
      ...(name === 'mediamake' && { why: 'Signs the session in to MediaMake: this page, the productions and the releases' }),
    }),
  );
  return {
    repos,
    keys: list,
    hosts: [...new Set([...list.map(key => key.host), storage].filter((host): host is string => !!host))],
    device: [...device].map(([need, usedBy]) => ({ need, label: needLabel(need), usedBy })),
    unknown,
  };
}

/** The line every cloud session starts with: it connects the space, links its skills and says what is missing. */
export const CLOUD_LINE = 'npm run mm -- cloud';

/** A name for the environment (`MEDIAMAKE_PLACE`), from the space's repo: `ana/mediamake-doomcat` → `doomcat-cloud`. */
export function placeName(repo?: string): string {
  const base = (repo?.split('/').pop() ?? '')
    .toLowerCase()
    .replace(/^mediamake-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base && base !== 'space' ? base.slice(0, 40) : 'my'}-cloud`;
}

/**
 * The environment's variables as .env lines: every key by its name with nothing after the `=`, then
 * the environment's name. Pasted into the environment's variables, where each value is filled in: a
 * value is never known here.
 */
export function envLines(setup: Pick<CloudSetup, 'keys'>, place?: string): string {
  return [...setup.keys.map(key => `${key.env}=`), ...(place ? [`MEDIAMAKE_PLACE=${place}`] : [])].join('\n');
}

/**
 * The whole setup as plain text, in the order it is done: for a note, a teammate, or Claude. The
 * variables are clean .env lines (a note about one is a `#` line above it, never after the `=`).
 */
export function setupText(setup: CloudSetup, input: { name?: string; place?: string } = {}): string {
  const { name, place } = input;
  const lines = [`Set up a Claude cloud environment for ${name ?? 'this space'} (MediaMake)`, '', '1. Add these repositories to the environment:', ...setup.repos.map(repo => `${repo.repo}`)];
  lines.push('', "2. Set these as the environment's variables. Fill in each value there, never in a chat or a file:");
  for (const key of setup.keys) lines.push(`# ${key.title} key${key.from ? `: ${key.from}` : ''}`, `${key.env}=`);
  if (place) lines.push('# A name for this environment, any you like', `MEDIAMAKE_PLACE=${place}`);
  if (setup.unknown.length) lines.push(`# ${setup.unknown.join(', ')}: no run sheet yet, so a key may be missing from this list`);
  lines.push('', `3. Network access: Full${setup.hosts.length ? ', or Limited with these domains allowed:' : '.'}`, ...setup.hosts);
  lines.push('', "4. Start each session, or a routine's instructions, with this line:", CLOUD_LINE);
  if (setup.device.length) lines.push('', 'Stays on a computer (a cloud session stops at these steps and posts each as a to-do for a computer that has it):', ...setup.device.map(d => `${d.label} (${d.usedBy.join(', ')})`));
  return lines.join('\n');
}
