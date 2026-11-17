import Link from 'next/link';
import { ArrowRightIcon, LockIcon } from 'lucide-react';
import { SpaceItems } from '@/components/app-shell/space-items';
import type { ProjectCard } from '@/lib/projects/access';
import { formatBytes } from '@/lib/projects/storage';
import type { SpaceView } from '@/lib/space/space';

/**
 * The member's personal space at the top of Spaces: only theirs. Its skills,
 * MCPs and apps come from their own private repo (lib/space); its files
 * (brand kit, productions, releases, media) are kept like a project space's,
 * in a project of its own (lib/projects/personal), for Plus and above.
 */

const code = 'rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground';
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export function PersonalSpace({
  card,
  space,
  loading = false,
  filesNeed,
}: {
  /** Its files, when the membership keeps files in the cloud. */ card?: ProjectCard | null;
  /** Its skills, MCPs and apps, as the member's computers reported them. */ space: SpaceView | null;
  loading?: boolean;
  /** The membership that opens cloud files, when theirs doesn't. */ filesNeed?: string;
}) {
  const computers = space?.devices.length ?? 0;
  const files = card ? [plural(card.counts.productions, 'production'), plural(card.counts.releases, 'release'), plural(card.counts.media, 'media file'), ...(card.brandKit ? ['a brand kit'] : []), formatBytes(card.bytes)] : [];
  return (
    <section className="rounded-xl border bg-card" aria-labelledby="personal-space">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-background">
          <LockIcon className="size-4 text-muted-foreground" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="personal-space" className="text-sm font-semibold">
            Your personal space
          </h2>
          <p className="text-xs text-muted-foreground">
            Only you
            {space && ` · ${plural(space.items.length, 'item')} on ${plural(computers, 'computer')}`}
            {space?.repoUrl && (
              <>
                {' · '}
                <a href={space.repoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2" title={`The private repo that holds its skills, MCPs and apps: ${space.repo}`}>
                  GitHub
                </a>
              </>
            )}
          </p>
        </div>
        {card && (
          <Link href={`/app/spaces/${card.id}`} className="ml-auto inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
            Open <ArrowRightIcon className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="grid gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-muted-foreground">Skills, MCPs and apps</h3>
          {space?.items.length ? (
            <SpaceItems space={space} />
          ) : (
            <p className="py-2 text-xs text-muted-foreground">
              Nothing yet. Ask Claude to make a skill for you, or run <span className={code}>mm space new skill &lt;name&gt;</span>. It is saved here by itself.
            </p>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-muted-foreground">Files</h3>
          {card ? (
            <p className="py-2 text-sm">{files.join(' · ')}</p>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">
              {loading ? 'Loading…' : filesNeed ? `Brand kits, productions and media are kept here with ${filesNeed} and above. Until then they stay on your computer.` : 'Your brand kits, productions and media are kept here.'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            <span className={code}>mm space sync</span> makes a computer match every space you are on.
          </p>
        </div>
      </div>
    </section>
  );
}
