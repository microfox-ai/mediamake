import { Globe, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { McpRuns } from '@/lib/catalog/types';

/**
 * Where an MCP runs (see mcpRunsOf), so a web connector and a server on the
 * computer can't be mistaken for each other, and an old item that is only an
 * alternative now: on the homepage cards, the install page and its "Works
 * with" list.
 */

export const RUNS: Record<McpRuns, { label: string; title: string; Icon: typeof Globe; style: string }> = {
  web: {
    label: 'Web',
    title: 'Hosted on the web: added as a connector, you sign in, nothing is installed on your computer',
    Icon: Globe,
    style: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  computer: {
    label: 'Local',
    title: 'Runs on your computer: installed there, and works with your files',
    Icon: Laptop,
    style: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
};

/** "🌐 Web" and/or "💻 Local" chips; `compact` shows the icons alone (their meaning on hover). */
export function RunsBadges({ runs, compact = false, className }: { runs?: McpRuns[]; compact?: boolean; className?: string }) {
  if (!runs?.length) return null;
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {runs.map(where => {
        const { label, title, Icon, style } = RUNS[where];
        return compact ? (
          <span key={where} title={title} className="inline-flex">
            <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        ) : (
          <span key={where} title={title} className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', style)}>
            <Icon className="size-3" aria-hidden />
            {label}
          </span>
        );
      })}
    </span>
  );
}

/** "Old": an older item that is only an alternative to `to` (its title when known). */
export function OldBadge({ to, className }: { to?: string; className?: string }) {
  return (
    <span
      title={to ? `Old: an alternative only. Use ${to} first.` : 'Old: an alternative only'}
      className={cn('rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300', className)}
    >
      Old
    </span>
  );
}
