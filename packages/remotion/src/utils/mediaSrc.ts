import { staticFile } from 'remotion';

/**
 * Whether a media `src` is already a URL (http(s), a blob: URL of a local file, a data: URL)
 * rather than a path in the public folder.
 */
export const isUrlSrc = (src: string) => /^(https?:|blob:|data:)/.test(src);

/** URLs as they are; anything else through `staticFile`. */
export const resolveMediaSrc = (src: string) => (isUrlSrc(src) ? src : staticFile(src));
