/**
 * classify: what a file is and where it goes in the library, from what is known about it, in this
 * order: its provenance sidecar (title, search, prompt), the naming habits of the tools that make
 * files (Browse Hack's YouTube downloads, Midjourney, Pexels, Pixabay, Pinterest, ElevenLabs, Suno),
 * its probe (how long, with sound or not), the subjects in taxonomy.json and the folders it sat in.
 * Whatever stays unsure goes to _unsorted/<kind>/ to be tagged, never into a wrong folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Kind } from './db.ts';
import type { Probe } from './probe.ts';
import { slug } from './sys.ts';

/** <file>.source.json, written next to a download by the tool that made it (mediamake.source/v1). */
export type Source = {
  schema?: string;
  tool: string;
  ref?: string;
  url?: string;
  pageUrl?: string;
  title?: string;
  author?: string;
  query?: string;
  prompt?: string;
  model?: string;
  height?: number;
  fps?: number;
  price?: number;
  downloadedAt?: string;
};

export type MediaType = 'video' | 'audio' | 'image' | 'font' | '3d' | 'archive';
const EXT: Record<MediaType, string[]> = {
  video: ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'],
  audio: ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.aif', '.aiff', '.opus'],
  image: ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tif', '.tiff', '.heic', '.bmp'],
  font: ['.ttf', '.otf', '.woff', '.woff2'],
  '3d': ['.glb', '.gltf', '.blend', '.fbx', '.obj', '.usdz'],
  archive: ['.zip'],
};
export const mediaTypeOf = (file: string): MediaType | null => {
  const ext = path.extname(file).toLowerCase();
  const type = (Object.keys(EXT) as MediaType[]).find(t => EXT[t].includes(ext)) ?? null;
  // a zip is media only when it holds a song's stems (Suno's "<song> Stems.zip")
  return type === 'archive' && !/\bstems?\b/i.test(path.basename(file)) ? null : type;
};

/** Phone, camera, chat, call and screen captures and mockups: someone's life, not production media. */
const PERSONAL = /^(whatsapp (image|video|audio)|screen recording|screenshot|screen shot|img_\d|vid_\d|pxl_\d|mvimg|simulator screen|(new )?recording \d|dji_\d|gopr\d|gx\d{6}|riverside[_-]|zoom_\d)|shots_so/i;
export const isPersonal = (name: string) => PERSONAL.test(name);

/** "<slug>-<13-digit time>.mp4": a video of the user's own, downloaded from a render. Outputs are delivered, not filed. */
const RENDER = /^([a-z][a-z0-9-]*?)-1[6-9]\d{11}(?: \(\d+\))?\.(?:mp4|mov|webm)$/i;
export const isRender = (name: string) => RENDER.test(name);

/** Tools that generate pictures and clips: what they make is art. */
const GENERATORS = new Set(['midjourney', 'fal', 'kling', 'freepik']);

type Guess = { tool: string; ref?: string; prompt?: string; height?: number; fps?: number };
const TOOLS: [RegExp, (m: RegExpMatchArray) => Guess][] = [
  // Browse Hack: "<title> (<height>p<fps>[, no sound]).<ext>"; Chrome adds " (1)" when the name is taken
  [/\((\d{3,4})p(\d{2,3})?(?:,[^)]*)?\)(?: \(\d+\))?\.\w+$/i, m => ({ tool: 'youtube', height: +m[1], fps: m[2] ? +m[2] : undefined })],
  [/^kling_\d{8}_/i, () => ({ tool: 'kling' })],
  [/^freepik__/i, () => ({ tool: 'freepik' })],
  // Midjourney: "<user>_<prompt>_<job uuid>_<n>", "social_<user>_…" for its videos
  [/^(?:social_)?u\d{6,}_(.+?)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i, m => ({ tool: 'midjourney', prompt: m[1].replace(/_+/g, ' ').trim() })],
  [/^(?:social_)?[a-z0-9.]{3,}_(.+?)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:_\d+)?(?: \(\d+\))?\.\w+$/i, m => ({ tool: 'midjourney', prompt: m[1].replace(/_+/g, ' ').trim() })],
  [/-midjourney-\d+/i, () => ({ tool: 'midjourney' })],
  [/^(\d+)-(?:hd|uhd|sd)_\d+_\d+_\d+fps\.mp4$/i, m => ({ tool: 'pexels', ref: m[1] })],
  [/^(\d{2,})(?:-\d{6,})?_(?:tiny|small|medium|large)\.mp4$/i, m => ({ tool: 'pixabay', ref: m[1] })],
  [/^(\d{2,})-\d{6,}\.mp4$/i, m => ({ tool: 'pixabay', ref: m[1] })],
  [/^([0-9a-f]{32})(?: \(\d+\))?\.(?:jpe?g|png|webp|gif|mp4)$/i, m => ({ tool: 'pinterest', ref: m[1] })],
  [/^PinGrab_(\d+)/i, m => ({ tool: 'pinterest', ref: `grab-${m[1]}` })],
  [/^ElevenLabs_/i, () => ({ tool: 'elevenlabs' })],
];
export const guessTool = (name: string): Guess | null => {
  for (const [re, f] of TOOLS) {
    const m = name.match(re);
    if (m) return f(m);
  }
  return null;
};

// ---------- subjects (taxonomy.json) ----------

type Alias = { re: RegExp; weak: boolean };
type Named = { name: string; aliases: Alias[] };
type Taxonomy = { franchises: (Named & { words: Set<string> })[]; characters: (Named & { franchise: string; words: Set<string> })[]; overlays: Named[]; sfx: Named[]; types: Named[] };
type RawTaxonomy = {
  franchises: Record<string, { aliases: string[]; characters: Record<string, string[]> }>;
  overlays: Record<string, string[]>;
  sfx: Record<string, string[]>;
  types: Record<string, string[]>;
};

const TAXONOMY = path.join(path.dirname(fileURLToPath(import.meta.url)), 'taxonomy.json');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Words may be joined by spaces, _ or - or nothing ("gear 5" = "gear5" = "gear-5"); a trailing * needs context. */
const alias = (a: string): Alias => {
  const weak = a.endsWith('*');
  const words = (weak ? a.slice(0, -1) : a).trim().split(/[\s-]+/).map(esc).join('[\\s_-]*');
  return { re: new RegExp(`(?<![a-z0-9])${words}(?![a-z0-9])`, 'i'), weak };
};
const named = (rec: Record<string, string[]>): Named[] => Object.entries(rec).map(([name, list]) => ({ name, aliases: list.map(alias) }));
const wordsOf = (name: string, aliases: string[]) => new Set([...name.split('-'), ...aliases.flatMap(a => a.replace(/\*$/, '').toLowerCase().split(/[\s-]+/))]);

let compiled: Taxonomy | null = null;
export const taxonomy = (): Taxonomy => {
  if (compiled) return compiled;
  const raw = JSON.parse(fs.readFileSync(TAXONOMY, 'utf8')) as RawTaxonomy;
  compiled = {
    franchises: Object.entries(raw.franchises).map(([name, f]) => ({ name, aliases: f.aliases.map(alias), words: wordsOf(name, f.aliases) })),
    characters: Object.entries(raw.franchises).flatMap(([franchise, f]) =>
      Object.entries(f.characters).map(([name, list]) => ({ name, franchise, aliases: list.map(alias), words: wordsOf(name, list) })),
    ),
    overlays: named(raw.overlays),
    sfx: named(raw.sfx),
    types: named(raw.types),
  };
  return compiled;
};

export type Subjects = { franchise?: string; character?: string; overlay?: string; sfx?: string; types: string[] };

export const matchSubjects = (text: string): Subjects => {
  const t = taxonomy();
  const at = (aliases: Alias[], weakToo: boolean) => {
    let best = -1;
    for (const a of aliases) {
      if (a.weak && !weakToo) continue;
      const m = a.re.exec(text);
      if (m && (best < 0 || m.index < best)) best = m.index;
    }
    return best;
  };
  const franchiseAt = new Map(t.franchises.map(f => [f.name, at(f.aliases, true)]));
  const strong = t.characters.map(c => ({ c, at: at(c.aliases, false) })).filter(x => x.at >= 0);
  const backed = new Set(strong.map(x => x.c.franchise));
  // "ace", "law", "kid"… count only beside their franchise or another of its characters
  const weak = t.characters
    .filter(c => !strong.some(x => x.c === c) && ((franchiseAt.get(c.franchise) ?? -1) >= 0 || backed.has(c.franchise)))
    .map(c => ({ c, at: at(c.aliases, true) }))
    .filter(x => x.at >= 0);
  const character = [...strong, ...weak].sort((a, b) => a.at - b.at)[0]?.c;
  const franchise = character?.franchise ?? [...franchiseAt].filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1])[0]?.[0];
  const first = (list: Named[]) => list.map(x => ({ name: x.name, i: at(x.aliases, true) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i)[0]?.name;
  return { franchise, character: character?.name, overlay: first(t.overlays), sfx: first(t.sfx), types: t.types.filter(x => at(x.aliases, true) >= 0).map(x => x.name) };
};

// ---------- names ----------

const RES = /\s*\((\d{3,4})p(\d{2,3})?(?:,[^)]*)?\)/gi;
const REPEAT = /\s*\(\d+\)$/;
const STOP = new Set(['the', 'a', 'an', 'of', 'for', 'in', 'on', 'and', 'with', 'by', 'to', 'from', 'x', 'vs', 'ft', 'feat', 'official', 'video', 'free', 'quality', 'high', 'hd', 'uhd', 'fhd', '4k', '8k', '2k', 'best', 'full', 'new', 'final', 'no', 'cc']);

/** "Zoro Twixtor Clips 4K (2160p60) (1)" → "Zoro Twixtor Clips 4K". */
export const cleanTitle = (base: string) => base.replace(RES, '').replace(REPEAT, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
/** Hashes, ids and timestamps: a name that says nothing, kept as it is. */
/** Words a download's name carries that say nothing about what it shows ("224162_small", "Clip 1 (Copy)"). */
const FILLER = /(^|[^a-z])(tiny|small|medium|large|hd|uhd|copy|clip|video|image|img|untitled|\d+p\d*|\d+fps)(?=[^a-z]|$)/gi;
export const meaningless = (base: string) => {
  const b = base.replace(FILLER, '$1').trim();
  return /^[0-9a-f-]{16,}$/i.test(b) || /^[\d_ ()-]*$/.test(b) || !/[a-z]{3,}/i.test(b);
};

const resolution = (p?: Pick<Probe, 'height' | 'fps'> | null) => {
  const h = p?.height;
  if (!h) return '';
  const r = h >= 2100 ? '2160p' : h >= 1400 ? '1440p' : h >= 1000 ? '1080p' : h >= 700 ? '720p' : `${h}p`;
  return (p?.fps ?? 0) >= 48 ? `${r}${Math.round(p!.fps!)}` : r;
};

const qualityTags = (p: Probe | null | undefined, type: MediaType) => {
  const tags: string[] = [];
  if (!p) return tags;
  if (p.height && type !== 'audio') tags.push(p.height >= 2100 ? '4k' : p.height >= 1400 ? '1440p' : p.height >= 1000 ? '1080p' : p.height >= 700 ? '720p' : 'sd');
  if ((p.fps ?? 0) >= 48) tags.push('60fps');
  if (p.width && p.height && p.height > p.width) tags.push('vertical');
  if (type === 'video' && !p.hasAudio) tags.push('no-audio');
  return tags;
};

/** The song a Suno file belongs to: "DBZ - Goten - growling rock 2 (Remastered)" → "dbz-goten". */
export const songOf = (base: string) => {
  const parts = cleanTitle(base)
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+-\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  const head = parts.length > 1 && parts[0].length <= 4 ? `${parts[0]} ${parts[1]}` : (parts[0] ?? base);
  return slug(head.replace(/\b(stems?|final|master(ed)?|remaster(ed)?|mix(ed)?|mp3|wav)\b/gi, ' ')) || slug(base) || 'untitled';
};

// ---------- classify ----------

export type Hint = { kind?: Kind; subject?: string; channel?: string; tags?: string[] };
export type ClassifyInput = {
  file: string;
  probe?: Probe | null;
  source?: Source | null;
  /** the set folder it came in (_INBOX/pinterest/<date>-<query>/, a Midjourney batch) */
  set?: string;
  hint?: Hint;
  /** more words to match: the folders it sat in */
  context?: string;
  /** what the same bytes are called elsewhere, for a file whose own name says nothing (a project's input/overlays/swirl.mp4) */
  alias?: string;
};
export type Classification = {
  /** null: not for the library (not media, or personal) */
  kind: Kind | null;
  /** with _unsorted: what it most likely is */
  guess?: Kind;
  reason?: string;
  subject: string | null;
  tags: string[];
  title: string;
  name: string;
  tool?: string;
  ref?: string;
  prompt?: string;
  confidence: number;
};

const REFERENCE = /(^|[^a-z])(inspo|inspiration|references?|refs|moodboard)([^a-z]|$)/i;
const GENERATED = /(^|[^a-z])(midjourney|outcrops?|upscaled?|cutouts?|generated|firefly|fal|variations?)([^a-z]|$)/i;
const FOOTAGE_TYPES = ['twixtor', 'amv', 'edit', 'raw', 'clip', 'trailer', 'manga'];
const NEEDS_SUBJECT: Kind[] = ['footage', 'images', 'art', 'music', 'references', '3d'];

export const classify = (input: ClassifyInput): Classification => {
  const file = path.basename(input.file);
  const ext = path.extname(file).toLowerCase();
  const base = file.slice(0, file.length - ext.length);
  const type = mediaTypeOf(file);
  const title = input.source?.title?.trim() || cleanTitle(input.alias ?? base);
  const empty = { subject: null, tags: [], title, name: file, confidence: 0 };
  if (!type) return { kind: null, reason: 'not media', ...empty };
  if (isPersonal(file)) return { kind: null, reason: 'personal (phone, camera, call or screen capture)', ...empty };
  if (isRender(file)) return { kind: null, reason: 'a render of yours (outputs go to channel folders, not the library)', ...empty };

  const guess = guessTool(file);
  const src = input.source;
  const tool = src?.tool ?? guess?.tool ?? (type === 'audio' && / - /.test(base) ? 'suno' : undefined);
  const ref = src?.ref ?? guess?.ref;
  const prompt = src?.prompt ?? guess?.prompt;
  const p = input.probe ?? (src?.height ? { height: src.height, fps: src.fps, hasAudio: true } : null);
  const text = [title, src?.query, prompt, src?.author, base.replace(/[_-]+/g, ' '), input.alias?.replace(/[_-]+/g, ' '), input.set?.replace(/[_-]+/g, ' '), input.context]
    .filter(Boolean)
    .join(' | ');
  const m = matchSubjects(text);
  const channel = input.hint?.channel;
  const where = `${input.context ?? ''} ${input.set ?? ''}`;

  let kind: Kind;
  if (input.hint?.kind) kind = input.hint.kind;
  else if (type === 'archive') kind = 'music';
  else if (type === 'font') kind = 'fonts';
  else if (type === '3d') kind = '3d';
  else if (type === 'audio') kind = (p?.duration ?? 99) < 12 || (m.sfx && !m.franchise && (p?.duration ?? 99) < 30) ? 'sfx' : 'music';
  else if (REFERENCE.test(where) || m.types.includes('visualizer')) kind = 'references';
  else if (type === 'video') {
    const looksFootage = m.character || m.franchise || m.types.some(t => FOOTAGE_TYPES.includes(t));
    if (GENERATORS.has(tool ?? '') || tool === 'elevenlabs') kind = 'art';
    else if (!looksFootage && (m.overlay || ((tool === 'pexels' || tool === 'pixabay') && (p?.duration ?? 99) <= 30 && !p?.hasAudio))) kind = 'overlays';
    else kind = 'footage';
  } else kind = GENERATORS.has(tool ?? '') || tool === 'elevenlabs' || GENERATED.test(where) ? 'art' : 'images';

  const set = input.set ? slug(input.set) : undefined;
  let subject: string | null = input.hint?.subject ?? null;
  if (!subject) {
    const who = m.character ? `${m.franchise}/${m.character}` : (m.franchise ?? null);
    if (kind === 'overlays') subject = m.overlay ?? 'misc';
    else if (kind === 'sfx') subject = m.sfx ?? 'misc';
    else if (kind === 'fonts') subject = slug(base.replace(/[-_ ](thin|extralight|light|regular|book|medium|semibold|bold|extrabold|black|heavy|italic|variable|vf)\b.*$/i, '')) || 'misc';
    else if (kind === 'music') subject = channel ? `${channel}/${songOf(base)}` : null;
    else if (kind === 'art') subject = channel ? `${channel}/${set ?? 'misc'}` : null;
    else if (kind === 'footage' && !who && (tool === 'pexels' || tool === 'pixabay')) subject = 'stock';
    else if (kind === 'references') subject = who ?? channel ?? 'misc';
    else subject = who;
  }

  const tags = [...new Set([...m.types, ...qualityTags(p, type), ...(tool ? [tool] : []), ...(channel ? [channel] : []), ...(m.franchise ? [m.franchise] : []), ...(m.character ? [m.character] : []), ...(input.hint?.tags ?? [])])];

  let confidence = 0.5 + (src ? 0.25 : tool ? 0.15 : 0) + (subject ? 0.2 : 0);
  if (input.hint?.kind) confidence = 0.95;
  const unsure = !subject && NEEDS_SUBJECT.includes(kind);

  // names: sets keep the tool's names (pin ids, Midjourney jobs), music and fonts keep theirs, the rest say what they show
  const keep = !!input.set || kind === 'music' || kind === 'fonts' || kind === '3d' || (meaningless(base) && !input.alias);
  let name = `${base.replace(REPEAT, '')}${ext}`;
  if (!keep) {
    const leaf = subject?.split('/').pop() ?? '';
    const t = taxonomy();
    const franchiseWords = t.franchises.find(f => f.name === m.franchise)?.words ?? new Set<string>();
    const characterWords = t.characters.find(c => c.name === m.character && c.franchise === m.franchise)?.words ?? new Set<string>();
    const drop = new Set([...STOP, ...franchiseWords, ...characterWords, ...(subject ?? '').split(/[/-]/)]);
    const words = slug(title, 200)
      .split('-')
      .filter(w => w && !drop.has(w) && !/^\d{3,4}p\d*$|^\d+fps$/.test(w));
    const rest = [...new Set(words)].slice(0, 5);
    const parts = [leaf === 'misc' || leaf === 'stock' ? '' : leaf, ...rest].filter(Boolean);
    const res = type === 'video' ? resolution(p) : '';
    name = `${parts.join('-') || slug(title) || 'untitled'}${res ? `-${res}` : ''}${ext}`;
  }

  return {
    kind: unsure ? '_unsorted' : kind,
    guess: unsure ? kind : undefined,
    subject,
    tags,
    title,
    name,
    tool,
    ref,
    prompt,
    confidence: Math.min(0.95, unsure ? 0.4 : confidence),
  };
};

/** Where a classified file goes, relative to the library root. */
export const destOf = (c: Classification, set?: string) => {
  const s = set ? slug(set) : '';
  // a song whose channel isn't known yet still keeps its variants together
  if (c.kind === '_unsorted' && c.guess === 'music') return path.join('_unsorted', 'music', songOf(path.parse(c.name).name), c.name);
  if (c.kind === '_unsorted') return path.join('_unsorted', c.guess ?? 'misc', ...(c.subject ? c.subject.split('/') : []), s, c.name);
  if (!c.kind) throw new Error(`${c.name} isn't for the library (${c.reason})`);
  const subject = (c.subject ?? 'misc').split('/');
  if (c.kind === 'music' && mediaTypeOf(c.name) === 'archive') return path.join('music', ...subject, 'stems', c.name);
  if (c.kind === 'images' && s) return path.join('images', ...subject, s, c.name);
  return path.join(c.kind, ...subject, c.name);
};
