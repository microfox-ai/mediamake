'use client';

/**
 * Video poster frame for the Mediamake library grid — same approach as apps/mediamake
 * components/editor/media/media-ui.tsx (mediabunny + useVideoThumbnail).
 */
import { Film, Loader2, Play } from 'lucide-react';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';

/** Strip #fragment (e.g. #t=) so UrlSource receives a clean URL. */
export function videoUrlForThumbnail(filePath: string): string {
  const i = filePath.indexOf('#');
  return i === -1 ? filePath : filePath.slice(0, i);
}

export function MediamakeVideoThumb({
  src,
  title,
  timeInSeconds = 2,
  width = 280,
}: {
  src: string;
  title?: string;
  timeInSeconds?: number;
  width?: number;
}) {
  const cleanSrc = videoUrlForThumbnail(src);
  const { thumbnailSrc, loading } = useVideoThumbnail(cleanSrc, {
    timeInSeconds,
    width,
  });

  if (thumbnailSrc) {
    return (
      <div className="relative h-full w-full bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL / CDN */}
        <img
          src={thumbnailSrc}
          alt={title ?? ''}
          className="h-full w-full object-contain"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="size-7 text-white/90 drop-shadow" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Film className="size-10 opacity-50" />
    </div>
  );
}
