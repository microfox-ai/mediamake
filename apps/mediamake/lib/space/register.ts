/**
 * The access register: what each place can do, so a project knows where a step can run
 * (docs/cloud-device-runs.md). A place is a member's computer (`mm access` reports it) or a Claude
 * cloud environment (`mm cloud` reports it). Pure: what a report may hold, who may change a place and
 * what a project's page shows. ./register-store keeps the records.
 *
 * It holds facts, never a secret: a key by its name, a sign-in by its site and account.
 *
 * - A computer is its owner's. It is closed to every project until its owner opens it to one, and the
 *   owner closes it again or marks it busy at any time. Closed, only its owner sees it.
 * - A cloud environment belongs to the projects whose space repos it holds, and everyone on those
 *   projects sees it.
 */
import { deviceOnly, keyInfo, needList } from './places';
import { needLabel, type SetupItem } from './cloud-setup';
import { deviceLabel, deviceName, projectId, repoName } from './space';

export type PlaceKind = 'device' | 'cloud';

export interface PlaceRecord {
  /** `device:<clientId>/<label>` or `cloud:<clientId>/<label>`. */
  id: string;
  kind: PlaceKind;
  /** A computer's owner; for a cloud environment, the account whose key it reports with. */
  clientId: string;
  /** A computer's random label (`mac-3f9a`); a cloud environment's name. */
  label: string;
  /** The name its owner gave it: "Studio Mac". */
  name?: string;
  /** What it can do, in the words of ./places. */
  can: string[];
  /** The spend limit beside a key, as its owner wrote it: `{ elevenlabs: "unlimited" }`. */
  limits?: Record<string, string>;
  /** A computer: the projects its owner opened it to. A cloud environment: the projects whose space it holds. */
  projects: string[];
  /** Its owner said not to use it for now. */
  busy?: boolean;
  /** A cloud environment: the space repos it holds. */
  repos?: string[];
  reportedAt: string;
}

export const placeId = (kind: PlaceKind, clientId: string, label: string) => `${kind}:${clientId}/${label}`;
/** A place's id as a request may name it, or null. */
export const placeIdOf = (value: unknown): string | null => (typeof value === 'string' && /^(device|cloud):[^/\s]{1,100}\/[\w .()'-]{1,80}$/.test(value) ? value : null);

/** What a computer or a cloud session reports about itself. */
export interface PlaceReport {
  kind: PlaceKind;
  label: string;
  name?: string;
  can: string[];
  limits?: Record<string, string>;
  repos?: string[];
}

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || undefined;
};

/** A cloud environment's name: a few plain words. */
const cloudName = (value: unknown) => (typeof value === 'string' ? value.replace(/[^\w .()'-]/g, '').trim().slice(0, 80) : '') || 'cloud';

/**
 * A report: `{ kind, device, name?, can: ["render", "key:elevenlabs"], limits?: { elevenlabs: "unlimited" },
 * repos?: ["owner/mediamake-x"] }`. Only these are read, and of `can` only the known words. A cloud
 * environment never has what only a device has.
 */
export function parsePlaceReport(body: unknown): PlaceReport | { error: string } {
  const { kind, device, name, can, limits, repos } = (body ?? {}) as Record<string, unknown>;
  if (kind !== 'device' && kind !== 'cloud') return { error: 'Send { kind: "device" | "cloud", device, can: [...] }' };
  if (!Array.isArray(can)) return { error: 'can is a list of what this place can do' };
  const words = needList(can).filter(need => kind === 'device' || !deviceOnly(need));
  const kept: Record<string, string> = {};
  if (limits && typeof limits === 'object' && !Array.isArray(limits)) {
    for (const [key, value] of Object.entries(limits as Record<string, unknown>).slice(0, 40)) {
      if (/^[a-z0-9][a-z0-9._-]{0,63}$/.test(key) && words.includes(`key:${key}`) && text(value, 80)) kept[key] = text(value, 80)!;
    }
  }
  const named = kind === 'cloud' && Array.isArray(repos) ? [...new Set(repos.map(repoName).filter((repo): repo is string => !!repo))].slice(0, 50) : [];
  return {
    kind,
    label: kind === 'cloud' ? cloudName(device) : deviceLabel(device),
    ...(text(name, 60) && { name: text(name, 60) }),
    can: words,
    ...(Object.keys(kept).length && { limits: kept }),
    ...(named.length && { repos: named }),
  };
}

/**
 * A place after its report. What it can do, its limits and its repos are replaced; the name stays when
 * the report has none. A computer keeps the projects its owner opened it to; a cloud environment's are
 * `projects`, the ones whose space it holds (the store works them out from its repos).
 */
export function applyPlaceReport(before: PlaceRecord | null, clientId: string, report: PlaceReport, projects: string[], now = new Date().toISOString()): PlaceRecord {
  const name = report.name ?? before?.name;
  return {
    id: placeId(report.kind, clientId, report.label),
    kind: report.kind,
    clientId,
    label: report.label,
    ...(name && { name }),
    can: report.can,
    ...(report.limits && { limits: report.limits }),
    projects: report.kind === 'cloud' ? [...new Set(projects)] : (before?.projects ?? []),
    ...(before?.busy && { busy: true }),
    ...(report.repos && { repos: report.repos }),
    reportedAt: now,
  };
}

/** What a place's owner may ask: open it to a project or close it, mark it busy or free, name it, forget it. */
export type PlaceAction =
  | { action: 'open' | 'close'; place: string; project: string }
  | { action: 'busy' | 'free' | 'forget'; place: string }
  | { action: 'name'; place: string; name: string };

export function parsePlaceAction(body: unknown): PlaceAction | { error: string } {
  const { action, place, project, name } = (body ?? {}) as Record<string, unknown>;
  const id = placeIdOf(place);
  if (!id) return { error: 'place is a place id' };
  if (action === 'open' || action === 'close') {
    const to = projectId(project);
    return to ? { action, place: id, project: to } : { error: 'project is a project id' };
  }
  if (action === 'busy' || action === 'free' || action === 'forget') return { action, place: id };
  if (action === 'name') return text(name, 60) ? { action, place: id, name: text(name, 60)! } : { error: 'name is a few words' };
  return { error: 'action is open, close, busy, free, name or forget' };
}

/**
 * A place after its owner's ask, or an error: only its owner changes it, and only a computer is opened
 * or closed (a cloud environment follows its repos). `forget` is the store's.
 */
export function applyPlaceAction(place: PlaceRecord, clientId: string, ask: Exclude<PlaceAction, { action: 'forget' }>): PlaceRecord | { error: string } {
  if (place.clientId !== clientId) return { error: 'Only its owner changes a place' };
  if (ask.action === 'open' || ask.action === 'close') {
    if (place.kind !== 'device') return { error: "A cloud environment belongs to the projects whose space it holds: it isn't opened or closed" };
    const rest = place.projects.filter(id => id !== ask.project);
    return { ...place, projects: ask.action === 'open' ? [...rest, ask.project] : rest };
  }
  if (ask.action === 'name') return { ...place, name: ask.name };
  const next = { ...place };
  if (ask.action === 'busy') next.busy = true;
  else delete next.busy;
  return next;
}

/* ---------- What the page shows ---------- */

export interface PlaceView {
  id: string;
  kind: PlaceKind;
  /** "Studio Mac", else `Mac 3f9a` (`Asha's Mac 3f9a` for another member's), a cloud environment's name. */
  name: string;
  /** Whose it is, for another member's. */
  owner?: string;
  mine: boolean;
  /**
   * - `open`: the project's runs may use it, with nobody at it.
   * - `busy`: open, and its owner said not for now.
   * - `closed`: a computer of the viewer's own that this project can't use.
   */
  status: 'open' | 'busy' | 'closed';
  /** What it can do: `{ need: "key:elevenlabs", label: "the ElevenLabs key", limit?: "unlimited" }`. */
  can: { need: string; label: string; limit?: string }[];
  repos?: string[];
  reportedAt: string;
}

export interface NeedView {
  need: string;
  label: string;
  /** The items that need it, by title. */
  usedBy: string[];
  /** Only a device can have it. */
  device: boolean;
  /** The places open to the project that have it, by name. Empty: no place can run that step yet. */
  places: string[];
}

export interface AccessView {
  places: PlaceView[];
  /** What the space's skills, MCPs and apps need, and which place has each. */
  needs: NeedView[];
  /** Skills that don't say what they need yet (no run sheet). */
  unknown: string[];
  /** The project's owners: they look after its keys and environments. */
  admins: string[];
}

/** Does a place that can do `can` have `need`? A sign-in as a named account also covers the site alone. */
export const placeHas = (can: string[], need: string): boolean =>
  can.includes(need) || (need.startsWith('browser:') && !need.includes('/') && can.some(c => c.startsWith(`${need}/`)));

const canLabel = (need: string) => (need === 'render' ? 'renders' : need.startsWith('key:') ? `the ${keyInfo(need.slice(4)).title} key` : needLabel(need));

/**
 * A project's register for one viewer: its cloud environments, the computers open to it, and the
 * viewer's own computers (open or not). Another member's closed computer is never shown.
 */
export function accessView(input: { project: string; me: string; places: PlaceRecord[]; items: SetupItem[]; names?: Record<string, string>; admins?: string[] }): AccessView {
  const { project, me, items, names = {}, admins = [] } = input;
  const places = input.places
    .filter(place => place.projects.includes(project) || (place.kind === 'device' && place.clientId === me))
    .map((place): PlaceView => {
      const mine = place.clientId === me;
      const owner = mine ? undefined : (names[place.clientId] ?? 'A member');
      const open = place.projects.includes(project);
      return {
        id: place.id,
        kind: place.kind,
        name: place.name ?? (place.kind === 'cloud' ? (place.label === 'cloud' ? 'Cloud environment' : place.label) : deviceName(place.label, owner)),
        ...(owner && place.kind === 'device' && { owner }),
        mine,
        status: !open ? 'closed' : place.busy ? 'busy' : 'open',
        can: place.can.map(need => ({ need, label: canLabel(need), ...(need.startsWith('key:') && place.limits?.[need.slice(4)] && { limit: place.limits[need.slice(4)] }) })),
        ...(place.repos && { repos: place.repos }),
        reportedAt: place.reportedAt,
      };
    })
    .sort((a, b) => Number(b.kind === 'cloud') - Number(a.kind === 'cloud') || Number(b.status === 'open') - Number(a.status === 'open') || a.name.localeCompare(b.name));

  const usedBy = new Map<string, string[]>();
  const unknown: string[] = [];
  for (const item of items) {
    if (!item.needs) {
      if (item.kind === 'skill' && !unknown.includes(item.title)) unknown.push(item.title);
      continue;
    }
    for (const need of item.needs) {
      const by = usedBy.get(need) ?? [];
      if (!by.includes(item.title)) by.push(item.title);
      usedBy.set(need, by);
    }
  }
  const usable = places.filter(place => place.status === 'open');
  const needs = [...usedBy].map(
    ([need, by]): NeedView => ({
      need,
      label: canLabel(need),
      usedBy: by,
      device: deviceOnly(need),
      places: usable.filter(place => placeHas(place.can.map(c => c.need), need)).map(place => place.name),
    }),
  );
  return { places, needs, unknown, admins };
}
