'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangleIcon, ArrowUpRightIcon, CheckIcon, CopyIcon, LockIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppItem } from '@/lib/app-shell/member';
import { tierLabel } from '@/lib/memberships/tiers';

/**
 * The small parts Home, Explore and Mine share: an item's badges (Beta, its
 * membership, Failed with the reason) and its three actions (open, copy
 * install prompt, update).
 */

const chip = 'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium';

export function BetaBadge() {
  return (
    <span className={cn(chip, 'bg-amber-500/10 text-amber-700 dark:text-amber-300')} title="Beta: published, not yet proven by a finished production made with it">
      Beta
    </span>
  );
}

/** The membership that opens an item. Public says nothing unless `always`. */
export function TierBadge({ item, always = false }: { item: Pick<AppItem, 'tier' | 'locked'>; always?: boolean }) {
  if (item.tier === 'public' && !always) return null;
  const label = tierLabel(item.tier);
  return (
    <span
      className={cn(chip, item.locked ? 'border border-dashed text-muted-foreground' : 'bg-primary/10 text-foreground')}
      title={item.locked ? `Opens with a ${label} membership` : `${label} and above: your membership opens it`}
    >
      {item.locked && <LockIcon className="size-3" aria-hidden />}
      {label}
    </span>
  );
}

/** Failed, and why: on a card in Explore's failed filter and on an installed item in Mine. */
export function FailedNote({ item, installed = false, className }: { item: Pick<AppItem, 'healthNote'>; installed?: boolean; className?: string }) {
  return (
    <p className={cn('flex items-start gap-1.5 rounded-md bg-red-500/10 px-2 py-1.5 text-xs text-red-700 dark:text-red-300', className)}>
      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">{installed ? 'Failed: it is broken right now.' : "Failed: don't install it until it is fixed."}</span>{' '}
        {item.healthNote ?? 'No reason was given.'}
      </span>
    </p>
  );
}

/** Tells MediaMake an app was opened from the app, for Home's Apps column: its id and nothing else. */
export function recordAppOpen(item: Pick<AppItem, 'id' | 'kind' | 'locked'>) {
  if (item.kind !== 'app' || item.locked) return;
  fetch('/api/usage/app-opens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app: item.id }),
    keepalive: true,
  }).catch(() => undefined);
}

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  return [copied, (what: string) => (setCopied(what), setTimeout(() => setCopied(null), 1500))] as const;
}

/**
 * Open, copy install prompt and update, for one item. `labels` writes the
 * words beside the icons (cards); without it they are icon buttons (rows).
 * A locked item has none of them: its card says which membership opens it.
 */
export function ItemActions({
  item,
  updateAvailable = false,
  labels = false,
  className,
}: {
  item: AppItem;
  updateAvailable?: boolean;
  labels?: boolean;
  className?: string;
}) {
  const [copied, flash] = useCopied();
  if (item.locked) return null;
  const size = labels ? 'sm' : 'icon';
  const button = labels ? 'h-8' : 'size-8';
  const updatePrompt = item.updatePrompt;
  const isApp = item.kind === 'app' && item.open !== item.page;

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <Button asChild variant={labels ? 'secondary' : 'ghost'} size={size} className={button} title={isApp ? `Open ${item.title}` : `Open ${item.title}'s page`}>
        <Link href={item.open} onClick={() => recordAppOpen(item)}>
          <ArrowUpRightIcon />
          {labels ? 'Open' : <span className="sr-only">Open</span>}
        </Link>
      </Button>
      {item.installPrompt && (
        <Button
          variant={labels ? 'outline' : 'ghost'}
          size={size}
          className={button}
          title={`Copy the install prompt, then paste it into Claude: ${item.installPrompt}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(item.installPrompt!);
            } catch {
              window.prompt('Copy this install prompt and paste it into Claude:', item.installPrompt);
              return;
            }
            flash('install');
          }}
        >
          {copied === 'install' ? <CheckIcon /> : <CopyIcon />}
          {labels ? (copied === 'install' ? 'Copied' : 'Install prompt') : <span className="sr-only">Copy install prompt</span>}
        </Button>
      )}
      {updatePrompt && (
        <Button
          variant={updateAvailable ? 'default' : labels ? 'outline' : 'ghost'}
          size={size}
          className={button}
          title={`${updateAvailable ? 'A newer version is out. ' : ''}Copy the update prompt, then paste it into Claude: ${updatePrompt}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(updatePrompt);
            } catch {
              window.prompt('Copy this update prompt and paste it into Claude:', updatePrompt);
              return;
            }
            flash('update');
          }}
        >
          {copied === 'update' ? <CheckIcon /> : <RefreshCwIcon />}
          {labels ? (copied === 'update' ? 'Copied' : 'Update') : <span className="sr-only">Copy update prompt</span>}
        </Button>
      )}
    </div>
  );
}

/** The rule MediaMake is run by, in one line (the top of Explore, the foot of the app's pages). */
export function RuleLine({ rule, className }: { rule: string; className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      <span className="font-medium text-foreground">{rule}</span> Every skill, MCP and app here is used by its maker for real work before it is marked
      Ready.
    </p>
  );
}
