import { adviceInfo, levelInfo, type ItemAdvice, type ItemTier, type Readiness } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';
import { TIER_META } from './model';

/** The tier as a small coloured pill: Vault, Cohort, Pro, Plus, Public. */
export function TierPill({ tier, className }: { tier: ItemTier; className?: string }) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', TIER_META[tier].soft, className)}>
      <span className={cn('size-1.5 rounded-full', TIER_META[tier].dot)} />
      {TIER_META[tier].label}
    </span>
  );
}

/** How proven it is, as its level: Production (an admin marked it, with a production made with it), Beta or Alpha. */
export function ReadinessPill({ readiness, className }: { readiness?: Readiness; className?: string }) {
  const level = levelInfo(readiness);
  return (
    <span
      title={`${level.label}: ${level.about}`}
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        level.id === 'ready'
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : level.id === 'alpha'
            ? 'bg-red-500/10 text-red-700 dark:text-red-300'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
        className,
      )}
    >
      {level.label}
    </span>
  );
}

/** Not recommended or deprecated, from its listing's advice. */
export function AdvicePill({ advice, className }: { advice?: ItemAdvice; className?: string }) {
  if (!advice || advice === 'recommended') return null;
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300', className)}>
      {adviceInfo(advice).label}
    </span>
  );
}

/** Next to the tier of an archived item: still open as before, left off the homepage. */
export function ArchivedPill({ className }: { className?: string }) {
  return (
    <span
      title="Archived: left off the homepage, still installs by its link"
      className={cn('inline-flex w-fit shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground', className)}
    >
      Archived
    </span>
  );
}

/** A titled card, as the release pages lay out their sections; its buttons go in `footer`, under what it shows. */
export function Panel({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** The section's buttons: a row under its content, to the right. */
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border bg-card', className)}>
      <header className="border-b px-5 py-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="px-5 py-4">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3">{footer}</footer>}
    </section>
  );
}

/** A small uppercase label over a group of rows. */
export function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{children}</p>;
}
