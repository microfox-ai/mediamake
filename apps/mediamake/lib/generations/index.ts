/**
 * Music generations: every take a channel makes with an AI music tool (Suno
 * first), kept on the cloud project so everyone it is shared with can play,
 * rate and reuse them. Browse Hack records each take as it is made
 * (POST /api/generations); people rate them on the Projects page and Claude
 * reads them with the MCP's list_generations.
 *
 * Everything here is pure, for the API routes, the Generations sheet and tests.
 */

export const GENERATION_KINDS = ['create', 'cover', 'extend', 'remaster', 'reuse', 'upload'] as const;
export type GenerationKind = (typeof GENERATION_KINDS)[number];

export const GENERATION_STATUSES = ['queued', 'generating', 'complete', 'failed'] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const GENERATION_RATINGS = ['keeper', 'maybe', 'reject'] as const;
export type GenerationRating = (typeof GENERATION_RATINGS)[number];

export type SettingValue = string | number | boolean;

/** The tool's knobs for a take. Suno's are named; other tools may add their own keys. */
export interface GenerationSettings {
  vocalGender?: string;
  weirdness?: number;
  styleInfluence?: number;
  audioInfluence?: number;
  variety?: number;
  duration?: number | string;
  voice?: string;
  [key: string]: SettingValue | undefined;
}

export interface GenerationNote {
  at: string;
  /** clientId of who wrote it. */
  by: string;
  text: string;
}

/** A take as the API returns it. */
export interface Generation {
  id: string;
  projectId: string;
  /** Who saved it last. */
  clientId: string;
  tool: string;
  /** The tool's id for the take (Suno's clip id). Unique per tool. */
  ref: string;
  kind: GenerationKind;
  /** The take it was made from (a cover's or extend's source). */
  parentRef: string | null;
  /** SHA-256 of the media library track it covered. */
  sourceItem: string | null;
  /** Takes made by one request share it. */
  batchId: string | null;
  title: string;
  styles: string;
  excludeStyles: string;
  lyrics: string;
  instrumental: boolean;
  model: string;
  settings: GenerationSettings;
  workspace: { id?: string; name?: string } | null;
  status: GenerationStatus;
  audioUrl: string | null;
  imageUrl: string | null;
  /** Seconds. */
  duration: number | null;
  credits: number | null;
  rating: GenerationRating | null;
  notes: GenerationNote[];
  /** Production slugs it was used in. */
  usedIn: string[];
  /** SHA-256 of the media library item, once it is filed there. */
  libraryItem: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** The take's page on the tool's site, e.g. https://suno.com/song/<ref>. */
  url: string | null;
  parentUrl: string | null;
}

/** A saved style: styles, exclude styles and settings to start a take from. */
export interface GenerationPreset {
  id: string;
  projectId: string;
  name: string;
  tool: string;
  styles: string;
  excludeStyles: string;
  settings: GenerationSettings;
  createdBy: string;
  updatedAt: string;
}

/** Display names for the settings, in the order they are shown. */
export const SETTING_LABELS: Record<string, string> = {
  vocalGender: 'vocal gender',
  weirdness: 'weirdness',
  styleInfluence: 'style influence',
  audioInfluence: 'audio influence',
  variety: 'variety',
  duration: 'duration',
  voice: 'voice',
};

const SUNO_SONG = /suno\.com\/song\/([A-Za-z0-9-]+)/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The take's page on its tool's site, or null when the tool has none. */
export function takeUrl(tool: string, ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (tool === 'suno') return `https://suno.com/song/${encodeURIComponent(ref)}`;
  return null;
}

/** A ref from what someone pasted: a suno.com/song/<id> link becomes its id, anything else is trimmed. */
export function refFromInput(value: string): string {
  const trimmed = value.trim();
  return trimmed.match(SUNO_SONG)?.[1] ?? trimmed;
}

/** True when a search reads as one take's id or link rather than words. */
export function looksLikeRef(value: string): boolean {
  const trimmed = value.trim();
  return SUNO_SONG.test(trimmed) || UUID.test(trimmed);
}

const humanize = (key: string) => SETTING_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/** `weirdness 50, style influence 70, voice Aria`: the named settings first, then any others. */
export function formatSettings(settings: GenerationSettings | null | undefined): string {
  if (!settings) return '';
  const keys = [
    ...Object.keys(SETTING_LABELS).filter(k => k in settings),
    ...Object.keys(settings).filter(k => !(k in SETTING_LABELS)),
  ];
  return keys
    .filter(k => settings[k] !== undefined && settings[k] !== '')
    .map(k => `${humanize(k)} ${settings[k]}`)
    .join(', ');
}

/** 3:07 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Everything Claude needs to make more from a take, to paste into a chat: what
 * it is, how it was made, the lyrics, which channel, then a request to edit.
 */
export function copyForClaude(take: Generation, channelName: string): string {
  const lines = [`Title: ${take.title || 'Untitled'}`];
  if (take.url) lines.push(`Link: ${take.url}`);
  if (take.model) lines.push(`Model: ${take.model}`);
  const settings = formatSettings(take.settings);
  if (settings) lines.push(`Settings: ${settings}`);
  if (take.styles) lines.push(`Styles: ${take.styles}`);
  if (take.excludeStyles) lines.push(`Exclude styles: ${take.excludeStyles}`);
  if (take.instrumental) lines.push('Lyrics: none (instrumental)');
  else if (take.lyrics) lines.push('Lyrics:', take.lyrics);
  lines.push(`Channel: ${channelName}`, '', 'Ask Claude: make 3 covers of this in <style>');
  return lines.join('\n');
}
