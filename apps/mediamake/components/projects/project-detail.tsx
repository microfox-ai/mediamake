'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { rememberTab } from '@/components/app-shell/item-details';
import {
  ArrowLeftIcon,
  Loader2Icon,
  LockIcon,
} from 'lucide-react';
import {
  ProjectAccessPanel,
  RoleBadge,
} from '@/components/projects/project-access';
import { CopyLine } from './copy-line';
import { BrandTab } from './space-tabs';
import { CodeTab } from './space-code';
import { CloudSetupCard } from './space-cloud';
import { PlacesTab } from './space-places';
import { RunsTab } from './space-runs';
import { TodosTab } from './space-todos';
import { SettingsTab } from './space-settings';
import type { RunsView } from '@/lib/space/runs';
import type { TodosView } from '@/lib/space/todos';
import { ItemCards } from '@/components/app-shell/item-cards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectRole } from '@/lib/editor/project-access';
import type { LinkedItemView } from '@/lib/space/links';
import type { SpaceCodeView, SpaceView } from '@/lib/space/space';
import { formatBytes } from '@/lib/projects/storage';

interface Bundle {
  id: string;
  slug: string;
  title: string;
  latestVersion: number;
  status: string;
  fileCount: number;
  bytes: number;
  updatedAt: string;
  release?: { platform: string };
}

interface MediaItem {
  id: string;
  name: string;
  url: string;
  contentType?: string;
  size?: number;
  createdAt?: string;
}

interface Listing<T> {
  total: number;
  items: T[];
}

interface Project {
  id: string;
  displayName: string;
  tags?: string[];
  /** The member's personal space: only theirs. */
  personal?: boolean;
  isOwned?: boolean;
  sharedRole?: ProjectRole;
  sharedWith?: unknown[];
  brandKit?: { assetCount: number; logo?: string };
}

const day = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Could not load (${res.status})`);
  return json as T;
}

/** The one line that sets this project up on a member's computer, with a button to copy it. */
function SetUp({ projectId, personal = false }: { projectId: string; personal?: boolean }) {
  if (personal) {
    return (
      <section className="rounded-xl border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">Get your personal space on a computer</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Paste this line in a terminal, or give it to Claude. It brings in your skills, MCPs and apps, links them into Claude and shows what would go out and which files are waiting.
        </p>
        <div className="mt-3">
          <CopyLine line="mm space sync" label="the sync line" />
        </div>
      </section>
    );
  }
  return (
    <section className="rounded-xl border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">Set this space up on your computer</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Paste this line in a terminal, or give it to Claude. It signs you in, gets the project&apos;s skills, MCPs and apps, links them into Claude and shows its shared media.
      </p>
      <div className="mt-3">
        <CopyLine line={`mm space join ${projectId}`} label="the setup line" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Needs MediaMake on the computer (
        <a href="https://github.com/microfox-ai/mediamake/blob/main/install.md" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          how to install
        </a>
        ) and the GitHub CLI signed in. Run it again any time to catch up.
      </p>
    </section>
  );
}

/**
 * One space in the app, one tab each: its code (its repo as GitHub shows
 * it: files, README, commits, who has it and where each computer stands),
 * its skills, MCPs and apps, its brand kit, what it keeps on MediaMake (its
 * productions, its releases and its media), who can open it, which its owner
 * changes here, its to-dos (the steps a session could not do where it ran, waiting
 * for a place that can), where its steps can run (its cloud environments and the
 * computers open to it), and how to set it up: the line for a computer, and for a Claude cloud
 * environment the repos to add and the keys to set, and for its owner its
 * settings: its name, and deleting it. A personal space is
 * only its owner's, so it has no access panel. The files are reading only:
 * they are added and changed from Claude with the MediaMake Spaces MCP, or
 * `mm media sync`.
 */
export function ProjectDetail({
  projectId,
  me,
  oldEditor,
  space = null,
  linked = [],
  linkTargets = [],
  code = null,
  readmeHtml,
  about,
  storageHost,
  tab,
}: {
  /** The tab to open first (`?tab=`): code, skills, brand… */ tab?: string;
  /** The host of MediaMake's file storage, for a cloud environment with limited network access. */ storageHost?: string;
  /** The Code tab (lib/space/space spaceCodeView), with its README as HTML and its opening paragraph. */ code?: SpaceCodeView | null;
  readmeHtml?: string;
  about?: string;
  /** The items linked to this project from members' spaces; on the personal space, the member's own linked items. */ linked?: LinkedItemView[];
  /** The projects the viewer owns or edits: where they may link their own items. */ linkTargets?: { id: string; name: string }[];
  /** What was made for this project (its space), as its people's computers reported it. */ space?: SpaceView | null;
  projectId: string;
  /** The signed-in account. */ me?: string;
  /** Admins still reach the deprecated timeline editor. */ oldEditor?: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(null);
  const [productions, setProductions] = React.useState<Listing<Bundle> | null>(
    null,
  );
  const [releases, setReleases] = React.useState<Listing<Bundle> | null>(null);
  const [media, setMedia] = React.useState<Listing<MediaItem> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [todos, setTodos] = React.useState<TodosView | null>(null);
  const [todosError, setTodosError] = React.useState<string | null>(null);
  const loadTodos = React.useCallback(
    () =>
      getJson<TodosView>(`/api/space/todos?project=${encodeURIComponent(projectId)}`)
        .then(view => {
          setTodos(view);
          setTodosError(null);
        })
        .catch(e => setTodosError(e.message)),
    [projectId],
  );
  const [runs, setRuns] = React.useState<RunsView | null>(null);
  const [runsError, setRunsError] = React.useState<string | null>(null);
  const loadRuns = React.useCallback(
    () =>
      getJson<RunsView>(`/api/space/runs?project=${encodeURIComponent(projectId)}`)
        .then(view => {
          setRuns(view);
          setRunsError(null);
        })
        .catch(e => setRunsError(e.message)),
    [projectId],
  );
  React.useEffect(() => {
    void loadTodos();
    void loadRuns();
  }, [loadTodos, loadRuns]);

  React.useEffect(() => {
    const id = encodeURIComponent(projectId);
    getJson<Project>(`/api/project?id=${id}`)
      .then(setProject)
      .catch(e => setError(e.message));
    getJson<Listing<Bundle>>(
      `/api/project/productions?projectId=${id}&limit=100`,
    )
      .then(setProductions)
      .catch(() => setProductions({ total: 0, items: [] }));
    getJson<Listing<Bundle>>(`/api/project/releases?projectId=${id}&limit=100`)
      .then(setReleases)
      .catch(() => setReleases({ total: 0, items: [] }));
    getJson<Listing<MediaItem>>(`/api/project/media?projectId=${id}&limit=100`)
      .then(setMedia)
      .catch(() => setMedia({ total: 0, items: [] }));
  }, [projectId]);

  const back = (
    <Link
      href="/app/spaces"
      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" /> All spaces
    </Link>
  );

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 lg:px-6">
        {back}
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {error}
        </p>
      </div>
    );
  }

  const personal = project?.personal === true;
  const role: ProjectRole | undefined = project
    ? project.isOwned === false
      ? (project.sharedRole ?? 'viewer')
      : 'owner'
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 lg:px-6">
      {back}
      <div className="flex flex-wrap items-center gap-3">
        {project?.brandKit?.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.brandKit.logo}
            alt=""
            className="size-11 rounded-xl border object-contain p-1.5"
          />
        )}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="truncate">
              {project ? (
                personal ? (
                  'Your personal space'
                ) : (
                  project.displayName
                )
              ) : (
                <span className="text-muted-foreground">Loading…</span>
              )}
            </span>
            {role && !personal && <RoleBadge role={role} className="shrink-0" />}
            {personal && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <LockIcon className="size-3" aria-hidden /> Only you
              </span>
            )}
          </h1>
          {project && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.brandKit
                ? `Brand kit with ${project.brandKit.assetCount} file${project.brandKit.assetCount === 1 ? '' : 's'}`
                : 'No brand kit yet'}
              {(project.tags ?? []).length > 0 &&
                ` · ${project.tags!.join(', ')}`}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {oldEditor && (
            <Link
              href={`/core/editor?id=${encodeURIComponent(projectId)}`}
              className="text-xs text-muted-foreground underline underline-offset-4"
              title="Admins only: the deprecated Core editor"
            >
              Timelines in the old editor
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue={tab ?? 'code'} onValueChange={value => rememberTab(value)} className="gap-4">
        <div className="-mx-4 overflow-x-auto px-4">
          <TabsList>
            <Tab value="code" label="Code" />
            <Tab value="skills" label="Skills" count={(space?.items.length ?? 0) + linked.length} />
            <Tab value="brand" label="Brand" count={project?.brandKit?.assetCount} />
            <Tab value="productions" label="Productions" count={productions?.total} />
            <Tab value="releases" label="Releases" count={releases?.total} />
            <Tab value="media" label="Media" count={media?.total} />
            {!personal && <Tab value="people" label="People" count={project?.sharedWith ? project.sharedWith.length + 1 : undefined} />}
            <Tab value="runs" label="Runs" count={runs?.ready || undefined} />
            <Tab value="todos" label="To do" count={todos?.todos.filter(todo => todo.state !== 'done' && todo.state !== 'cancelled').length || undefined} />
            {!personal && <Tab value="places" label="Where it runs" />}
            <Tab value="setup" label="Set up" />
            {(personal || role === 'owner') && <Tab value="settings" label="Settings" />}
          </TabsList>
        </div>

        <TabsContent value="code">
          <CodeTab code={code} readmeHtml={readmeHtml} about={about} space={space} projectId={projectId} personal={personal} projectName={project?.displayName} />
        </TabsContent>

        <TabsContent value="skills" className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            The skills, MCPs and apps {personal ? 'of your space, on every computer of yours' : `of this space: everyone on ${project?.displayName ?? 'the project'} gets them with mm space sync`}. Their code is in the Code tab.
          </p>
          <ItemCards
            space={space}
            audience={personal ? 'Only you' : `Everyone on ${project?.displayName ?? 'the project'}`}
            linked={linked}
            projects={linkTargets}
            unlinkFrom={!personal && project?.isOwned ? { id: projectId, name: project.displayName } : undefined}
            empty={
              personal
                ? 'Nothing yet. Ask Claude to make a skill for you.'
                : `Nothing made for this project yet. Ask Claude to "share <skill> with the ${project?.displayName ?? 'project'} project" and everyone on it gets it.`
            }
          />
          {!personal && (
            <p className="mt-1 text-xs text-muted-foreground">
              To add one of your own skills here and keep it yours, ask Claude to &quot;link &lt;skill&gt; to the {project?.displayName ?? 'project'} project&quot;.
            </p>
          )}
        </TabsContent>

        <TabsContent value="brand">
          {project ? (
            <BrandTab projectId={projectId} projectName={personal ? 'Your brand' : project.displayName} canEdit={role === 'owner' || role === 'editor'} me={me} />
          ) : (
            <Loading />
          )}
        </TabsContent>

        <TabsContent value="productions">
          <Bundles listing={productions} empty="No productions yet. A production is a video's code and renders, kept so any computer on the space can pick it up." />
        </TabsContent>

        <TabsContent value="releases">
          <Bundles listing={releases} empty="No releases yet. A release is a whole kit: a YouTube upload pack, a DistroKid release." />
        </TabsContent>

        <TabsContent value="media">
          {!media ? (
            <Loading />
          ) : media.items.length ? (
            <ul className="divide-y rounded-xl border bg-card px-4">
              {media.items.map(item => (
                <li key={item.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate underline-offset-4 hover:underline">
                    {item.name}
                  </a>
                  <span className="text-xs text-muted-foreground">{item.contentType}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatBytes(item.size ?? 0)} · {day(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No media yet. Shared pictures, songs and clips of the space show here.</Empty>
          )}
          {media && media.total > media.items.length && (
            <p className="pt-2 text-xs text-muted-foreground">
              Showing the newest {media.items.length} of {media.total}.
            </p>
          )}
        </TabsContent>

        {!personal && (
          <TabsContent value="people">
            <section className="max-w-xl rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">{role === 'owner' ? 'Share and manage access' : 'Who has access'}</h2>
              <ProjectAccessPanel projectId={projectId} me={me} onLeft={() => router.push('/app/spaces')} className="mt-3" />
            </section>
          </TabsContent>
        )}

        <TabsContent value="runs">
          <RunsTab view={runs} error={runsError} onChanged={() => Promise.all([loadRuns(), loadTodos()]).then(() => undefined)} />
        </TabsContent>

        <TabsContent value="todos">
          <TodosTab view={todos} error={todosError} onChanged={() => Promise.all([loadTodos(), loadRuns()]).then(() => undefined)} />
        </TabsContent>

        {!personal && (
          <TabsContent value="places">
            <PlacesTab projectId={projectId} />
          </TabsContent>
        )}

        <TabsContent value="setup" className="flex flex-col gap-3">
          <SetUp projectId={projectId} personal={personal} />
          <CloudSetupCard space={space} linked={linked} personal={personal} storage={storageHost} name={project?.displayName} />
          <p className="text-xs text-muted-foreground">
            Productions, releases and media are added from Claude: ask it to share or sync them (the MediaMake Spaces MCP, or{' '}
            <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">mm media sync</span>).
          </p>
        </TabsContent>

        {project && (personal || role === 'owner') && (
          <TabsContent value="settings">
            <SettingsTab
              projectId={projectId}
              name={project.displayName}
              personal={personal}
              repo={space?.repo}
              people={(project.sharedWith?.length ?? 0) + 1}
              onRenamed={displayName => setProject(current => (current ? { ...current, displayName } : current))}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Tab({ value, label, count }: { value: string; label: string; count?: number }) {
  return (
    <TabsTrigger value={value} className="flex-none px-3">
      {label}
      {count !== undefined && <span className="text-xs font-normal tabular-nums text-muted-foreground">{count}</span>}
    </TabsTrigger>
  );
}

function Bundles({ listing, empty }: { listing: Listing<Bundle> | null; empty: string }) {
  if (!listing) return <Loading />;
  if (!listing.items.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {listing.items.map(item => (
        <li key={item.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{item.title}</span>
            {item.release && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{item.release.platform}</span>}
            {item.status !== 'ready' && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">uploading</span>}
          </div>
          <span className="mt-0.5 font-mono text-xs text-muted-foreground">{item.slug}</span>
          <span className="mt-3 text-xs tabular-nums text-muted-foreground">
            v{item.latestVersion || 1} · {item.fileCount} file{item.fileCount === 1 ? '' : 's'} · {formatBytes(item.bytes)} · {day(item.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const Loading = () => (
  <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
    <Loader2Icon className="size-3.5 animate-spin" /> Loading
  </p>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
    {children}
  </p>
);
