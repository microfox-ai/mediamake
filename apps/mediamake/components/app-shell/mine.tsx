import Link from 'next/link';
import { AlertTriangleIcon, ArrowRightIcon } from 'lucide-react';
import { detailsKey, usedLine } from '@/lib/app-shell/details';
import { KIND_LABEL, type LocalOnly, type MemberKind, type Mine, type MineItem } from '@/lib/app-shell/member';
import type { BrandMarks } from '@/lib/brand-kit';
import { deviceName } from '@/lib/space/space';
import type { MySpaces } from '@/lib/space/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ItemCards } from './item-cards';
import { AdviceBadge, FailedNote, ItemActions, LevelBadge, TierBadge } from './item-bits';
import { DetailsButton, rememberTab } from './item-details';

/**
 * Mine (lib/app-shell/member › mine), one tab each: what the member
 * installed (the last used first: skills in a wide column, MCPs and apps
 * beside it), what is theirs (their personal space and the items they
 * shared from it), what their projects have (a tab per project), what
 * members shared with them by name, and the other skills on their
 * computers. Clicking an item anywhere opens its page (./item-details ItemView).
 */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function onLine(on: { device: string; version?: string }[]): string | null {
  if (!on.length) return null;
  return `On ${on.map(entry => `${deviceName(entry.device)}${entry.version && !entry.version.startsWith('sha:') ? ` (${entry.version})` : ''}`).join(', ')}`;
}

function InstalledRow({ entry, now }: { entry: MineItem; now: number }) {
  const { item } = entry;
  return (
    <li className="relative flex flex-col gap-2 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <DetailsButton detailsKey={detailsKey.catalog(item.id)} cover className="truncate text-sm font-medium">
              {item.title}
            </DetailsButton>
            <LevelBadge item={item} />
            <AdviceBadge item={item} />
            <TierBadge item={item} />
            {entry.updateAvailable && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium">Update out</span>}
          </div>
          <p className="text-xs text-muted-foreground">{usedLine(entry.used, now)}</p>
        </div>
        <ItemActions item={item} updateAvailable={entry.updateAvailable} className="relative z-10" />
      </div>
      {item.failed && <FailedNote item={item} installed />}
    </li>
  );
}

/** One kind of installed items as a card: its name, how many, and a row each. */
function InstalledList({ kind, rows, now }: { kind: MemberKind; rows: MineItem[]; now: number }) {
  return (
    <section className="rounded-xl border bg-card px-4 py-3">
      <h2 className="flex items-baseline gap-1.5 text-sm font-semibold">
        {KIND_LABEL[kind].many}
        <span className="text-xs font-normal tabular-nums text-muted-foreground">{rows.length}</span>
      </h2>
      {rows.length ? (
        <ul className="mt-1 divide-y">
          {rows.map(entry => (
            <InstalledRow key={entry.item.id} entry={entry} now={now} />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-xs text-muted-foreground">None installed yet.</p>
      )}
    </section>
  );
}

function LocalRows({ rows, variant = false }: { rows: LocalOnly[]; variant?: boolean }) {
  return (
    <ul className="divide-y">
      {rows.map(row => (
        <li key={row.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
          <DetailsButton detailsKey={detailsKey.local(row.name)} className="font-mono text-sm">
            {row.name}
          </DetailsButton>
          {variant && row.variantOf && (
            <span className="text-xs text-muted-foreground">
              variant of{' '}
              <DetailsButton detailsKey={detailsKey.catalog(`skill/${row.variantOf}`)} className="underline underline-offset-2">
                {row.variantOf}
              </DetailsButton>
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{onLine(row.on)}</span>
        </li>
      ))}
    </ul>
  );
}

/** A project's small mark on its tab: its favicon, else its logo, else its first letter. */
function ProjectMark({ name, brand }: { name: string; brand?: BrandMarks }) {
  const src = brand?.favicon ?? brand?.logo;
  return (
    <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background text-[11px] font-semibold uppercase text-muted-foreground" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="size-full object-contain" /> : name.trim().charAt(0)}
    </span>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">{children}</p>;
const Hint = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-xs text-muted-foreground">{children}</p>;

const code = 'rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground';

export const MINE_TABS = ['installed', 'yours', 'projects', 'shared', 'computers'] as const;
export type MineTab = (typeof MINE_TABS)[number];

function Tab({ value, label, count }: { value: MineTab; label: string; count: number }) {
  return (
    <TabsTrigger value={value} className="flex-none px-3">
      {label}
      <span className="text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
    </TabsTrigger>
  );
}

export function MineView({
  mine,
  spaces = null,
  spacesOpen = true,
  tab,
  now,
}: {
  mine: Mine;
  spaces?: MySpaces | null;
  /** Whether the Spaces pages are there for this member (lib/app-shell/nav): no, and a project has no "Open space". */
  spacesOpen?: boolean;
  /** The tab to open first. */
  tab?: MineTab;
  /** The time "used 3 days ago" counts from. */
  now: number;
}) {
  const projects = spaces?.projects ?? [];
  const linked = spaces?.linked ?? [];
  const own = linked.filter(item => item.role === 'owner');
  // an item shared by name shows once, under Shared with you; the others on each linked project
  const direct = linked.filter(item => item.role !== 'owner' && item.direct);
  const linkedTo = (projectId: string) => linked.filter(item => item.role !== 'owner' && !item.direct && item.projects.some(project => project.id === projectId));
  const targets = projects.filter(project => project.role !== 'viewer').map(project => ({ id: project.projectId, name: project.name }));
  const inProjects = projects.reduce((sum, project) => sum + (project.space?.items.length ?? 0) + linkedTo(project.projectId).length, 0);

  // a skill in a space is listed there, not again among the skills a computer reported
  const inSpace = new Set([
    ...[spaces?.mine, ...projects.map(project => project.space)].flatMap(space => space?.items.filter(item => item.kind === 'skill').map(item => item.name) ?? []),
    ...linked.filter(item => item.kind === 'skill').map(item => item.name),
  ]);
  const variants = mine.variants.filter(row => !inSpace.has(row.name));
  const local = mine.local.filter(row => !inSpace.has(row.name));
  const failed = mine.installed.filter(entry => entry.item.failed);
  const first = tab === 'shared' && !direct.length ? 'yours' : (tab ?? 'installed');
  const installed = (kind: MemberKind) => mine.installed.filter(entry => entry.item.kind === kind);
  const inProject = (project: (typeof projects)[number]) => (project.space?.items.length ?? 0) + linkedTo(project.projectId).length;
  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 lg:px-6">
        {failed.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-medium">
                {failed.length === 1 ? `${failed[0].item.title} is failed right now.` : `${failed.length} things you installed are failed right now.`}
              </span>{' '}
              The reason is on {failed.length === 1 ? 'its row' : 'each row'} under Installed. Leave {failed.length === 1 ? 'it' : 'them'} out of your work until fixed.
            </p>
          </div>
        )}

        <Tabs defaultValue={first} onValueChange={value => rememberTab(value)} className="gap-4">
          <div className="-mx-4 overflow-x-auto px-4">
            <TabsList>
              <Tab value="installed" label="Installed" count={mine.installed.length} />
              <Tab value="yours" label="Yours" count={(spaces?.mine?.items.length ?? 0) + own.length} />
              <Tab value="projects" label="Projects" count={inProjects} />
              {direct.length > 0 && <Tab value="shared" label="Shared with you" count={direct.length} />}
              <Tab value="computers" label="On your computers" count={variants.length + local.length} />
            </TabsList>
          </div>

          <TabsContent value="installed">
            {mine.installed.length ? (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
                <InstalledList kind="skill" rows={installed('skill')} now={now} />
                <div className="flex flex-col gap-4">
                  <InstalledList kind="mcp" rows={installed('mcp')} now={now} />
                  <InstalledList kind="app" rows={installed('app')} now={now} />
                </div>
              </div>
            ) : (
              <Empty>
                Nothing installed yet. Copy an item&apos;s install prompt in{' '}
                <Link href="/app/explore" className="font-medium text-foreground underline underline-offset-4">
                  Explore
                </Link>{' '}
                and paste it into Claude.
              </Empty>
            )}
          </TabsContent>

          <TabsContent value="yours">
            <ItemCards
              space={spaces?.mine ?? null}
              audience="Only you"
              linked={own}
              projects={targets}
              empty={
                <>
                  Nothing of your own yet. Ask Claude to make a skill for you, or run <span className={code}>mm space new skill &lt;name&gt;</span>.
                </>
              }
            />
            {targets.length > 0 && <Hint>To share one and keep it yours, ask Claude to &quot;link &lt;skill&gt; to the &lt;project&gt; project&quot;. After that, Share on its card changes who has it.</Hint>}
          </TabsContent>

          <TabsContent value="projects">
            {projects.length ? (
              <Tabs defaultValue={projects[0].projectId} className="gap-4">
                <div className="-mx-4 overflow-x-auto px-4 pb-1">
                  <TabsList className="h-auto w-max justify-start gap-1.5 bg-transparent p-0">
                    {projects.map(project => (
                      <TabsTrigger key={project.projectId} value={project.projectId} className="h-9 flex-none gap-2 rounded-full border-border py-1 pl-1.5 pr-3 data-[state=active]:border-foreground/40 data-[state=active]:bg-muted data-[state=active]:shadow-none">
                        <ProjectMark name={project.name} brand={project.brand} />
                        {project.name}
                        <span className="text-xs font-normal tabular-nums text-muted-foreground">{inProject(project)}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {projects.map(project => (
                  <TabsContent key={project.projectId} value={project.projectId}>
                    {project.brand?.banner && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.brand.banner} alt="" className="mb-3 h-24 w-full rounded-xl border object-cover" />
                    )}
                    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{project.people > 1 ? `${project.people} people have these` : 'Only you so far'}</span>
                      {spacesOpen && (
                        <Link href={`/app/spaces/${project.projectId}`} className="ml-auto inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
                          Open space <ArrowRightIcon className="size-3" aria-hidden />
                        </Link>
                      )}
                    </div>
                    <ItemCards space={project.space} audience={`Everyone on ${project.name}`} linked={linkedTo(project.projectId)} projects={targets} columns={3} empty="Nothing made for this project yet." />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <Empty>You are on no project yet. A project&apos;s skills, MCPs and apps show here once you are on one.</Empty>
            )}
          </TabsContent>

          {direct.length > 0 && (
            <TabsContent value="shared">
              <ItemCards linked={direct} projects={targets} />
            </TabsContent>
          )}

          <TabsContent value="computers">
            {(variants.length > 0 || local.length > 0) && (
              <div className="rounded-xl border bg-card px-4 py-1">
                {variants.length > 0 && <LocalRows rows={variants} variant />}
                {local.length > 0 && <LocalRows rows={local} />}
              </div>
            )}
            {variants.length > 0 && (
              <Hint>
                A variant lives on one computer until it is in your space: <span className={code}>mm space add &lt;name&gt;</span> moves it there.
              </Hint>
            )}
            {mine.devices.length ? (
              <Hint>Reported by {mine.devices.map(device => `${deviceName(device.device)} (${device.skills} skill${device.skills === 1 ? '' : 's'}, ${day(device.reportedAt)})`).join(', ')}. Names and versions only.</Hint>
            ) : (
              <Empty>
                No computer has reported its skills yet. It happens by itself once a day on a computer with MediaMake (<span className={code}>mm usage skills</span> does it now).{' '}
                <span className={code}>mm usage off</span> stops it, and <span className={code}>mm usage forget</span> deletes what was sent.
              </Empty>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
