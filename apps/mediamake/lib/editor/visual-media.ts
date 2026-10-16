import { overlayMediaStatic } from "../../components/editor/presets/dataTypes/media";

export type VisualMediaKind = "image" | "video";

/** One image or video a preset can preview in the left panel. */
export type VisualMediaRef = {
  kind: VisualMediaKind;
  src: string;
  thumbnail?: string;
};

export type MediaReferenceLike = {
  key?: string;
  value?: unknown;
};

/** A clip that can draw a filmstrip. `sourceOffset` is seconds into the file. */
export type ClipStill = VisualMediaRef & {
  sourceOffset: number;
};

const SRC_KEYS = ["src", "filePath", "url", "mediaUrl", "imageUrl", "videoUrl"] as const;

const SKIP_WALK_KEYS = new Set([
  "text",
  "html",
  "captions",
  "words",
  "title",
  "description",
  "name",
  "label",
  "trackName",
  "className",
  "fontFamily",
  "font",
  "color",
  "colorTint",
  "filter",
  "fit",
  "rangeString",
  "lock",
  "lockTo",
  "attachedToId",
  "id",
  "key",
  "presetId",
  "componentId",
  "proxySrc",
  "thumbnail",
  "thumbnailUrl",
  "poster",
]);

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv|flv|wmv)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|wma)(\?|#|$)/i;
const FONT_EXT = /\.(woff2?|ttf|otf|eot)(\?|#|$)/i;

type Kind = "image" | "video" | "audio";

function isFetchable(value: string): boolean {
  return /^(https?:\/\/|blob:|data:image\/|data:video\/|\/)/i.test(value);
}

/** True when a video URL can be decoded into a still, the way the media grid does. */
export function isDirectVideoUrl(url: string): boolean {
  if (/^blob:/i.test(url) || /^data:video\//i.test(url)) return true;
  return VIDEO_EXT.test(url.split(/[?#]/)[0]);
}

function explicitKind(value: unknown): Kind | null {
  if (typeof value !== "string") return null;
  const kind = value.trim().toLowerCase();
  if (kind === "image" || kind.startsWith("image/")) return "image";
  if (kind === "video" || kind.startsWith("video/")) return "video";
  if (kind === "audio" || kind.startsWith("audio/")) return "audio";
  return null;
}

function kindFromUrl(url: string): Kind | null {
  if (/^data:image\//i.test(url)) return "image";
  if (/^data:video\//i.test(url)) return "video";
  if (/^data:audio\//i.test(url)) return "audio";
  const path = url.split(/[?#]/)[0];
  if (FONT_EXT.test(path)) return null;
  if (IMAGE_EXT.test(path)) return "image";
  if (VIDEO_EXT.test(path)) return "video";
  if (AUDIO_EXT.test(path)) return "audio";
  if (/images\.unsplash\.com|images\.pexels\.com|i\.imgur\.com/i.test(url)) return "image";
  return null;
}

function classify(record: Record<string, unknown>, src: string, key?: string): Kind | null {
  const declared =
    explicitKind(record.type) ||
    explicitKind(record.contentType) ||
    explicitKind(record.contentMimeType);
  if (declared) return declared;
  const fromUrl = kindFromUrl(src);
  if (fromUrl) return fromUrl;
  if (key === "imageUrl" || record.backgroundType === "image-overlay") return "image";
  if (key === "videoUrl" || record.backgroundType === "video-overlay") return "video";
  return null;
}

function thumbnailOf(record: Record<string, unknown>): string | undefined {
  const direct = record.thumbnail ?? record.thumbnailUrl ?? record.poster;
  if (typeof direct === "string" && direct.trim() && isFetchable(direct.trim())) {
    return direct.trim();
  }
  const metadata = record.metadata;
  if (metadata && typeof metadata === "object") {
    const meta = metadata as Record<string, unknown>;
    const nested = meta.thumbnail ?? meta.thumbnailUrl;
    if (typeof nested === "string" && nested.trim() && isFetchable(nested.trim())) {
      return nested.trim();
    }
  }
  return undefined;
}

function extractCssUrls(value: string): string[] {
  const urls: string[] = [];
  const pattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    const url = match[2]?.trim();
    if (url) urls.push(url);
  }
  return urls;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sourceOffsetOf(record: Record<string, unknown>): number {
  for (const key of ["startFrom", "startCropVideo", "startCrop"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function unwrapRef(raw: string, baseData: Record<string, unknown>): unknown {
  const match = raw.trim().match(/^data:\[([^\]]+)\]$/);
  if (!match) return raw;
  const key = match[1].trim();
  return key in baseData ? baseData[key] : raw;
}

/** Image or video identity on one media object. Audio returns null. */
export function readClipStill(
  value: unknown,
  baseData: Record<string, unknown> = {},
): ClipStill | null {
  if (!isRecord(value)) return null;
  for (const key of SRC_KEYS) {
    const raw = value[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const unwrapped = unwrapRef(raw.trim(), baseData);
    if (typeof unwrapped !== "string" || !isFetchable(unwrapped.trim())) continue;
    const src = unwrapped.trim();
    const kind = classify(value, src, key);
    if (kind !== "image" && kind !== "video") return null;
    const thumbnail = thumbnailOf(value);
    return {
      kind,
      src,
      sourceOffset: sourceOffsetOf(value),
      ...(thumbnail ? { thumbnail } : {}),
    };
  }
  return null;
}

/**
 * One entry per media or image item, in order. Audio items are null so
 * indexes still match the timeline blocks.
 */
export function clipStillsForInput(
  input: unknown,
  references?: MediaReferenceLike[] | null,
): Array<ClipStill | null> {
  if (!isRecord(input)) return [];
  const baseData = baseDataFrom(references);
  const group = isRecord(input.mediaItems)
    ? input.mediaItems
    : isRecord(input.images)
      ? input.images
      : Array.isArray(input.mediaItems)
        ? input.mediaItems
        : Array.isArray(input.images)
          ? input.images
          : null;
  let items: unknown[] | null = null;
  if (Array.isArray(group)) {
    items = group;
  } else if (isRecord(group) && Array.isArray(group.items)) {
    const medias =
      typeof group.mediaRef === "string" ? baseData[group.mediaRef] : undefined;
    const local = group.items;
    const length = Math.max(local.length, Array.isArray(medias) ? medias.length : 0);
    items = Array.from({ length }, (_, index) =>
      overlayMediaStatic(local[index], Array.isArray(medias) ? medias[index] : undefined),
    );
  }
  if (!items) return [];
  return items.map((item) => readClipStill(item, baseData));
}

function baseDataFrom(references?: MediaReferenceLike[] | null): Record<string, unknown> {
  const baseData: Record<string, unknown> = {};
  for (const reference of references ?? []) {
    if (reference?.key) baseData[reference.key] = reference.value;
  }
  return baseData;
}

/**
 * Image and video URLs stored on a preset. Audio is omitted.
 * Linked `mediaRef` groups are filled from timeline references.
 * The same source is counted once.
 */
export function collectVisualMedia(
  input: unknown,
  references?: MediaReferenceLike[] | null,
): VisualMediaRef[] {
  const baseData = baseDataFrom(references);
  const out: VisualMediaRef[] = [];
  const seen = new Set<string>();
  const visiting = new WeakSet<object>();

  const push = (kind: Kind | null, src: string, thumbnail?: string) => {
    if (kind !== "image" && kind !== "video") return;
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push({ kind, src, ...(thumbnail ? { thumbnail } : {}) });
  };

  const unwrap = (raw: string): unknown => {
    const match = raw.trim().match(/^data:\[([^\]]+)\]$/);
    if (!match) return raw;
    const key = match[1].trim();
    return key in baseData ? baseData[key] : raw;
  };

  const considerUrl = (
    raw: string,
    record: Record<string, unknown>,
    key?: string,
    thumbnail?: string,
  ) => {
    const unwrapped = unwrap(raw);
    if (typeof unwrapped !== "string") {
      walk(unwrapped);
      return;
    }
    const src = unwrapped.trim();
    if (!isFetchable(src)) return;
    push(classify(record, src, key), src, thumbnail);
  };

  const walk = (value: unknown, key?: string) => {
    if (typeof value === "string") {
      const cssUrls = extractCssUrls(value);
      if (cssUrls.length > 0) {
        for (const url of cssUrls) considerUrl(url, {}, key);
        return;
      }
      const unwrapped = unwrap(value);
      if (unwrapped !== value) {
        walk(unwrapped, key);
        return;
      }
      if (key && (SRC_KEYS as readonly string[]).includes(key)) {
        considerUrl(value, {}, key);
      }
      return;
    }

    if (!value || typeof value !== "object") return;
    if (visiting.has(value)) return;
    visiting.add(value);

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string") considerUrl(entry, {}, key);
        else walk(entry);
      }
      return;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.mediaRef === "string" && Array.isArray(record.items)) {
      const medias = baseData[record.mediaRef];
      const items = record.items;
      const length = Math.max(items.length, Array.isArray(medias) ? medias.length : 0);
      for (let index = 0; index < length; index += 1) {
        walk(overlayMediaStatic(items[index], Array.isArray(medias) ? medias[index] : undefined));
      }
      for (const [childKey, child] of Object.entries(record)) {
        if (childKey === "items" || childKey === "mediaRef" || SKIP_WALK_KEYS.has(childKey)) continue;
        walk(child, childKey);
      }
      return;
    }

    let consumedSrc = false;
    for (const srcKey of SRC_KEYS) {
      const raw = record[srcKey];
      if (typeof raw !== "string" || !raw.trim()) continue;
      considerUrl(raw, record, srcKey, thumbnailOf(record));
      consumedSrc = true;
      break;
    }

    for (const [childKey, child] of Object.entries(record)) {
      if (SKIP_WALK_KEYS.has(childKey)) continue;
      if (consumedSrc && (SRC_KEYS as readonly string[]).includes(childKey)) continue;
      if (typeof child === "string" || (child && typeof child === "object")) {
        walk(child, childKey);
      }
    }
  };

  walk(input);
  return out;
}
