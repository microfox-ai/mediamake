'use client';

import * as React from 'react';
import { FolderIcon, Loader2Icon, StarIcon, UserIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { RequestView } from '@/lib/cloud-library/listing';
import type { InvitationView, ShareNotes, ShareRole, ShareView } from '@/lib/cloud-library/shares';
import { canChange, dayText, formatBytes, type CollectionView, type SpaceView } from '@/lib/cloud-library/view';
import { libraryApi } from './api';

/**
 * Shared collections on the page (docs/library.md › Shared collections): the owner's Share dialog,
 * the invitation a receiving space answers, what a shared collection says about itself, and a
 * receiving space's own notes on a shared entry.
 */

const button = 'inline-flex items-center justify-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50';
const primary = 'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';
const said = (problem: unknown) => (problem instanceof Error ? problem.message : String(problem));
const CAN: Record<ShareRole, string> = { viewer: 'Can read and fetch', editor: 'Can also add and change' };

/** The owner opens a collection to a project or a person, and sees who has it and what they fetched. */
export function ShareDialog({ space, collection, projects, open, onOpenChange, onChanged }: { space: SpaceView; collection: CollectionView; projects: SpaceView[]; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [shares, setShares] = React.useState<ShareView[] | null>(null);
  const [kind, setKind] = React.useState('project');
  const [project, setProject] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<ShareRole>('viewer');
  const [internal, setInternal] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const others = projects.filter(item => !item.personal && item.id !== space.id);
  const keepsInternal = collection.fields.some(field => field.key === 'use' && (field.options ?? []).some(option => /^internal only$/i.test(option)));

  const load = React.useCallback(() => {
    libraryApi
      .shares(space.id, collection.slug)
      .then(result => setShares(result.shares))
      .catch(problem => setError(said(problem)));
  }, [space.id, collection.slug]);
  React.useEffect(() => {
    if (!open) return;
    setShares(null);
    setError(null);
    setEmail('');
    setProject('');
    setRole('viewer');
    setInternal(false);
    load();
  }, [open, load]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      toast.success(done);
      load();
      onChanged();
    } catch (problem) {
      setError(said(problem));
    } finally {
      setBusy(false);
    }
  };
  const target = kind === 'project' ? project : email.trim();
  const share = () =>
    run(async () => {
      await libraryApi.share({ space: space.id, collection: collection.slug, ...(kind === 'project' ? { project } : { email: email.trim() }), role, internal });
      setEmail('');
      setProject('');
    }, 'Invited. It shows in their Library once they accept.');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share {collection.name}</DialogTitle>
          <DialogDescription>They use this collection itself, never a copy, so every change you make reaches them at once. Its files stay in this space&apos;s storage.</DialogDescription>
        </DialogHeader>

        <Tabs value={kind} onValueChange={setKind}>
          <TabsList>
            <TabsTrigger value="project">With a project</TabsTrigger>
            <TabsTrigger value="person">With a person</TabsTrigger>
            <TabsTrigger value="explore">
              In Explore
              {!!collection.requests && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{collection.requests}</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="project">
            {others.length ? (
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger aria-label="Project">
                  <SelectValue placeholder="Choose a project: everyone on it gets the collection" />
                </SelectTrigger>
                <SelectContent>
                  {others.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">You are on no other project. Share with a person instead.</p>
            )}
          </TabsContent>
          <TabsContent value="person">
            <Input type="email" placeholder="Their email address on MediaMake" value={email} onChange={event => setEmail(event.target.value)} aria-label="Email address" />
          </TabsContent>
          <TabsContent value="explore">
            <ListingPanel space={space} collection={collection} onChanged={onChanged} />
          </TabsContent>
        </Tabs>
        <div className={`flex flex-wrap items-center gap-3 ${kind === 'explore' ? 'hidden' : ''}`}>
          <Select value={role} onValueChange={value => setRole(value as ShareRole)}>
            <SelectTrigger className="w-56" aria-label="What they can do">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">{CAN.viewer}</SelectItem>
              <SelectItem value="editor">{CAN.editor}</SelectItem>
            </SelectContent>
          </Select>
          {keepsInternal && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={internal} onCheckedChange={value => setInternal(value === true)} />
              Also show the ones marked Internal only
            </label>
          )}
          <button type="button" className={`${primary} ml-auto`} disabled={busy || !target} onClick={share}>
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            Share
          </button>
        </div>
        <p className="min-h-4 text-xs text-destructive" role={error ? 'alert' : undefined}>
          {error}
        </p>

        <div className={`flex flex-col gap-2 ${kind === 'explore' ? 'hidden' : ''}`}>
          <p className="text-sm font-medium">Shared with</p>
          {!shares && !error && <p className="text-sm text-muted-foreground">Reading</p>}
          {shares && !shares.length && <p className="text-sm text-muted-foreground">Nobody yet. Only you can share this collection.</p>}
          {shares && shares.length > 0 && (
            <ul className="divide-y rounded-xl border">
              {shares.map(item => (
                <li key={item.to} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  {item.kind === 'project' ? <FolderIcon className="size-4 shrink-0 text-muted-foreground" /> : <UserIcon className="size-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.state === 'accepted' ? CAN[item.role] : `Invited ${dayText(item.at)}, not accepted yet`}
                      {item.internal ? ' · sees Internal only' : ''}
                      {item.fetches > 0 ? ` · fetched ${formatBytes(item.fetchedBytes)} in 30 days (${item.people} ${item.people === 1 ? 'person' : 'people'})` : item.state === 'accepted' ? ' · nothing fetched in 30 days' : ''}
                    </p>
                  </div>
                  <button type="button" className={button} disabled={busy} onClick={() => run(() => libraryApi.unshare(space.id, collection.slug, item.to), `${item.name} no longer has ${collection.name}`)}>
                    Stop sharing
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The owner lists a collection in Explore with the rights they write, and answers who asks for it. */
function ListingPanel({ space, collection, onChanged }: { space: SpaceView; collection: CollectionView; onChanged: () => void }) {
  const [about, setAbout] = React.useState(collection.listing?.about ?? '');
  const [rights, setRights] = React.useState(collection.listing?.rights ?? '');
  const [requests, setRequests] = React.useState<RequestView[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const listed = !!collection.listing;

  const load = React.useCallback(() => {
    libraryApi
      .requests(space.id, collection.slug)
      .then(result => setRequests(result.requests))
      .catch(problem => setError(said(problem)));
  }, [space.id, collection.slug]);
  React.useEffect(() => {
    if (listed) load();
  }, [listed, load]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      toast.success(done);
      onChanged();
      if (listed) load();
    } catch (problem) {
      setError(said(problem));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Members who use the Library see its name, what it holds and a few titles, never a file. They ask you for access, and you say yes or no. Entries marked Internal only are never shown.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        What it is
        <Textarea rows={2} maxLength={600} value={about} onChange={event => setAbout(event.target.value)} placeholder={collection.about} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        What someone with access may do with it
        <Textarea rows={2} maxLength={600} value={rights} onChange={event => setRights(event.target.value)} placeholder="In your own words: use in videos on your own channels, credit Sample Channel" />
      </label>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {listed && (
          <button type="button" className={button} disabled={busy} onClick={() => run(() => libraryApi.unlist(space.id, collection.slug), `${collection.name} is no longer in Explore`)}>
            Take it off Explore
          </button>
        )}
        <button type="button" className={primary} disabled={busy || !rights.trim()} onClick={() => run(() => libraryApi.listCollection(space.id, collection.slug, { about, rights }), listed ? 'Listing changed' : `${collection.name} is listed in Explore`)}>
          {busy && <Loader2Icon className="size-4 animate-spin" />}
          {listed ? 'Save the listing' : 'List in Explore'}
        </button>
      </div>
      <p className="min-h-4 text-xs text-destructive" role={error ? 'alert' : undefined}>
        {error}
      </p>
      {listed && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Requests</p>
          {requests && !requests.length && <p className="text-sm text-muted-foreground">Nobody is waiting.</p>}
          {requests && requests.length > 0 && (
            <ul className="divide-y rounded-xl border">
              {requests.map(item => (
                <li key={item.to} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      For {item.space} · asked {dayText(item.at)}
                      {item.note ? ` · "${item.note}"` : ''}
                    </p>
                  </div>
                  <button type="button" className={button} disabled={busy} onClick={() => run(() => libraryApi.decide(space.id, collection.slug, item.to, false), `Declined ${item.name}`)}>
                    Decline
                  </button>
                  <button type="button" className={primary} disabled={busy} onClick={() => run(() => libraryApi.decide(space.id, collection.slug, item.to, true), `${item.name} can read and fetch once they accept`)}>
                    Accept
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** A collection another space opened to this one, waiting for a yes. */
export function Invitations({ space, invitations, onAccepted, onChanged }: { space: SpaceView; invitations: InvitationView[]; onAccepted: (slug: string) => void; onChanged: () => void }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const may = canChange(space);
  const answer = async (invitation: InvitationView, yes: boolean) => {
    setBusy(`${invitation.from}/${invitation.collection}`);
    try {
      if (yes) {
        const accepted = await libraryApi.acceptShare(space.id, invitation.from, invitation.collection);
        toast.success(`${accepted.name} is in the ${space.name} space`);
        onAccepted(accepted.as);
      } else {
        await libraryApi.leaveShare(space.id, invitation.from, invitation.collection);
        onChanged();
      }
    } catch (problem) {
      toast.error(said(problem));
    } finally {
      setBusy(null);
    }
  };
  return (
    <ul className="flex flex-col gap-2">
      {invitations.map(invitation => {
        const id = `${invitation.from}/${invitation.collection}`;
        return (
          <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card p-4">
            <UsersIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-sm font-medium">
                {invitation.by} shares {invitation.name} with {space.personal ? 'you' : `the ${space.name} space`}
              </p>
              <p className="text-xs text-muted-foreground">
                {invitation.entries} {invitation.noun}
                {invitation.entries === 1 ? '' : 's'} · {invitation.role === 'editor' ? 'you can also add and change' : 'you can read and fetch'}. {invitation.says}
              </p>
            </div>
            {may ? (
              <div className="flex shrink-0 gap-2">
                <button type="button" className={button} disabled={busy === id} onClick={() => answer(invitation, false)}>
                  Decline
                </button>
                <button type="button" className={primary} disabled={busy === id} onClick={() => answer(invitation, true)}>
                  {busy === id && <Loader2Icon className="size-4 animate-spin" />}
                  Accept
                </button>
              </div>
            ) : (
              <p className="shrink-0 text-xs text-muted-foreground">The owner or an editor of this space accepts it.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** What a shared collection is, for the space it was opened to, and the way out of it. */
export function SharedInfo({ space, collection, open, onOpenChange, onLeft }: { space: SpaceView; collection: CollectionView; open: boolean; onOpenChange: (open: boolean) => void; onLeft: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const shared = collection.shared;
  if (!shared) return null;
  const leave = async () => {
    setBusy(true);
    try {
      await libraryApi.leaveShare(space.id, shared.from, shared.collection);
      toast.success(`${collection.name} is no longer in the ${space.name} space`);
      onOpenChange(false);
      onLeft();
    } catch (problem) {
      toast.error(said(problem));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {collection.name}, shared by {shared.by}
          </DialogTitle>
          <DialogDescription>This is their live collection, not a copy. It changes when they change it, and they can stop sharing it.</DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
          <li>{shared.role === 'editor' ? 'The owner and editors of this space can add and change entries. Everyone else here reads and fetches.' : 'Everyone on this space can search, read and fetch. Only its owner adds and changes.'}</li>
          <li>Its files are in {shared.by}&apos;s storage. What you fetch is counted as yours.</li>
          <li>Notes this space keeps on an entry (rating, tags, used in) stay here.</li>
        </ul>
        {canChange(space) && (
          <DialogFooter className="items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Files already inside your productions stay where they are.</p>
            <button type="button" className={button} disabled={busy} onClick={leave}>
              {busy && <Loader2Icon className="size-4 animate-spin" />}
              Leave this collection
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

const listOf = (text: string) => [...new Set(text.split(/[,\n]/).map(item => item.trim()).filter(Boolean))];

/** This space's own rating, tags and "used in" on a shared entry. They never reach the owner's entry. */
export function ShareNotesCard({ space, entryRef, by }: { space: SpaceView; entryRef: string; by: string }) {
  const [saved, setSaved] = React.useState<ShareNotes | null>(null);
  const [rating, setRating] = React.useState(0);
  const [tags, setTags] = React.useState('');
  const [usedIn, setUsedIn] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const may = canChange(space);
  const show = (notes: ShareNotes) => {
    setSaved(notes);
    setRating(notes.rating ?? 0);
    setTags(notes.tags.join(', '));
    setUsedIn(notes.usedIn.join(', '));
  };
  React.useEffect(() => {
    let live = true;
    setSaved(null);
    libraryApi
      .notes(space.id, entryRef)
      .then(result => live && show(result.notes))
      .catch(problem => live && toast.error(said(problem)));
    return () => {
      live = false;
    };
  }, [space.id, entryRef]);
  const now: ShareNotes = { ...(rating && { rating }), tags: listOf(tags), usedIn: listOf(usedIn) };
  const changed = !!saved && JSON.stringify(now) !== JSON.stringify({ ...(saved.rating && { rating: saved.rating }), tags: saved.tags, usedIn: saved.usedIn });
  const save = async () => {
    setBusy(true);
    try {
      show((await libraryApi.setNotes(space.id, entryRef, now)).notes);
      toast.success('Saved in this space');
    } catch (problem) {
      toast.error(said(problem));
    } finally {
      setBusy(false);
    }
  };
  if (!saved) return <p className="text-sm text-muted-foreground">Reading this space&apos;s notes</p>;
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Kept in the {space.name} space only. {by} does not see them, and they never change the entry.
      </p>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating</p>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`} disabled={!may} onClick={() => setRating(rating === n ? 0 : n)} className="rounded p-0.5 disabled:opacity-60">
              <StarIcon className={`size-5 ${n <= rating ? 'fill-foreground text-foreground' : 'text-muted-foreground/50'}`} />
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Tags
        <Input className="text-sm font-normal normal-case tracking-normal text-foreground" value={tags} onChange={event => setTags(event.target.value)} placeholder="Separated by commas" disabled={!may} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Used in
        <Input className="text-sm font-normal normal-case tracking-normal text-foreground" value={usedIn} onChange={event => setUsedIn(event.target.value)} placeholder="The productions it went in, separated by commas" disabled={!may} />
      </label>
      {may && (
        <div>
          <button type="button" className={primary} disabled={busy || !changed} onClick={save}>
            {busy && <Loader2Icon className="size-4 animate-spin" />}
            Save the notes
          </button>
        </div>
      )}
    </div>
  );
}
