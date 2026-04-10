/** GFM image with Mediamake id in the title (tooltip + machine-readable). */
export function mdImageWithMediamakeRef(
  label: string,
  url: string,
  mediamakeId: string,
): string {
  const safe = label.replace(/[\[\]]/g, '').trim() || 'media';
  const title = `mediamake:${mediamakeId}`;
  return `![${safe}](${url} "${title}")`;
}

/** Link with Mediamake id in the title (for audio/video). */
export function mdLinkWithMediamakeRef(
  label: string,
  url: string,
  mediamakeId: string,
): string {
  const safe = label.replace(/[\[\]]/g, '').trim() || 'media';
  const title = `mediamake:${mediamakeId}`;
  return `[${safe}](${url} "${title}")`;
}

/**
 * Append Media Fragments `#t=` (seconds). Many browsers respect this when opening a direct
 * video file URL; YouTube etc. need their own `t` query — not handled here.
 */
export function withMediaStartSeconds(
  url: string,
  startSeconds?: number | null,
): string {
  if (startSeconds == null || !Number.isFinite(startSeconds) || startSeconds <= 0) {
    return url;
  }
  const base = url.trim().replace(/#.*$/, '');
  const t =
    startSeconds % 1 === 0
      ? Math.floor(startSeconds).toString()
      : String(Number(startSeconds.toFixed(3)));
  return `${base}#t=${t}`;
}

export function isImageLikeMedia(
  contentType: string | null | undefined,
  contentMimeType: string | null | undefined,
): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct === 'image') return true;
  const mime = (contentMimeType || '').toLowerCase();
  return mime.startsWith('image/');
}

export function isVideoLikeMedia(
  contentType: string | null | undefined,
  contentMimeType: string | null | undefined,
): boolean {
  const ct = (contentType || '').toLowerCase();
  if (ct === 'video') return true;
  const mime = (contentMimeType || '').toLowerCase();
  return mime.startsWith('video/');
}
