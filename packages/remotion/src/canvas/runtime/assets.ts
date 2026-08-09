import { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { CanvasAssets, CanvasSourceDef } from '../types';

/**
 * Render-safe asset loading for canvas drawing.
 *
 * All image loads go through delayRender so Remotion never captures a frame
 * before the pixels exist. Decoded images are cached module-wide, so the
 * same URL used by several ops/components loads exactly once per worker.
 */

const imageCache = new Map<string, Promise<HTMLImageElement>>();

const resolveSrc = (src: string): string =>
  src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  const key = resolveSrc(src);
  const cached = imageCache.get(key);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load canvas image: ${src}`));
    img.src = key;
  });
  imageCache.set(key, promise);
  // Allow a retry on failure instead of caching the rejection forever.
  promise.catch(() => imageCache.delete(key));
  return promise;
};

/**
 * Load a single image behind delayRender. Returns null until decoded.
 * On failure the render is released (continueRender) and null is returned,
 * letting callers degrade gracefully instead of hanging the render.
 */
export const useRenderSafeImage = (
  src: string | undefined
): HTMLImageElement | null => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let cancelled = false;
    const handle = delayRender(`canvas: loading image ${src}`);
    loadImage(src)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) setImage(null);
      })
      .finally(() => continueRender(handle));
    return () => {
      cancelled = true;
      continueRender(handle);
    };
  }, [src]);

  return image;
};

/**
 * Load every source in a pipeline's `sources` map behind a single
 * delayRender. Returns null until everything is decoded, then a stable
 * CanvasAssets lookup.
 */
export const useCanvasSources = (
  sources: Record<string, CanvasSourceDef> | undefined
): CanvasAssets | null => {
  const sourcesKey = useMemo(() => JSON.stringify(sources ?? {}), [sources]);
  const [assets, setAssets] = useState<CanvasAssets | null>(null);

  useEffect(() => {
    const defs: Record<string, CanvasSourceDef> = JSON.parse(sourcesKey);
    const entries = Object.entries(defs);
    let cancelled = false;
    const handle = delayRender(
      `canvas: loading ${entries.length} source(s)`
    );

    Promise.all(
      entries.map(async ([name, def]) => {
        try {
          const img = await loadImage(def.src);
          return [name, img] as const;
        } catch (err) {
          console.warn(err);
          return [name, undefined] as const;
        }
      })
    )
      .then((loaded) => {
        if (cancelled) return;
        const map = new Map<string, HTMLImageElement | undefined>(loaded);
        setAssets({ image: (name: string) => map.get(name) ?? undefined });
      })
      .finally(() => continueRender(handle));

    return () => {
      cancelled = true;
      continueRender(handle);
    };
  }, [sourcesKey]);

  return assets;
};
