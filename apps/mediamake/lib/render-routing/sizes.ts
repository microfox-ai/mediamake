import { isLocalMediaUrl } from "../local-media/urls";
import type { MediaSource } from "./plan";

/**
 * File sizes for a plan's media, from HEAD requests (Content-Length).
 * Best effort: a file that doesn't answer, or blocks CORS in the browser,
 * is simply left out and the plan goes by duration for it.
 */
export async function probeMediaSizes(
  media: Pick<MediaSource, "src" | "bytes">[],
  { timeoutMs = 4000, max = 24 }: { timeoutMs?: number; max?: number } = {},
): Promise<Record<string, number>> {
  const targets = media
    .filter(m => m.bytes === undefined && /^https?:\/\//i.test(m.src) && !isLocalMediaUrl(m.src))
    .slice(0, max);
  const sizes: Record<string, number> = {};
  await Promise.all(
    targets.map(async ({ src }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(src, { method: "HEAD", signal: controller.signal });
        const length = Number(res.headers.get("content-length"));
        if (res.ok && Number.isFinite(length) && length > 0) sizes[src] = length;
      } catch {
        // Unknown size.
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  return sizes;
}
