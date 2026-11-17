'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2Icon, UsersIcon, XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { GithubLinkSync } from '@/lib/space/github';
import { linkedSummary, type LinkedItemView } from '@/lib/space/links';
import type { SpaceItemView, SpaceView } from '@/lib/space/space';
import { detailsKey } from '@/lib/app-shell/details';
import { DetailsButton } from './item-details';
import { NextStep, SyncPill } from './space-items';

/**
 * The skills, MCPs and apps of a space as a grid of cards, one item each:
 * what it is, who has it, and where it stands. A space's own items say
 * whether they are the same on every computer. A linked item
 * (lib/space/links) stays its owner's and says who it is shared with; its
 * owner opens Share, a dialog to tick projects, add people and choose who
 * can edit. Used by Mine and by a space's page. On Mine a card opens the
 * item's details (./item-details).
 */

const KIND: Record<SpaceItemView['kind'], string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };
const button = 'inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50';

type Sync = GithubLinkSync & { noGithub?: string[] };
interface Answer {
  linked: LinkedItemView[];
  item: LinkedItemView | null;
  github?: Sync;
}

async function change(body: Record<string, unknown>): Promise<Answer> {
  const res = await fetch('/api/space/links', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `It failed (${res.status})`);
  return json as Answer;
}

/** What still has to happen after a change, when anything does. Null: all done. */
function followUp(github: Sync | undefined): string | null {
  if (!github) return null;
  if (github.noGithub?.length) return `${github.noGithub.join(', ')} must link a GitHub account (Account) to get it.`;
  if (github.state === 'failed') return github.reason;
  if (github.state === 'done') return github.failed.length ? `GitHub refused ${github.failed.join(', ')}.` : null;
  return 'It reaches them after your next sync.';
}

/** Whose it is and who has it, in one line. */
function whoLine(item: LinkedItemView): string {
  if (item.role === 'owner') return `Shared with ${linkedSummary(item)}`;
  return `From ${item.owner}${item.role === 'editor' ? ' · you can edit it' : ''}`;
}

function Share({ item, projects, onChanged }: { item: LinkedItemView; projects: { id: string; name: string }[]; onChanged: (answer: Answer) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const answer = await change({ item: item.id, ...body });
      setNote(followUp(answer.github) ?? 'Saved.');
      onChanged(answer);
      return true;
    } catch (e) {
      setNote(null);
      setError(e instanceof Error ? e.message : 'It failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const linked = new Set(item.projects.map(project => project.id));
  const options = [...projects, ...item.projects.filter(project => !projects.some(option => option.id === project.id))];
  const role = (editor: boolean, onChange: (editor: boolean) => void, label: string) => (
    <select className="h-8 rounded-md border bg-background px-2 text-xs" value={editor ? 'edit' : 'use'} disabled={busy} onChange={event => onChange(event.target.value === 'edit')} aria-label={label}>
      <option value="use">Can use</option>
      <option value="edit">Can edit</option>
    </select>
  );

  return (
    <div className="flex flex-col gap-4 text-sm">
      {options.length > 0 && (
        <div>
          <p className="font-medium">Projects</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {options.map(project => (
              <label key={project.id} className="inline-flex items-center gap-1.5">
                <input type="checkbox" className="size-3.5" checked={linked.has(project.id)} disabled={busy} onChange={event => run({ action: event.target.checked ? 'link' : 'unlink', project: project.id })} />
                {project.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="font-medium">People</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {(item.people ?? []).map(person => (
            <li key={person.clientId} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{person.name}</span>
              {role(person.editor, editor => run({ action: 'add', clientId: person.clientId, editor }), `What ${person.name} can do`)}
              <button type="button" className={button} disabled={busy} onClick={() => run({ action: 'remove', clientId: person.clientId })} aria-label={`Remove ${person.name}`}>
                <XIcon className="size-3" aria-hidden />
              </button>
            </li>
          ))}
          {(item.invites ?? []).map(invite => (
            <li key={invite.email} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">
                {invite.email} <span className="text-muted-foreground">(invited)</span>
              </span>
              {role(invite.editor, editor => run({ action: 'add', email: invite.email, editor }), `What ${invite.email} can do`)}
              <button type="button" className={button} disabled={busy} onClick={() => run({ action: 'remove', email: invite.email })} aria-label={`Remove ${invite.email}`}>
                <XIcon className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-1.5 flex items-center gap-2"
          onSubmit={async event => {
            event.preventDefault();
            if (email.trim() && (await run({ action: 'add', email: email.trim(), editor: false }))) setEmail('');
          }}
        >
          <input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Add someone by email" aria-label="Email of the person to share with" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" />
          <button type="submit" className={button} disabled={busy}>
            {busy ? <Loader2Icon className="size-3 animate-spin" aria-hidden /> : null} Add
          </button>
        </form>
      </div>

      {(note || error) && (
        <p className={error ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'} role={error ? 'alert' : 'status'}>
          {error ?? note}
        </p>
      )}
    </div>
  );
}

function Card({ kind, version, title, summary, status, children, foot, action, details }: { kind: SpaceItemView['kind']; version?: string; title: string; summary?: string; status?: React.ReactNode; children?: React.ReactNode; foot: React.ReactNode; action?: React.ReactNode; /** The key its details open by, where the page has them. */ details?: string }) {
  return (
    <li className="relative flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-xs has-[button[data-details]]:hover:border-foreground/30">
      <div className="flex min-h-6 flex-wrap items-center gap-2">
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{KIND[kind]}</span>
        {version && <span className="text-xs tabular-nums text-muted-foreground">v{version.replace(/^v/, '')}</span>}
        {status && <span className="ml-auto">{status}</span>}
      </div>
      <h3 className="mt-3 text-sm font-semibold">
        <DetailsButton detailsKey={details} cover>
          {title}
        </DetailsButton>
      </h3>
      {summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{summary}</p>}
      {children}
      <div className="mt-auto flex min-h-7 items-center gap-2 pt-3">
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">{foot}</span>
        {action && <span className="relative z-10">{action}</span>}
      </div>
    </li>
  );
}

export function ItemCards({
  space = null,
  audience,
  linked = [],
  projects = [],
  unlinkFrom,
  empty,
  columns = 2,
}: {
  /** The space's own items. */
  space?: SpaceView | null;
  /** Who has the space's own items, in a few words: "Only you", "Everyone on Kids TV". */
  audience?: string;
  /** Linked items to show beside them. */
  linked?: LinkedItemView[];
  /** The projects the viewer owns or edits: where they may share their own items. */
  projects?: { id: string; name: string }[];
  /** On a project's page, for its owner: the project an item of someone else can be removed from. */
  unlinkFrom?: { id: string; name: string };
  /** Shown when there is nothing. */
  empty?: React.ReactNode;
  /** Cards to a row on a wide screen. */
  columns?: 2 | 3;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState(linked);
  const [open, setOpen] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => setRows(linked), [linked]);

  const onChanged = (answer: Answer) => {
    const fresh = new Map(answer.linked.map(view => [view.id, view]));
    setRows(current => current.map(row => fresh.get(row.id) ?? row));
    router.refresh();
  };
  const sharing = rows.find(row => row.id === open && row.role === 'owner');

  if (!space?.items.length && !rows.length) return empty ? <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">{empty}</p> : null;
  return (
    <>
      <ul className={columns === 3 ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'grid grid-cols-1 gap-3 sm:grid-cols-2'}>
        {(space?.items ?? []).map(item => (
          <Card key={item.key} kind={item.kind} version={item.version} title={item.title} summary={item.summary} status={<SyncPill item={item} computers={space!.devices.length} />} foot={audience} details={detailsKey.space(space!.id, item.key)}>
            <NextStep item={item} />
          </Card>
        ))}
        {rows.map(item => (
          <Card
            key={item.id}
            kind={item.kind}
            version={item.version}
            title={item.title}
            summary={item.summary}
            foot={whoLine(item)}
            details={detailsKey.linked(item.id)}
            action={
              item.role === 'owner' ? (
                <button type="button" className={button} onClick={() => setOpen(item.id)}>
                  <UsersIcon className="size-3" aria-hidden /> Share
                </button>
              ) : unlinkFrom ? (
                <button
                  type="button"
                  className={button}
                  onClick={async () => {
                    setError(null);
                    try {
                      await change({ item: item.id, action: 'unlink', project: unlinkFrom.id });
                      setRows(current => current.filter(row => row.id !== item.id));
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'It failed');
                    }
                  }}
                >
                  Remove
                </button>
              ) : null
            }
          />
        ))}
      </ul>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <Dialog open={!!sharing} onOpenChange={next => !next && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          {sharing && (
            <>
              <DialogHeader>
                <DialogTitle>Share {sharing.title}</DialogTitle>
                <DialogDescription>It stays yours. Choose who else gets it.</DialogDescription>
              </DialogHeader>
              <Share item={sharing} projects={projects} onChanged={onChanged} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
