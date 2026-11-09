import { parseVideoMap } from './map';
import { MAP_SCHEMA, type MapShot, type VideoMap } from './types';

/*
 * The shot map of a lyric project reviewed live (never rendered), built in the browser the way
 * apps/studio/scripts/map.ts builds `<video>.map.json` after a render, so shot ids match
 * the ones a render of the same project gets: shots from video/shots.json when the project has
 * one, otherwise one shot per lyric line inside each manifest section. Keep the two in step.
 */

type Section = { label: string; from: number; to: number };
type Line = { text: string; start: number };

/** "verse-1" → "v1", "hook" → "h"; as map.ts does. */
function abbreviate(label: string): string {
  const parts = label
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean);
  const words = parts.filter(p => /^[a-z]+$/.test(p)).map(p => p[0]);
  const rest = parts.filter(p => !/^[a-z]+$/.test(p));
  return words.join('') + rest.join('') || label;
}

function sectionIds(sections: Section[]): Map<string, string> {
  const ids = new Map<string, string>();
  const count = new Map<string, number>();
  for (const s of sections) {
    const id = abbreviate(s.label);
    count.set(id, (count.get(id) ?? 0) + 1);
  }
  // two sections that abbreviate the same (bridge / break) keep their full label
  for (const s of sections) {
    const id = abbreviate(s.label);
    ids.set(s.label, count.get(id)! > 1 ? s.label : id);
  }
  return ids;
}

function shotsFromLyrics(
  sections: Section[],
  lyrics: Line[],
  ids: Map<string, string>,
): MapShot[] {
  const shots: MapShot[] = [];
  for (const section of sections) {
    const lines = lyrics.filter(
      l => l.start >= section.from + 0.3 && l.start < section.to - 0.3,
    );
    const cuts = [section.from, ...lines.map(l => l.start)];
    cuts.forEach((from, i) => {
      const to = cuts[i + 1] ?? section.to;
      if (to - from < 0.05) return;
      const line =
        i === 0
          ? lyrics.find(l => l.start >= from - 0.3 && l.start < from + 0.3)
          : lines[i - 1];
      shots.push({
        id: `${ids.get(section.label)}.${shots.filter(s => s.section === section.label).length + 1}`,
        from,
        to,
        lyric: line?.text ?? '(instrumental)',
        section: section.label,
      });
    });
  }
  return shots;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function buildLiveMap(opts: {
  slug: string;
  manifest: { sections: Section[]; lyrics: Line[] };
  /** the text of projects/<slug>/video/shots.json, when there is one */
  shotsJson: string | null;
  fps: number;
  /** seconds of the video (a short's window, or the song plus its tail) */
  duration: number;
  width: number;
  height: number;
  /** a short shows only this stretch of the song */
  window?: { from: number; to: number };
}): { map: VideoMap; fromShotsJson: boolean } {
  const { manifest, window: win } = opts;
  const ids = sectionIds(manifest.sections);
  let shots: MapShot[] | null = null;
  if (opts.shotsJson) {
    try {
      const raw = JSON.parse(opts.shotsJson) as unknown;
      shots = parseVideoMap(raw).shots.map(s => ({
        ...s,
        section:
          s.section ??
          manifest.sections.find(x => s.from >= x.from && s.from < x.to)?.label,
      }));
    } catch {
      shots = null;
    }
  }
  const fromShotsJson = shots !== null;
  shots ??= shotsFromLyrics(manifest.sections, manifest.lyrics, ids);

  const offset = win?.from ?? 0;
  const end = win ? win.to : Infinity;
  const clip = <T extends { from: number; to: number }>(items: T[]): T[] =>
    items
      .filter(it => it.to > offset && it.from < end)
      .map(it => ({
        ...it,
        from: round(Math.max(it.from, offset) - offset),
        to: round(Math.min(it.to, end) - offset),
      }));

  const map: VideoMap = {
    schema: MAP_SCHEMA,
    video: 'live',
    source: { project: opts.slug },
    fps: opts.fps,
    duration: round(opts.duration),
    width: opts.width,
    height: opts.height,
    sections: clip(
      manifest.sections.map(s => ({
        id: ids.get(s.label)!,
        label: s.label,
        from: s.from,
        to: s.to,
      })),
    ),
    shots: clip(shots).map(s => ({
      ...s,
      section: s.section ? (ids.get(s.section) ?? s.section) : undefined,
    })),
    markers: [],
  };
  return { map, fromShotsJson };
}
