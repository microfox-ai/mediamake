'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, FolderPlusIcon, LayersIcon, LoaderIcon, RefreshCwIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Hint, isTextField } from '@/components/revisions/keyboard';
import { DetailPanel } from './DetailPanel';
import { EditDialog } from './EditDialog';
import { Sidebar } from './Sidebar';
import { FamiliesView, ProjectsGrid, SkillsGrid, useMatchingProjects, useMatchingSkills } from './Views';
import { pinKey, useSkillLibraryStore, type CardSize, type View } from './store';

const VIEWS: { id: View; label: string; key: string }[] = [
  { id: 'skills', label: 'Skills', key: '1' },
  { id: 'families', label: 'Variants', key: '2' },
  { id: 'projects', label: 'Projects', key: '3' },
];

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
      const store = useSkillLibraryStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      if ((mod && e.key.toLowerCase() === 'k') || (e.key === '/' && !isTextField(e.target))) {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
        return;
      }
      if (isTextField(e.target)) {
        if (e.key === 'Escape') {
          if (store.query) store.setQuery('');
          else (e.target as HTMLElement).blur();
        }
        return;
      }
      if (mod || e.altKey || store.editing) return;
      if ((e.target as HTMLElement | null)?.closest?.('[role="dialog"],[role="menu"],[role="listbox"]')) return;
      const view = VIEWS.find(v => v.key === e.key);
      if (view) return store.setView(view.id);
      if (e.key === 'Escape' && store.selected) return store.select(null);
      if ((e.key === 'p' || e.key === 'P') && store.selected) return store.togglePin(pinKey(store.selected));
      if ((e.key === 'e' || e.key === 'E') && store.selected) {
        e.preventDefault(); // the dialog's first field takes focus: don't type the "e" into it
        return store.setEditing(store.selected);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [search]);
}

function Header({ search }: { search: React.RefObject<HTMLInputElement | null> }) {
  const view = useSkillLibraryStore(s => s.view);
  const setView = useSkillLibraryStore(s => s.setView);
  const query = useSkillLibraryStore(s => s.query);
  const setQuery = useSkillLibraryStore(s => s.setQuery);
  const sort = useSkillLibraryStore(s => s.sort);
  const setSort = useSkillLibraryStore(s => s.setSort);
  const size = useSkillLibraryStore(s => s.cardSize);
  const setSize = useSkillLibraryStore(s => s.setCardSize);
  const group = useSkillLibraryStore(s => s.groupVariants);
  const setGroup = useSkillLibraryStore(s => s.setGroupVariants);
  const scanning = useSkillLibraryStore(s => s.sources.some(src => src.status === 'scanning'));
  const rescan = useSkillLibraryStore(s => s.rescan);
  const skills = useMatchingSkills().length;
  const projects = useMatchingProjects().length;

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
          <LayersIcon className="size-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Skill Library</span>
      </div>
      <Segmented
        className="ml-3"
        value={view}
        onChange={setView}
        options={VIEWS.map(v => ({ id: v.id, label: v.label, hint: `Press ${v.key}` }))}
      />
      <div className="relative mx-auto w-full max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={search}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={view === 'projects' ? 'Search projects, artists, skills…' : 'Search skills, variants, projects…'}
          className="h-9 w-full rounded-full border bg-muted/40 pl-9 pr-12 text-sm outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-ring/30"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{view === 'projects' ? `${projects} projects` : `${skills} skills`}</span>
      {view === 'skills' && (
        <Hint label="Show variants inside their base skill's card" side="bottom">
          <button
            type="button"
            onClick={() => setGroup(!group)}
            aria-pressed={group}
            className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition', group ? 'border-foreground/20 bg-foreground/5' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayersIcon className="size-3.5" /> Stack variants
          </button>
        </Hint>
      )}
      <select value={sort} onChange={e => setSort(e.target.value as 'name' | 'recent')} className="h-8 shrink-0 rounded-full border bg-transparent px-2.5 text-xs outline-none" aria-label="Sort">
        <option value="name">A–Z</option>
        <option value="recent">Recently changed</option>
      </select>
      <Segmented<CardSize>
        value={size}
        onChange={setSize}
        options={[
          { id: 'sm', label: 'S', hint: 'Small cards' },
          { id: 'md', label: 'M', hint: 'Medium cards' },
          { id: 'lg', label: 'L', hint: 'Large cards' },
        ]}
      />
      <Hint label="Read every folder again" side="bottom">
        <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 rounded-full p-0" onClick={() => void rescan()}>
          {scanning ? <LoaderIcon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
        </Button>
      </Hint>
    </header>
  );
}

function Welcome() {
  const support = useSkillLibraryStore(s => s.support);
  const addSource = useSkillLibraryStore(s => s.addSource);
  const unsupported = support && !support.supported;
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-foreground text-background">
          <LayersIcon className="size-7" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Your skills, their variants, and the projects they made</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Add a folder and every Claude Code skill in it is listed with a thumbnail, its variants beside it, and the projects that used it. Everything is read on this computer; nothing is uploaded.
        </p>
        {unsupported ? (
          <p className="mt-6 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {support.reason === 'insecure' ? 'Open this page over https or on localhost to read local folders.' : 'This needs Chrome, Edge, Arc or Brave: other browsers cannot open local folders.'}
          </p>
        ) : (
          <>
            <Button size="lg" className="mt-7 h-11 gap-2 rounded-full px-6" onClick={() => void addSource()}>
              <FolderPlusIcon className="size-4" /> Add a folder
            </Button>
            <div className="mt-8 grid gap-2 text-left text-sm sm:grid-cols-3">
              {[
                ['A repo', 'Finds .claude/skills, .agents/skills, every projects folder and the thumbnails in out/.'],
                ['~/.claude/skills', 'Your personal skills, the ones Claude Code loads in every project.'],
                ['A projects folder', 'Folders with a mediamake.json or input/project.json.'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-2xl border p-3.5">
                  <div className="font-medium">{t}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SkillLibraryWorkspace() {
  const init = useSkillLibraryStore(s => s.init);
  const ready = useSkillLibraryStore(s => s.ready);
  const sources = useSkillLibraryStore(s => s.sources);
  const view = useSkillLibraryStore(s => s.view);
  const rescanIfStale = useSkillLibraryStore(s => s.rescanIfStale);
  const search = useRef<HTMLInputElement>(null);

  useShortcuts(search);
  useEffect(() => {
    void init();
  }, [init]);
  // skills change while Claude works: read the folders again when the window comes back
  useEffect(() => {
    window.addEventListener('focus', rescanIfStale);
    return () => window.removeEventListener('focus', rescanIfStale);
  }, [rescanIfStale]);

  const empty = ready && !sources.length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header search={search} />
      <div className="flex min-h-0 flex-1">
        {!empty && <Sidebar />}
        <main className="min-w-0 flex-1">
          {empty || !ready ? (
            ready ? <Welcome /> : null
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="px-6 py-6">
                {view === 'skills' && <SkillsGrid />}
                {view === 'families' && <FamiliesView />}
                {view === 'projects' && <ProjectsGrid />}
              </div>
            </div>
          )}
        </main>
        <DetailPanel />
      </div>
      <EditDialog />
    </div>
  );
}
