'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2Icon, LockIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nameMatches, type DeletedSpace } from '@/lib/projects/delete';

/**
 * The Settings tab of a space's page (project-detail.tsx), for its owner: its name, and the danger
 * zone where it is deleted (lib/projects/delete) after its name is typed. A personal space has
 * nothing to change: it is only its owner's and is never renamed or deleted.
 */

async function send<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch('/api/project', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'It failed');
  return json as T;
}

const card = 'max-w-2xl rounded-xl border bg-card p-4';

export function SettingsTab({
  projectId,
  name,
  personal = false,
  repo,
  people = 1,
  onRenamed,
}: {
  projectId: string;
  name: string;
  personal?: boolean;
  /** The space's repo on GitHub (`owner/name`), when it has one. */ repo?: string;
  /** How many people are on it, the owner included. */ people?: number;
  onRenamed: (name: string) => void;
}) {
  const [deleting, setDeleting] = React.useState(false);

  if (personal) {
    return (
      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <LockIcon className="size-3.5" aria-hidden /> Your personal space
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">It is only yours, so it can&apos;t be renamed, shared or deleted. Make a project space for work with other people.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Rename projectId={projectId} name={name} onRenamed={onRenamed} />

      <section className={`${card} border-destructive/40`}>
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm font-medium">Delete this space</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Everything it keeps is deleted for everyone on it. This can&apos;t be undone.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleting(true)}>
            <Trash2Icon /> Delete this space
          </Button>
        </div>
      </section>

      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} projectId={projectId} name={name} repo={repo} people={people} />
    </div>
  );
}

function Rename({ projectId, name, onRenamed }: { projectId: string; name: string; onRenamed: (name: string) => void }) {
  const [value, setValue] = React.useState(name);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setValue(name), [name]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await send('PUT', { id: projectId, displayName: value });
      onRenamed(value.trim());
      toast.success(`Renamed to ${value.trim()}.`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={card}>
      <h2 className="text-sm font-semibold">General</h2>
      <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-64 space-y-1.5">
          <Label htmlFor="space-name">Name</Label>
          <Input id="space-name" value={value} onChange={e => setValue(e.target.value)} maxLength={80} />
        </div>
        <Button type="submit" variant="outline" disabled={busy || !value.trim() || value.trim() === name}>
          {busy && <Loader2Icon className="animate-spin" />} Rename
        </Button>
      </form>
    </section>
  );
}

function DeleteDialog({ open, onClose, projectId, name, repo, people }: { open: boolean; onClose: () => void; projectId: string; name: string; repo?: string; people: number }) {
  const router = useRouter();
  const [typed, setTyped] = React.useState('');
  const [alsoRepo, setAlsoRepo] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /** The GitHub account the owner connected, when there is one. */
  const [login, setLogin] = React.useState<string | null | undefined>(undefined);

  React.useEffect(() => {
    if (!open) return;
    setTyped('');
    setAlsoRepo(false);
    setError(null);
    if (!repo) return;
    fetch('/api/space/github')
      .then(res => res.json())
      .then(json => setLogin(json.connected && typeof json.login === 'string' ? json.login : null))
      .catch(() => setLogin(null));
  }, [open, repo]);

  // MediaMake can delete only a repo under the GitHub account the owner connected
  const canDeleteRepo = !!repo && !!login && repo.split('/')[0].toLowerCase() === login.toLowerCase();
  const others = people - 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await send<DeletedSpace>('DELETE', { id: projectId, name: typed, repo: alsoRepo && canDeleteRepo ? 'delete' : 'keep' });
      toast.success(result.repo.state === 'deleted' ? `Deleted ${result.name} and ${result.repo.repo}.` : result.repo.state === 'kept' ? `Deleted ${result.name}. ${result.repo.repo} is still on GitHub.` : `Deleted ${result.name}.`);
      router.push('/app/spaces');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              Its brand kit, productions, releases, media, runs and to-dos are deleted for good
              {others > 0 ? `, and the ${others === 1 ? 'other person' : `${others} other people`} on it lose${others === 1 ? 's' : ''} access` : ''}. Skills linked to it stay with their owners.
            </DialogDescription>
          </DialogHeader>

          {repo && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              {canDeleteRepo ? (
                <label className="flex items-start gap-2.5">
                  <Checkbox checked={alsoRepo} onCheckedChange={checked => setAlsoRepo(checked === true)} className="mt-0.5" />
                  <span>
                    Also delete the repo <span className="font-mono text-xs font-medium">{repo}</span> on GitHub
                    <span className="mt-0.5 block text-xs text-muted-foreground">It holds the code of this space&apos;s skills. Left unticked, it stays on GitHub as it is.</span>
                  </span>
                </label>
              ) : (
                <p>
                  The repo <span className="font-mono text-xs font-medium">{repo}</span> stays on GitHub.
                  <span className="mt-0.5 block text-xs text-muted-foreground">{login === undefined ? 'Checking GitHub…' : 'It holds the code of this space’s skills. Its owner can delete it on GitHub.'}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="delete-space-name" className="font-normal">
              Type <span className="font-semibold">{name}</span> to confirm
            </Label>
            <Input id="delete-space-name" autoFocus autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !nameMatches(typed, name)}>
              {busy && <Loader2Icon className="animate-spin" />} Delete this space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
