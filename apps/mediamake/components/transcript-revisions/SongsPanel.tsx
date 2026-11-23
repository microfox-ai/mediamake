'use client';

import { FolderOpenIcon, LoaderIcon, MusicIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hint } from '@/components/revisions/keyboard';
import { cn } from '@/lib/utils';
import { useTranscriptStore } from './store';

/** The songs in the opened folder (each one transcript and its audio), filtered by name. */
export function SongsPanel() {
  const root = useTranscriptStore(s => s.root);
  const songs = useTranscriptStore(s => s.songs);
  const scanning = useTranscriptStore(s => s.scanning);
  const filter = useTranscriptStore(s => s.filter);
  const setFilter = useTranscriptStore(s => s.setFilter);
  const current = useTranscriptStore(s => s.song?.entry.id ?? null);
  const openSong = useTranscriptStore(s => s.openSong);
  const pickRoot = useTranscriptStore(s => s.pickRoot);
  const f = filter.trim().toLowerCase();
  const list = f ? songs.filter(s => s.title.toLowerCase().includes(f) || s.folder.toLowerCase().includes(f)) : songs;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold" title={root?.path ?? root?.name}>
            {root?.name ?? 'No folder'}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {scanning ? `Looking… ${scanning.done}/${scanning.total || '?'}` : `${songs.length} songs`}
          </div>
        </div>
        <Hint label="Open another folder" side="bottom">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void pickRoot()}>
            <FolderOpenIcon className="size-4" />
          </Button>
        </Hint>
      </div>
      <div className="border-b p-2">
        <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find a song" className="h-7 text-xs md:text-xs" />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1">
          {scanning && !songs.length && (
            <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
              <LoaderIcon className="size-3.5 animate-spin" /> Reading the folders
            </div>
          )}
          {list.map(s => (
            <button
              key={s.id}
              onClick={() => void openSong(s)}
              className={cn('flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-muted/50', s.id === current && 'bg-secondary')}
            >
              <MusicIcon className={cn('mt-0.5 size-3.5 shrink-0', s.audio ? 'text-muted-foreground' : 'text-destructive')} />
              <span className="min-w-0">
                <span className="block truncate text-xs">{s.folder || s.title}</span>
                {s.folder && s.folder !== s.title && <span className="block truncate text-[10px] text-muted-foreground">{s.title}</span>}
                {!s.audio && <span className="block text-[10px] text-destructive">no audio beside it</span>}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
