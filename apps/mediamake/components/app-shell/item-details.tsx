'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon, CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { DetailsStatus, ItemDetails } from '@/lib/app-shell/details';

/**
 * Mine's details dialog: click a skill, MCP or app anywhere on the page and
 * it opens with what the item is, when it was last used, what it belongs
 * to, where it is stored, where it stands and how to publish it
 * (lib/app-shell/details). The provider holds the details by key and the
 * one dialog; DetailsButton is what opens it. Outside a provider, or for a
 * key it doesn't have, the button is plain text.
 */

const Context = React.createContext<{
  has: (key: string) => boolean;
  open: (key: string) => void;
} | null>(null);

const KIND: Record<ItemDetails['kind'], string> = {
  skill: 'Skill',
  mcp: 'MCP',
  app: 'App',
};

const TONE: Record<DetailsStatus['tone'], string> = {
  good: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  warn: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  bad: 'bg-red-500/15 text-red-700 dark:text-red-300',
  plain: 'bg-muted text-muted-foreground',
};

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function Command({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs hover:bg-muted"
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt('Copy this:', text);
        }
      }}
    >
      <span className="truncate">{text}</span>
      {copied ? (
        <CheckIcon className="size-3 shrink-0" aria-hidden />
      ) : (
        <CopyIcon className="size-3 shrink-0" aria-hidden />
      )}
      <span className="sr-only">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function Details({ item }: { item: ItemDetails }) {
  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {KIND[item.kind]}
          </span>
          {item.version && (
            <span className="text-xs tabular-nums text-muted-foreground">
              v{item.version.replace(/^v/, '')}
            </span>
          )}
        </div>
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription>{item.summary ?? item.name}</DialogDescription>
      </DialogHeader>

      <dl className="divide-y border-y">
        {item.summary && item.title !== item.name && (
          <Row label="Name">
            <span className="font-mono text-xs">{item.name}</span>
          </Row>
        )}
        <Row label="Status">
          <ul className="flex flex-col gap-1.5">
            {item.status.map(status => (
              <li
                key={status.label}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
              >
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-medium',
                    TONE[status.tone],
                  )}
                >
                  {status.label}
                </span>
                {status.note && (
                  <span className="text-xs text-muted-foreground">
                    {status.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Row>
        <Row label="Last used">{item.used}</Row>
        <Row label="Belongs to">{item.belongs}</Row>
        <Row label="Stored">
          {item.stored.map(line => (
            <p key={line} className="break-words">
              {line}
            </p>
          ))}
        </Row>
        <Row label="To publish">
          <p>{item.publish.text}</p>
          {item.publish.command && <Command text={item.publish.command} />}
        </Row>
      </dl>

      {item.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.links.map((link, index) => (
            <Button
              key={link.href}
              asChild
              variant={index ? 'outline' : 'secondary'}
              size="sm"
              className="h-8"
            >
              {link.external ? (
                <a href={link.href} target="_blank" rel="noreferrer">
                  <ArrowUpRightIcon /> {link.label}
                </a>
              ) : (
                <Link href={link.href}>
                  <ArrowUpRightIcon /> {link.label}
                </Link>
              )}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}

export function ItemDetailsProvider({
  details,
  children,
}: {
  details: Record<string, ItemDetails>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  const value = React.useMemo(
    () => ({ has: (key: string) => key in details, open: setOpen }),
    [details],
  );
  const item = open ? details[open] : undefined;
  return (
    <Context.Provider value={value}>
      {children}
      <Dialog open={!!item} onOpenChange={next => !next && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {item && <Details item={item} />}
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}

/**
 * An item's name that opens its details. `cover` makes the whole card or
 * row around it (the nearest `relative` parent) the click target; other
 * buttons there need `relative z-10` to stay clickable.
 */
export function DetailsButton({
  detailsKey,
  cover = false,
  className,
  children,
}: {
  detailsKey?: string;
  cover?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(Context);
  if (!detailsKey || !context?.has(detailsKey))
    return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      data-details
      className={cn(
        'cursor-pointer text-left underline-offset-4 outline-none hover:underline focus-visible:underline',
        cover && 'after:absolute after:inset-0 after:rounded-[inherit]',
        className,
      )}
      onClick={() => context.open(detailsKey)}
    >
      {children}
    </button>
  );
}
