import Link from 'next/link';
import { AlertTriangleIcon, LockIcon, UsersIcon } from 'lucide-react';
import { KIND_LABEL, MEMBER_KINDS, type LocalOnly, type Mine, type MineItem } from '@/lib/app-shell/member';
import { deviceName, type SpaceView } from '@/lib/space/space';
import type { MySpaces } from '@/lib/space/store';
import { SpaceItems } from './space-items';
import { BetaBadge, FailedNote, ItemActions, TierBadge } from './item-bits';

/** Mine (lib/app-shell/member › mine): what the member installed, their private space, their variants, and the skills on their computers. */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function onLine(on: { device: string; version?: string }[]): string | null {
  if (!on.length) return null;
  return `On ${on.map(entry => `${deviceName(entry.device)}${entry.version && !entry.version.startsWith('sha:') ? ` (${entry.version})` : ''}`).join(', ')}`;
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

/** One space as a card: who has it, then its items. */
function SpaceCard({ title, who, Icon, href, space, empty }: { title: string; who: string; Icon: typeof LockIcon; href?: string; space: SpaceView | null; empty: React.ReactNode }) {
  const computers = space?.devices.length ?? 0;
  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/40 px-3 py-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {href ? (
          <Link href={href} className="text-sm font-medium underline-offset-4 hover:underline">
            {title}
          </Link>
        ) : (
          <span className="text-sm font-medium">{title}</span>
        )}
        <span className="text-xs text-muted-foreground">{who}</span>
        {space && (
          <span className="ml-auto text-xs text-muted-foreground">
            {space.items.length} item{space.items.length === 1 ? '' : 's'} · {computers} computer{computers === 1 ? '' : 's'}
            {space.repoUrl && (
              <>
                {' · '}
                <a href={space.repoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2" title={`The private repo that holds it: ${space.repo}`}>
                  GitHub
                </a>
              </>
            )}
          </span>
        )}
      </div>
      <div className="px-3">{space?.items.length ? <SpaceItems space={space} /> : <p className="py-3 text-xs text-muted-foreground">{empty}</p>}</div>
    </div>
  );
}

const STEPS = [
  { title: 'Make it', text: 'Ask Claude to make a skill for you. It is saved in your personal space, which Claude sets up by itself the first time.' },
  { title: 'Share it, if you want', text: 'Say "share it with the <project> project" and everyone on that project gets it. Otherwise it stays only yours.' },
  { title: 'Keep it the same', text: 'On any computer, "sync my MediaMake spaces" brings in what changed elsewhere and sends what changed there.' },
];

/** What the member made: their private space, then one space per project they are on. */
function MadeByYou({ spaces }: { spaces: MySpaces | null }) {
  const projects = spaces?.projects ?? [];
  const withSpace = projects.filter(project => project.space);
  const open = projects.filter(project => !project.space && project.role !== 'viewer');
  const count = (spaces?.mine?.items.length ?? 0) + withSpace.reduce((sum, project) => sum + project.space!.items.length, 0);
  const started = !!spaces?.mine || withSpace.length > 0;
  return (
    <Section id="space" title="Made in your spaces" count={count} about="Skills, MCPs and apps in your personal space and your project spaces. Personal ones are only yours, a project's go to everyone on it, and all of them stay the same on every computer.">
      {!started && (
        <ol className="grid gap-2 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">
                <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px]">{index + 1}</span>
                {step.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      )}
      {started && (
        <div className="flex flex-col gap-3">
          <SpaceCard
            title="Personal"
            who="Only you"
            href="/app/spaces"
            Icon={LockIcon}
            space={spaces?.mine ?? null}
            empty={
              <>
                Nothing personal yet. Ask Claude to make a skill for you, or run <span className={code}>mm space new skill &lt;name&gt;</span>.
              </>
            }
          />
          {withSpace.map(project => (
            <SpaceCard
              key={project.projectId}
              title={project.name}
              who={project.people > 1 ? `Shared with the ${project.people} people on this project` : 'A project with only you on it so far'}
              Icon={UsersIcon}
              href={`/app/spaces/${project.projectId}`}
              space={project.space}
              empty="Nothing shared into this project yet."
            />
          ))}
        </div>
      )}
      {open.length > 0 && started && (
        <p className="mt-3 text-xs text-muted-foreground">
          You can also share into {open.map(project => project.name).join(', ')}: ask Claude to &quot;share &lt;skill&gt; with the &lt;project&gt; project&quot;, or run{' '}
          <span className={code}>mm space share &lt;skill&gt; --project=&quot;&lt;project&gt;&quot;</span>.
        </p>
      )}
      {started && (
        <p className="mt-3 text-xs text-muted-foreground">
          To make a computer match: <span className={code}>mm space sync</span> brings everything in and shows what would go out, <span className={code}>mm space sync --yes</span> sends it too. MediaMake sees names
          and versions only, never the files.
        </p>
      )}
    </Section>
  );
}

export function MineView({ mine, spaces = null }: { mine: Mine; spaces?: MySpaces | null }) {
  // a skill in a space is listed there, not again among the skills a computer reported
  const inSpace = new Set([spaces?.mine, ...(spaces?.projects ?? []).map(project => project.space)].flatMap(space => space?.items.filter(item => item.kind === 'skill').map(item => item.name) ?? []));
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

      <MadeByYou spaces={spaces} />

      <Section id="local" title="Also on your computers" count={variants.length + local.length} about="Other skills your computers reported: your variants of MediaMake skills that aren't in a space yet, and skills from elsewhere. Names and versions only.">
        {variants.length > 0 && <LocalRows rows={variants} variant />}
        {local.length > 0 && <LocalRows rows={local} />}
        {variants.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            A variant lives on one computer until it is in your space: <span className={code}>mm space add &lt;name&gt;</span> moves it there.
          </p>
        )}
        {mine.devices.length ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Reported by {mine.devices.map(device => `${deviceName(device.device)} (${device.skills} skill${device.skills === 1 ? '' : 's'}, ${day(device.reportedAt)})`).join(', ')}.
          </p>
        ) : (
          <Empty>
            No computer has reported its skills yet. It happens by itself once a day on a computer with MediaMake (<span className={code}>mm usage skills</span> does it now).{' '}
            <span className={code}>mm usage off</span> stops it, and <span className={code}>mm usage forget</span> deletes what was sent.
          </Empty>
        )}
      </Section>
    </div>
  );
}
