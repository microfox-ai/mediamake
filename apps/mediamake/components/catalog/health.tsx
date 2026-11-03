import { cn } from '@/lib/utils';
import type { McpHealth } from '@/lib/catalog/types';

/**
 * How an MCP is doing (see McpHealth), as a dot and a word: on the homepage
 * cards, the install page, its "Works with" lists and the admin pages.
 */

export const HEALTH: Record<McpHealth, { label: string; title: string; dot: string; style: string }> = {
  healthy: {
    label: 'Healthy',
    title: 'Healthy: works',
    dot: 'bg-emerald-500',
    style: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  inactive: {
    label: 'Inactive',
    title: 'Inactive: works, but nobody uses or looks after it right now',
    dot: 'bg-zinc-400',
    style: 'bg-muted text-muted-foreground',
  },
  archived: {
    label: 'Archived',
    title: 'Archived: kept for reference, no longer maintained',
    dot: 'bg-zinc-500',
    style: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  },
  'not-working': {
    label: 'Not working',
    title: "Not working: broken right now, so don't install it until it is fixed",
    dot: 'bg-red-500',
    style: 'bg-red-500/10 text-red-700 dark:text-red-300',
  },
};

export function HealthBadge({ health, note, className }: { health?: McpHealth; note?: string; className?: string }) {
  if (!health) return null;
  const { label, title, dot, style } = HEALTH[health];
  return (
    <span
      title={note ? `${title}. ${note}` : title}
      className={cn('inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', style, className)}
    >
      <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  );
}
