/**
 * The page the painted-cartoon kit runs in (kit/, John Heibel's Claude Animation Base): upstream's
 * studio.html and src/config.js, as one HTML string. Both ways of running a project build it here, so
 * they draw the same frames:
 *
 * - the Remotion scene (PaintedCartoon.tsx) puts it in an iframe and asks it for each frame (mm render,
 *   mm preview, mm stills);
 * - mm painted (scripts/painted.ts) opens it in headless Chrome for the kit's own checks: contact
 *   sheets, strips, crops, stills and loops.
 *
 * Everything is inline (p5, p5.brush, the kit, the project's scene files), so the page needs no server.
 * Plain browser code only: no remotion, no node.
 */

/** A project's video/painted.json. */
export type PaintedConfig = {
  /** The project's scene files, relative to its video/ folder, loaded in this order. */
  scenes: string[];
  /** The rhythm every idle, bounce and pulse() follows. Default: the song's tempo, else 120. */
  bpm?: number;
  /** Seconds to the first downbeat. Default: the song's first downbeat, else 0. */
  offset?: number;
};

/** What the kit calls PROJECT (upstream's config.js). */
export type PaintedSettings = { duration: number; bpm: number; offset: number };

/** The parts of a project's manifest.json the kit reads. */
export type ManifestTiming = {
  audio: { duration: number };
  beats?: { bpm?: number | null; downbeats?: number[] };
};

export const FPS = 24;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** PROJECT for a project: its length is the song's (a silent track when it has none), its beat the song's unless painted.json says. */
export const settingsFor = (config: PaintedConfig, manifest: ManifestTiming): PaintedSettings => ({
  duration: manifest.audio.duration,
  bpm: config.bpm ?? manifest.beats?.bpm ?? 120,
  offset: config.offset ?? manifest.beats?.downbeats?.[0] ?? 0,
});

/** Reads and checks video/painted.json. */
export const parseConfig = (text: string, where = 'video/painted.json'): PaintedConfig => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`${where} is not JSON: ${(e as Error).message}`);
  }
  const c = raw as Partial<PaintedConfig>;
  if (!c || !Array.isArray(c.scenes) || !c.scenes.length || c.scenes.some(s => typeof s !== 'string' || s.includes('..'))) {
    throw new Error(`${where} needs "scenes": the scene files in video/, in order (e.g. ["scenes/main.js"])`);
  }
  for (const k of ['bpm', 'offset'] as const) {
    if (c[k] !== undefined && typeof c[k] !== 'number') throw new Error(`${where}: "${k}" is a number`);
  }
  return { scenes: c.scenes, bpm: c.bpm, offset: c.offset };
};

export type PageSources = {
  p5: string;
  brush: string;
  kit: { core: string; clawd: string; timeline: string; sheets: string };
};

export type PageOptions = {
  sources: PageSources;
  settings: PaintedSettings;
  /** The project's scene files' text, in order. */
  scenes: { name: string; src: string }[];
  /** A standalone loop (LOOPS[name]: the model sheets 'emotions' and 'views', or the project's own) instead of the video. */
  loop?: string | null;
};

// A script's text inline: only "</script" could end it early.
const inline = (src: string, name: string) => `<script>${src.replace(/<\/script/gi, '<\\/script')}\n//# sourceURL=${name}\n</script>`;

/**
 * The page. After the kit: the page is driven from outside, so upstream's scrub bar (devUI) is off, and
 * window.renderFrame(t) draws frame t into canvas#out (upstream's renderAt without encoding an image).
 * window.paintedError holds the first error a script threw, so whoever drives the page can say why.
 */
export const paintedPage = ({ sources, settings, scenes, loop }: PageOptions): string => {
  const head = `
window.paintedError = null;
addEventListener('error', e => { if (!window.paintedError) window.paintedError = (e.error && e.error.stack) || e.message; });
addEventListener('unhandledrejection', e => { if (!window.paintedError) window.paintedError = String((e.reason && e.reason.stack) || e.reason); });`;
  const project = `const PROJECT = ${JSON.stringify(settings)};`;
  const drive = `
window.devUI = () => {};
window.renderFrame = async t => { T = t; await redraw(); composite(t); };
window.loopLength = () => (window.LOOP ? window.LOOP.len : DUR);`;
  const name = JSON.stringify(loop ?? '');
  const pickLoop = loop
    ? `if (!LOOPS[${name}]) window.paintedError = 'no loop named ' + ${name} + ' (LOOPS has: ' + Object.keys(LOOPS).join(', ') + ')'; else window.LOOP = LOOPS[${name}];`
    : '';
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>painted cartoon</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=block">
<style>
  html, body { margin: 0; background: #F3EBDC; overflow: hidden; }
  #out { display: block; width: ${WIDTH}px; height: ${HEIGHT}px; }
  .p5Canvas { display: none !important; }
</style>
${inline(head, 'painted/errors.js')}
${inline(sources.p5, 'p5.min.js')}
${inline(sources.brush, 'p5.brush.js')}
</head>
<body>
<canvas id="out" width="${WIDTH}" height="${HEIGHT}"></canvas>
${inline(project, 'painted/config.js')}
${inline(sources.kit.core, 'kit/core.js')}
${inline(sources.kit.clawd, 'kit/clawd.js')}
${inline(sources.kit.timeline, 'kit/timeline.js')}
${inline(sources.kit.sheets, 'kit/sheets.js')}
${inline(drive, 'painted/drive.js')}
${scenes.map(s => inline(s.src, s.name)).join('\n')}
${pickLoop ? inline(pickLoop, 'painted/loop.js') : ''}
</body>
</html>`;
};
