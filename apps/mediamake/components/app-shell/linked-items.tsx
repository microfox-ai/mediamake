'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2Icon, UsersIcon, XIcon } from 'lucide-react';
import type { GithubLinkSync } from '@/lib/space/github';
import { linkedSummary, type LinkedItemView } from '@/lib/space/links';

/**
 * Linked items (lib/space/links): a skill, MCP or app that stays its
 * owner's and is shared with projects and people. One row each: what it
 * is, and in one line whose it is and who has it. Its owner opens Share to
 * tick projects, add people and say who can edit. Used by Mine and by a
 * space's page.
 */

const KIND: Record<LinkedItemView['kind'], string> = { skill: 'Skill', mcp: 'MCP', app: 'App' };
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
  if (item.role === 'owner') return `Yours · shared with ${linkedSummary(item)}`;
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
    <select className="h-7 rounded-md border bg-background px-1.5 text-xs" value={editor ? 'edit' : 'use'} disabled={busy} onChange={event => onChange(event.target.value === 'edit')} aria-label={label}>
      <option value="use">Can use</option>
      <option value="edit">Can edit</option>
    </select>
  );

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
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
          <input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Add someone by email" aria-label="Email of the person to share with" className="h-7 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs" />
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

export function LinkedItems({
  items,
  projects = [],
  unlinkFrom,
}: {
  items: LinkedItemView[];
  /** The projects the viewer owns or edits: where they may share their own items. */
  projects?: { id: string; name: string }[];
  /** On a project's page, for its owner: the project an item of someone else can be removed from. */
  unlinkFrom?: { id: string; name: string };
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState(items);
  const [open, setOpen] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => setRows(items), [items]);

  const onChanged = (answer: Answer) => {
    const fresh = new Map(answer.linked.map(view => [view.id, view]));
    setRows(current => current.map(row => fresh.get(row.id) ?? row));
    router.refresh();
  };

  return (
    <ul className="divide-y">
      {rows.map(item => (
        <li key={item.id} className="py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{item.title}</span>
            <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{KIND[item.kind]}</span>
            {item.version && <span className="text-xs tabular-nums text-muted-foreground">v{item.version.replace(/^v/, '')}</span>}
            <span className="ml-auto">
              {item.role === 'owner' ? (
                <button type="button" className={button} onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id}>
                  <UsersIcon className="size-3" aria-hidden /> {open === item.id ? 'Done' : 'Share'}
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
              ) : null}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{whoLine(item)}</p>
          {item.summary && <p className="mt-0.5 line-clamp-1 max-w-prose text-xs text-muted-foreground">{item.summary}</p>}
          {open === item.id && item.role === 'owner' && <Share item={item} projects={projects} onChanged={onChanged} />}
        </li>
      ))}
      {error && (
        <li className="py-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </li>
      )}
    </ul>
  );
}
