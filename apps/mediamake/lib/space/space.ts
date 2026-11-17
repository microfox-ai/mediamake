/**
 * Spaces, as MediaMake knows them: the private git repos that hold what
 * members made for themselves (`mm space`, tools/space.mjs).
 *
 * - A member's own space (`user:<clientId>`): their private skills, MCPs
 *   and apps, the same on every computer of theirs.
 * - A project's space (`project:<projectId>`): what was made for that
 *   project, in a private repo its members are collaborators on, so
 *   everyone on the project pulls and pushes the same items.
 *
 * An item is in exactly one space, and which space says who gets it. Pure:
 * what a computer's report may hold, and how reports add up into the item
 * records. ./store keeps them; docs/private-spaces.md is the guide.
 *
 * MediaMake never holds a repo's contents or a GitHub token. A computer
 * reports names, versions, titles and one-line summaries, and git moves the
 * files with each member's own sign-in.
 */

export const SPACE_KINDS = ['skill', 'mcp', 'app'] as const;
export type SpaceKind = (typeof SPACE_KINDS)[number];

export const MAX_SPACE_ITEMS = 500;

/** An item's folder name: lower-case words joined by hyphens. Never a path. */
const ITEM_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A version as an item states it, or a short content hash: one short token. */
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+:-]{0,79}$/;
/** A repo's name for people: `owner/name` (or `host/owner/name`). Never an address with a sign-in. */
const REPO = /^[\w.-]{1,100}(\/[\w.-]{1,100}){1,2}$/;
const COMMIT = /^[0-9a-f]{7,40}$/;
const PROJECT_ID = /^[0-9a-f]{24}$/;

export const userSpaceId = (clientId: string) => `user:${clientId}`;
export const projectSpaceId = (projectId: string) => `project:${projectId}`;
/** The project a space id names, or null for a member's own space. */
export const projectOf = (spaceId: string) => (spaceId.startsWith('project:') ? spaceId.slice('project:'.length) : null);

/** `owner/name` as a report or a share may name a repo, or null. */
export const repoName = (value: unknown): string | null => (typeof value === 'string' && REPO.test(value.trim()) ? value.trim() : null);
/** A project id as a report may name it, or null. */
export const projectId = (value: unknown): string | null => (typeof value === 'string' && PROJECT_ID.test(value) ? value : null);

/** One item in a computer's report. */
export interface ReportedItem {
  kind: SpaceKind;
  name: string;
  version?: string;
  title?: string;
  summary?: string;
  /** Edited on that computer and not pushed yet. */
  changed?: boolean;
  /** How many media files it names in its item.json (they travel through the media library). */
  media?: number;
}

/** What one computer says its clone of a space holds. */
export interface SpaceReport {
  device: string;
  repo: string;
  /** The project whose space this is; none for the member's own. */
  project?: string;
  branch?: string;
  commit?: string;
  /** When that commit was made: ISO 8601. The newest one says which computer is up to date. */
  commitAt?: string;
  /** Everything on that computer is on GitHub. */
  pushed: boolean;
  items: ReportedItem[];
}

/** A computer that has a space. In a project's space they are several members' computers. */
export interface SpaceDevice {
  /** `<clientId>/<label>`: one member's computer. */
  key: string;
  clientId: string;
  /** The computer's random label (`mac-3f9a`). */
  label: string;
  branch?: string;
  commit?: string;
  commitAt?: string;
  pushed: boolean;
  reportedAt: string;
}

export interface SpaceRecord {
  /** `user:<clientId>` or `project:<projectId>`. */
  id: string;
  repo: string;
  connectedAt: string;
  updatedAt: string;
  devices: SpaceDevice[];
}

/** An item as one computer has it. */
export interface ItemOnDevice {
  /** A SpaceDevice's key. */
  device: string;
  version?: string;
  changed?: boolean;
}

/** One item of a space. */
export interface SpaceItemRecord {
  /** The space that holds it: `user:<clientId>` or `project:<projectId>`. */
  space: string;
  kind: SpaceKind;
  name: string;
  title: string;
  summary?: string;
  /** Its version on the computer that is furthest along. */
  version?: string;
  media?: number;
  devices: ItemOnDevice[];
  createdAt: string;
  updatedAt: string;
}

/** `skill/make-my-intro`: an item within its space. */
export const spaceItemKey = (item: { kind: string; name: string }) => `${item.kind}/${item.name}`;
export const deviceKey = (clientId: string, label: string) => `${clientId}/${label}`;

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || undefined;
};

/** A device's label as usage has it: a short random label, never a path. */
export const deviceLabel = (value: unknown): string => (typeof value === 'string' ? value.replace(/[^\w .()'-]/g, '').trim().slice(0, 80) : '') || 'computer';

/**
 * A computer's report: `{ device, repo, project, branch, commit, commitAt,
 * pushed, items: [{ kind, name, version, title, summary, changed, media }] }`.
 * Only these are read. An item whose name isn't a folder name is left out.
 */
export function parseSpaceReport(body: unknown): SpaceReport | { error: string } {
  const { device, repo, project, branch, commit, commitAt, pushed, items } = (body ?? {}) as Record<string, unknown>;
  const name = repoName(repo);
  if (!name) return { error: "Send { repo }: the space's repo as owner/name" };
  if (project !== undefined && !projectId(project)) return { error: 'project is a project id' };
  if (!Array.isArray(items)) return { error: 'Send { device, repo, items: [{ kind, name, version }] }' };
  if (items.length > MAX_SPACE_ITEMS) return { error: `Send ${MAX_SPACE_ITEMS} items at most` };
  const byKey = new Map<string, ReportedItem>();
  for (const entry of items) {
    const { kind, name: itemName, version, title, summary, changed, media } = (entry ?? {}) as Record<string, unknown>;
    if (typeof kind !== 'string' || !(SPACE_KINDS as readonly string[]).includes(kind)) continue;
    if (typeof itemName !== 'string' || itemName.length > 100 || !ITEM_NAME.test(itemName)) continue;
    const v = typeof version === 'string' && VERSION.test(version.trim()) ? version.trim() : undefined;
    const count = typeof media === 'number' && Number.isInteger(media) && media > 0 ? Math.min(media, 9999) : undefined;
    const item: ReportedItem = {
      kind: kind as SpaceKind,
      name: itemName,
      ...(v && { version: v }),
      ...(text(title, 120) && { title: text(title, 120) }),
      ...(text(summary, 200) && { summary: text(summary, 200) }),
      ...(changed === true && { changed: true }),
      ...(count && { media: count }),
    };
    byKey.set(spaceItemKey(item), item);
  }
  const when = typeof commitAt === 'string' ? Date.parse(commitAt) : NaN;
  return {
    device: deviceLabel(device),
    repo: name,
    ...(typeof project === 'string' && { project }),
    ...(text(branch, 100) && { branch: text(branch, 100) }),
    ...(typeof commit === 'string' && COMMIT.test(commit) && { commit }),
    ...(Number.isFinite(when) && { commitAt: new Date(when).toISOString() }),
    pushed: pushed === true,
    items: [...byKey.values()],
  };
}

const humanize = (name: string) => name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

/** Computers by how far along they are: the newest commit first, then everything pushed, then the latest report. */
const byProgress = (a: SpaceDevice, b: SpaceDevice) =>
  (b.commitAt ?? '').localeCompare(a.commitAt ?? '') || Number(b.pushed) - Number(a.pushed) || b.reportedAt.localeCompare(a.reportedAt) || a.key.localeCompare(b.key);

/** An item's version on the computer furthest along that has it, else on any. */
function versionOf(devices: ItemOnDevice[], order: SpaceDevice[]): string | undefined {
  const rank = new Map(order.map((device, index) => [device.key, index]));
  return [...devices].filter(on => on.version).sort((a, b) => (rank.get(a.device) ?? 999) - (rank.get(b.device) ?? 999))[0]?.version;
}

export interface SpaceState {
  space: SpaceRecord | null;
  items: SpaceItemRecord[];
}

export interface SpaceChange {
  space: SpaceRecord;
  /** Every item after the report: new, changed and untouched. */
  items: SpaceItemRecord[];
  /** Keys (`kind/name`) of items no computer has any more. */
  removed: string[];
}

/**
 * A space after one computer's report. That computer's list replaces what
 * it said before: an item it no longer lists loses that computer, and an
 * item no computer has is removed. Another repo starts the list of
 * computers again. Titles and summaries follow the computer that is
 * furthest along.
 */
export function applyReport(state: SpaceState, spaceId: string, clientId: string, report: SpaceReport, now = new Date().toISOString()): SpaceChange {
  const sameRepo = state.space?.repo === report.repo;
  const key = deviceKey(clientId, report.device);
  const others = sameRepo ? state.space!.devices.filter(device => device.key !== key) : [];
  const device: SpaceDevice = {
    key,
    clientId,
    label: report.device,
    ...(report.branch && { branch: report.branch }),
    ...(report.commit && { commit: report.commit }),
    ...(report.commitAt && { commitAt: report.commitAt }),
    pushed: report.pushed,
    reportedAt: now,
  };
  const order = [device, ...others].sort(byProgress);
  const leads = order[0].key === key;
  const known = new Set(order.map(d => d.key));

  const reported = new Map(report.items.map(item => [spaceItemKey(item), item]));
  const items: SpaceItemRecord[] = [];
  const removed: string[] = [];
  for (const record of state.items) {
    const itemKey = spaceItemKey(record);
    const item = reported.get(itemKey);
    reported.delete(itemKey);
    const on = record.devices.filter(entry => entry.device !== key && known.has(entry.device));
    if (item) on.unshift({ device: key, ...(item.version && { version: item.version }), ...(item.changed && { changed: true }) });
    if (!on.length) {
      removed.push(itemKey);
      continue;
    }
    const takes = item && (leads || on.length === 1);
    const version = versionOf(on, order);
    const next: SpaceItemRecord = { ...record, title: (takes && item.title) || record.title, devices: on };
    if (takes) {
      if (item.summary) next.summary = item.summary;
      else delete next.summary;
      if (item.media) next.media = item.media;
      else delete next.media;
    }
    if (version) next.version = version;
    else delete next.version;
    const same = JSON.stringify({ ...record, updatedAt: '' }) === JSON.stringify({ ...next, updatedAt: '' });
    items.push(same ? record : { ...next, updatedAt: now });
  }
  for (const item of reported.values()) {
    items.push({
      space: spaceId,
      kind: item.kind,
      name: item.name,
      title: item.title ?? humanize(item.name),
      ...(item.summary && { summary: item.summary }),
      ...(item.version && { version: item.version }),
      ...(item.media && { media: item.media }),
      devices: [{ device: key, ...(item.version && { version: item.version }), ...(item.changed && { changed: true }) }],
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    space: { id: spaceId, repo: report.repo, connectedAt: sameRepo ? state.space!.connectedAt : now, updatedAt: now, devices: order },
    items,
    removed,
  };
}

/** A space after one computer disconnected: the computer gone from it and from its items. */
export function dropDevice(state: SpaceState, spaceId: string, clientId: string, label: string, now = new Date().toISOString()): SpaceChange | null {
  const key = deviceKey(clientId, label);
  if (!state.space || !state.space.devices.some(d => d.key === key)) return null;
  const change = applyReport(state, spaceId, clientId, { device: label, repo: state.space.repo, pushed: true, items: [] }, now);
  return { ...change, space: { ...change.space, devices: change.space.devices.filter(d => d.key !== key) } };
}

/* ---------- What Mine shows ---------- */

/** A computer as the page names it. */
export interface DeviceView {
  key: string;
  /** `Mac 3f9a`, and `Asha's Mac 3f9a` for another member's. */
  name: string;
  mine: boolean;
}

/**
 * Where an item stands, in one word:
 * - `synced`: every computer that has the space has the newest version.
 * - `unsent`: changed on a computer and not pushed yet.
 * - `behind`: some computer has an older version, or doesn't have it yet.
 */
export type ItemSync = 'synced' | 'unsent' | 'behind';

export interface SpaceItemView {
  key: string;
  kind: SpaceKind;
  name: string;
  title: string;
  summary?: string;
  /** A version a person stated (`1.2.0`); a content hash is left out. */
  version?: string;
  media?: number;
  sync: ItemSync;
  /** The computers with edits that were not pushed. */
  unsentOn: DeviceView[];
  /** The computers with an older version, or without it. */
  behindOn: DeviceView[];
  /** How many computers have the newest version. */
  upToDate: number;
}

export interface SpaceView {
  id: string;
  repo: string;
  /** Its page on GitHub, when the repo is there. */
  repoUrl?: string;
  devices: (DeviceView & { reportedAt: string; pushed: boolean; behind: boolean })[];
  items: SpaceItemView[];
}

/** `mac-3f9a` → `Mac 3f9a`. */
export function deviceName(label: string, owner?: string): string {
  const [kind, ...rest] = label.split('-');
  const system = { mac: 'Mac', windows: 'Windows PC', linux: 'Linux PC', darwin: 'Mac', win32: 'Windows PC' }[kind];
  const name = system && rest.length ? `${system} ${rest.join('-')}` : label;
  return owner ? `${owner}'s ${name}` : name;
}

/** A version a person would recognise, not the hash an item without one reports. */
const stated = (version?: string) => (version && !/^(sha|tree):/.test(version) && version !== 'new' ? version : undefined);

/**
 * A space for the page: every item with where it stands. `me` is the
 * viewer; `names` gives the other members' names in a project's space.
 */
export function spaceView(state: SpaceState, me: string, names: Record<string, string> = {}): SpaceView | null {
  const { space } = state;
  if (!space) return null;
  const order = [...space.devices].sort(byProgress);
  const lead = order[0];
  const view = (device: SpaceDevice): DeviceView => ({
    key: device.key,
    name: deviceName(device.label, device.clientId === me ? undefined : (names[device.clientId] ?? 'A member')),
    mine: device.clientId === me,
  });
  const byKey = new Map(space.devices.map(device => [device.key, device]));
  const kindOrder = (kind: SpaceKind) => SPACE_KINDS.indexOf(kind);
  const items = state.items
    .map((item): SpaceItemView => {
      const has = new Map(item.devices.map(on => [on.device, on]));
      const unsentOn: DeviceView[] = [];
      const behindOn: DeviceView[] = [];
      let upToDate = 0;
      for (const device of space.devices) {
        const on = has.get(device.key);
        if (on?.changed) unsentOn.push(view(device));
        else if (!on || (on.version && item.version && on.version !== item.version)) behindOn.push(view(device));
        else upToDate++;
      }
      const version = stated(item.version);
      return {
        key: spaceItemKey(item),
        kind: item.kind,
        name: item.name,
        title: item.title,
        ...(item.summary && { summary: item.summary }),
        ...(version && { version }),
        ...(item.media && { media: item.media }),
        sync: unsentOn.length ? 'unsent' : behindOn.length ? 'behind' : 'synced',
        unsentOn,
        behindOn,
        upToDate,
      };
    })
    .sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name));
  return {
    id: space.id,
    repo: space.repo,
    ...(space.repo.split('/').length === 2 && { repoUrl: `https://github.com/${space.repo}` }),
    devices: order
      .filter(device => byKey.has(device.key))
      .map(device => ({
        ...view(device),
        reportedAt: device.reportedAt,
        pushed: device.pushed,
        behind: !!lead?.commit && !!device.commit && device.commit !== lead.commit,
      })),
    items,
  };
}

/** A project's space on the page, with who is on the project. */
export interface ProjectSpaceView {
  projectId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  /** How many people are on the project, the owner included. */
  people: number;
  /** The owner's name: who to ask when the project's repo hasn't invited you. */
  owner?: string;
  /** Null until someone shared the first item into the project. */
  space: SpaceView | null;
}
