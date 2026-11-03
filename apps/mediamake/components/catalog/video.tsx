'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { onYouTubeThumbnailLoad, placeholderBackground, youtubeEmbedUrl } from '@/lib/catalog/video';

/**
 * A video's thumbnail at 16:9, or, when there is none yet, the item's title
 * on its own colour (the same colour every time, see placeholderBackground).
 */
export function VideoThumb({
  id,
  title,
  src,
  className,
  size = 'md',
}: {
  /** The item's id: picks its colour. */
  id: string;
  title: string;
  src?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const img = useRef<HTMLImageElement>(null);
  // a server-rendered thumbnail can finish loading before hydration, so its onLoad never runs
  useEffect(() => {
    if (img.current?.complete) onYouTubeThumbnailLoad({ currentTarget: img.current });
  }, [src]);
  return (
    <div className={cn('relative aspect-video w-full overflow-hidden bg-muted', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src={src} alt="" loading="lazy" onLoad={onYouTubeThumbnailLoad} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center p-4 text-center"
          style={{ background: placeholderBackground(id) }}
          aria-hidden
        >
          <span
            className={cn(
              'line-clamp-3 break-words font-semibold leading-tight tracking-tight text-white drop-shadow-sm',
              size === 'sm' ? 'text-[11px]' : 'text-xl',
            )}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}

/** The YouTube player for one video, at 16:9. */
export function YouTubeEmbed({ youtubeId, title, className }: { youtubeId: string; title: string; className?: string }) {
  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-xl bg-black', className)}>
      <iframe
        src={youtubeEmbedUrl(youtubeId)}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
