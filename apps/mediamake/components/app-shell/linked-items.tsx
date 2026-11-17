'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Link2Icon, Loader2Icon, PencilIcon, XIcon } from 'lucide-react';
import type { GithubLinkSync } from '@/lib/space/github';
import { linkedSummary, type LinkedItemView } from '@/lib/space/links';
import { NextStep, SyncPill } from './space-items';

/**
 * Linked items (lib/space/links): a skill, MCP or app that stays its
 * owner's and is used by the people of every project it is linked to, and
 * by the members its owner named. Each row says whose it is, who has it
 * and where it stands on the computers that have it. Its owner manages it
 * here: which projects it is linked to, who else has it, and who may
 * change it. Used by Mine and by a space's page.
 */

const KIND: Record<LinkedItemView['kind'], string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };
const cmd = 'rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground';
const chip = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]';
const button = 'inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50';

type Sync = GithubLinkSync & { noGithub?: string[] };
interface Answer {
  linked: LinkedItemView[];
  item: LinkedItemView | null;
  github?: Sync;
  mailed?: boolean;
}

async function change(body: Record<string, unknown>): Promise<Answer> {
  const res = await fetch('/api/space/links', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `It failed (${res.status})`);
  return json as Answer;
}

/** How a change went on the item's repo, in one line. */
function githubLine(github: Sync | undefined): string | null {
  if (!github) return null;
  const without = github.noGithub?.length ? ` ${github.noGithub.join(', ')} ${github.noGithub.length === 1 ? 'has' : 'have'} no GitHub account linked yet (Account), so can't get it until then.` : '';
  if (github.state === 'done') {
    const parts = [github.invited.length && `invited ${github.invited.join(', ')}`, github.removed.length && `removed ${github.removed.join(', ')}`, github.failed.length && `GitHub refused ${github.failed.join(', ')}`].filter(Boolean);
    return `${parts.length ? `On GitHub: ${parts.join('; ')}.` : 'Its repo on GitHub already matches.'}${without}`;
  }
  if (github.state === 'failed') return `${github.reason}${without}`;
  return `Saved. The people on its repo follow the next time your computer runs mm space sync${github.state === 'other-owner' ? ' (the repo is under another GitHub account than the one you connected)' : ''}.${without}`;
}

/** Whose it is and how it reached the viewer. */
function fromLine(item: LinkedItemView): string {
  if (item.role === 'owner') return `Yours · linked to ${linkedSummary(item)}`;
  const through = [item.projects.length && `through ${item.projects.map(project => project.name).join(', ')}`, item.direct && 'shared with you'].filter(Boolean).join(' and ');
  return `From ${item.owner}${through ? `, ${through}` : ''} · ${item.role === 'editor' ? 'you can change it' : 'you can use it'}`;
}

function Manage({ item, projects, onChanged }: { item: LinkedItemView; projects: { id: string; name: string }[]; onChanged: (answer: Answer) => void }) {
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [editor, setEditor] = React.useState(false);

  const run = async (body: Record<string, unknown>, said: string) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const answer = await change({ item: item.id, ...body });
      setNote([said, githubLine(answer.github)].filter(Boolean).join(' '));
      onChanged(answer);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'It failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const linked = new Set(item.projects.map(project => project.id));
  // the projects the owner may link to, and any it is linked to that they no longer can
  const options = [...projects, ...item.projects.filter(project => !projects.some(option => option.id === project.id))];

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs">
      <p className="font-medium">Linked projects</p>
      <p className="mt-0.5 text-muted-foreground">Everyone on a linked project can use it. Unlinking takes it away from that project&apos;s people only.</p>
      {options.length ? (
        <ul className="mt-2 flex flex-col gap-1">
          {options.map(project => (
            <li key={project.id}>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-3.5"
                  checked={linked.has(project.id)}
                  disabled={busy}
                  onChange={event => run({ action: event.target.checked ? 'link' : 'unlink', project: project.id }, event.target.checked ? `Linked to ${project.name}.` : `Unlinked from ${project.name}.`)}
                />
                {project.name}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">You own or edit no project yet. Make one on the Spaces page, then link this to it.</p>
      )}

      <p className="mt-3 font-medium">People outside those projects</p>
      <p className="mt-0.5 text-muted-foreground">Only you can change it, and the people you tick as editors.</p>
      <ul className="mt-2 flex flex-col gap-1">
        {(item.people ?? []).map(person => (
          <li key={person.clientId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 truncate">
              {person.name}
              {person.email && <span className="text-muted-foreground"> · {person.email}</span>}
            </span>
            <label className="inline-flex items-center gap-1.5 text-muted-foreground">
              <input type="checkbox" className="size-3.5" checked={person.editor} disabled={busy} onChange={event => run({ action: 'add', clientId: person.clientId, editor: event.target.checked }, event.target.checked ? `${person.name} can change it now.` : `${person.name} can only use it now.`)} />
              Can change it
            </label>
            <button type="button" className={button} disabled={busy} onClick={() => run({ action: 'remove', clientId: person.clientId }, `No longer shared with ${person.name}.`)} aria-label={`Stop sharing with ${person.name}`}>
              <XIcon className="size-3" aria-hidden /> Remove
            </button>
          </li>
        ))}
        {(item.invites ?? []).map(invite => (
          <li key={invite.email} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 truncate">
              {invite.email} <span className="text-muted-foreground">· invited, no account yet{invite.editor ? ' · will be an editor' : ''}</span>
            </span>
            <button type="button" className={button} disabled={busy} onClick={() => run({ action: 'remove', email: invite.email }, `The invite for ${invite.email} is withdrawn.`)} aria-label={`Withdraw the invite for ${invite.email}`}>
              <XIcon className="size-3" aria-hidden /> Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={async event => {
          event.preventDefault();
          const address = email.trim();
          if (!address) return;
          if (await run({ action: 'add', email: address, editor }, `Shared with ${address}.`)) {
            setEmail('');
            setEditor(false);
          }
        }}
      >
        <input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Their MediaMake email" aria-label="Email of the member to share with" className="h-7 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs sm:max-w-64" />
        <label className="inline-flex items-center gap-1.5 text-muted-foreground">
          <input type="checkbox" className="size-3.5" checked={editor} onChange={event => setEditor(event.target.checked)} />
          Can change it
        </label>
        <button type="submit" className={button} disabled={busy}>
          {busy ? <Loader2Icon className="size-3 animate-spin" aria-hidden /> : null} Share
        </button>
      </form>

      {note && (
        <p className="mt-2 text-muted-foreground" role="status">
          {note}
        </p>
      )}
      {error && (
        <p className="mt-2 text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function LinkedItems({
  items,
  projects = [],
  unlinkFrom,
}: {
  items: LinkedItemView[];
  /** The projects the viewer owns or edits: where they may link their own items. */
  projects?: { id: string; name: string }[];
  /** On a project's page, for its owner: the project an item of someone else can be unlinked from. */
  unlinkFrom?: { id: string; name: string };
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState(items);
  const [open, setOpen] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => setRows(items), [items]);

  const onChanged = (answer: Answer) => {
    const fresh = new Map(answer.linked.map(view => [view.id, view]));
    // an item that left this list (unlinked from this project) stays until the page reloads, so its note can be read
    setRows(current => current.map(row => fresh.get(row.id) ?? row));
    router.refresh();
  };

  return (
    <ul className="divide-y">
      {rows.map(item => {
        const shown = item.space?.items[0];
        return (
          <li key={item.id} className="py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium">{item.title}</span>
              <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{KIND[item.kind]}</span>
              {item.version && <span className="text-xs tabular-nums text-muted-foreground">v{item.version.replace(/^v/, '')}</span>}
              <span className={`${chip} text-muted-foreground`}>
                <Link2Icon className="size-3" aria-hidden /> Linked
              </span>
              <span className="ml-auto flex items-center gap-2">
                {shown && item.space && <SyncPill item={shown} computers={item.space.devices.length} />}
                {item.role === 'owner' && (
                  <button type="button" className={button} onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id}>
                    <PencilIcon className="size-3" aria-hidden /> {open === item.id ? 'Done' : 'Manage'}
                  </button>
                )}
                {item.role !== 'owner' && unlinkFrom && (
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
                    Unlink from {unlinkFrom.name}
                  </button>
                )}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{fromLine(item)}</p>
            {item.summary && <p className="mt-0.5 line-clamp-2 max-w-prose text-xs text-muted-foreground">{item.summary}</p>}
            {shown ? (
              <NextStep item={shown} />
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                No computer has it yet. <span className={cmd}>mm space sync</span> gets it.
              </p>
            )}
            {open === item.id && item.role === 'owner' && <Manage item={item} projects={projects} onChanged={onChanged} />}
          </li>
        );
      })}
      {error && (
        <li className="py-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </li>
      )}
    </ul>
  );
}
