'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckIcon,
  KeyboardIcon,
  LoaderIcon,
  MapIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { selectFps, useRevisionsStore } from './store';
import { Hint, useModKey, usePlayAnywhereKeys } from './keyboard';

/** "Mod" is ⌘ on a Mac and Ctrl elsewhere; "PlayAnywhere" is ⌥Space / Ctrl Space. */
const SHORTCUTS: [string, string][] = [
  ['Space or K', 'Play / pause'],
  ['PlayAnywhere', 'Play / pause, also while typing'],
  ['Mod ← →', 'Previous / next shot (also while typing)'],
  ['Mod ⇧ ← →', 'Previous / next section'],
  ['← → or , .', 'Previous / next frame'],
  ['Scroll on video', 'Frame by frame (⇧ scroll: by the second)'],
  ['⇧ ← →', 'One second back / forward'],
  ['Double-click + drag', 'Select a range on the timeline'],
  ['Double-tap + drag', 'Same, on a Mac trackpad'],
  ['Double-click a shot', 'Select that shot'],
  ['⇧ click / drag', 'Extend the selection from the playhead'],
  ['I / O', 'Selection in / out at the playhead'],
  ['L', 'Loop the selection'],
  ['Esc', 'Clear the selection / leave a text box'],
  ['C or Enter', 'Write a comment'],
  ['Mod Enter', 'Add the comment'],
  ['N', 'New revision'],
  ['M', 'Mute / unmute'],
  ['F', 'Fullscreen video'],
  ['- / = / 0', 'Zoom the timeline out / in / to fit'],
  ['Mod scroll', 'Zoom the timeline at the pointer'],
  ['Mod S', 'Save now'],
  ['?', 'Show these shortcuts'],
];

function ShortcutKeys({ keys }: { keys: string }) {
  const mod = useModKey();
  const play = usePlayAnywhereKeys();
  return <>{keys.replace('PlayAnywhere', play).replace(/Mod/g, mod)}</>;
}

function SaveIndicator() {
  const saveState = useRevisionsStore(s => s.saveState);
  const anyDirty = useRevisionsStore(s => Object.values(s.dirty).some(Boolean));
  if (saveState === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <TriangleAlertIcon className="size-3.5" /> Not saved
      </span>
    );
  }
  if (saveState === 'saving' || anyDirty) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <LoaderIcon className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (saveState === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckIcon className="size-3.5" /> Saved to disk
      </span>
    );
  }
  return null;
}

function FpsControl() {
  const map = useRevisionsStore(s => s.map);
  const fps = useRevisionsStore(selectFps);
  const fpsOverride = useRevisionsStore(s => s.fpsOverride);
  const detectedFps = useRevisionsStore(s => s.detectedFps);
  const setFpsOverride = useRevisionsStore(s => s.setFpsOverride);
  if (map?.fps) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        {map.fps} fps
      </span>
    );
  }
  return (
    <Hint
      label="No fps in the map: set it so frame numbers are right"
      side="bottom"
    >
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input
          type="number"
          min={1}
          max={240}
          step="any"
          value={fpsOverride ?? ''}
          placeholder={String(fps)}
          onChange={e =>
            setFpsOverride(e.target.value ? Number(e.target.value) : null)
          }
          className="h-6 w-14 rounded border bg-background px-1 text-right tabular-nums"
        />
        fps{!fpsOverride && detectedFps ? ' (detected)' : ''}
      </label>
    </Hint>
  );
}

export function RevisionsHeader() {
  const folder = useRevisionsStore(s => s.folder);
  const video = useRevisionsStore(s => s.video);
  const map = useRevisionsStore(s => s.map);
  const mapFile = useRevisionsStore(s => s.mapFile);
  const mapError = useRevisionsStore(s => s.mapError);
  const shortcutsOpen = useRevisionsStore(s => s.shortcutsOpen);
  const setShortcutsOpen = useRevisionsStore(s => s.setShortcutsOpen);

  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b px-2">
      <Hint label="Back to projects" side="bottom">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link href="/core/projects">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
      </Hint>
      <span className="text-sm font-semibold">Revisions</span>
      {folder && (
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {folder.name}
          {video && <span className="text-foreground"> / {video.name}</span>}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        {video && (
          <Hint
            label={
              mapError ??
              (mapFile ? `Shot map: ${mapFile}` : 'No map beside this video')
            }
            side="bottom"
          >
            <span
              className={`flex items-center gap-1 text-xs ${mapError ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              <MapIcon className="size-3.5" />
              {map
                ? `${map.shots.length} shots · ${map.sections.length} sections`
                : mapError
                  ? 'map unreadable'
                  : 'no map'}
            </span>
          </Hint>
        )}
        {video && <FpsControl />}
        <SaveIndicator />
        <Popover open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <Hint label="Keyboard shortcuts" keys="?" side="bottom">
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <KeyboardIcon className="size-4" />
              </Button>
            </PopoverTrigger>
          </Hint>
          <PopoverContent align="end" className="w-80 p-3">
            <div className="mb-2 text-xs font-semibold">Shortcuts</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys} className="contents">
                  <dt className="font-mono text-muted-foreground">
                    <ShortcutKeys keys={keys} />
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
