'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  FolderIcon,
  KeyboardIcon,
  LoaderIcon,
  Redo2Icon,
  RefreshCwIcon,
  ServerIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Hint, useModKey } from '@/components/revisions/keyboard';
import { REPO_AVAILABLE, selectDirty, useEditor } from './store';

const SHORTCUTS: [string, string][] = [
  ['Click', 'Select what is under the pointer'],
  ['Alt click', 'Select the next thing under the pointer'],
  ['Drag', 'Move the selection (⇧ keeps one axis)'],
  ['Corner / top dot', 'Scale / rotate (⇧ snaps to 15°)'],
  ['Double-click', 'Select the word inside a group and edit its text'],
  ['← → ↑ ↓', 'Nudge 1 px (⇧ 10 px); with nothing selected, ← → step frames'],
  ['Delete', 'Reset the selection'],
  ['Esc', 'Deselect'],
  ['Space or K', 'Play / pause'],
  [', .', 'Previous / next frame'],
  ['Mod Z / Mod ⇧ Z', 'Undo / redo'],
  ['Mod S', 'Save now'],
];

function SaveIndicator() {
  const saveState = useEditor(s => s.saveState);
  const saveError = useEditor(s => s.saveError);
  const dirty = useEditor(selectDirty);
  const dragging = useEditor(s => s.dragging);
  if (saveState === 'error') {
    return (
      <Hint label={saveError ?? 'Could not save'} side="bottom">
        <span className="flex items-center gap-1 text-xs text-destructive">
          <TriangleAlertIcon className="size-3.5" /> Not saved
        </span>
      </Hint>
    );
  }
  if (saveState === 'saving' || (dirty && !dragging)) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <LoaderIcon className="size-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (saveState === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckIcon className="size-3.5" /> Saved to edits.json
      </span>
    );
  }
  return null;
}

/** Where projects come from: the repo (next dev only), a folder to pick, or one opened before. */
function SourceMenu() {
  const source = useEditor(s => s.source);
  const folders = useEditor(s => s.folders);
  const canPick = useEditor(s => !!s.support?.supported);
  const pickFolder = useEditor(s => s.pickFolder);
  const openFolder = useEditor(s => s.openFolder);
  const openRepo = useEditor(s => s.openRepo);
  const Icon = source?.kind === 'repo' ? ServerIcon : FolderIcon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 max-w-64 gap-1.5 px-2 text-[11px] text-muted-foreground"
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">
            {source ? (source.kind === 'repo' ? 'Local repo · apps/lyrics_videos' : source.label) : 'Open a folder'}
          </span>
          <ChevronDownIcon className="size-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
          Open projects from
        </DropdownMenuLabel>
        {REPO_AVAILABLE && (
          <DropdownMenuItem className="text-xs" onSelect={() => void openRepo()}>
            <ServerIcon className="size-3.5" /> The local repo (next dev)
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-xs"
          disabled={!canPick}
          onSelect={() => void pickFolder()}
        >
          <FolderIcon className="size-3.5" /> Choose a folder…
        </DropdownMenuItem>
        {folders.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              Opened before
            </DropdownMenuLabel>
            {folders.map(f => (
              <DropdownMenuItem
                key={f.id}
                className="text-xs"
                onSelect={() => void openFolder(f.handle)}
              >
                <FolderIcon className="size-3.5" /> {f.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EditorHeader() {
  const projects = useEditor(s => s.projects);
  const slug = useEditor(s => s.slug);
  const phase = useEditor(s => s.phase);
  const error = useEditor(s => s.error);
  const openProject = useEditor(s => s.openProject);
  const reload = useEditor(s => s.reload);
  const undo = useEditor(s => s.undo);
  const redo = useEditor(s => s.redo);
  const canUndo = useEditor(s => s.past.length > 0);
  const canRedo = useEditor(s => s.future.length > 0);
  const mod = useModKey();

  return (
    <header className="flex h-9 shrink-0 items-center gap-3 border-b px-2">
      <Hint label="Back to projects" side="bottom">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link href="/projects">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
      </Hint>
      <span className="text-sm font-semibold">Remotion editor</span>
      <Select
        value={slug ?? ''}
        onValueChange={v => void openProject(v)}
        disabled={!projects.length}
      >
        <SelectTrigger className="h-7 w-64 text-xs">
          <SelectValue placeholder="Pick a lyric project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map(p => (
            <SelectItem key={p.slug} value={p.slug} className="text-xs">
              {p.title ? `${p.title} · ${p.slug}` : p.slug}
              {p.hasEdits ? ' ✎' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SourceMenu />

      <div className="ml-auto flex items-center gap-2">
        {phase === 'compiling' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <LoaderIcon className="size-3.5 animate-spin" /> Compiling
          </span>
        )}
        {error && (
          <Hint label={error} side="bottom">
            <span className="flex items-center gap-1 text-xs text-destructive">
              <TriangleAlertIcon className="size-3.5" /> Compile error
            </span>
          </Hint>
        )}
        <Hint label="Recompile the project (happens by itself when its files change)" side="bottom">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={!slug}
            onClick={() => void reload()}
          >
            <RefreshCwIcon className="size-3.5" />
          </Button>
        </Hint>
        <Hint label="Undo" keys="Mod Z" side="bottom">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!canUndo} onClick={undo}>
            <Undo2Icon className="size-3.5" />
          </Button>
        </Hint>
        <Hint label="Redo" keys="Mod ⇧ Z" side="bottom">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!canRedo} onClick={redo}>
            <Redo2Icon className="size-3.5" />
          </Button>
        </Hint>
        <SaveIndicator />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Shortcuts">
              <KeyboardIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <table className="w-full text-xs">
              <tbody>
                {SHORTCUTS.map(([keys, what]) => (
                  <tr key={keys}>
                    <td className="whitespace-nowrap py-0.5 pr-3 font-mono text-[11px]">
                      {keys.replace(/Mod/g, mod)}
                    </td>
                    <td className="py-0.5 text-muted-foreground">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
