'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, CopyIcon, Loader2Icon, PlusIcon, SendIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * What an author does on My store items beside Edit card (components/catalog/item-card-editor):
 * see and change an item's authors, send a new version, and read how a new item gets into the store.
 */

type Author = { name: string; github?: string; addedAt: string; you?: true };

/** A person as a small disc with their first letter: an author in a list or on an item. */
export function Initial({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn('flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-foreground', className)}>
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

/** A line to run, with a button that copies it. */
function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      window.prompt('Copy this:', command);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <span className="flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-muted/50">
      <code className="min-w-0 flex-1 break-all px-3 py-2 font-mono text-xs leading-relaxed">{command}</code>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 border-l bg-background px-3 text-xs font-medium transition-colors hover:bg-muted active:bg-muted/70"
        aria-label={copied ? 'Copied' : 'Copy the line'}
      >
        {copied ? <CheckIcon className="size-3.5 text-emerald-600" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}

/** Numbered steps, each a short title over what to do. */
function Steps({ steps, className }: { steps: { title: string; body: React.ReactNode }[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col gap-4', className)}>
      {steps.map((step, i) => (
        <li key={step.title} className="flex min-w-0 gap-3">
          <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold tabular-nums text-background">
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
            <p className="font-medium leading-6">{step.title}</p>
            <div className="flex min-w-0 flex-col gap-2 text-muted-foreground">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- authors ---------- */

/** The item's authors, with a way to add one by their MediaMake account's email and to remove one. */
export function AuthorsButton({ itemId, title }: { itemId: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        <UsersIcon /> Authors
      </Button>
      {open && <AuthorsDialog itemId={itemId} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

function AuthorsDialog({ itemId, title, onClose }: { itemId: string; title: string; onClose: () => void }) {
  const router = useRouter();
  const [authors, setAuthors] = React.useState<Author[] | null>(null);
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  // said in the dialog itself: a toast can sit behind it
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState('');
  // removing takes a second click: an author who removes themself needs another author to come back
  const [confirming, setConfirming] = React.useState('');

  React.useEffect(() => {
    let gone = false;
    fetch(`/api/submissions/authors?id=${encodeURIComponent(itemId)}`)
      .then(async res => ({ ok: res.ok, answer: await res.json().catch(() => ({})) }))
      .then(({ ok, answer }) => {
        if (gone) return;
        if (ok) setAuthors(answer.authors ?? []);
        else setError(answer.error ?? 'Could not read the authors');
      })
      .catch(() => !gone && setError('Could not read the authors'));
    return () => {
      gone = true;
    };
  }, [itemId]);

  async function change(body: { add?: string; remove?: string }) {
    if (busy) return;
    setBusy(true);
    setError('');
    setDone('');
    setConfirming('');
    try {
      const res = await fetch('/api/submissions/authors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: itemId, ...body }) });
      const answer = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(answer.error ?? 'Could not change the authors');
      setAuthors(answer.authors ?? []);
      setDone(answer.changed ? `Done: ${answer.changed}.` : 'Done.');
      if (body.add) setEmail('');
      router.refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const address = email.trim();
  return (
    <Dialog open onOpenChange={next => !next && !busy && onClose()}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Authors of {title}</DialogTitle>
          <DialogDescription>Every author can edit its card, send a new version and change this list.</DialogDescription>
        </DialogHeader>

        {authors === null && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" aria-hidden /> Reading the authors
          </p>
        )}

        {authors && (
          <ul className="flex flex-col">
            {authors.map(author => {
              const key = author.github ?? author.name;
              const sure = confirming === key;
              return (
                <li key={`${key}-${author.addedAt}`} className="flex items-center gap-3 border-b py-2.5 text-sm first:pt-0 last:border-b-0 last:pb-0">
                  <Initial name={author.name} className="size-8 text-xs" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{author.name}</span>
                      {author.you && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">You</span>}
                    </span>
                    {author.github && <span className="truncate text-xs text-muted-foreground">github.com/{author.github}</span>}
                  </span>
                  {authors.length > 1 && (
                    <Button
                      type="button"
                      variant={sure ? 'destructive' : 'ghost'}
                      size="sm"
                      className={cn('h-8 shrink-0 text-xs', !sure && 'text-muted-foreground')}
                      disabled={busy}
                      onClick={() => (sure ? change({ remove: key }) : setConfirming(key))}
                      onBlur={() => sure && setConfirming('')}
                      aria-label={sure ? `Yes, remove ${author.name}` : `Remove ${author.name}`}
                    >
                      {sure ? (author.you ? 'Yes, remove me' : 'Yes, remove') : 'Remove'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {authors && (
          <form
            className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3.5"
            onSubmit={event => {
              event.preventDefault();
              if (address) change({ add: address });
            }}
          >
            <Label htmlFor="author-email">Add an author</Label>
            <div className="flex gap-2">
              <Input id="author-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="off" className="min-w-0 bg-background" />
              <Button type="submit" disabled={busy || !address} className="shrink-0">
                {busy ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />} Add
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The email of their MediaMake account. Pages name an author by GitHub login or display name, never by email.
              {authors.length === 1 && ' An item always keeps one author: add another before removing this one.'}
            </p>
          </form>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {done && !error && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-emerald-600" aria-hidden /> {done}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- a new version ---------- */

/** How to send a new version: the line to run where the item's files are, and what happens to it. */
export function UpdateButton({ name, kind, title, direct }: { name: string; kind: string; title: string; direct: boolean }) {
  const [open, setOpen] = React.useState(false);
  const command = `mm submit ${name} --yes${kind === 'skill' ? '' : ` --kind=${kind}`}`;
  return (
    <>
      <Button variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        <SendIcon /> Send an update
      </Button>
      {open && (
        <Dialog open onOpenChange={next => !next && setOpen(false)}>
          <DialogContent className="gap-5 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Send an update of {title}</DialogTitle>
              <DialogDescription>A new version goes from the computer that has its files. Nothing is uploaded from this page.</DialogDescription>
            </DialogHeader>
            <Steps
              steps={[
                {
                  title: 'Raise its version',
                  body: (
                    <p>
                      {kind === 'skill' ? (
                        <>
                          <code className="font-mono text-xs text-foreground">metadata.version</code> in its SKILL.md.
                        </>
                      ) : (
                        <>
                          <code className="font-mono text-xs text-foreground">version</code> in its item.json.
                        </>
                      )}
                    </p>
                  ),
                },
                { title: 'Run this in a terminal, or paste it into Claude', body: <CommandLine command={command} /> },
                {
                  title: direct ? 'It is published at once' : 'An admin reviews it',
                  body: <p>{direct ? 'At the membership the item has now.' : 'Then it is published at the membership the item has now. Where it stands shows on this page.'}</p>,
                },
              ]}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* ---------- a new item ---------- */

/** How a skill, MCP or app someone built gets into the store: on an empty page, and behind Publish an item. */
export function PublishSteps({ months, className }: { months: number; className?: string }) {
  return (
    <Steps
      className={className}
      steps={[
        { title: 'Use it for real work', body: <p>We publish nothing we don&rsquo;t use. Have one finished production made with it to name.</p> },
        {
          title: 'Send it from the computer that has it',
          body: (
            <>
              <p>Ask Claude to &ldquo;make this public&rdquo;, or run this where its files are:</p>
              <CommandLine command="mm submit <name>" />
            </>
          ),
        },
        { title: 'An admin reviews it', body: <p>They pick who it opens for. Once accepted it shows here with you as its author, and earns you a membership for {months} months.</p> },
      ]}
    />
  );
}

export function PublishButton({ months }: { months: number }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        <PlusIcon /> Publish an item
      </Button>
      {open && (
        <Dialog open onOpenChange={next => !next && setOpen(false)}>
          <DialogContent className="gap-5 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Publish an item</DialogTitle>
              <DialogDescription>A skill, MCP or app you built goes to the store in three steps.</DialogDescription>
            </DialogHeader>
            <PublishSteps months={months} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
