'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ClapperboardIcon,
  ImageIcon,
  Loader2Icon,
  PackageIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react';
import {
  ProjectAccessPanel,
  RoleBadge,
} from '@/components/projects/project-access';
import type { ProjectRole } from '@/lib/editor/project-access';
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

/**
 * One cloud project in the app: what it keeps on MediaMake through ProjectSync
 * (its productions, its releases and its media), and beside them who can open
 * it, which its owner changes here. The files are reading only: they are
 * added and changed from Claude with the ProjectSync MCP, or `mm media sync`.
 */
export function ProjectDetail({
  projectId,
  me,
  oldEditor,
}: {
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
      href="/app/projects"
      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" /> All projects
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
              {project?.displayName ?? (
                <span className="text-muted-foreground">Loading…</span>
              )}
            </span>
            {role && <RoleBadge role={role} className="shrink-0" />}
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
          <a
            href="#access"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted lg:hidden"
          >
            <UsersIcon className="size-4" aria-hidden />{' '}
            {role === 'owner' ? 'Share' : 'Access'}
          </a>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Bundles
            title="Productions"
            Icon={ClapperboardIcon}
            listing={productions}
            empty="No productions yet. A production is a video's code and renders, kept so any computer on the project can pick it up."
          />
          <Bundles
            title="Releases"
            Icon={PackageIcon}
            listing={releases}
            empty="No releases yet. A release is a whole kit: a YouTube upload pack, a DistroKid release."
          />

          <Group
            title="Media"
            Icon={ImageIcon}
            count={media?.total}
            bytes={media?.items.reduce(
              (sum, item) => sum + (item.size ?? 0),
              0,
            )}
          >
            {!media ? (
              <Loading />
            ) : media.items.length ? (
              <ul className="divide-y">
                {media.items.map(item => (
                  <li
                    key={item.id}
                    className="flex items-baseline gap-3 py-2 text-sm"
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate underline-offset-4 hover:underline"
                    >
                      {item.name}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {item.contentType}
                    </span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatBytes(item.size ?? 0)} · {day(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>
                No media yet. Shared pictures, songs and clips of the project
                show here.
              </Empty>
            )}
            {media && media.total > media.items.length && (
              <p className="pt-2 text-xs text-muted-foreground">
                Showing the newest {media.items.length} of {media.total}.
              </p>
            )}
          </Group>

          <Group title="Skills" Icon={SparklesIcon}>
            <Empty>
              <span className="mr-1.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">Coming</span>
              Private skills made for this project will be linked here, so everyone on it has them. MCPs and apps follow.
            </Empty>
          </Group>

          <p className="text-xs text-muted-foreground">
            Productions, releases and media are added from Claude: ask it to
            share or sync them (the ProjectSync MCP, or{' '}
            <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              mm media sync
            </span>
            ).
          </p>
        </div>

        <aside
          id="access"
          className="scroll-mt-20 rounded-xl border bg-card p-4 lg:sticky lg:top-20"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden />{' '}
            {role === 'owner' ? 'Share and manage access' : 'Who has access'}
          </h2>
          <ProjectAccessPanel
            projectId={projectId}
            me={me}
            onLeft={() => router.push('/app/projects')}
            className="mt-3"
          />
        </aside>
      </div>
    </div>
  );
}

function Bundles({
  title,
  Icon,
  listing,
  empty,
}: {
  title: string;
  Icon: typeof PackageIcon;
  listing: Listing<Bundle> | null;
  empty: string;
}) {
  return (
    <Group
      title={title}
      Icon={Icon}
      count={listing?.total}
      bytes={listing?.items.reduce((sum, item) => sum + item.bytes, 0)}
    >
      {!listing ? (
        <Loading />
      ) : listing.items.length ? (
        <ul className="divide-y">
          {listing.items.map(item => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm"
            >
              <span className="font-medium">{item.title}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {item.slug}
              </span>
              {item.release && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {item.release.platform}
                </span>
              )}
              {item.status !== 'ready' && (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                  uploading
                </span>
              )}
              <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                v{item.latestVersion || 1} · {item.fileCount} file
                {item.fileCount === 1 ? '' : 's'} · {formatBytes(item.bytes)} ·{' '}
                {day(item.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{empty}</Empty>
      )}
    </Group>
  );
}

function Group({
  title,
  Icon,
  count,
  bytes,
  children,
}: {
  title: string;
  Icon: typeof PackageIcon;
  count?: number;
  bytes?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" aria-hidden /> {title}
        {count !== undefined && (
          <span className="text-xs font-normal text-muted-foreground">
            {count}
          </span>
        )}
        {!!bytes && (
          <span className="ml-auto text-xs font-normal tabular-nums text-muted-foreground">
            {formatBytes(bytes)}
          </span>
        )}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const Loading = () => (
  <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
    <Loader2Icon className="size-3.5 animate-spin" /> Loading
  </p>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
    {children}
  </p>
);
