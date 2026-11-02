'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VideoThumb, YouTubeEmbed } from './video';

/** One lesson of a course as its page plays it. */
export interface Lesson {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  thumbnail?: string;
}

/** The little of YouTube's IFrame API the player uses. */
interface YouTubePlayer {
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  destroy(): void;
}
interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: { onStateChange?: (event: { data: number }) => void };
    },
  ) => YouTubePlayer;
  PlayerState: { ENDED: number };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApi: Promise<YouTubeApi> | null = null;

/** Loads YouTube's IFrame API once per page. */
function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youtubeApi ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      youtubeApi = null;
      reject(new Error('YouTube player could not load'));
    };
    document.head.appendChild(script);
  });
  return youtubeApi;
}

/**
 * A course's lessons in order: the player plays one and moves on to the next
 * when it ends; the list beside it jumps to any. `?lesson=<n>` opens on one.
 */
export function CoursePlayer({ courseId, lessons }: { courseId: string; lessons: Lesson[] }) {
  const [index, setIndex] = useState(0);
  // the API failed to load (blocked): play each lesson in a plain embed instead
  const [plain, setPlain] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const current = useRef(0);
  // the first lesson is cued, not played; every later change plays at once
  const started = useRef(false);

  // open on ?lesson=<n> (1-based)
  useEffect(() => {
    const wanted = Number(new URLSearchParams(window.location.search).get('lesson'));
    if (Number.isInteger(wanted) && wanted >= 1 && wanted <= lessons.length) setIndex(wanted - 1);
  }, [lessons.length]);

  useEffect(() => {
    if (!lessons.length || !host.current) return;
    let live = true;
    const element = document.createElement('div');
    host.current.appendChild(element);
    loadYouTubeApi()
      .then(YT => {
        if (!live) return;
        player.current = new YT.Player(element, {
          videoId: lessons[current.current].youtubeId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onStateChange: event => {
              if (event.data === YT.PlayerState.ENDED && current.current < lessons.length - 1) {
                started.current = true;
                setIndex(current.current + 1);
              }
            },
          },
        });
      })
      .catch(() => live && setPlain(true));
    return () => {
      live = false;
      player.current?.destroy();
      player.current = null;
      element.remove();
    };
  }, [lessons]);

  useEffect(() => {
    current.current = index;
    const lesson = lessons[index];
    if (!lesson) return;
    if (started.current) player.current?.loadVideoById(lesson.youtubeId);
    else player.current?.cueVideoById(lesson.youtubeId);
    const url = new URL(window.location.href);
    if (index === 0) url.searchParams.delete('lesson');
    else url.searchParams.set('lesson', String(index + 1));
    window.history.replaceState(null, '', url);
  }, [index, lessons]);

  const go = (next: number) => {
    started.current = true;
    setIndex(Math.max(0, Math.min(lessons.length - 1, next)));
  };

  if (!lessons.length) {
    return <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No lessons in this course yet.</p>;
  }
  const lesson = lessons[index];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {plain ? (
          <YouTubeEmbed key={lesson.id} youtubeId={lesson.youtubeId} title={lesson.title} />
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <div ref={host} className="absolute inset-0 [&_iframe]:size-full" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Lesson {index + 1} of {lessons.length}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">{lesson.title}</h2>
          {lesson.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{lesson.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronLeft />
            Previous
          </Button>
          <Button size="sm" disabled={index === lessons.length - 1} onClick={() => go(index + 1)}>
            Next lesson
            <ChevronRight />
          </Button>
        </div>
      </div>

      <ol className="flex flex-col gap-1.5 rounded-xl border bg-card p-2" aria-label="Lessons">
        {lessons.map((other, i) => (
          <li key={other.id}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === index ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/60',
                i === index && 'bg-muted',
              )}
            >
              <span className="w-5 shrink-0 text-center text-xs font-medium tabular-nums text-muted-foreground">
                {i === index ? <Play className="mx-auto size-3.5 fill-current text-foreground" /> : i + 1}
              </span>
              <VideoThumb id={`${courseId}:${other.id}`} title={other.title} src={other.thumbnail} size="sm" className="w-24 shrink-0 rounded-md" />
              <span className={cn('line-clamp-2 min-w-0 text-sm', i === index && 'font-medium')}>{other.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
