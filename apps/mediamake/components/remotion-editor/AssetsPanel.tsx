'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileAudioIcon,
  FileImageIcon,
  FileVideoIcon,
  ReplaceIcon,
  Undo2Icon,
  UploadIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mediaKindOf, type MediaFile } from '@/lib/remotion-editor/types';
import { cn } from '@/lib/utils';
import { useEditor } from './store';

/*
 * Every image, clip and sound of the open project, what is on screen now first. Swapping one saves
 * it in edits.json (`assets`): the kit hands every scene the replacement wherever it loads the
 * file through asset() or the manifest, in this player and in every render.
 */

const KIND_ICON = { image: FileImageIcon, video: FileVideoIcon, audio: FileAudioIcon };
const ACCEPT = { image: 'image/*', video: 'video/*', audio: 'audio/*' };
const LIMIT = 300;

const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const folderOf = (path: string) => {
  const parts = path.split('/');
  return parts.slice(1, -1).join('/') || '.';
};
const sizeOf = (bytes: number) =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} kB`;

/** Paths of the files the Player shows right now (by their URLs in its DOM), checked while it settles. */
function useOnScreenPaths(urlToPath: Map<string, string>): Set<string> {
  const [paths, setPaths] = useState<Set<string>>(new Set());
  useEffect(() => {
    let timer = 0;
    const scan = () => {
      const found = new Set<string>();
      const add = (url: string | null | undefined) => {
        const path = url ? urlToPath.get(url) : undefined;
        if (path) found.add(path);
      };
      document.querySelectorAll<HTMLElement>('img, video, audio, source, image').forEach(el => {
        if (el.closest('[data-assets-panel]')) return;
        if (el instanceof HTMLMediaElement) add(el.currentSrc || el.src);
        else if (el instanceof HTMLImageElement) add(el.currentSrc || el.src);
        else if (el instanceof HTMLSourceElement) add(el.src);
        else add(el.getAttribute('href') ?? el.getAttribute('xlink:href'));
      });
      document.querySelectorAll<HTMLElement>('[style*="url("]').forEach(el => {
        if (el.closest('[data-assets-panel]')) return;
        for (const m of el.style.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) add(m[1]);
      });
      setPaths(prev =>
        prev.size === found.size && [...found].every(p => prev.has(p)) ? prev : found,
      );
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(scan, 150);
    };
    scan();
    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.frame !== prev.frame || s.edits.assets !== prev.edits.assets) schedule();
    });
    // while playing, frames change too often to follow: a look every second is enough
    const every = window.setInterval(() => useEditor.getState().playing && scan(), 1000);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.clearInterval(every);
    };
  }, [urlToPath]);
  return paths;
}

function Thumb({ path, url, kind }: { path: string; url: string; kind: MediaFile['kind'] }) {
  const Icon = KIND_ICON[kind];
  return kind === 'image' ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      className="size-8 shrink-0 rounded border bg-muted object-cover"
      title={path}
    />
  ) : (
    <span className="flex size-8 shrink-0 items-center justify-center rounded border bg-muted">
      <Icon className="size-4 text-muted-foreground" />
    </span>
  );
}

function Preview({ url, kind }: { url: string; kind: MediaFile['kind'] }) {
  if (kind === 'image')
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="max-h-40 w-full rounded border bg-muted object-contain" />;
  if (kind === 'video')
    return (
      <video src={url} controls muted preload="metadata" className="max-h-40 w-full rounded border bg-black" />
    );
  return <audio src={url} controls preload="metadata" className="h-8 w-full" />;
}

/** The detail of one file: preview, and the controls to swap it or put it back. */
function AssetDetail({ path, kind }: { path: string; kind: MediaFile['kind'] }) {
  const source = useEditor(s => s.source);
  const media = useEditor(s => s.media);
  const swappedFor = useEditor(s => s.edits.assets[path]);
  const swapAsset = useEditor(s => s.swapAsset);
  const swapping = useEditor(s => s.swapping);
  const fileRef = useRef<HTMLInputElement>(null);
  const others = useMemo(
    () => media.filter(m => m.kind === kind && m.path !== path),
    [media, kind, path],
  );
  if (!source) return null;
  const shown = swappedFor ?? path;
  return (
    <div className="space-y-2 px-2 pb-3 pt-1">
      <Preview url={source.assetUrl(shown)} kind={kind} />
      <p className="break-all font-mono text-[10px] text-muted-foreground">{path}</p>
      {swappedFor && (
        <p className="text-[11px]">
          Swapped for <span className="break-all font-mono text-[10px]">{swappedFor}</span>
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void swapAsset(path, file);
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={!source.writeSwap || !!swapping}
          onClick={() => fileRef.current?.click()}
        >
          <UploadIcon className="size-3.5" />
          {swapping ? `Saving ${swapping}…` : 'Replace with a file…'}
        </Button>
        {swappedFor && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => void swapAsset(path, undefined)}
          >
            <Undo2Icon className="size-3.5" /> Put the original back
          </Button>
        )}
      </div>
      {others.length > 0 && (
        <Select value="" onValueChange={v => void swapAsset(path, v)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Or use another file of the project…" />
          </SelectTrigger>
          <SelectContent>
            {others.slice(0, LIMIT).map(m => (
              <SelectItem key={m.path} value={m.path} className="text-xs">
                {m.path.slice(m.path.indexOf('/') + 1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-[10px] leading-snug text-muted-foreground">
        Drop a file on a row to swap it. Scenes get the swap where they load the file with the
        kit&apos;s asset() or through the manifest.
      </p>
    </div>
  );
}

export function AssetsPanel() {
  const source = useEditor(s => s.source);
  const slug = useEditor(s => s.slug);
  const media = useEditor(s => s.media);
  const rawManifest = useEditor(s => s.rawManifest);
  const swaps = useEditor(s => s.edits.assets);
  const swapAsset = useEditor(s => s.swapAsset);
  const [filter, setFilter] = useState('');
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);

  // every URL the player may show → the path it stands for (a swapped-in file → the original)
  const urlToPath = useMemo(() => {
    const map = new Map<string, string>();
    if (!source) return map;
    const back = new Map(Object.entries(swaps).map(([from, to]) => [to, from]));
    for (const m of media) map.set(source.assetUrl(m.path), back.get(m.path) ?? m.path);
    for (const [from, to] of Object.entries(swaps)) map.set(source.assetUrl(to), from);
    return map;
  }, [source, media, swaps]);
  const onScreen = useOnScreenPaths(urlToPath);

  const rows = useMemo(() => {
    const named = new Set<string>([
      ...(rawManifest ? [rawManifest.audio.src] : []),
      ...Object.values(rawManifest?.assets ?? {}),
    ]);
    const swappedIn = new Set(Object.values(swaps));
    const all = new Map<string, MediaFile>();
    for (const m of media) all.set(m.path, m);
    // a swap of a file that is gone from disk still shows, so it can be put back
    for (const from of Object.keys(swaps)) {
      const kind = mediaKindOf(from);
      if (!all.has(from) && kind) all.set(from, { path: from, kind, size: 0 });
    }
    const q = filter.trim().toLowerCase();
    const rank = (m: MediaFile) =>
      (onScreen.has(m.path) ? 0 : 4) + (swaps[m.path] ? 0 : 2) + (named.has(m.path) ? 0 : 1);
    return [...all.values()]
      .filter(m => !swappedIn.has(m.path) || onScreen.has(m.path))
      .filter(m => !q || m.path.toLowerCase().includes(q))
      .sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path))
      .map(m => ({
        ...m,
        onScreen: onScreen.has(m.path),
        named: named.has(m.path),
        song: m.path === rawManifest?.audio.src,
        swappedFor: swaps[m.path],
      }));
  }, [media, rawManifest, swaps, onScreen, filter]);

  if (!source || !slug) {
    return <div className="p-3 text-xs text-muted-foreground">No project open.</div>;
  }
  const swapCount = Object.keys(swaps).length;
  return (
    <div data-assets-panel className="flex h-full flex-col">
      <div className="space-y-1.5 border-b px-2 py-2">
        <Input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder={`Filter ${media.length} files`}
          className="h-7 text-xs"
        />
        <p className="text-[10px] text-muted-foreground">
          {onScreen.size} on screen now
          {swapCount ? ` · ${swapCount} swapped` : ''}
          {!source.writeSwap ? ' · this source cannot save files' : ''}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {rows.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            {media.length ? 'Nothing matches.' : 'No images, clips or sounds in this project.'}
          </p>
        )}
        {rows.slice(0, LIMIT).map(r => {
          const open = openPath === r.path;
          const url = source.assetUrl(r.swappedFor ?? r.path);
          return (
            <div
              key={r.path}
              className={cn('border-b border-transparent', open && 'border-border bg-muted/40')}
              onDragOver={e => {
                if (!e.dataTransfer.types.includes('Files')) return;
                e.preventDefault();
                e.stopPropagation();
                setDropOn(r.path);
              }}
              onDragLeave={() => setDropOn(p => (p === r.path ? null : p))}
              onDrop={e => {
                const file = e.dataTransfer.files[0];
                if (!file) return;
                // the page opens dropped folders: this drop is a swap
                e.preventDefault();
                e.stopPropagation();
                setDropOn(null);
                const kind = mediaKindOf(file.name) ?? file.type.split('/')[0];
                if (kind !== r.kind) {
                  toast.error(`${file.name} is not ${r.kind === 'image' ? 'an image' : `a${r.kind === 'audio' ? 'n audio file' : ' video'}`}`);
                  return;
                }
                void swapAsset(r.path, file);
              }}
            >
              <button
                type="button"
                onClick={() => setOpenPath(open ? null : r.path)}
                className={cn(
                  'flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted',
                  dropOn === r.path && 'bg-primary/15 ring-1 ring-primary',
                )}
              >
                <Thumb path={r.path} url={url} kind={r.kind} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs">{nameOf(r.path)}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {[
                      r.onScreen && 'on screen',
                      r.song && 'the song',
                      r.named && !r.song && 'in the manifest',
                      folderOf(r.path),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {r.swappedFor ? (
                  <ReplaceIcon className="size-3.5 shrink-0 text-primary" aria-label="swapped" />
                ) : (
                  r.size > 0 && (
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {sizeOf(r.size)}
                    </span>
                  )
                )}
                {r.onScreen && <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />}
              </button>
              {open && <AssetDetail path={r.path} kind={r.kind} />}
            </div>
          );
        })}
        {rows.length > LIMIT && (
          <p className="px-3 py-2 text-[11px] text-muted-foreground">
            {rows.length - LIMIT} more: filter to find them.
          </p>
        )}
      </div>
    </div>
  );
}
