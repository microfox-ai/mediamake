import { MAP_SCHEMA, type MapMarker, type MapSection, type MapShot, type VideoMap } from './types';

/*
 * Reads a shot map in either form: the full object (see types.ts) or a bare
 * array of shots, which is what the older handoff/revision-N/shots.json files
 * are. Anything malformed is dropped rather than failing the whole map.
 */

type Loose = Record<string, unknown>;

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : undefined;

function readShot(raw: unknown, index: number): MapShot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Loose;
  const from = num(r.from) ?? num(r.start);
  const to = num(r.to) ?? num(r.end);
  if (from === undefined || to === undefined || to <= from) return null;
  return {
    id: str(r.id) ?? `s${index + 1}`,
    section: str(r.section),
    from,
    to,
    label: str(r.label) ?? str(r.name),
    lyric: str(r.lyric),
  };
}

function readSection(raw: unknown, index: number): MapSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Loose;
  const from = num(r.from) ?? num(r.start);
  const to = num(r.to) ?? num(r.end);
  if (from === undefined || to === undefined || to <= from) return null;
  const label = str(r.label) ?? str(r.id) ?? `section ${index + 1}`;
  return { id: str(r.id) ?? label, label, from, to };
}

function readMarker(raw: unknown, index: number): MapMarker | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Loose;
  const time = num(r.time) ?? num(r.at);
  if (time === undefined) return null;
  return { id: str(r.id) ?? `m${index + 1}`, time, label: str(r.label) };
}

/** Sections from the shots' `section` field, when the map has none. */
function sectionsFromShots(shots: MapShot[]): MapSection[] {
  const byId = new Map<string, MapSection>();
  for (const shot of shots) {
    if (!shot.section) continue;
    const existing = byId.get(shot.section);
    if (existing) {
      existing.from = Math.min(existing.from, shot.from);
      existing.to = Math.max(existing.to, shot.to);
    } else {
      byId.set(shot.section, { id: shot.section, label: shot.section, from: shot.from, to: shot.to });
    }
  }
  return [...byId.values()];
}

const compact = <T,>(items: (T | null)[]): T[] => items.filter((x): x is T => x !== null);

export function parseVideoMap(json: unknown): VideoMap {
  const root = (Array.isArray(json) ? { shots: json } : json) as Loose | null;
  if (!root || typeof root !== 'object') throw new Error('Map is not a JSON object or array');
  const shots = compact((Array.isArray(root.shots) ? root.shots : []).map(readShot)).sort(
    (a, b) => a.from - b.from,
  );
  const listedSections = compact((Array.isArray(root.sections) ? root.sections : []).map(readSection));
  const sections = (listedSections.length ? listedSections : sectionsFromShots(shots)).sort(
    (a, b) => a.from - b.from,
  );
  const markers = compact((Array.isArray(root.markers) ? root.markers : []).map(readMarker)).sort(
    (a, b) => a.time - b.time,
  );
  if (shots.length === 0 && sections.length === 0 && markers.length === 0) {
    throw new Error('Map has no shots, sections or markers');
  }
  const source = root.source && typeof root.source === 'object' ? (root.source as Loose) : undefined;
  return {
    schema: str(root.schema) ?? MAP_SCHEMA,
    video: str(root.video),
    source: source ? { path: str(source.path), project: str(source.project) } : undefined,
    fps: num(root.fps),
    duration: num(root.duration),
    width: num(root.width),
    height: num(root.height),
    sections,
    shots,
    markers,
  };
}

/** The shot showing at `time` (the later one wins on a shared boundary). */
export function shotAt(map: VideoMap | null, time: number): MapShot | null {
  if (!map) return null;
  let hit: MapShot | null = null;
  for (const shot of map.shots) {
    if (shot.from > time + 1e-6) break;
    if (time < shot.to) hit = shot;
  }
  return hit;
}

export function sectionAt(map: VideoMap | null, time: number): MapSection | null {
  if (!map) return null;
  let hit: MapSection | null = null;
  for (const section of map.sections) {
    if (section.from > time + 1e-6) break;
    if (time < section.to) hit = section;
  }
  return hit;
}

/**
 * Shots with at least one frame in [from, to). With `fps`, shot edges are
 * compared as the frames they cut on, not as raw seconds.
 */
export function shotsInRange(map: VideoMap | null, from: number, to: number, fps?: number): MapShot[] {
  if (!map) return [];
  const cut = (t: number) => (fps ? Math.ceil(t * fps - 1e-6) / fps : t);
  return map.shots.filter((shot) => cut(shot.from) < to - 1e-6 && cut(shot.to) > from + 1e-6);
}

/** Sorted, de-duplicated jump points: shot starts and markers. */
export function shotTargets(map: VideoMap | null): number[] {
  if (!map) return [];
  return dedupe([...map.shots.map((s) => s.from), ...map.markers.map((m) => m.time)]);
}

export function sectionTargets(map: VideoMap | null): number[] {
  if (!map) return [];
  return dedupe(map.sections.map((s) => s.from));
}

export function dedupe(times: number[]): number[] {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted.filter((t, i) => i === 0 || t - sorted[i - 1] > 1e-3);
}

/**
 * Next/previous jump point. Going back from just after a point skips to the
 * one before it, so repeated presses walk backwards even while playing.
 */
export function stepTarget(
  targets: number[],
  time: number,
  direction: 1 | -1,
  backTolerance: number,
): number | null {
  if (direction === 1) return targets.find((t) => t > time + 1e-3) ?? null;
  for (let i = targets.length - 1; i >= 0; i--) {
    if (targets[i] < time - backTolerance) return targets[i];
  }
  return null;
}
