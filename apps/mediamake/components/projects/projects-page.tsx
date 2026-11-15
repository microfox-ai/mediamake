'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowUpRightIcon,
  ClapperboardIcon,
  FolderPlusIcon,
  ImageIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  MusicIcon,
  PackageIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandKitSheet } from '@/components/projects/BrandKitSheet';
import { GenerationsSheet } from '@/components/projects/GenerationsSheet';
import { AvatarStack, ProjectAccessSheet, RoleBadge } from '@/components/projects/project-access';
import { ProjectSyncExplainer } from '@/components/projects/projectsync-explainer';
import { StorageCapAdmin, StorageMeter, type MemberStorageState } from '@/components/projects/storage-meter';
import { canWrite } from '@/lib/editor/project-access';
import { PROJECT_SORTS, ago, browseProjects, sharedSummary, type ProjectCard, type ProjectScope, type ProjectSort } from '@/lib/projects/access';
import { formatBytes } from '@/lib/projects/storage';
import { cn } from '@/lib/utils';

type View = 'grid' | 'list';
const VIEW_KEY = 'mediamake.projects.view';

// A project opens on its own page in the app: what it keeps in the cloud, and who has access.
const pageOf = (id: string) => `/app/projects/${id}`;

interface Overview {
  clientId: string;
  projects: ProjectCard[];
}

/**
 * /app/projects for Plus members and above: every cloud project they own or
 * were given, to search, sort and look through as cards or a list, with who
 * each is shared with and the controls to change that; then how ProjectSync
 * fills them. The cards come from GET /api/project/overview.
 */
export function ProjectsPage({ isAdmin = false, canSync = false }: { isAdmin?: boolean; /** Their membership opens the ProjectSync MCP. */ canSync?: boolean }) {
  const [data, setData] = React.useState<Overview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [storage, setStorage] = React.useState<MemberStorageState | null>(null);

  const [query, setQuery] = React.useState('');
  const [scope, setScope] = React.useState<ProjectScope>('all');
  const [sort, setSort] = React.useState<ProjectSort>('activity');
  const [view, setView] = React.useState<View>('grid');

  const [sharing, setSharing] = React.useState<ProjectCard | null>(null);
  const [brand, setBrand] = React.useState<ProjectCard | null>(null);
  const [takes, setTakes] = React.useState<ProjectCard | null>(null);
  const [naming, setNaming] = React.useState<ProjectCard | 'new' | null>(null);

  const load = React.useCallback(async () => {
    // what the projects they own hold, of their cap (lib/projects/storage)
    fetch('/api/project/storage')
      .then(r => (r.ok ? r.json() : null))
      .then(setStorage)
      .catch(() => undefined);
    try {
      const res = await fetch('/api/project/overview');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Could not load your projects (${res.status})`);
      setData(json as Overview);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  React.useEffect(() => {
    void load();
    try {
      if (window.localStorage.getItem(VIEW_KEY) === 'list') setView('list');
    } catch {
      // a private window: the grid it is
    }
  }, [load]);

  const pickView = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // not remembered, still switched
    }
  };

  const all = data?.projects ?? [];
  const mine = all.filter(card => card.role === 'owner').length;
  const scopes: { id: ProjectScope; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: all.length },
    { id: 'mine', label: 'Mine', count: mine },
    { id: 'shared', label: 'Shared with me', count: all.length - mine },
  ];
  const visible = browseProjects(all, { query, scope, sort });
  const filtered = !!query.trim() || scope !== 'all';
  const actions = { share: setSharing, brand: setBrand, takes: setTakes, rename: setNaming };
  const cap = storage?.cap ?? null;

  return (
    <SidebarInset>
      <SiteHeader title="Projects" />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">A project is one body of work: a channel, a film, a series, a brand. It keeps its productions, releases, brand kit and media in the cloud, for the people you choose.</p>
          </div>
          <Button onClick={() => setNaming('new')}>
            <PlusIcon /> New project
          </Button>
        </div>

        <StorageMeter storage={storage} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by project, tag or person" aria-label="Search projects" className="pl-9" />
            {query && (
              <button type="button" className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear the search" onClick={() => setQuery('')}>
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border bg-muted/40 p-0.5" role="tablist" aria-label="Which projects">
            {scopes.map(each => (
              <button
                key={each.id}
                type="button"
                role="tab"
                aria-selected={scope === each.id}
                onClick={() => setScope(each.id)}
                className={cn('cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors', scope === each.id ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground')}
              >
                {each.label} <span className="tabular-nums opacity-60">{data ? each.count : ''}</span>
              </button>
            ))}
          </div>
          <Select value={sort} onValueChange={next => setSort(next as ProjectSort)}>
            <SelectTrigger className="w-[150px]" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PROJECT_SORTS.map(each => (
                <SelectItem key={each.id} value={each.id}>
                  {each.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="View">
            {(
              [
                ['grid', LayoutGridIcon, 'Cards'],
                ['list', ListIcon, 'List'],
              ] as const
            ).map(([id, Icon, label]) => (
              <button key={id} type="button" aria-pressed={view === id} aria-label={label} title={label} onClick={() => pickView(id)} className={cn('cursor-pointer rounded-md p-1.5 transition-colors', view === id ? 'bg-background shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">Your projects didn&apos;t load</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <Loading view={view} />
        ) : all.length === 0 ? (
          <NoProjects onNew={() => setNaming('new')} />
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm font-medium">No project matches</p>
            <p className="mt-1 text-sm text-muted-foreground">{query.trim() ? `Nothing here is called, tagged or shared with “${query.trim()}”.` : scope === 'shared' ? 'Nobody has shared a project with you yet.' : 'You own no project yet.'}</p>
            {filtered && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery('');
                  setScope('all');
                }}
              >
                Show all projects
              </Button>
            )}
          </div>
        ) : view === 'grid' ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(card => (
              <GridCard key={card.id} card={card} me={data.clientId} cap={cap} {...actions} />
            ))}
          </ul>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {visible.map(card => (
              <ListRow key={card.id} card={card} me={data.clientId} {...actions} />
            ))}
          </ul>
        )}

        {isAdmin && <StorageCapAdmin />}

        <ProjectSyncExplainer canSync={canSync} className="mt-6" />
      </div>

      <ProjectAccessSheet project={sharing} me={data?.clientId} onClose={() => setSharing(null)} onChanged={() => void load()} />
      {brand && <BrandKitSheet open onOpenChange={open => !open && setBrand(null)} projectId={brand.id} projectName={brand.displayName} clientId={data?.clientId} onSaved={() => void load()} />}
      {takes && <GenerationsSheet open onOpenChange={open => !open && setTakes(null)} projectId={takes.id} projectName={takes.displayName} clientId={data?.clientId} />}
      <NameDialog
        target={naming}
        onClose={() => setNaming(null)}
        onSaved={async created => {
          setNaming(null);
          await load();
          if (created) toast.success(`${created} is ready. Share it, or ask Claude to sync a production into it.`);
        }}
      />
    </SidebarInset>
  );
}

interface CardActions {
  share: (card: ProjectCard) => void;
  brand: (card: ProjectCard) => void;
  takes: (card: ProjectCard) => void;
  rename: (card: ProjectCard) => void;
}

/** The brand kit's logo on its colours, or the project's initial. */
function Mark({ card, className }: { card: ProjectCard; className?: string }) {
  return (
    <span className={cn('relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/50 text-base font-semibold text-muted-foreground', className)} aria-hidden>
      {card.brandKit?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.brandKit.logo} alt="" className="size-full object-contain p-1.5" />
      ) : (
        card.displayName.trim().charAt(0).toUpperCase()
      )}
      {!!card.brandKit?.colors.length && (
        <span className="absolute inset-x-0 bottom-0 flex h-1">
          {card.brandKit.colors.map(color => (
            <span key={color} className="flex-1" style={{ background: color }} />
          ))}
        </span>
      )}
    </span>
  );
}

function Holds({ card, className }: { card: ProjectCard; className?: string }) {
  const parts = [
    [ClapperboardIcon, card.counts.productions, 'production'],
    [PackageIcon, card.counts.releases, 'release'],
    [ImageIcon, card.counts.media, 'media file'],
  ] as const;
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
      {parts.map(([Icon, count, noun]) => (
        <span key={noun} className="inline-flex items-center gap-1" title={`${count} ${noun}${count === 1 ? '' : 's'}`}>
          <Icon className="size-3.5" aria-hidden />
          <span className="tabular-nums">{count}</span>
          <span className="sr-only">
            {noun}
            {count === 1 ? '' : 's'}
          </span>
        </span>
      ))}
      {card.brandKit && (
        <span className="inline-flex items-center gap-1" title="Has a brand kit">
          <PaletteIcon className="size-3.5" aria-hidden /> Kit
        </span>
      )}
    </p>
  );
}

/** What the project stores: for its owner against their cap, for others against the owner's. */
function Size({ card, cap }: { card: ProjectCard; cap: number | null }) {
  const owned = card.role === 'owner';
  const percent = owned && cap ? Math.min(100, (card.bytes / cap) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium tabular-nums">{formatBytes(card.bytes)}</span>
        <span className="truncate text-muted-foreground">{owned ? (cap ? `${percent < 1 && card.bytes > 0 ? 'under 1' : Math.round(percent)}% of your ${formatBytes(cap)}` : 'of your storage, no cap') : `counts against ${card.owner.name}’s storage`}</span>
      </div>
      {owned && cap !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${card.displayName} of your storage`}>
          <div className={cn('h-full rounded-full', percent >= 90 ? 'bg-amber-500' : 'bg-foreground/70')} style={{ width: `${Math.max(percent, card.bytes > 0 ? 2 : 0)}%` }} />
        </div>
      )}
    </div>
  );
}

function CardMenu({ card, share, brand, takes, rename }: { card: ProjectCard } & CardActions) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative z-10 size-8 text-muted-foreground" aria-label={`More for ${card.displayName}`}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={pageOf(card.id)}>
            <ArrowUpRightIcon /> Open
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => share(card)}>
          <UsersIcon /> {card.role === 'owner' ? 'Share and manage access' : 'Who has access'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => brand(card)}>
          <PaletteIcon /> Brand kit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => takes(card)}>
          <MusicIcon /> Song takes
        </DropdownMenuItem>
        {canWrite(card.role) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => rename(card)}>
              <PencilIcon /> Rename
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function People({ card, me, share, className }: { card: ProjectCard; me: string; share: (card: ProjectCard) => void; className?: string }) {
  const faces = card.role === 'owner' ? card.members : [card.owner, ...card.members.filter(member => member.clientId !== me)];
  return (
    <button type="button" onClick={() => share(card)} className={cn('relative z-10 flex min-w-0 cursor-pointer items-center gap-2 rounded-md text-left text-xs text-muted-foreground hover:text-foreground', className)} title={card.role === 'owner' ? 'Share and manage access' : 'Who has access'}>
      {faces.length > 0 ? <AvatarStack people={faces} /> : <UsersIcon className="size-4 shrink-0" aria-hidden />}
      <span className="truncate">{sharedSummary(card, me)}</span>
    </button>
  );
}

function GridCard({ card, me, cap, ...actions }: { card: ProjectCard; me: string; cap: number | null } & CardActions) {
  return (
    <li className="group relative flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 transition-shadow focus-within:ring-2 focus-within:ring-ring/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Mark card={card} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base leading-tight font-semibold">
            <Link href={pageOf(card.id)} className="outline-none after:absolute after:inset-0 after:rounded-xl">
              {card.displayName}
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {card.role === 'owner' ? 'Yours' : `By ${card.owner.name}`}
            {card.tags.length > 0 && ` · ${card.tags.join(', ')}`}
          </p>
        </div>
        <RoleBadge role={card.role} className="mt-0.5 shrink-0" />
      </div>

      <Holds card={card} />
      <Size card={card} cap={cap} />

      <div className="mt-auto flex items-center gap-2 border-t pt-3">
        <People card={card} me={me} share={actions.share} className="flex-1" />
        <span className="shrink-0 text-xs text-muted-foreground" title={new Date(card.lastActivityAt).toLocaleString()}>
          {ago(card.lastActivityAt)}
        </span>
        <CardMenu card={card} {...actions} />
      </div>
    </li>
  );
}

function ListRow({ card, me, ...actions }: { card: ProjectCard; me: string } & CardActions) {
  return (
    <li className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_7rem_5rem_auto]">
      <Mark card={card} className="row-span-2 size-10 md:row-span-1" />
      <div className="min-w-0">
        <p className="flex items-center gap-2">
          <Link href={pageOf(card.id)} className="truncate text-sm font-medium outline-none after:absolute after:inset-0">
            {card.displayName}
          </Link>
          <RoleBadge role={card.role} className="shrink-0" />
        </p>
        <Holds card={card} className="mt-1 hidden md:flex" />
      </div>
      <div className="row-span-2 md:row-span-1 md:hidden">
        <CardMenu card={card} {...actions} />
      </div>
      <People card={card} me={me} share={actions.share} className="col-start-2 md:col-start-auto" />
      <span className="hidden text-xs text-muted-foreground md:block" title={new Date(card.lastActivityAt).toLocaleString()}>
        {ago(card.lastActivityAt)}
      </span>
      <span className="hidden text-right text-xs tabular-nums md:block">{formatBytes(card.bytes)}</span>
      <div className="hidden md:block">
        <CardMenu card={card} {...actions} />
      </div>
    </li>
  );
}

function Loading({ view }: { view: View }) {
  if (view === 'list') {
    return (
      <div className="divide-y rounded-xl border" aria-busy aria-label="Loading your projects">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy aria-label="Loading your projects">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function NoProjects({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border bg-muted/50">
        <FolderPlusIcon className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div>
        <p className="font-medium">No projects yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Make one for a channel, a film, a series or a brand, then add the people who work on it. Or ask Claude to create one and sync a production into it with ProjectSync.</p>
      </div>
      <Button onClick={onNew}>
        <PlusIcon /> Create your first project
      </Button>
    </div>
  );
}

/** A new project's name, or an existing one's new name. */
function NameDialog({ target, onClose, onSaved }: { target: ProjectCard | 'new' | null; onClose: () => void; onSaved: (created?: string) => void }) {
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isNew = target === 'new';

  React.useEffect(() => {
    setName(target && target !== 'new' ? target.displayName : '');
    setError(null);
  }, [target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/project', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { displayName: name } : { id: (target as ProjectCard).id, displayName: name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'It failed');
      onSaved(isNew ? name.trim() : undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New project' : 'Rename project'}</DialogTitle>
            <DialogDescription>{isNew ? 'One project per body of work (a channel, a film, a series, a brand) works best: its productions, releases, brand kit and media stay together.' : 'Everyone on the project sees the new name.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Anime Music Zone, or the name of your film" maxLength={80} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy && <Loader2Icon className="animate-spin" />} {isNew ? 'Create project' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
