'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Power,
} from 'lucide-react';
import type { ApiKeyInfo } from '@/app/types/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const TOAST_MS = 3000;

interface KeysResponse {
  clientId: string;
  isAdmin: boolean;
  keys: ApiKeyInfo[];
}

type Confirm = { kind: 'rotate' | 'delete'; key: ApiKeyInfo } | null;

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json as T;
}

function mask(key: string) {
  return `${'•'.repeat(12)}${key.slice(-4)}`;
}

export function ApiKeysManager() {
  const [data, setData] = useState<KeysResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [fresh, setFresh] = useState<ApiKeyInfo | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await call<KeysResponse>('GET', '/api/apikeys'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const keys = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || !q) return data?.keys ?? [];
    return data.keys.filter(
      k => k.clientName?.toLowerCase().includes(q) || k.clientId.toLowerCase().includes(q),
    );
  }, [data, query]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      toast.success(label, { duration: TOAST_MS });
      await load();
    } catch (e) {
      toast.error((e as Error).message, { duration: TOAST_MS * 2 });
    }
  };

  const setValid = (key: ApiKeyInfo, isValid: boolean) =>
    run(isValid ? 'Key enabled' : 'Key disabled', () =>
      call('PATCH', '/api/apikeys', { apiKey: key.apiKey, isValid }),
    );

  const onConfirm = async () => {
    if (!confirm) return;
    const { kind, key } = confirm;
    setConfirm(null);
    if (kind === 'delete') {
      await run('Key deleted', () => call('DELETE', '/api/apikeys', { apiKey: key.apiKey }));
    } else {
      await run('Key rotated', async () => {
        const rotated = await call<ApiKeyInfo>('POST', '/api/admin/apikeys/rotate', { apiKey: key.apiKey });
        setFresh(rotated);
      });
    }
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p className="font-medium">Couldn&apos;t load API keys</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const admin = data?.isAdmin ?? false;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">API keys</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {admin
              ? 'Every key on this MediaMake. A key is also its client’s sign-in password, so share it only with that person.'
              : 'Sign in, and connect tools to MediaMake, with any of your keys. Make one per app or computer, and disable it when you stop using it. Keep them private.'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New key
        </Button>
      </div>

      {admin && (data?.keys.length ?? 0) > 5 && (
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or client id"
            className="pl-9"
          />
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        {!data ? (
          <div className="divide-y">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-48" />
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <KeyRound className="size-8 text-muted-foreground" />
            <p className="font-medium">{query ? 'No keys match' : 'No API keys yet'}</p>
            {!query && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Create the first key
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {keys.map(key => (
              <KeyRow
                key={key.apiKey}
                apiKey={key}
                mine={key.clientId === data.clientId}
                admin={admin}
                onRotate={() => setConfirm({ kind: 'rotate', key })}
                onDelete={() => setConfirm({ kind: 'delete', key })}
                onToggle={() => setValid(key, !key.isValid)}
              />
            ))}
          </ul>
        )}
      </div>

      <CreateKeyDialog
        admin={admin}
        open={creating}
        onOpenChange={setCreating}
        onCreated={async key => {
          setCreating(false);
          setFresh(key);
          await load();
        }}
      />

      <NewKeyDialog apiKey={fresh} mine={fresh?.clientId === data?.clientId} onClose={() => setFresh(null)} />

      <AlertDialog open={!!confirm} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'delete' ? 'Delete this key?' : 'Rotate this key?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'delete'
                ? `${confirm.key.clientName || confirm.key.clientId} can no longer sign in or use tools with this key. This can't be undone.`
                : `${confirm?.key.clientName || confirm?.key.clientId} gets a new key and the current one stops working right away, including for signing in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className={cn(confirm?.kind === 'delete' && 'bg-destructive text-white hover:bg-destructive/90')}
            >
              {confirm?.kind === 'delete' ? 'Delete' : 'Rotate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KeyRow({
  apiKey: key,
  mine,
  admin,
  onRotate,
  onDelete,
  onToggle,
}: {
  apiKey: ApiKeyInfo;
  mine: boolean;
  admin: boolean;
  onRotate: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [shown, setShown] = useState(false);
  const initial = (key.clientName || key.clientId).charAt(0).toUpperCase();

  return (
    <li className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4', !key.isValid && 'opacity-60')}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{key.clientName || key.clientId}</p>
            {mine && <Badge variant="secondary">You</Badge>}
            {!key.isValid && <Badge variant="outline">Disabled</Badge>}
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{key.clientId}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <code className="rounded-md border bg-muted/50 px-2.5 py-1.5 font-mono text-xs tabular-nums">
          {shown ? key.apiKey : mask(key.apiKey)}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setShown(s => !s)}
          aria-label={shown ? 'Hide key' : 'Show key'}
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <CopyButton value={key.apiKey} />

        {(admin || mine) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {admin && (
                <DropdownMenuItem onClick={onRotate}>
                  <RefreshCw className="size-4" />
                  Rotate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onToggle}>
                <Power className="size-4" />
                {key.isValid ? 'Disable' : 'Enable'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={label ? 'secondary' : 'ghost'}
      size={label ? 'sm' : 'icon'}
      className={label ? undefined : 'size-8'}
      aria-label="Copy key"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label && (copied ? 'Copied' : label)}
    </Button>
  );
}

function CreateKeyDialog({
  admin,
  open,
  onOpenChange,
  onCreated,
}: {
  admin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: ApiKeyInfo) => void;
}) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setClientId('');
      setError(null);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { key } = await call<{ key: ApiKeyInfo }>('POST', '/api/apikeys', { clientName: name, clientId });
      onCreated(key);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
            <DialogDescription>
              {admin
                ? 'For a new person or app, or a second key for an existing client.'
                : 'Another key for your account, e.g. for one app or computer. It works like your other keys.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={admin ? 'e.g. Priya, or Render worker' : 'e.g. Laptop scripts'}
            />
          </div>
          {admin && (
            <div className="space-y-2">
              <Label htmlFor="key-client">
                Client id <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="key-client"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="Made from the name if empty"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use an existing client id to give that client another key. They sign in with the client id and the key.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? 'Creating…' : 'Create key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewKeyDialog({
  apiKey,
  mine,
  onClose,
}: {
  apiKey: ApiKeyInfo | null;
  mine: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!apiKey} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Key ready</DialogTitle>
          <DialogDescription>
            {mine
              ? 'Use it wherever a MediaMake API key is asked for. It also signs you in, with your client id.'
              : `Send these to ${apiKey?.clientName || 'them'} privately. They sign in with both.`}
          </DialogDescription>
        </DialogHeader>
        {apiKey && (
          <div className="space-y-3">
            <Field label="Client id" value={apiKey.clientId} />
            <Field label="API key" value={apiKey.apiKey} />
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">{value}</code>
        <CopyButton value={value} label="Copy" />
      </div>
    </div>
  );
}
