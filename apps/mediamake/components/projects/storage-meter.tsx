'use client';

import * as React from 'react';
import Link from 'next/link';
import { HardDriveIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GB, formatBytes, type StorageState } from '@/lib/projects/storage';
import { tierLabel, type MemberTier } from '@/lib/memberships/tiers';
import { cn } from '@/lib/utils';

/** What GET /api/project/storage answers. */
export type MemberStorageState = StorageState & { tier: MemberTier; raised?: boolean; byProject?: Record<string, number> };

/** The member's cloud storage: what the projects they own hold, of their cap. */
export function StorageMeter({ storage, className }: { storage: MemberStorageState | null; className?: string }) {
  if (!storage) return <div className={cn('h-[74px] animate-pulse rounded-xl border bg-muted/30', className)} />;
  const { used, cap, percent, near, full } = storage;
  return (
    <div className={cn('rounded-xl border bg-card p-4', full ? 'border-red-500/50' : near && 'border-amber-500/50', className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <HardDriveIcon className="size-4 text-muted-foreground" aria-hidden /> Cloud storage
        </p>
        <p className="text-sm tabular-nums">
          {formatBytes(used)} <span className="text-muted-foreground">{cap === null ? 'used, no cap' : `of ${formatBytes(cap)}`}</span>
        </p>
        <p className="ml-auto text-xs text-muted-foreground">
          {cap === null ? `${tierLabel(storage.tier)} has no cap` : storage.raised ? 'Raised for you by an admin' : `The ${tierLabel(storage.tier)} cap`}
        </p>
      </div>
      {cap !== null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Cloud storage used">
          <div className={cn('h-full rounded-full', full ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${Math.max(percent, used > 0 ? 1 : 0)}%` }} />
        </div>
      )}
      {(near || full) && (
        <p className={cn('mt-2 text-xs', full ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300')}>
          {full ? 'Your storage is full: new uploads to the projects you own are refused.' : 'Your storage is almost full.'} Delete productions, releases or media you no longer need, or ask an
          admin to raise your cap.{' '}
          <Link href="/app/subscription" className="underline underline-offset-2">
            Your membership
          </Link>
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Counts the productions (every version kept), releases, media and brand kit files of the projects you own, whoever uploaded them.</p>
    </div>
  );
}

type Looked = StorageState & { clientId: string; tier: MemberTier; raise?: { bytes: number; note?: string; by?: string; at: string } | null };

/** Admins: look up what a member stores, and raise their cap (POST /api/admin/storage-caps). */
export function StorageCapAdmin({ className }: { className?: string }) {
  const [clientId, setClientId] = React.useState('');
  const [gb, setGb] = React.useState('');
  const [note, setNote] = React.useState('');
  const [looked, setLooked] = React.useState<Looked | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const call = async (request: () => Promise<Response>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await request();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'It failed');
      setLooked(json as Looked);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'It failed');
    } finally {
      setBusy(false);
    }
  };
  const who = encodeURIComponent(clientId.trim());

  return (
    <form
      className={cn('rounded-xl border border-dashed p-4', className)}
      onSubmit={e => {
        e.preventDefault();
        void call(() => fetch('/api/admin/storage-caps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, gb: Number(gb), note }) }));
      }}
    >
      <p className="text-sm font-medium">Admin: raise a member&apos;s storage cap</p>
      <p className="mt-0.5 text-xs text-muted-foreground">A raise counts when it is more than their membership&apos;s cap, and stays when their membership changes.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Client id" aria-label="Client id" className="h-8 w-48 text-sm" required />
        <Button type="button" variant="outline" size="sm" disabled={busy || !clientId.trim()} onClick={() => void call(() => fetch(`/api/admin/storage-caps?clientId=${who}`))}>
          Look up
        </Button>
        <Input value={gb} onChange={e => setGb(e.target.value)} type="number" min="1" step="1" placeholder="New cap, GB" aria-label="New cap in GB" className="h-8 w-32 text-sm" required />
        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Why (optional)" aria-label="Why" className="h-8 min-w-40 flex-1 text-sm" />
        <Button type="submit" size="sm" disabled={busy}>
          {busy && <Loader2Icon className="animate-spin" />} Raise
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
      {looked && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs">
          <span>
            <span className="font-medium">{looked.clientId}</span> ({tierLabel(looked.tier)}) uses {formatBytes(looked.used)} of {looked.cap === null ? 'no cap' : formatBytes(looked.cap)}.
            {looked.raise ? ` Raised to ${looked.raise.bytes / GB} GB${looked.raise.by ? ` by ${looked.raise.by}` : ''}${looked.raise.note ? `: ${looked.raise.note}` : ''}.` : ' No raise.'}
          </span>
          {looked.raise && (
            <button type="button" className="cursor-pointer underline underline-offset-2" disabled={busy} onClick={() => void call(() => fetch(`/api/admin/storage-caps?clientId=${encodeURIComponent(looked.clientId)}`, { method: 'DELETE' }))}>
              Remove the raise
            </button>
          )}
        </p>
      )}
    </form>
  );
}
