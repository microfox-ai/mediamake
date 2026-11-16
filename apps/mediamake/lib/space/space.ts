/**
 * A member's private space, as MediaMake knows it: the private git repo
 * that holds their own skills, MCPs and apps (`mm space`, tools/space.mjs),
 * and for each item its version and which of their computers have it.
 * Pure: what a computer's report may hold, and how reports add up into the
 * item records. ./store keeps them; docs/private-spaces.md is the guide.
 *
 * MediaMake never holds the repo's contents or a GitHub token. A computer
 * reports names, versions, titles and one-line summaries, and git moves the
 * files between the member's computers with their own sign-in.
 *
 * The item record is also where sharing lives (step 2b): `projects` (any
 * number of projects whose members get the item), `people` (members named
 * one by one) and `editors` (who besides the owner may change it). A report
 * from a computer never touches those three: only the owner's actions in
 * the app do.
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

/** What one computer says its clone of the space holds. */
export interface SpaceReport {
  device: string;
  repo: string;
  branch?: string;
  commit?: string;
  /** When that commit was made: ISO 8601. The newest one says which computer is up to date. */
  commitAt?: string;
  /** Everything on that computer is on GitHub. */
  pushed: boolean;
  items: ReportedItem[];
}

/** A computer that has the space. */
export interface SpaceDevice {
  device: string;
  branch?: string;
  commit?: string;
  commitAt?: string;
  pushed: boolean;
  reportedAt: string;
}

/** A member's space: one per account. */
export interface SpaceRecord {
  clientId: string;
  repo: string;
  connectedAt: string;
  updatedAt: string;
  devices: SpaceDevice[];
}

/** An item as one computer has it. */
export interface ItemOnDevice {
  device: string;
  version?: string;
  changed?: boolean;
}

/**
 * One private item. It lives in its owner's space (one copy, one history),
 * whoever it is shared with.
 */
export interface SpaceItemRecord {
  /** The account whose space holds it. */
  owner: string;
  kind: SpaceKind;
  name: string;
  title: string;
  summary?: string;
  /** Its version on the computer that is furthest along. */
  version?: string;
  media?: number;
  devices: ItemOnDevice[];
  /** Step 2b. The projects it is linked to: every member of one gets it. */
  projects: string[];
  /** Step 2b. Members it is shared with one by one (client ids). */
  people: string[];
  /** Step 2b. Who besides the owner may change it (client ids). */
  editors: string[];
  createdAt: string;
  updatedAt: string;
}

/** `skill/make-my-intro`: an item within its owner's space. */
export const spaceItemKey = (item: { kind: string; name: string }) => `${item.kind}/${item.name}`;
/** `<owner>:skill/make-my-intro`: an item among everyone's, for links from projects and people. */
export const spaceItemId = (item: { owner: string; kind: string; name: string }) => `${item.owner}:${spaceItemKey(item)}`;

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || undefined;
};

/** A device's label as usage has it: a short random label, never a path. */
export const deviceLabel = (value: unknown): string => (typeof value === 'string' ? value.replace(/[^\w .()'-]/g, '').trim().slice(0, 80) : '') || 'computer';

/**
 * A computer's report: `{ device, repo, branch, commit, commitAt, pushed,
 * items: [{ kind, name, version, title, summary, changed, media }] }`.
 * Only these are read. An item whose name isn't a folder name is left out.
 */
export function parseSpaceReport(body: unknown): SpaceReport | { error: string } {
  const { device, repo, branch, commit, commitAt, pushed, items } = (body ?? {}) as Record<string, unknown>;
  if (typeof repo !== 'string' || !REPO.test(repo.trim())) return { error: 'Send { repo }: the space\'s repo as owner/name' };
  if (!Array.isArray(items)) return { error: 'Send { device, repo, items: [{ kind, name, version }] }' };
  if (items.length > MAX_SPACE_ITEMS) return { error: `Send ${MAX_SPACE_ITEMS} items at most` };
  const byKey = new Map<string, ReportedItem>();
  for (const entry of items) {
    const { kind, name, version, title, summary, changed, media } = (entry ?? {}) as Record<string, unknown>;
    if (typeof kind !== 'string' || !(SPACE_KINDS as readonly string[]).includes(kind)) continue;
    if (typeof name !== 'string' || name.length > 100 || !ITEM_NAME.test(name)) continue;
    const v = typeof version === 'string' && VERSION.test(version.trim()) ? version.trim() : undefined;
    const count = typeof media === 'number' && Number.isInteger(media) && media > 0 ? Math.min(media, 9999) : undefined;
    const item: ReportedItem = {
      kind: kind as SpaceKind,
      name,
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
    repo: repo.trim(),
    ...(text(branch, 100) && { branch: text(branch, 100) }),
    ...(typeof commit === 'string' && COMMIT.test(commit) && { commit }),
    ...(Number.isFinite(when) && { commitAt: new Date(when).toISOString() }),
    pushed: pushed === true,
    items: [...byKey.values()],
  };
}

const humanize = (name: string) => name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

/** Whether an item is shared with anyone (step 2b): such an item is kept even when no computer reports it. */
export const isShared = (item: Pick<SpaceItemRecord, 'projects' | 'people'>) => item.projects.length > 0 || item.people.length > 0;

/** Computers by how far along they are: the newest commit first, then everything pushed, then the latest report. */
const byProgress = (a: SpaceDevice, b: SpaceDevice) =>
  (b.commitAt ?? '').localeCompare(a.commitAt ?? '') || Number(b.pushed) - Number(a.pushed) || b.reportedAt.localeCompare(a.reportedAt) || a.device.localeCompare(b.device);

/** An item's version on the computer furthest along that has it, else on any. */
function versionOf(devices: ItemOnDevice[], order: SpaceDevice[]): string | undefined {
  const rank = new Map(order.map((device, index) => [device.device, index]));
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
  /** Keys (`kind/name`) of items no computer has any more and nobody shares. */
  removed: string[];
}

/**
 * The space after one computer's report. That computer's list replaces
 * what it said before: an item it no longer lists loses that computer, and
 * an item no computer has is removed unless it is shared. Connecting
 * another repo starts the list of computers again. Titles and summaries
 * follow the computer that is furthest along. Sharing is never touched.
 */
export function applyReport(state: SpaceState, clientId: string, report: SpaceReport, now = new Date().toISOString()): SpaceChange {
  const sameRepo = state.space?.repo === report.repo;
  const others = sameRepo ? state.space!.devices.filter(device => device.device !== report.device) : [];
  const device: SpaceDevice = {
    device: report.device,
    ...(report.branch && { branch: report.branch }),
    ...(report.commit && { commit: report.commit }),
    ...(report.commitAt && { commitAt: report.commitAt }),
    pushed: report.pushed,
    reportedAt: now,
  };
  const devices = [device, ...others];
  const order = [...devices].sort(byProgress);
  const leads = order[0].device === report.device;
  const known = new Set(devices.map(d => d.device));

  const reported = new Map(report.items.map(item => [spaceItemKey(item), item]));
  const items: SpaceItemRecord[] = [];
  const removed: string[] = [];
  for (const record of state.items) {
    const key = spaceItemKey(record);
    const item = reported.get(key);
    reported.delete(key);
    const on = record.devices.filter(entry => entry.device !== report.device && known.has(entry.device));
    if (item) on.unshift({ device: report.device, ...(item.version && { version: item.version }), ...(item.changed && { changed: true }) });
    if (!on.length && !isShared(record)) {
      removed.push(key);
      continue;
    }
    const takes = item && (leads || on.length === 1);
    const version = versionOf(on, order);
    const next: SpaceItemRecord = {
      ...record,
      title: (takes && item.title) || record.title,
      devices: on,
    };
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
      owner: clientId,
      kind: item.kind,
      name: item.name,
      title: item.title ?? humanize(item.name),
      ...(item.summary && { summary: item.summary }),
      ...(item.version && { version: item.version }),
      ...(item.media && { media: item.media }),
      devices: [{ device: report.device, ...(item.version && { version: item.version }), ...(item.changed && { changed: true }) }],
      projects: [],
      people: [],
      editors: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    space: { clientId, repo: report.repo, connectedAt: sameRepo ? state.space!.connectedAt : now, updatedAt: now, devices: order },
    items,
    removed,
  };
}

/** The space after one computer disconnected: `applyReport` with nothing on it, and the computer gone. */
export function dropDevice(state: SpaceState, clientId: string, device: string, now = new Date().toISOString()): SpaceChange | null {
  if (!state.space || !state.space.devices.some(d => d.device === device)) return null;
  const change = applyReport(state, clientId, { device, repo: state.space.repo, pushed: true, items: [] }, now);
  return { ...change, space: { ...change.space, devices: change.space.devices.filter(d => d.device !== device) } };
}

/* ---------- What Mine shows ---------- */

export interface SpaceItemView {
  key: string;
  kind: SpaceKind;
  name: string;
  title: string;
  summary?: string;
  version?: string;
  media?: number;
  /** Each computer that has it: its version, whether that is behind the newest, and edits not pushed. */
  on: { device: string; version?: string; behind?: boolean; changed?: boolean }[];
  /** The computers that have the space but not this item yet. */
  missingOn: string[];
  /** How many projects it is linked to (step 2b). */
  projects: number;
}

export interface SpaceView {
  repo: string;
  connectedAt: string;
  devices: { device: string; reportedAt: string; commit?: string; pushed: boolean; behind: boolean }[];
  items: SpaceItemView[];
}

/** A member's space for Mine: every item, its version, and which computers have it. */
export function spaceView(state: SpaceState): SpaceView | null {
  const { space } = state;
  if (!space) return null;
  const lead = [...space.devices].sort(byProgress)[0];
  const devices = space.devices.map(device => ({
    device: device.device,
    reportedAt: device.reportedAt,
    ...(device.commit && { commit: device.commit }),
    pushed: device.pushed,
    behind: !!lead?.commit && !!device.commit && device.commit !== lead.commit && device.device !== lead.device,
  }));
  const kindOrder = (kind: SpaceKind) => SPACE_KINDS.indexOf(kind);
  const items = state.items
    .map(item => {
      const has = new Set(item.devices.map(on => on.device));
      return {
        key: spaceItemKey(item),
        kind: item.kind,
        name: item.name,
        title: item.title,
        ...(item.summary && { summary: item.summary }),
        ...(item.version && { version: item.version }),
        ...(item.media && { media: item.media }),
        on: item.devices.map(on => ({
          device: on.device,
          ...(on.version && { version: on.version }),
          ...(on.version && item.version && on.version !== item.version && { behind: true }),
          ...(on.changed && { changed: true }),
        })),
        missingOn: space.devices.filter(device => !has.has(device.device)).map(device => device.device),
        projects: item.projects.length,
      };
    })
    .sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name));
  return { repo: space.repo, connectedAt: space.connectedAt, devices, items };
}
