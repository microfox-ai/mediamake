'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, CopyIcon, Loader2Icon, SendIcon, UserPlusIcon, UsersIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * What an author does with a store item of theirs on My store items, beside Edit card
 * (components/catalog/item-card-editor): see and change its authors, and send a new version.
 */

type Author = { name: string; github?: string; addedAt: string; you?: true };

/** The item's authors, with a way to add one by their MediaMake account's email and to remove one. */
export function AuthorsButton({ itemId, title }: { itemId: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Authors of {title}</DialogTitle>
          <DialogDescription>The people who look after it, like the collaborators on a repo. Every author can send a new version, edit its card and change this list.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {authors === null && !error && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" aria-hidden /> Reading the authors
            </p>
          )}
          {authors && (
            <ul className="flex flex-col divide-y rounded-lg border">
              {authors.map(author => {
                const key = author.github ?? author.name;
                const sure = confirming === key;
                return (
                  <li key={`${key}-${author.addedAt}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{author.name}</span>
                      {author.you && <span className="text-muted-foreground"> · you</span>}
                    </span>
                    {authors.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={sure ? 'h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive' : 'h-7 shrink-0 px-2 text-xs text-muted-foreground'}
                        disabled={busy}
                        onClick={() => (sure ? change({ remove: key }) : setConfirming(key))}
                        onBlur={() => sure && setConfirming('')}
                        aria-label={sure ? `Yes, remove ${author.name}` : `Remove ${author.name}`}
                      >
                        <XIcon /> {sure ? (author.you ? 'Yes, remove me' : 'Yes, remove') : 'Remove'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {authors && authors.length === 1 && <p className="text-xs text-muted-foreground">An item always keeps one author: add another before removing this one.</p>}
          {authors && (
            <form
              className="flex flex-col gap-1.5"
              onSubmit={event => {
                event.preventDefault();
                if (address) change({ add: address });
              }}
            >
              <Label htmlFor="author-email">Add an author</Label>
              <div className="flex gap-2">
                <Input id="author-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="their MediaMake account's email" autoComplete="off" className="min-w-0" />
                <Button type="submit" variant="outline" disabled={busy || !address} className="shrink-0">
                  {busy ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />} Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">They need to have signed in to MediaMake once with that email. Pages name authors by GitHub login or display name, never an email.</p>
            </form>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {done && !error && (
            <p role="status" className="text-sm text-muted-foreground">
              {done}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** How to send a new version: the line to run where the item's files are, and what happens to it. */
export function UpdateButton({ name, kind, title, direct }: { name: string; kind: string; title: string; direct: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const command = `mm submit ${name} --yes${kind === 'skill' ? '' : ` --kind=${kind}`}`;
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
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
        <SendIcon /> Send an update
      </Button>
      {open && (
        <Dialog open onOpenChange={next => !next && setOpen(false)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Send an update of {title}</DialogTitle>
              <DialogDescription>A new version goes from the computer that has its files. Nothing is uploaded from this page.</DialogDescription>
            </DialogHeader>
            <ol className="flex min-w-0 list-decimal flex-col gap-3 pl-5 text-sm [&>li]:min-w-0">
              <li>
                Raise its version: <code className="rounded bg-muted px-1 py-0.5 text-xs">{kind === 'skill' ? 'metadata.version in its SKILL.md' : 'version in its item.json'}</code>.
              </li>
              <li>
                Run this in a terminal, or paste it into Claude:
                <span className="mt-1.5 flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md border bg-muted/50 px-2.5 py-1.5 font-mono text-xs">{command}</code>
                  <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={copy}>
                    {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy'}
                  </Button>
                </span>
              </li>
              <li>{direct ? 'It is published at once, at the membership the item has.' : 'An admin reviews it, then it is published at the membership the item has. Where it stands shows here and on Subscription.'}</li>
            </ol>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
