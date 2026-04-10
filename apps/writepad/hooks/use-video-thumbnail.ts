import { useEffect, useState } from 'react';
import { ALL_FORMATS, CanvasSink, Input, UrlSource } from 'mediabunny';

type UseVideoThumbnailOptions = {
  /**
   * Timestamp in seconds from which to extract the thumbnail.
   * If the video duration is known, the actual capture time will be clamped to the duration.
   */
  timeInSeconds?: number;
  /**
   * Target thumbnail width in pixels. Height will be derived from the video aspect ratio.
   */
  width?: number;
};

type UseVideoThumbnailResult = {
  thumbnailSrc: string | null;
  loading: boolean;
  error: Error | null;
};

// Simple in-memory cache so we only decode a given URL once per session.
const thumbnailCache = new Map<string, string>();

export function useVideoThumbnail(
  src: string | null | undefined,
  options: UseVideoThumbnailOptions = {},
): UseVideoThumbnailResult {
  const { timeInSeconds = 1, width = 320 } = options;
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!src) {
      setThumbnailSrc(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Serve from cache if available.
    const cached = thumbnailCache.get(src);
    if (cached) {
      setThumbnailSrc(cached);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let input: Input | null = null;

    const generateThumbnail = async () => {
      try {
        setLoading(true);
        setError(null);

        input = new Input({
          formats: ALL_FORMATS,
          source: new UrlSource(src),
        });

        const videoTrack = await input.getPrimaryVideoTrack();
        if (!videoTrack) {
          throw new Error('No video track found for thumbnail generation.');
        }

        const canDecode = await videoTrack.canDecode();
        if (!canDecode) {
          throw new Error('Video track is not decodable for thumbnail generation.');
        }

        const sink = new CanvasSink(videoTrack, {
          width,
        });

        let duration: number | null = null;
        try {
          const d = await input.computeDuration();
          duration = Number.isFinite(d) && d > 0 ? d : null;
        } catch {
          duration = null;
        }

        let t = timeInSeconds;
        if (duration !== null) {
          const safeMax = Math.max(0, duration - 0.1);
          t = Math.min(Math.max(0, timeInSeconds), safeMax);
        }

        const result = await sink.getCanvas(t);
        const canvas = result?.canvas;
        if (!canvas) {
          throw new Error('Failed to obtain canvas from CanvasSink.');
        }

        let htmlCanvas: HTMLCanvasElement;
        if (canvas instanceof HTMLCanvasElement) {
          htmlCanvas = canvas;
        } else {
          htmlCanvas = document.createElement('canvas');
          htmlCanvas.width = (canvas as OffscreenCanvas).width;
          htmlCanvas.height = (canvas as OffscreenCanvas).height;
          const ctx = htmlCanvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get 2D context for thumbnail canvas.');
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ctx.drawImage(canvas as any, 0, 0);
        }

        const dataUrl = htmlCanvas.toDataURL('image/jpeg', 0.8);
        if (!dataUrl) {
          throw new Error('Failed to convert thumbnail canvas to data URL.');
        }

        if (!cancelled) {
          thumbnailCache.set(src, dataUrl);
          setThumbnailSrc(dataUrl);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setThumbnailSrc(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        if (input && typeof (input as { dispose?: () => void }).dispose === 'function') {
          try {
            (input as { dispose: () => void }).dispose();
          } catch {
            /* ignore */
          }
        }
      }
    };

    void generateThumbnail();

    return () => {
      cancelled = true;
      if (input && typeof (input as { dispose?: () => void }).dispose === 'function') {
        try {
          (input as { dispose: () => void }).dispose();
        } catch {
          /* ignore */
        }
      }
    };
  }, [src, timeInSeconds, width]);

  return { thumbnailSrc, loading, error };
}
