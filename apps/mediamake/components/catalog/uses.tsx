import Link from 'next/link';
import { ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { slugOf, type MadeBy, type UseNeed, type UseShown } from '@/lib/catalog/types';
import { OldBadge, RunsBadges } from './runs';

/**
 * What a catalog item works with (its `uses`, e.g. a skill's MCPs) and who
 * makes an item we list but don't build (`madeBy`): on the install page,
 * the homepage cards and /skills.
 */

export const NEED_LABEL: Record<UseNeed, string> = {
  required: 'Required',
  recommended: 'Recommended',
  optional: 'Optional',
};

const NEED_STYLE: Record<UseNeed, string> = {
  required: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  recommended: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  optional: 'bg-muted text-muted-foreground',
};

export function NeedBadge({ need, className }: { need: UseNeed; className?: string }) {
  return <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', NEED_STYLE[need], className)}>{NEED_LABEL[need]}</span>;
}

/** "Open source · by ElevenLabs · MIT · GitHub", or "By fal · docs" for a hosted one; `link={false}` inside another link. */
export function MadeByLine({ madeBy, link: linked = true, className }: { madeBy: MadeBy; link?: boolean; className?: string }) {
  const link = linked ? (madeBy.repo ? `https://github.com/${madeBy.repo}` : madeBy.homepage) : undefined;
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {madeBy.repo ? 'Open source · by ' : 'By '}
      <span className="font-medium text-foreground">{madeBy.name}</span>
      {madeBy.license && ` · ${madeBy.license}`}
      {link && (
        <>
          {' · '}
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground hover:underline">
            {madeBy.repo ? 'GitHub' : 'docs'} <ExternalLinkIcon className="size-3" />
          </a>
        </>
      )}
    </p>
  );
}

/** The full list for an install page: what each one is for, and what is lost without it. */
export function UsesList({ uses }: { uses: UseShown[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Works with</p>
      <ul className="divide-y rounded-lg border">
        {uses.map(use => (
          <li key={use.id} className="space-y-1 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {use.href ? (
                <Link href={use.href} className="text-sm font-medium hover:underline">
                  {use.title ?? slugOf(use.id)}
                </Link>
              ) : (
                <span className="text-sm font-medium">{use.title ?? slugOf(use.id)}</span>
              )}
              <NeedBadge need={use.need} />
              <RunsBadges runs={use.runs} />
              {use.alternativeTo && <OldBadge to={slugOf(use.alternativeTo)} />}
            </div>
            <p className="text-sm text-muted-foreground">{use.for}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Without it:</span> {use.without}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Claude asks which of these to add while it installs, and you can skip any of them.</p>
    </div>
  );
}

/** One line for a card: "Works with elevenlabs (required), browse-hack, fal". */
export function UsesLine({ uses, className }: { uses: UseShown[]; className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)} title={uses.map(u => `${slugOf(u.id)} (${u.need}): ${u.for}`).join('\n')}>
      Works with{' '}
      {uses.map((use, i) => (
        <span key={use.id}>
          {i > 0 && ', '}
          <RunsBadges runs={use.runs} compact className="mr-0.5 align-[-1px]" />
          <span className="font-medium text-foreground/80">{slugOf(use.id)}</span>
          {use.need === 'required' && ' (required)'}
          {use.alternativeTo && ' (old)'}
        </span>
      ))}
    </p>
  );
}
