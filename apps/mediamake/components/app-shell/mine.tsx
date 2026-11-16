import Link from 'next/link';
import { AlertTriangleIcon, GitBranchIcon, LaptopIcon } from 'lucide-react';
import { KIND_LABEL, MEMBER_KINDS, type LocalOnly, type Mine, type MineItem } from '@/lib/app-shell/member';
import type { SpaceItemView, SpaceView } from '@/lib/space/space';
import { BetaBadge, FailedNote, ItemActions, TierBadge } from './item-bits';

/** Mine (lib/app-shell/member › mine): what the member installed, their private space, their variants, and the skills on their computers. */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function onLine(on: { device: string; version?: string }[]): string | null {
  if (!on.length) return null;
  return `On ${on.map(entry => `${entry.device}${entry.version ? ` (${entry.version})` : ''}`).join(', ')}`;
}

function InstalledRow({ entry }: { entry: MineItem }) {
  const { item } = entry;
  const facts = [
    entry.installedAt && `Installed ${day(entry.installedAt)}${entry.installedVersion ? `, v${entry.installedVersion}` : ''}`,
    onLine(entry.on),
    item.version && `Latest v${item.version}`,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={item.page} className="truncate text-sm font-medium underline-offset-4 hover:underline">
              {item.title}
            </Link>
            {item.beta && <BetaBadge />}
            <TierBadge item={item} />
            {entry.updateAvailable && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium">Update out</span>}
          </div>
          <p className="text-xs text-muted-foreground">{facts.join(' · ')}</p>
        </div>
        <ItemActions item={item} updateAvailable={entry.updateAvailable} />
      </div>
      {item.failed && <FailedNote item={item} installed />}
      {item.locked && <p className="text-xs text-muted-foreground">Your membership no longer opens it: it needs {item.opensWith}. What you installed keeps working, without updates.</p>}
    </li>
  );
}

function LocalRows({ rows, variant = false }: { rows: LocalOnly[]; variant?: boolean }) {
  return (
    <ul className="divide-y">
      {rows.map(row => (
        <li key={row.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
          <span className="font-mono text-sm">{row.name}</span>
          {variant && row.variantOf && (
            <span className="text-xs text-muted-foreground">
              variant of{' '}
              <Link href={`/skills/${row.variantOf}`} className="underline underline-offset-2">
                {row.variantOf}
              </Link>
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{onLine(row.on)}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ id, title, count, about, children }: { id: string; title: string; count: number; about: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 rounded-xl border bg-card p-4">
      <h2 className="flex items-baseline gap-2 text-base font-semibold">
        {title} <span className="text-xs font-normal text-muted-foreground">{count}</span>
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{about}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">{children}</p>;

const code = 'rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground';

const SPACE_KIND: Record<SpaceItemView['kind'], string> = { skill: 'Skills', mcp: 'MCPs', app: 'Apps' };
const pill = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]';

/** One of the member's own items: its version, and a chip per computer that has it (or doesn't yet). */
function SpaceRow({ item }: { item: SpaceItemView }) {
  return (
    <li className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{item.title}</span>
          <span className="font-mono text-xs text-muted-foreground">{item.name}</span>
          {item.version && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{item.version}</span>}
        </div>
        {item.summary && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>}
        {(item.media || item.projects > 0) && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {[item.media && `Needs ${item.media} media file${item.media === 1 ? '' : 's'} from the media library`, item.projects > 0 && `Linked to ${item.projects} project${item.projects === 1 ? '' : 's'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      <ul className="flex flex-wrap gap-1 sm:max-w-[50%] sm:justify-end" aria-label={`Computers with ${item.name}`}>
        {item.on.map(on => (
          <li
            key={on.device}
            className={`${pill} ${on.behind ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-primary/10 text-foreground'}`}
            title={on.behind ? `${on.device} has ${on.version}, an older one: run mm space pull there` : on.changed ? `Changed on ${on.device} and not pushed yet: mm space push` : `${on.device} has it`}
          >
            <LaptopIcon className="size-3" aria-hidden />
            {on.device}
            {on.behind && on.version ? ` · ${on.version}` : ''}
            {on.changed ? ' · not pushed' : ''}
          </li>
        ))}
        {item.missingOn.map(device => (
          <li key={device} className={`${pill} border border-dashed text-muted-foreground`} title={`${device} doesn't have it yet: run mm space pull there`}>
            <LaptopIcon className="size-3" aria-hidden />
            {device} · not yet
          </li>
        ))}
        {!item.on.length && !item.missingOn.length && <li className={`${pill} border border-dashed text-muted-foreground`}>on no computer</li>}
      </ul>
    </li>
  );
}

/** The member's private space: the repo, its computers, and every item in it. */
function SpaceSection({ space }: { space: SpaceView | null }) {
  const about = 'Your own skills, MCPs and apps, in a private GitHub repo of yours and the same on every computer. MediaMake sees their names and versions, never the files.';
  if (!space) {
    return (
      <Section id="space" title="Your space" count={0} about={about}>
        <Empty>
          No space yet. On a computer with MediaMake, run <span className={code}>mm space connect --create</span> to make the private repo, or{' '}
          <span className={code}>mm space connect &lt;owner/repo&gt;</span> for one you have. Then <span className={code}>mm space push</span> sends what you make and{' '}
          <span className={code}>mm space pull</span> brings it to your other computers. Or ask Claude to &quot;set up my MediaMake space&quot;.
        </Empty>
      </Section>
    );
  }
  const behind = space.devices.filter(device => device.behind);
  return (
    <Section id="space" title="Your space" count={space.items.length} about={about}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <GitBranchIcon className="size-3.5" aria-hidden />
        <span className="font-mono text-foreground">{space.repo}</span>
        <span>
          on {space.devices.length ? space.devices.map(device => `${device.device} (${day(device.reportedAt)}${device.pushed ? '' : ', changes not pushed'})`).join(', ') : 'no computer right now'}
        </span>
      </p>
      {behind.length > 0 && (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {behind.map(device => device.device).join(' and ')} {behind.length === 1 ? 'is' : 'are'} behind. Run <span className="font-mono">mm space pull</span> there.
        </p>
      )}
      {space.items.length ? (
        (Object.keys(SPACE_KIND) as SpaceItemView['kind'][]).map(kind => {
          const rows = space.items.filter(item => item.kind === kind);
          if (!rows.length) return null;
          return (
            <div key={kind} className="mt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{SPACE_KIND[kind]}</p>
              <ul className="divide-y">
                {rows.map(item => (
                  <SpaceRow key={item.key} item={item} />
                ))}
              </ul>
            </div>
          );
        })
      ) : (
        <div className="mt-3">
          <Empty>
            The space is empty. <span className={code}>mm space new skill &lt;name&gt;</span> starts an item, <span className={code}>mm space add &lt;skill&gt;</span> moves in one of your variants, and{' '}
            <span className={code}>mm space push --yes</span> sends it.
          </Empty>
        </div>
      )}
    </Section>
  );
}

export function MineView({ mine, space = null }: { mine: Mine; space?: SpaceView | null }) {
  // a skill in the space is listed there, not again among the skills a computer reported
  const inSpace = new Set(space?.items.filter(item => item.kind === 'skill').map(item => item.name));
  const variants = mine.variants.filter(row => !inSpace.has(row.name));
  const local = mine.local.filter(row => !inSpace.has(row.name));
  const failed = mine.installed.filter(entry => entry.item.failed);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 lg:px-6">
      {failed.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">
              {failed.length === 1 ? `${failed[0].item.title} is failed right now.` : `${failed.length} things you installed are failed right now.`}
            </span>{' '}
            The reason is on {failed.length === 1 ? 'its row' : 'each row'} below. Leave {failed.length === 1 ? 'it' : 'them'} out of your work until fixed.
          </p>
        </div>
      )}

      <Section id="installed" title="Installed" count={mine.installed.length} about="What you installed from MediaMake, and the MediaMake skills your computers have.">
        {mine.installed.length ? (
          MEMBER_KINDS.map(kind => {
            const rows = mine.installed.filter(entry => entry.item.kind === kind);
            if (!rows.length) return null;
            return (
              <div key={kind} className="mt-3 first:mt-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{KIND_LABEL[kind].many}</p>
                <ul className="divide-y">
                  {rows.map(entry => (
                    <InstalledRow key={entry.item.id} entry={entry} />
                  ))}
                </ul>
              </div>
            );
          })
        ) : (
          <Empty>
            Nothing installed yet. Copy an item&apos;s install prompt in{' '}
            <Link href="/app/explore" className="font-medium text-foreground underline underline-offset-4">
              Explore
            </Link>{' '}
            and paste it into Claude.
          </Empty>
        )}
      </Section>

      <SpaceSection space={space} />

      <Section id="variants" title="Your variants" count={variants.length} about="Skills you forked from a MediaMake skill to keep a style or an older version. They live in your workspace, not in the store.">
        {variants.length ? (
          <LocalRows rows={variants} variant />
        ) : (
          <Empty>
            No variants reported. Ask Claude to &quot;save this style as a skill&quot; (fork-skill) and it makes one, named <span className={code}>&lt;skill&gt;-like-&lt;project&gt;</span>.
          </Empty>
        )}
      </Section>

      <Section id="local" title="Other skills on your computers" count={local.length} about="Your own skills and skills from elsewhere, as your computers reported them: names and versions only.">
        {local.length > 0 && <LocalRows rows={local} />}
        {mine.devices.length ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Reported by {mine.devices.map(device => `${device.device} (${device.skills} skill${device.skills === 1 ? '' : 's'}, ${day(device.reportedAt)})`).join(', ')}.
          </p>
        ) : (
          <Empty>
            No computer has reported its skills yet. On a computer with MediaMake, run <span className={code}>mm usage skills</span> (it also goes out once a day by itself). In the Claude apps, ask Claude
            to report your local skills with mm-use. <span className={code}>mm usage off</span> stops it, and <span className={code}>mm usage forget</span> deletes what was sent.
          </Empty>
        )}
      </Section>
    </div>
  );
}
