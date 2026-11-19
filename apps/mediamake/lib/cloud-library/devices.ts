/**
 * Device libraries (docs/library.md › Device libraries). A computer's media library stays on that
 * computer. Once its owner turns reporting on, `mm library report` sends a card per file (what it
 * is, never its bytes, never where it is on the disk), so the Library's page and a cloud session
 * can see what each computer holds. A file here and a file in the Cloud Library are the same file
 * when their SHA-256 is the same: nothing else links them.
 */
import { SHA256 } from './index';

/** One file on a computer, as its owner's media library describes it. */
export interface DeviceCard {
  sha256: string;
  /** The file's name, without its folder. */
  name: string;
  title?: string;
  /** The media library's kind: footage, music, images… */
  kind: string;
  subject?: string;
  bytes: number;
  /** Seconds, for audio and video. */
  duration?: number;
  width?: number;
  height?: number;
  tags: string[];
  /** The file is on a disk that is not plugged in. */
  cold?: boolean;
}

export const MAX_REPORT_CARDS = 1000;
export const MAX_DEVICE_CARDS = 100_000;
export const DEVICE_LABEL = /^[\w .()'-]{1,80}$/;
export const REPORT_RUN = /^[a-z0-9]{8,40}$/;

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || undefined;
};
const amount = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined);

/** A card as a report may carry it. Only these keys are kept; a path is cut down to the file's name. */
export function cleanCard(raw: unknown): DeviceCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const card = raw as Record<string, unknown>;
  const sha256 = typeof card.sha256 === 'string' ? card.sha256.toLowerCase() : '';
  const name = text(typeof card.name === 'string' ? card.name.split(/[\\/]/).pop() : undefined, 200);
  if (!SHA256.test(sha256) || !name) return null;
  const bytes = amount(card.bytes);
  const duration = amount(card.duration);
  const width = amount(card.width);
  const height = amount(card.height);
  const title = text(card.title, 200);
  const subject = text(card.subject, 80);
  const tags = Array.isArray(card.tags) ? [...new Set(card.tags.map(tag => text(tag, 40)).filter((tag): tag is string => !!tag))].slice(0, 20) : [];
  return {
    sha256,
    name,
    ...(title && { title }),
    kind: text(card.kind, 20)?.toLowerCase() ?? 'other',
    ...(subject && { subject }),
    bytes: Math.round(bytes ?? 0),
    ...(duration && { duration: Math.round(duration * 10) / 10 }),
    ...(width && { width: Math.round(width) }),
    ...(height && { height: Math.round(height) }),
    tags,
    ...(card.cold === true && { cold: true }),
  };
}

export interface DeviceReport {
  device: string;
  /** One whole report has one run id, however many parts it comes in. */
  run: string;
  cards: DeviceCard[];
  /** The last part: cards of this computer that are not in this run are gone from it. */
  done: boolean;
  /** Cards that were left out because they could not be read. */
  skipped: number;
}

/** A report's part: `{ device, run, cards: [...], done }`. */
export function parseDeviceReport(body: unknown): DeviceReport | { error: string } {
  const ask = (body ?? {}) as Record<string, unknown>;
  const device = typeof ask.device === 'string' ? ask.device.trim() : '';
  if (!DEVICE_LABEL.test(device)) return { error: "device is this computer's label (mm access shows it)" };
  if (typeof ask.run !== 'string' || !REPORT_RUN.test(ask.run)) return { error: 'run is one id for the whole report: 8 to 40 lowercase letters and digits' };
  const raw = Array.isArray(ask.cards) ? ask.cards : [];
  if (raw.length > MAX_REPORT_CARDS) return { error: `At most ${MAX_REPORT_CARDS} cards a part` };
  const bySha = new Map<string, DeviceCard>();
  for (const one of raw) {
    const card = cleanCard(one);
    if (card) bySha.set(card.sha256, card);
  }
  return { device, run: ask.run, cards: [...bySha.values()], done: ask.done === true, skipped: raw.length - bySha.size };
}

/** What a card is searched by: lowercase words of its name, title, subject, kind and tags. */
export const searchTextOf = (card: Pick<DeviceCard, 'name' | 'title' | 'subject' | 'kind' | 'tags'>) =>
  [card.title, card.name, card.subject, card.kind, ...card.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The words of a search, as `searchTextOf` spells them. A card fits when it has every word. */
export const searchWords = (q: string) =>
  q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 8);

export const WHERE = ['device', 'both'] as const;
/** device: on the computer only. both: the same file is also in this space's Cloud Library. */
export type Where = (typeof WHERE)[number];

export interface DeviceAsk {
  q: string;
  kind: string;
  where: Where | '';
  limit: number;
  skip: number;
}

export function parseDeviceAsk(params: URLSearchParams): DeviceAsk {
  const where = params.get('where') ?? '';
  const count = (key: string, fallback: number, max: number) => {
    const value = Number(params.get(key));
    return Number.isInteger(value) && value >= 0 ? Math.min(value, max) : fallback;
  };
  return {
    q: (params.get('q') ?? '').slice(0, 200),
    kind: (params.get('kind') ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20),
    where: (WHERE as readonly string[]).includes(where) ? (where as Where) : '',
    limit: count('limit', 60, 200) || 60,
    skip: count('skip', 0, MAX_DEVICE_CARDS),
  };
}

/** Where the same file is in the space's Cloud Library. */
export interface CloudCopy {
  ref: string;
  title: string;
  slot: string;
}

/** Each SHA-256 a space's entries hold, with the first entry that holds it. */
export function cloudCopies(entries: { collection: string; slug: string; title: string; slots?: Record<string, { sha256: string }[]> }[]): Map<string, CloudCopy> {
  const copies = new Map<string, CloudCopy>();
  for (const entry of entries)
    for (const [slot, files] of Object.entries(entry.slots ?? {}))
      for (const file of files ?? []) if (!copies.has(file.sha256)) copies.set(file.sha256, { ref: `${entry.collection}/${entry.slug}`, title: entry.title, slot });
  return copies;
}

/** A computer as the page lists it. */
export interface DeviceView {
  /** `<owner's id>/<label>`: what the page asks for its files with. */
  id: string;
  label: string;
  /** The name its owner gave it ("Studio Mac"), else its label. */
  name: string;
  mine: boolean;
  /** Whose it is, when it is not yours. */
  owner?: string;
  files: number;
  bytes: number;
  /** How many of its files are also in this space's Cloud Library. */
  linked: number;
  kinds: Record<string, number>;
  reportedAt: string;
}

export interface DeviceFile extends DeviceCard {
  where: Where;
  cloud?: CloudCopy;
}

/**
 * The words to give Claude to put one of a computer's files in the Cloud Library. On your own
 * computer it is a save that waits for your yes; on someone else's it is a to-do for that computer.
 */
export function uploadPrompt(input: { file: Pick<DeviceCard, 'sha256' | 'name' | 'title'>; device: Pick<DeviceView, 'name' | 'mine' | 'owner'>; space: string; personal: boolean }): string {
  const { file, device, space } = input;
  const what = `"${file.title ?? file.name}" (${file.name}, media library id ${file.sha256.slice(0, 12)})`;
  const place = input.personal ? 'my personal Library' : `the Library of the ${space} space`;
  const save = `mm library save <collection> --item <slot>=${file.sha256.slice(0, 12)}`;
  if (device.mine)
    return [
      `Add ${what} from the media library on this computer (${device.name}) to ${place}.`,
      `Run mm library first, pick the collection and the slot the file fits, and read that collection's guide (mm library guide <collection>).`,
      `Then run ${save} without --yes, show me the sentence it prints, and add --yes only after I agree.`,
    ].join('\n');
  return [
    `${what} is only on ${device.owner ? `${device.owner}'s computer` : 'another computer'} (${device.name}). I want it in ${place}.`,
    `Post a to-do for that computer with mm todo post, needing media:library, that says to add the file with ${save} after its owner agrees.`,
    `Tell me the to-do's id. Do not try to fetch the file from here.`,
  ].join('\n');
}

/** A device's id as a request names it: `<owner>/<label>`. */
export function parseDeviceId(value: unknown): { owner: string; label: string } | null {
  if (typeof value !== 'string') return null;
  const at = value.indexOf('/');
  const owner = value.slice(0, at);
  const label = value.slice(at + 1);
  return at > 0 && /^[^/\s]{1,100}$/.test(owner) && DEVICE_LABEL.test(label) ? { owner, label } : null;
}
