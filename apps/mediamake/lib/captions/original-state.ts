import type { Caption } from '@/app/types/transcription';

type CaptionWithOriginal = Caption & { originalState?: Caption };

function cloneCaption(caption: Caption): Caption {
  return JSON.parse(JSON.stringify(caption)) as Caption;
}

/** Snapshot each line as sentence structure left it. Later edits must not replace this. */
export function stampCaptionOriginalState(captions: Caption[]): Caption[] {
  return captions.map(caption => {
    const { originalState: _previous, ...rest } = caption as CaptionWithOriginal;
    const snapshot = cloneCaption(rest as Caption);
    return { ...(rest as Caption), originalState: snapshot };
  });
}

export function resetCaptionToOriginal<T extends { originalState?: unknown }>(caption: T): T {
  const stored = caption.originalState;
  if (!stored || typeof stored !== 'object') return caption;
  const snapshot = JSON.parse(JSON.stringify(stored)) as T;
  return { ...snapshot, originalState: stored };
}

export function captionHasOriginalState(caption: { originalState?: unknown } | null | undefined): boolean {
  return !!caption?.originalState && typeof caption.originalState === 'object';
}

/** Line-level rewrites keep the sentence-structure snapshot when the line id is unchanged. */
export function preserveCaptionOriginalState(previous: Caption[], next: Caption[]): Caption[] {
  const byId = new Map<string, Caption>();
  for (const caption of previous) {
    const stored = (caption as CaptionWithOriginal).originalState;
    if (caption.id && stored) byId.set(caption.id, stored);
  }
  return next.map(caption => {
    const stored = caption.id ? byId.get(caption.id) : undefined;
    if (!stored) return caption;
    return { ...caption, originalState: stored };
  });
}
