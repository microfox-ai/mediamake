'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ClockIcon, Loader2Icon, LogOutIcon, MailIcon, SearchIcon, UserPlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { MEMBER_ROLES, ROLE_INFO, initials, isEmail, type MemberPerson, type MemberRole, type Person, type ProjectInvite } from '@/lib/projects/access';
import type { ProjectRole } from '@/lib/editor/project-access';
import { cn } from '@/lib/utils';
import { CopyLine } from './copy-line';

/** What GET /api/project/share answers (lib/projects/access-store's ProjectAccessView). */
interface AccessView {
  projectId: string;
  displayName: string;
  myRole: ProjectRole;
  isOwner: boolean;
  owner: Person;
  members: MemberPerson[];
  invites: ProjectInvite[];
}

interface Lookup {
  people: Person[];
  /** The account a typed email belongs to. */
  match?: Person;
  /** A typed email with no account yet: it would be invited. */
  invite?: string;
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `It failed (${res.status})`);
  return json as T;
}

// One quiet tint per person, so a row of avatars reads as different people.
const TINTS = ['bg-amber-500/15 text-amber-800 dark:text-amber-200', 'bg-sky-500/15 text-sky-800 dark:text-sky-200', 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200', 'bg-rose-500/15 text-rose-800 dark:text-rose-200', 'bg-violet-500/15 text-violet-800 dark:text-violet-200'];
const tintOf = (id: string) => TINTS[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TINTS.length];

export function PersonAvatar({ person, className }: { person: Pick<Person, 'clientId' | 'name' | 'avatarUrl'>; className?: string }) {
  return (
    <span className={cn('flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold', tintOf(person.clientId), className)} title={person.name}>
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(person.name)
      )}
    </span>
  );
}

/** The first few faces on a project, then "+3". */
export function AvatarStack({ people, max = 4, className }: { people: Pick<Person, 'clientId' | 'name' | 'avatarUrl'>[]; max?: number; className?: string }) {
  const shown = people.slice(0, people.length > max ? max - 1 : max);
  const more = people.length - shown.length;
  return (
    <span className={cn('flex items-center', className)}>
      {shown.map(person => (
        <PersonAvatar key={person.clientId} person={person} className="-ml-1 size-6 text-[9px] ring-2 ring-card first:ml-0" />
      ))}
      {more > 0 && <span className="-ml-1.5 flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-card">+{more}</span>}
    </span>
  );
}

const ROLE_TONE: Record<ProjectRole, string> = {
  owner: 'border-foreground/20 bg-foreground text-background',
  editor: 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  viewer: 'border-border bg-muted text-muted-foreground',
};

export function RoleBadge({ role, className }: { role: ProjectRole; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none', ROLE_TONE[role], className)}>{ROLE_INFO[role].label}</span>;
}

function RoleSelect({ value, onChange, disabled, label }: { value: MemberRole; onChange: (role: MemberRole) => void; disabled?: boolean; label: string }) {
  return (
    <Select value={value} onValueChange={next => onChange(next as MemberRole)} disabled={disabled}>
      <SelectTrigger size="sm" className="h-8 w-[92px] px-2.5 text-xs" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {MEMBER_ROLES.map(role => (
          <SelectItem key={role} value={role} className="text-xs">
            {ROLE_INFO[role].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Who can open a project, and for its owner, the controls: add someone by
 * name or email, change a role, remove, and the invites still waiting.
 * Members see the same list without the controls, and can leave. Used in the
 * sheet a project card opens and on the project's own page.
 */
export function ProjectAccessPanel({ projectId, me, onChanged, onLeft, className }: { projectId: string; me?: string; /** After any change, so a list behind can refresh. */ onChanged?: () => void; onLeft?: () => void; className?: string }) {
  const [view, setView] = React.useState<AccessView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [text, setText] = React.useState('');
  const [role, setRole] = React.useState<MemberRole>('editor');
  const [lookup, setLookup] = React.useState<Lookup | null>(null);
  const [open, setOpen] = React.useState(false);
  /** Who was just added, so the owner gets the two lines that finish the job. */
  const [added, setAdded] = React.useState<string | null>(null);

  React.useEffect(() => {
    setView(null);
    setError(null);
    call<AccessView>('GET', `/api/project/share?projectId=${encodeURIComponent(projectId)}`).then(setView).catch(e => setError(e.message));
  }, [projectId]);

  // Suggestions while typing: people you already work with, or the account behind a full email.
  React.useEffect(() => {
    if (!view?.isOwner || !open) return;
    let stale = false;
    const timer = setTimeout(() => {
      call<Lookup>('GET', `/api/project/people?projectId=${encodeURIComponent(projectId)}&q=${encodeURIComponent(text.trim())}`)
        .then(found => !stale && setLookup(found))
        .catch(() => !stale && setLookup({ people: [] }));
    }, 180);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [text, open, projectId, view?.isOwner, view?.members.length]);

  const change = async (key: string, done: string, request: () => Promise<Partial<AccessView> & { mailed?: boolean; invite?: ProjectInvite; left?: boolean }>) => {
    setBusy(key);
    try {
      const next = await request();
      if (next.left) {
        toast.success(done);
        onLeft?.();
        return true;
      }
      if (next.members) setView(next as AccessView);
      toast.success(next.invite ? `${done}${next.mailed ? ' We mailed them the link.' : ' Send them the link to sign up: no mail went out.'}` : done);
      onChanged?.();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const add = (who: { email: string } | { clientId: string }, name: string) => {
    setOpen(false);
    setText('');
    setLookup(null);
    return change('add', 'email' in who && !lookup?.match ? `Invited ${name} as ${role}.` : `Added ${name} as ${role}.`, () => call('POST', '/api/project/share', { projectId, role, ...who })).then(ok => {
      if (ok) setAdded(name);
    });
  };

  if (error) return <p className={cn('rounded-lg border border-dashed p-4 text-sm text-muted-foreground', className)}>{error}</p>;
  if (!view) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-9 w-full" />
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  const typed = text.trim();
  const options: { key: string; person?: Person; invite?: string }[] = [
    ...(lookup?.match ? [{ key: lookup.match.clientId, person: lookup.match }] : []),
    ...(lookup?.people ?? []).map(person => ({ key: person.clientId, person })),
    ...(lookup?.invite ? [{ key: lookup.invite, invite: lookup.invite }] : []),
  ];
  const people = 1 + view.members.length;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className="text-sm text-muted-foreground">
        {people === 1 ? 'Only the owner can open this project.' : `${people} people can open this project.`}
        {view.invites.length > 0 && ` ${view.invites.length} invited, not joined yet.`}
      </p>

      {view.isOwner && (
        <form
          className="relative flex flex-wrap items-start gap-2"
          onSubmit={e => {
            e.preventDefault();
            const first = options[0];
            if (first?.person) void add({ clientId: first.person.clientId }, first.person.name);
            else if (isEmail(typed)) void add({ email: typed }, typed);
            else toast.error('Pick someone from the list, or type their full email address.');
          }}
        >
          <div className="relative min-w-0 flex-1 basis-52">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={text}
              onChange={e => {
                setText(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Add by name or email"
              aria-label="Add someone by name or email"
              autoComplete="off"
              className="h-8 pl-8 text-sm"
            />
            {open && (options.length > 0 || typed.length > 0) && (
              <ul className="absolute inset-x-0 top-9 z-20 max-h-64 overflow-auto rounded-lg border bg-popover p-1 shadow-md" role="listbox">
                {options.map(option =>
                  option.person ? (
                    <li key={option.key}>
                      <button type="button" role="option" aria-selected={false} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onMouseDown={e => e.preventDefault()} onClick={() => void add({ clientId: option.person!.clientId }, option.person!.name)}>
                        <PersonAvatar person={option.person} className="size-6 text-[10px]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{option.person.name}</span>
                          {option.person.email && <span className="block truncate text-xs text-muted-foreground">{option.person.email}</span>}
                        </span>
                      </button>
                    </li>
                  ) : (
                    <li key={option.key}>
                      <button type="button" role="option" aria-selected={false} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onMouseDown={e => e.preventDefault()} onClick={() => void add({ email: option.invite! }, option.invite!)}>
                        <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                          <MailIcon className="size-3" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          Invite <span className="font-medium">{option.invite}</span>
                        </span>
                        <span className="hidden text-xs text-muted-foreground sm:block">No account yet</span>
                      </button>
                    </li>
                  ),
                )}
                {options.length === 0 && <li className="px-2 py-1.5 text-xs text-muted-foreground">{lookup ? 'Nobody you work with matches. Type their full email to add or invite them.' : 'Looking…'}</li>}
              </ul>
            )}
          </div>
          <RoleSelect value={role} onChange={setRole} label="Role for the person you add" />
          <Button type="submit" size="sm" className="h-8" disabled={busy === 'add' || !typed}>
            {busy === 'add' ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />} Add
          </Button>
        </form>
      )}

      {added && view.isOwner && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm font-medium text-foreground">Two lines give {added} the project&apos;s skills</p>
            <button type="button" onClick={() => setAdded(null)} className="underline underline-offset-2">
              Hide
            </button>
          </div>
          <p className="mt-2">1. On your computer, to invite them to the project&apos;s private repo on GitHub:</p>
          <div className="mt-1">
            <CopyLine line={`mm space invite ${projectId}`} label="the invite line" />
          </div>
          <p className="mt-3">2. Send them this line, to set the project up on their computer:</p>
          <div className="mt-1">
            <CopyLine line={`mm space join ${projectId}`} label="their setup line" />
          </div>
          <p className="mt-2">They need a GitHub account linked to MediaMake (they sign in with GitHub, or link it under Account).</p>
        </div>
      )}

      <ul className="divide-y rounded-lg border">
        <li className="flex items-center gap-3 px-3 py-2.5">
          <PersonAvatar person={view.owner} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {view.owner.name}
              {view.owner.clientId === me && <span className="font-normal text-muted-foreground"> (you)</span>}
            </p>
            {view.owner.email && <p className="truncate text-xs text-muted-foreground">{view.owner.email}</p>}
          </div>
          <RoleBadge role="owner" />
        </li>

        {view.members.map(member => (
          <li key={member.clientId} className="flex items-center gap-3 px-3 py-2.5">
            <PersonAvatar person={member} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.name}
                {member.clientId === me && <span className="font-normal text-muted-foreground"> (you)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {member.canOpen === false ? <span className="text-amber-700 dark:text-amber-300">Needs Plus to open it</span> : (member.email ?? (member.name === member.clientId ? '' : member.clientId))}
              </p>
            </div>
            {view.isOwner ? (
              <>
                <RoleSelect value={member.role} disabled={busy === member.clientId} label={`Role of ${member.name}`} onChange={next => void change(member.clientId, `${member.name} is now ${next === 'editor' ? 'an editor' : 'a viewer'}.`, () => call('PATCH', '/api/project/share', { projectId, clientId: member.clientId, role: next }))} />
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Remove ${member.name}`} title="Remove" disabled={busy === member.clientId} onClick={() => void change(member.clientId, `Removed ${member.name}.`, () => call('DELETE', '/api/project/share', { projectId, clientId: member.clientId }))}>
                  <XIcon />
                </Button>
              </>
            ) : (
              <RoleBadge role={member.role} />
            )}
          </li>
        ))}

        {view.invites.map(invite => (
          <li key={invite.email} className="flex items-center gap-3 bg-muted/30 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed">
              <ClockIcon className="size-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{invite.email}</p>
              <p className="text-xs text-muted-foreground">Invited, not joined yet</p>
            </div>
            <RoleSelect value={invite.role} disabled={busy === invite.email} label={`Role of ${invite.email}`} onChange={next => void change(invite.email, `${invite.email} will join as ${next}.`, () => call('PATCH', '/api/project/share', { projectId, email: invite.email, role: next }))} />
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Cancel the invite of ${invite.email}`} title="Cancel invite" disabled={busy === invite.email} onClick={() => void change(invite.email, `Cancelled the invite of ${invite.email}.`, () => call('DELETE', '/api/project/share', { projectId, email: invite.email }))}>
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>

      <dl className="grid gap-1.5 text-xs text-muted-foreground">
        {(['owner', 'editor', 'viewer'] as ProjectRole[]).map(each => (
          <div key={each} className="flex gap-2">
            <dt className="w-12 shrink-0 font-medium text-foreground">{ROLE_INFO[each].label}</dt>
            <dd>{ROLE_INFO[each].can}</dd>
          </div>
        ))}
      </dl>

      {!view.isOwner && me && (
        <Button variant="outline" size="sm" className="w-fit" disabled={busy === 'leave'} onClick={() => window.confirm(`Leave ${view.displayName}? Its owner can add you again.`) && void change('leave', `You left ${view.displayName}.`, () => call('DELETE', '/api/project/share', { projectId, clientId: me }))}>
          <LogOutIcon /> Leave this project
        </Button>
      )}
    </div>
  );
}

/** The access panel in a sheet, opened from a project's card. */
export function ProjectAccessSheet({ project, me, onClose, onChanged }: { project: { id: string; displayName: string; role: ProjectRole } | null; me?: string; onClose: () => void; onChanged?: () => void }) {
  return (
    <Sheet open={!!project} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{project?.role === 'owner' ? 'Share' : 'Who has access to'} {project?.displayName}</SheetTitle>
          <SheetDescription>{project?.role === 'owner' ? 'Add people, choose what they can do, and take access back.' : 'Its owner decides who can open it.'}</SheetDescription>
        </SheetHeader>
        {project && (
          <ProjectAccessPanel
            projectId={project.id}
            me={me}
            onChanged={onChanged}
            onLeft={() => {
              onChanged?.();
              onClose();
            }}
            className="px-4 pb-6"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
