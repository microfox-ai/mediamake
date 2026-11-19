'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpenIcon, CheckIcon, ChevronRightIcon, ChevronsUpDownIcon, CloudIcon, FolderIcon, Loader2Icon, MonitorIcon, PlusIcon, SearchIcon, SparklesIcon, UserIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppPage } from '@/components/app-shell/app-page';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { canChange, filtersOf, folderFields, libraryHref, listQuery, spaceFor, viewOf, type CollectionView, type EntryAnswer, type EntryRow, type LibraryView, type SpaceOverview, type SpaceView, type TemplateCard } from '@/lib/cloud-library/view';
import { libraryApi } from './api';
import { CollectionCard } from './collection-card';
import { DeviceLibrary, computersHref } from './device-library';
import { EntryDialog } from './entry-dialog';
import { EntryView } from './entry-view';
import { EntryViews, ViewSwitch } from './entry-views';
import { Invitations, ShareDialog, SharedInfo } from './share-dialog';

/**
 * /app/library: the Cloud Library. The space is picked at the top right (Personal when no project
 * is chosen). With no collection open, the space's collections are cards; with one open, a
 * breadcrumb sits under the search, its filters at the right end, and the entries are cards; an
 * entry opens in tabs. The address holds the place (?space=&c=&e=), so a link opens the same view.
 * A switch beside the space picks the cloud or the computers (?on=computers, ./device-library).
 * A collection another space shares sits beside the space's own, marked with who shares it
 * (./share-dialog).
 */

const ANY = '__any__';
const REMEMBER = 'mediamake.library.space';
const REMEMBER_VIEW = 'mediamake.library.view';
const button = 'inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50';
const primary = 'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';
const card = 'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50';

function SpacePicker({ spaces, current, onPick }: { spaces: SpaceView[]; current: SpaceView | null; onPick: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const personal = spaces.filter(space => space.personal);
  const projects = spaces.filter(space => !space.personal);
  const Row = ({ space }: { space: SpaceView }) => (
    <CommandItem
      value={`${space.name} ${space.id}`}
      onSelect={() => {
        onPick(space.id);
        setOpen(false);
      }}
    >
      {space.personal ? <UserIcon className="size-4" /> : <FolderIcon className="size-4" />}
      <span className="min-w-0 flex-1 truncate">{space.name}</span>
      {current?.id === space.id && <CheckIcon className="size-4" />}
    </CommandItem>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`${button} w-56 justify-between`} aria-label="Choose a space">
          <span className="flex min-w-0 items-center gap-1.5">
            {current?.personal ? <UserIcon className="size-4 shrink-0" /> : <FolderIcon className="size-4 shrink-0" />}
            <span className="truncate">{current?.name ?? 'Choose a space'}</span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Find a project" />
          <CommandList>
            <CommandEmpty>No project by that name</CommandEmpty>
            <CommandGroup>
              {personal.map(space => (
                <Row key={space.id} space={space} />
              ))}
            </CommandGroup>
            {projects.length > 0 && (
              <CommandGroup heading="Projects">
                {projects.map(space => (
                  <Row key={space.id} space={space} />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Cloud: what the space keeps. Computers: what each computer holds, from the cards it reported. */
function SideSwitch({ space, computers }: { space: string; computers: boolean }) {
  const item = (on: boolean) => `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${on ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`;
  return (
    <nav aria-label="Cloud or computers" className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      <Link href={libraryHref({ space })} className={item(!computers)} aria-current={!computers ? 'page' : undefined}>
        <CloudIcon className="size-4" />
        Cloud
      </Link>
      <Link href={computersHref(space)} className={item(computers)} aria-current={computers ? 'page' : undefined}>
        <MonitorIcon className="size-4" />
        Computers
      </Link>
    </nav>
  );
}

function NewCollection({ space, templates, taken, open, onOpenChange, onMade }: { space: SpaceView; templates: TemplateCard[]; taken: string[]; open: boolean; onOpenChange: (open: boolean) => void; onMade: (slug: string) => void }) {
  const [picked, setPicked] = React.useState<TemplateCard | null>(null);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setPicked(templates.length === 1 ? templates[0] : null);
      setName(templates.length === 1 ? templates[0].name : '');
      setError(null);
    }
  }, [open, templates]);

  const make = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const { collection } = await libraryApi.newCollection(space.id, picked.id, name.trim() || undefined);
      onMade(collection.slug);
      onOpenChange(false);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>A collection starts from a template, which says what each entry holds. It goes in the {space.name} space.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map(template => (
            <button
              key={template.id}
              type="button"
              className={`${card} ${picked?.id === template.id ? 'border-primary' : ''}`}
              onClick={() => {
                setPicked(template);
                setName(template.name);
              }}
            >
              <span className="text-sm font-semibold">{template.name}</span>
              <span className="text-xs text-muted-foreground">{template.about}</span>
            </button>
          ))}
        </div>
        {picked && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Its name
            <Input value={name} onChange={event => setName(event.target.value)} />
            {taken.includes(name.trim().toLowerCase()) && <span className="text-xs font-normal text-muted-foreground">This space already has a collection by that name.</span>}
          </label>
        )}
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs text-destructive" role={error ? 'alert' : undefined}>
            {error}
          </p>
          <button type="button" className={primary} disabled={!picked || busy} onClick={make}>
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            Make the collection
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** How a collection is filled: the template's guide, and the owner's own notes under it. */
function Guide({ space, collection, open, onOpenChange, onSaved }: { space: SpaceView; collection: CollectionView; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [prefs, setPrefs] = React.useState(collection.prefs ?? '');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (open) setPrefs(collection.prefs ?? '');
  }, [open, collection.prefs]);
  const owner = space.role === 'owner';
  const save = async () => {
    setBusy(true);
    try {
      await libraryApi.setPrefs(space.id, collection.slug, prefs);
      toast.success('Your notes are saved');
      onSaved();
      onOpenChange(false);
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>How {collection.name} is filled</DialogTitle>
          <DialogDescription>Claude reads this before it adds or changes a {collection.noun}.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">{owner ? 'Your notes' : "The owner's notes"}</TabsTrigger>
            <TabsTrigger value="guide">The guide</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="flex flex-col gap-3">
            {owner ? (
              <Textarea rows={12} value={prefs} onChange={event => setPrefs(event.target.value)} placeholder={`What Claude should know about your ${collection.noun}s: the label you always use, how you name things, what to leave empty.`} />
            ) : (
              <p className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{collection.prefs || 'None yet.'}</p>
            )}
          </TabsContent>
          <TabsContent value="guide">
            <p className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">{collection.guide}</p>
          </TabsContent>
        </Tabs>
        {owner && (
          <DialogFooter>
            <button type="button" className={primary} disabled={busy || prefs === (collection.prefs ?? '')} onClick={save}>
              {busy && <Loader2Icon className="size-4 animate-spin" />}
              Save your notes
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Empty({ title, about, children }: { title: string; about: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{about}</p>
      {children}
    </div>
  );
}

export function LibraryPage() {
  const router = useRouter();
  const params = useSearchParams();
  const spaceParam = params.get('space');
  const computers = params.get('on') === 'computers';
  const collectionSlug = computers ? null : params.get('c');
  const entrySlug = collectionSlug ? params.get('e') : null;
  // folders view: the field entries are grouped by, and the folder that is open
  const byParam = params.get('by');
  const folder = collectionSlug && !entrySlug ? params.get('f') : null;

  const [spaces, setSpaces] = React.useState<SpaceOverview[] | null>(null);
  const [templates, setTemplates] = React.useState<TemplateCard[]>([]);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [full, setFull] = React.useState<SpaceOverview | null>(null);
  const [rows, setRows] = React.useState<{ total: number; results: EntryRow[] } | null>(null);
  const [answer, setAnswer] = React.useState<EntryAnswer | null>(null);
  const [typed, setTyped] = React.useState('');
  const [q, setQ] = React.useState('');
  const [where, setWhere] = React.useState<Record<string, string>>({});
  const [files, setFiles] = React.useState('');
  const [meaning, setMeaning] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [making, setMaking] = React.useState(false);
  const [guide, setGuide] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [view, setView] = React.useState<LibraryView>('grid');
  React.useEffect(() => {
    try {
      setView(viewOf(window.localStorage.getItem(REMEMBER_VIEW)));
    } catch {}
  }, []);
  const pickView = (next: LibraryView) => {
    setView(next);
    try {
      window.localStorage.setItem(REMEMBER_VIEW, next);
    } catch {}
  };
  const [tick, setTick] = React.useState(0);
  const reload = () => setTick(n => n + 1);

  // the spaces, once; then again after something changed
  React.useEffect(() => {
    let live = true;
    libraryApi
      .spaces()
      .then(result => {
        if (!live) return;
        setSpaces(result.spaces);
        setTemplates(result.templates);
      })
      .catch(error => live && setProblem(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [tick]);

  // the space in the address, else the one used last, else Personal
  const spaceId = React.useMemo(() => {
    if (!spaces?.length) return null;
    const known = (id: string | null) => (id && spaces.some(s => s.space.id === id) ? id : null);
    let last: string | null = null;
    try {
      last = window.localStorage.getItem(REMEMBER);
    } catch {}
    return known(spaceParam) ?? known(last) ?? spaces[0].space.id;
  }, [spaces, spaceParam]);
  const space = spaces?.find(s => s.space.id === spaceId)?.space ?? null;

  const go = React.useCallback((at: { space?: string | null; collection?: string | null; entry?: string | null }) => router.push(libraryHref({ space: spaceId, ...at })), [router, spaceId]);

  // the space's collections in full: each one's hints, its guide and the owner's notes
  React.useEffect(() => {
    if (!spaceId) return;
    let live = true;
    setFull(null);
    libraryApi
      .space(spaceId)
      .then(result => live && setFull(result))
      .catch(error => live && setProblem(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [spaceId, tick]);

  const collections = full?.collections ?? spaces?.find(s => s.space.id === spaceId)?.collections ?? [];
  const collection = collectionSlug ? collections.find(c => c.slug === collectionSlug) : undefined;

  // what is typed is searched a moment after the typing stops
  React.useEffect(() => {
    const timer = setTimeout(() => setQ(typed), 250);
    return () => clearTimeout(timer);
  }, [typed]);
  // filters belong to one collection
  React.useEffect(() => {
    setWhere({});
    setFiles('');
  }, [collectionSlug, spaceId]);

  const listing = !!spaceId && !entrySlug && (!!collectionSlug || !!q.trim());
  React.useEffect(() => {
    if (!listing || !spaceId) {
      setRows(null);
      return;
    }
    let live = true;
    libraryApi
      .list(listQuery({ space: spaceId, collection: collectionSlug, q, where, files, meaning }))
      .then(result => live && setRows(result))
      .catch(error => live && toast.error(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [listing, spaceId, collectionSlug, q, where, files, meaning, tick]);

  React.useEffect(() => {
    setAnswer(null);
    if (!spaceId || !collectionSlug || !entrySlug) return;
    let live = true;
    libraryApi
      .entry(spaceId, `${collectionSlug}/${entrySlug}`)
      .then(result => live && setAnswer(result))
      .catch(error => {
        if (!live) return;
        toast.error(error instanceof Error ? error.message : String(error));
        router.replace(libraryHref({ space: spaceId, collection: collectionSlug }));
      });
    return () => {
      live = false;
    };
  }, [spaceId, collectionSlug, entrySlug, tick, router]);

  const pick = (id: string) => {
    try {
      window.localStorage.setItem(REMEMBER, id);
    } catch {}
    setTyped('');
    router.push(computers ? computersHref(id) : libraryHref({ space: id }));
  };
  const saved = (ref: string, warnings: string[]) => {
    for (const warning of warnings) toast.warning(warning);
    reload();
    const [c, e] = ref.split('/');
    go({ collection: c, entry: e });
  };

  const groupable = collection ? folderFields(collection) : [];
  const folderField = groupable.find(field => field.key === byParam)?.key ?? groupable[0]?.key ?? null;
  const withFolder = (name: string | null, by = folderField) => {
    const query = new URLSearchParams({ space: spaceId ?? '', c: collectionSlug ?? '' });
    if (by) query.set('by', by);
    if (name !== null) query.set('f', name);
    return `/app/library?${query}`;
  };
  const may = canChange(space);
  // in a collection another space shares, what this space may do is what its owner allowed
  const here = space ? spaceFor(space, collection) : null;
  const mayHere = canChange(here);
  const filters = collection ? filtersOf(collection) : null;
  const filtered = !!q.trim() || Object.values(where).some(Boolean) || !!files;

  return (
    <AppPage title="Library">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">The files a space reuses, kept once and found from every computer.</p>
          </div>
          {spaces && spaces.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {space && <SideSwitch space={space.id} computers={computers} />}
              <SpacePicker spaces={spaces.map(s => s.space)} current={space} onPick={pick} />
            </div>
          )}
        </div>

        {problem && (
          <p className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive" role="alert">
            {problem}
          </p>
        )}
        {!spaces && !problem && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Opening your Library
          </p>
        )}

        {space && computers && <DeviceLibrary space={space} deviceId={params.get('d')} />}
        {space && !computers && (
          <>
            {!entrySlug && (
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder={meaning ? 'Describe it: the sad song about the sea' : collection ? `Search ${collection.name}` : `Search the ${space.name} space`}
                    value={typed}
                    onChange={event => setTyped(event.target.value)}
                    aria-label="Search"
                  />
                </div>
                {full?.byMeaning && (
                  <button type="button" className={`${button} shrink-0 ${meaning ? 'border-primary text-primary' : ''}`} aria-pressed={meaning} onClick={() => setMeaning(on => !on)} title="Find entries by what they are about, not only the exact words">
                    <SparklesIcon className="size-4" />
                    By meaning
                  </button>
                )}
              </div>
            )}

            {collection && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <nav aria-label="Where you are" className="flex min-w-0 items-center gap-1 text-sm">
                  <Link href={libraryHref({ space: space.id })} className="text-muted-foreground hover:text-foreground">
                    Library
                  </Link>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  {entrySlug || (view === 'folders' && folder !== null) ? (
                    <Link href={entrySlug ? libraryHref({ space: space.id, collection: collection.slug }) : withFolder(null)} className="text-muted-foreground hover:text-foreground">
                      {collection.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{collection.name}</span>
                  )}
                  {!entrySlug && view === 'folders' && folder !== null && (
                    <>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{folder}</span>
                    </>
                  )}
                  {entrySlug && (
                    <>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{answer?.entry.title ?? entrySlug}</span>
                    </>
                  )}
                </nav>
                {!entrySlug && filters && (
                  <div className="flex flex-wrap items-center gap-2">
                    {filters.choices.map(field => (
                      <Select key={field.key} value={where[field.key] || ANY} onValueChange={value => setWhere(current => ({ ...current, [field.key]: value === ANY ? '' : value }))}>
                        <SelectTrigger className="h-8 w-40" aria-label={field.label}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ANY}>{field.label}: any</SelectItem>
                          {(field.options ?? []).map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                    <Select value={files || ANY} onValueChange={value => setFiles(value === ANY ? '' : value)}>
                      <SelectTrigger className="h-8 w-44" aria-label="Files">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>Files: any</SelectItem>
                        {filters.slots.map(slot => (
                          <SelectItem key={`has-${slot.key}`} value={`has:${slot.key}`}>
                            Has {slot.label.toLowerCase()}
                          </SelectItem>
                        ))}
                        {filters.slots.map(slot => (
                          <SelectItem key={`lacks-${slot.key}`} value={`lacks:${slot.key}`}>
                            No {slot.label.toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {view === 'folders' && groupable.length > 1 && (
                      <Select value={folderField ?? ''} onValueChange={value => router.push(withFolder(null, value))}>
                        <SelectTrigger className="h-8 w-44" aria-label="Folders by">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {groupable.map(field => (
                            <SelectItem key={field.key} value={field.key}>
                              By {field.label.toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <ViewSwitch view={view} onChange={pickView} />
                    <button type="button" className={button} onClick={() => setGuide(true)}>
                      <BookOpenIcon className="size-4" />
                      Guide
                    </button>
                    {(collection.shared || space.role === 'owner') && (
                      <button type="button" className={button} onClick={() => setSharing(true)}>
                        <UsersIcon className="size-4" />
                        {collection.shared ? `Shared by ${collection.shared.by}` : collection.requests ? `Share · ${collection.requests} ${collection.requests === 1 ? 'request' : 'requests'}` : collection.sharedWith ? `Shared with ${collection.sharedWith}` : 'Share'}
                      </button>
                    )}
                    {mayHere && (
                      <button type="button" className={primary} onClick={() => setAdding(true)}>
                        <PlusIcon className="size-4" />
                        Add a {collection.noun}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* an entry */}
            {collection && here && entrySlug && (answer ? <EntryView space={here} home={space} collection={collection} answer={answer} onChanged={warnings => (warnings.forEach(w => toast.warning(w)), reload())} onTrashed={() => (reload(), go({ collection: collection.slug }))} /> : <p className="text-sm text-muted-foreground">Opening it</p>)}

            {/* a collection's entries, or what a search of the whole space found */}
            {listing && rows && rows.results.length > 0 && (
              <>
                <EntryViews
                  view={view}
                  collection={collection}
                  rows={rows.results}
                  collectionOf={row => collections.find(item => item.slug === row.ref.split('/')[0])}
                  hrefOf={row => libraryHref({ space: space.id, collection: row.ref.split('/')[0], entry: row.ref.split('/')[1] })}
                  showCollection={!collection}
                  folderField={folderField}
                  folder={view === 'folders' ? folder : null}
                  folderHref={name => withFolder(name)}
                />
                {rows.total > rows.results.length && (
                  <p className="text-xs text-muted-foreground">
                    Showing {rows.results.length} of {rows.total}. Search or filter to narrow it.
                  </p>
                )}
              </>
            )}
            {listing && rows && !rows.results.length && (
              <Empty
                title={filtered ? 'Nothing matches' : `No ${collection?.noun ?? 'item'}s yet`}
                about={filtered ? 'Try fewer words, or clear a filter.' : mayHere ? `Add the first one here, or ask Claude to add your ${collection?.noun ?? 'item'}s from a computer.` : collection?.shared ? `${collection.shared.by} adds them.` : 'The owner or an editor of this space adds them.'}
              >
                {!filtered && mayHere && collection && (
                  <button type="button" className={primary} onClick={() => setAdding(true)}>
                    <PlusIcon className="size-4" />
                    Add a {collection.noun}
                  </button>
                )}
              </Empty>
            )}
            {collectionSlug && full && !collection && <Empty title="No such collection here" about={`The ${space.name} space has no collection by that name.`} />}

            {/* the space's collections */}
            {!collectionSlug && !q.trim() && (
              <>
                {!!full?.invitations?.length && <Invitations space={space} invitations={full.invitations} onAccepted={slug => (reload(), go({ collection: slug }))} onChanged={reload} />}
                {collections.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map(item => (
                      <CollectionCard key={item.slug} space={space} collection={item} href={libraryHref({ space: space.id, collection: item.slug })} may={may && !item.shared} onChanged={reload} />
                    ))}
                    {may && (
                      <button type="button" className={`${card} min-h-40 items-center justify-center border-dashed text-sm font-medium text-muted-foreground`} onClick={() => setMaking(true)}>
                        <PlusIcon className="size-5" />
                        New collection
                      </button>
                    )}
                  </div>
                )}
                {!collections.length && (full || spaces) && (
                  <Empty title={`The ${space.name} space has no collections yet`} about={may ? 'A collection keeps one kind of thing, such as a channel’s songs, with its files and details.' : 'The owner or an editor of this space makes them.'}>
                    {may && (
                      <button type="button" className={primary} onClick={() => setMaking(true)}>
                        <PlusIcon className="size-4" />
                        New collection
                      </button>
                    )}
                  </Empty>
                )}
              </>
            )}

            {collection && here && <EntryDialog space={here} collection={collection} open={adding} onOpenChange={setAdding} onSaved={saved} />}
            {collection && here && <Guide space={here} collection={collection} open={guide} onOpenChange={setGuide} onSaved={reload} />}
            {collection && !collection.shared && space.role === 'owner' && <ShareDialog space={space} collection={collection} projects={(spaces ?? []).map(s => s.space)} open={sharing} onOpenChange={setSharing} onChanged={reload} />}
            {collection?.shared && <SharedInfo space={space} collection={collection} open={sharing} onOpenChange={setSharing} onLeft={() => (reload(), go({}))} />}
            <NewCollection space={space} templates={templates} taken={collections.map(item => item.name.toLowerCase())} open={making} onOpenChange={setMaking} onMade={slug => (reload(), go({ collection: slug }))} />
          </>
        )}
      </div>
    </AppPage>
  );
}
