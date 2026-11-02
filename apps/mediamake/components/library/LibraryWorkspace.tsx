'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, FolderOpenIcon, LibraryIcon, LoaderIcon, MoreHorizontalIcon, RefreshCwIcon, SearchIcon, ServerIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Hint, isTextField } from '@/components/revisions/keyboard';
import type { MediaSort } from '@/lib/library/filter';
import type { SkillsRegistry } from '@/lib/library/types';
import { DetailPanel } from './DetailPanel';
import { ago, plural } from './format';
import { useMatchingMedia, useMatchingProductions, useMatchingSkills } from './hooks';
import { HoverPreview } from './HoverPreview';
import { Sidebar } from './Sidebar';
import { ChannelsView, MediaView, ProductionsView, SkillsView } from './Views';
import { useLibraryStore, VIEWS, type CardSize, type View } from './store';

function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { id: T; label: React.ReactNode; hint?: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex h-8 items-center rounded-full bg-muted p-0.5', className)}>
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={cn('h-7 rounded-full px-3 text-[13px] font-medium transition', value === o.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function useShortcuts(search: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useLibraryStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      if ((mod && e.key.toLowerCase() === 'k') || (e.key === '/' && !isTextField(e.target))) {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
        return;
      }
      if (isTextField(e.target)) {
        if (e.key === 'Escape') {
          if (store.queries[store.view]) store.setQuery('');
          else (e.target as HTMLElement).blur();
        }
        return;
      }
      if (mod || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.('[role="dialog"],[role="menu"],[role="listbox"]')) return;
      const triaging = store.view === 'media' && store.mediaMode === 'inbox'; // numbers pick a kind there
      const view = !triaging && VIEWS.find(v => v.key === e.key);
      if (view) return store.setView(view.id);
      if (e.key === 'Escape' && store.selected) return store.select(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [search]);
}

const PLACEHOLDER: Record<View, string> = {
  channels: 'Search channels…',
  productions: 'Search productions, artists, songs, skills…',
  skills: 'Search skills…',
  media: 'Search titles, subjects, tags, sources…',
};

function Count() {
  const view = useLibraryStore(s => s.view);
  const channels = useLibraryStore(s => s.library.channels.length);
  const productions = useMatchingProductions().length;
  const skills = useMatchingSkills().length;
  const media = useMatchingMedia().length;
  const n = { channels: plural(channels, 'channel'), productions: plural(productions, 'production'), skills: plural(skills, 'skill'), media: plural(media, 'item') }[view];
  return <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{n}</span>;
}

function PendingEdits() {
  const pending = useLibraryStore(s => s.pending);
  if (!pending.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-sky-400 px-3 text-xs font-medium text-sky-700 dark:text-sky-300">
          {plural(pending.length, 'edit')} waiting
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 text-xs">
        <p className="mb-2 text-muted-foreground">Saved in .catalog/requests. The media CLI applies them on its next run; they show as done once the library is exported again.</p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {[...pending].reverse().map(p => (
            <div key={p.file} className="flex gap-2 rounded-md bg-muted/60 px-2 py-1">
              <span className="font-mono">{p.req.op}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{p.req.target.slice(0, 24)}</span>
              <span className="shrink-0 text-muted-foreground">{ago(p.at)}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SourceMenu() {
  const source = useLibraryStore(s => s.source);
  const root = useLibraryStore(s => s.root);
  const status = useLibraryStore(s => s.status);
  const meta = useLibraryStore(s => s.library.meta);
  const reload = useLibraryStore(s => s.reload);
  const pickFolder = useLibraryStore(s => s.pickFolder);
  const forget = useLibraryStore(s => s.forget);
  if (!source && !root) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex h-8 max-w-60 shrink-0 items-center gap-2 rounded-full border px-3 text-xs transition hover:bg-muted">
          {status === 'loading' ? <LoaderIcon className="size-3.5 animate-spin" /> : source?.kind === 'dev' ? <ServerIcon className="size-3.5" /> : <FolderOpenIcon className="size-3.5" />}
          <span className="truncate font-medium">{source?.name ?? root?.name}</span>
          {meta && <span className="shrink-0 text-muted-foreground">{ago(meta.generatedAt)}</span>}
          <MoreHorizontalIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {source?.kind === 'dev' ? 'Read through the local dev server' : 'Read from the folder you picked'}
          {meta && <div>Exported {new Date(meta.generatedAt).toLocaleString()}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void reload()}>
          <RefreshCwIcon className="size-4" /> Read the export again
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void pickFolder()}>
          <FolderOpenIcon className="size-4" /> Pick another folder
        </DropdownMenuItem>
        {root && <DropdownMenuItem onSelect={() => void forget()}>Forget this folder</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({ search }: { search: React.RefObject<HTMLInputElement | null> }) {
  const view = useLibraryStore(s => s.view);
  const setView = useLibraryStore(s => s.setView);
  const query = useLibraryStore(s => s.queries[s.view]);
  const setQuery = useLibraryStore(s => s.setQuery);
  const size = useLibraryStore(s => s.cardSize);
  const setSize = useLibraryStore(s => s.setCardSize);
  const sort = useLibraryStore(s => s.mediaSort);
  const setSort = useLibraryStore(s => s.setMediaSort);
  const mode = useLibraryStore(s => s.mediaMode);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3">
      <Hint label="All apps" side="bottom">
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
          <Link href="/apps">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
      </Hint>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-foreground text-background">
          <LibraryIcon className="size-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Library</span>
      </div>
      <Segmented className="ml-2" value={view} onChange={setView} options={VIEWS.map(v => ({ id: v.id, label: v.label, hint: `Press ${v.key}` }))} />
      <div className="relative mx-auto w-full max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={search}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={PLACEHOLDER[view]}
          className="h-9 w-full rounded-full border bg-muted/40 pl-9 pr-12 text-sm outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-ring/30"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
      </div>
      <Count />
      {view === 'media' && mode === 'all' && (
        <select value={sort} onChange={e => setSort(e.target.value as MediaSort)} className="h-8 shrink-0 rounded-full border bg-transparent px-2.5 text-xs outline-none" aria-label="Sort">
          <option value="recent">Newest</option>
          <option value="title">A–Z</option>
          <option value="rating">Rating</option>
          <option value="size">Biggest</option>
        </select>
      )}
      {view !== 'channels' && !(view === 'media' && mode !== 'all') && (
        <Segmented<CardSize>
          value={size}
          onChange={setSize}
          options={[
            { id: 'sm', label: 'S', hint: 'Small cards' },
            { id: 'md', label: 'M', hint: 'Medium cards' },
            { id: 'lg', label: 'L', hint: 'Large cards' },
          ]}
        />
      )}
      <PendingEdits />
      <SourceMenu />
    </header>
  );
}

/** What stands in for the views until a library is open. */
function Connect() {
  const support = useLibraryStore(s => s.support);
  const status = useLibraryStore(s => s.status);
  const error = useLibraryStore(s => s.error);
  const root = useLibraryStore(s => s.root);
  const source = useLibraryStore(s => s.source);
  const pickFolder = useLibraryStore(s => s.pickFolder);
  const reconnect = useLibraryStore(s => s.reconnect);
  const reload = useLibraryStore(s => s.reload);
  const setView = useLibraryStore(s => s.setView);
  const unsupported = support && !support.supported;

  if (status === 'loading') return <div className="grid h-full place-items-center text-sm text-muted-foreground"><LoaderIcon className="size-5 animate-spin" /></div>;

  let body: React.ReactNode;
  if (status === 'needs-permission' && root) {
    body = (
      <>
        <p className="mt-3 text-[15px] text-muted-foreground">Chrome asks again on each visit before the page can read {root.name}.</p>
        <Button size="lg" className="mt-7 h-11 gap-2 rounded-full px-6" onClick={() => void reconnect()}>
          <FolderOpenIcon className="size-4" /> Open {root.name}
        </Button>
      </>
    );
  } else if (status === 'no-export') {
    body = (
      <>
        <p className="mt-3 text-[15px] text-muted-foreground">{source?.name} has no export yet. The media CLI writes it to .catalog/export after a scan.</p>
        <div className="mt-7 flex justify-center gap-2">
          <Button size="lg" className="h-11 gap-2 rounded-full px-6" onClick={() => void reload()}>
            <RefreshCwIcon className="size-4" /> Look again
          </Button>
          <Button size="lg" variant="outline" className="h-11 rounded-full px-6" onClick={() => void pickFolder()}>
            Pick another folder
          </Button>
        </div>
      </>
    );
  } else if (status === 'error') {
    body = (
      <>
        <p className="mt-3 flex items-center justify-center gap-2 text-[15px] text-destructive">
          <TriangleAlertIcon className="size-4" /> Could not read the export
        </p>
        {error && <p className="mt-1 font-mono text-xs text-muted-foreground">{error}</p>}
        <Button size="lg" className="mt-7 h-11 gap-2 rounded-full px-6" onClick={() => void (source ? reload() : pickFolder())}>
          <RefreshCwIcon className="size-4" /> Try again
        </Button>
      </>
    );
  } else {
    body = (
      <>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Pick your <span className="font-mono text-foreground">_LIBRARY</span> folder once. The page reads the catalog&apos;s export in it and nothing else, and saves your edits there for the media CLI only after you say so. Nothing is uploaded.
        </p>
        {unsupported ? (
          <p className="mt-6 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {support.reason === 'insecure' ? 'Open this page over https or on localhost to read local folders.' : 'This needs Chrome, Edge, Arc or Brave: other browsers cannot open local folders.'}
          </p>
        ) : (
          <Button size="lg" className="mt-7 h-11 gap-2 rounded-full px-6" onClick={() => void pickFolder()}>
            <FolderOpenIcon className="size-4" /> Pick the _LIBRARY folder
          </Button>
        )}
      </>
    );
  }

  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-foreground text-background">
          <LibraryIcon className="size-7" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Channels, productions, skills and media in one place</h1>
        {body}
        <button type="button" className="mx-auto mt-6 block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setView('skills')}>
          See the skills without a library
        </button>
      </div>
    </div>
  );
}

export function LibraryWorkspace({ registry }: { registry: SkillsRegistry | null }) {
  const init = useLibraryStore(s => s.init);
  const ready = useLibraryStore(s => s.ready);
  const status = useLibraryStore(s => s.status);
  const view = useLibraryStore(s => s.view);
  const checkForNewExport = useLibraryStore(s => s.checkForNewExport);
  const search = useRef<HTMLInputElement>(null);

  useShortcuts(search);
  useEffect(() => {
    void init(registry);
  }, [init, registry]);
  // the CLI exports again while you work: one small read of meta.json when the window comes back
  useEffect(() => {
    const onFocus = () => void checkForNewExport();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkForNewExport]);

  const open = status === 'ready';
  const showView = open || (ready && view === 'skills' && status !== 'loading');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header search={search} />
      <div className="flex min-h-0 flex-1">
        {showView && <Sidebar />}
        <main className="min-w-0 flex-1">
          {!ready ? null : showView ? (
            <div className="h-full overflow-y-auto">
              {!open && (
                <div className="mx-6 mt-5 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  The skills from this build. Open the library to see their runs and outputs.
                </div>
              )}
              <div className="px-6 py-6">
                {view === 'channels' && <ChannelsView />}
                {view === 'productions' && <ProductionsView />}
                {view === 'skills' && <SkillsView />}
                {view === 'media' && <MediaView />}
              </div>
            </div>
          ) : (
            <Connect />
          )}
        </main>
        {showView && <DetailPanel />}
      </div>
      <HoverPreview />
    </div>
  );
}
