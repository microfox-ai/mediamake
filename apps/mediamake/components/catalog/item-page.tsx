import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon, ArrowUpRightIcon, BookOpenIcon } from 'lucide-react';
import { AccessActions } from '@/app/(public)/access/access-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MadeByLine, NeedBadge, UsesList } from '@/components/catalog/uses';
import { YouTubeEmbed } from '@/components/catalog/video';
import { accessLevel, getEntitlements, getViewer } from '@/lib/access';
import { directoryUrlOf, installPromptFor, isInstallable, toCard, toEntry, type ItemUse } from '@/lib/catalog';
import { itemPagePath } from '@/lib/catalog/paths';
import { getCatalogRecord } from '@/lib/catalog/records';
import { releasesOf } from '@/lib/catalog/releases';
import { accessRequestsDB, catalogArchiveDB, catalogVideosDB } from '@/lib/catalog/store';
import type { CatalogKind } from '@/lib/catalog/types';
import { registry } from '@/lib/skills/registry';

const KIND_LABEL: Partial<Record<CatalogKind, string>> = { mcp: 'MCP', app: 'App' };
const LIST_TAB: Partial<Record<CatalogKind, { href: string; label: string }>> = {
  mcp: { href: '/?tab=mcps', label: 'All MCPs' },
  app: { href: '/?tab=apps', label: 'All apps' },
};

/** The item as the viewer may see it, or null: for the page and its share preview. */
export async function viewableItem(kind: CatalogKind, slug: string) {
  const id = `${kind}/${slug}`;
  const record = await getCatalogRecord(id).catch(() => null);
  if (!record || record.kind !== kind) return null;
  const viewer = await getViewer();
  const entitlements = await getEntitlements(viewer);
  return { record, viewer, entitlements, entry: toEntry(entitlements, toCard(record)) };
}

/**
 * An MCP's or an app's own page, the link to share, like a skill's (/skills/<name>): what it is,
 * its intro video, how to install or open it, what it works with, the skills that use it and its
 * release notes. Who can see it follows the catalog: a locked item goes to its request-access page,
 * and one hidden from the viewer is not found.
 */
export async function CatalogItemPage({ kind, slug }: { kind: 'mcp' | 'app'; slug: string }) {
  const found = await viewableItem(kind, slug);
  if (!found) notFound();
  const { record, viewer, entitlements, entry: item } = found;
  if (item.access === 'locked') {
    if (record.listed === false) notFound();
    redirect(`/access?item=${encodeURIComponent(item.id)}`);
  }

  const [video, archived, pendingIds] = await Promise.all([
    catalogVideosDB.get(item.id).catch(() => null),
    catalogArchiveDB.get(item.id).catch(() => null),
    viewer.clientId ? accessRequestsDB.pendingFor(viewer.clientId).catch((): string[] => []) : Promise.resolve([] as string[]),
  ]);
  const installable = isInstallable(record);
  const releases = releasesOf(record.versions, 20);
  const directoryUrl = directoryUrlOf(record.install?.source);
  const here = itemPagePath(item.id);
  const loginHref = `/login?redirectTo=${encodeURIComponent(here)}`;
  // what it works with, named and linked when this viewer can open it
  const uses: (ItemUse & { title?: string; href?: string })[] = await Promise.all(
    (record.install?.uses ?? []).map(async use => {
      const used = await getCatalogRecord(use.id).catch(() => null);
      return used && accessLevel(entitlements, used) !== 'locked' ? { ...use, title: used.title, href: itemPagePath(use.id) } : use;
    }),
  );
  // the repo's skills that work with this MCP
  const usedBy = kind === 'mcp' ? (registry?.skills ?? []).flatMap(skill => skill.mcps?.filter(m => m.id === item.id).map(m => ({ skill, use: m })) ?? []) : [];
  const back = LIST_TAB[kind]!;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <img src="/brand/mediamake-mark.svg" alt="" className="size-6" />
            MediaMake
          </Link>
          <Link href={back.href} className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" /> {back.label}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{KIND_LABEL[kind]}</Badge>
              <Badge variant="secondary" className="capitalize">
                {item.status.replace('-', ' ')}
              </Badge>
              {item.visibility !== 'public' && <Badge variant="secondary">{item.visibility === 'network' ? 'Community' : 'Private'}</Badge>}
              {archived && (
                <Badge variant="secondary" title="Not in use any more: left off the homepage, still installs">
                  Archived
                </Badge>
              )}
              {item.version && <span className="font-mono text-xs text-muted-foreground">v{item.version}</span>}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{item.title}</h1>
            {item.summary && <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{item.summary}</p>}
            {item.madeBy && <MadeByLine madeBy={item.madeBy} />}
            {directoryUrl && (
              <p className="text-xs text-muted-foreground">
                In Claude&apos;s connector directory:{' '}
                <a href={directoryUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                  {directoryUrl.replace('https://', '')}
                </a>
              </p>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map(tag => (
                  <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {video?.youtubeId && (
            <section className="flex flex-col gap-2">
              <YouTubeEmbed youtubeId={video.youtubeId} title={video.title} className="overflow-hidden rounded-xl border" />
              <h2 className="pt-1 text-sm font-semibold">{video.title}</h2>
              {video.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{video.description}</p>}
            </section>
          )}

          {uses.length > 0 && <UsesList uses={uses} />}

          {releases.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="border-b pb-2">
                <h2 className="text-sm font-semibold">Release notes</h2>
                <p className="text-xs text-muted-foreground">Installed copies update to the latest version: say &ldquo;update {item.title}&rdquo; to Claude.</p>
              </div>
              {releases.map((release, i) => (
                <section key={release.version} id={`v${release.version}`} className="flex flex-col gap-1.5">
                  <h3 className="flex items-baseline gap-2 text-sm font-semibold">
                    <span className="font-mono">v{release.version}</span>
                    {i === 0 && <Badge variant="secondary">Latest</Badge>}
                    <time dateTime={release.publishedAt} className="text-xs font-normal text-muted-foreground">
                      {new Date(release.publishedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </time>
                  </h3>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{release.notes ?? 'No notes for this release.'}</p>
                </section>
              ))}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            {kind === 'app' && item.href && (
              <Button asChild>
                <Link href={item.href}>
                  Open {item.title} <ArrowUpRightIcon />
                </Link>
              </Button>
            )}
            {(kind === 'mcp' || installable) && (
              <AccessActions
                itemId={item.id}
                access={item.access}
                hasPackage={record.versions.length > 0}
                signedIn={!!viewer.clientId}
                pending={pendingIds.includes(item.id)}
                installPrompt={installable ? installPromptFor(item.id) : undefined}
                worksWith={uses.length > 0}
                loginHref={loginHref}
              />
            )}
            {kind === 'mcp' && item.href && (
              <Link href={item.href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                <BookOpenIcon className="size-3" /> Step-by-step setup
              </Link>
            )}
          </section>

          {usedBy.length > 0 && (
            <section className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">Skills that use it</h2>
              <ul className="divide-y">
                {usedBy.map(({ skill, use }) => (
                  <li key={skill.name} className="flex flex-col gap-1 py-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/skills/${skill.name}`} className="font-mono text-sm font-medium hover:underline">
                        {skill.name}
                      </Link>
                      <NeedBadge need={use.need} />
                    </div>
                    <p className="text-xs text-muted-foreground">{use.for}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
