'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Code2, Copy, ExternalLink, ShieldAlert, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthBadge } from '@/components/catalog/health';
import { NeedBadge } from '@/components/catalog/uses';
import { AuthorsLine } from '@/components/catalog/authors';
import { cn } from '@/lib/utils';
import { VIDEO_KINDS, directoryUrlOf, isAlwaysPublic, proofOf, type CatalogItemRecord, type CatalogKind, type InstallSource, type ItemTier } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';
import { onYouTubeThumbnailLoad, watchPath, youtubeUrl } from '@/lib/catalog/video';
import { itemPagePath } from '@/lib/catalog/paths';
import type { InstallChoice, InstallStep } from '@/lib/catalog/plan';
import { KIND_ICON } from './release-board';
import { AdvicePill, ArchivedPill, GroupLabel, Panel, ReadinessPill, TierPill } from './parts';
import { TIER_META, fetchItemDetail, formatDate, formatLeft, gateOf, itemPath, reachOf, tierOf, type ItemDetail } from './model';
import { CoursePanel, VideoPanel } from './video-panel';
import { CardSection, MadeWithSection, ReadmeEditor, SaveBar, ScreenshotsSection, SkillDetailsSection, StatusSection, useListingDraft } from './listing-editor';

/**
 * One catalog item's release page (/app/releases/<kind>/<slug>): its header
 * (what it is and where it stands), then its tabs. Listing is everything an
 * admin sets on its store listing, in one place (./listing-editor: its level,
 * advice, tier, health, editors' pick and archive, its card, a skill's
 * details, its video); README its README, full width; Made with this its
 * productions and screenshots; Access who can open it, what installing it
 * does, what it connects to and where it lives; History its versions and
 * tier changes. Gates and grants stay on the board and in the access sheet;
 * everything is also in `npm run catalog` and mm-release's tools.
 */

const KIND_LABEL: Record<CatalogKind, string> = { mcp: 'MCP', skill: 'Skill', app: 'App', tutorial: 'Tutorial', course: 'Course' };
const STATUS_LABEL: Record<CatalogItemRecord['status'], string> = { live: 'Live', beta: 'Beta', 'coming-soon': 'Coming soon' };

const DEFINED_IN: Record<NonNullable<ItemDetail['definedIn']>, string> = {
  database: 'Catalog database (npm run catalog)',
  'third-party.json': 'lib/catalog/third-party.json',
  'skills.json': '.agents/skills (skills.json)',
  'items.ts': 'lib/catalog/items.ts',
};

function formatBytes(bytes: number) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "microfox-ai/mediamake/.agents/skills/pack-brand-kit" from its GitHub URL. */
function shortGithub(url: string) {
  return url.replace(/^https:\/\/github\.com\//, '').replace(/\/tree\/[^/]+\//, '/');
}

/** Where a source installs from, in a few words. */
function describeSource(source: InstallSource): string {
  if (source.type === 'github-skill') return `Skill folder ${source.repo}/${source.path}`;
  const needs = [...(source.local?.env ?? []), ...(source.remote?.headers ?? [])].filter(s => s.required).map(s => s.name);
  const how = source.local
    ? `Runs ${[source.local.command, ...(source.local.args ?? [])].join(' ')}`
    : source.remote
      ? `Hosted at ${new URL(source.remote.url).host}`
      : `.mcpb from ${source.mcpb!.repo} releases`;
  return `${how}${needs.length ? ` · needs ${needs.join(', ')}` : ''}`;
}

/** How an item is installed, in a few words. */
function installsAs(item: CatalogItemRecord): string {
  if (item.kind === 'course') return 'Nothing to install: a course of tutorials';
  if (item.kind === 'tutorial') return 'Nothing to install: a YouTube video';
  const install = item.install;
  if (install?.source?.type === 'github-skill' && !item.versions.length) return `Skill folder, from ${install.source.repo}`;
  if (install?.source && !item.versions.length) return describeSource(install.source);
  if (!item.versions.length) return item.href ? `Nothing to install: a page at ${item.href}` : 'Nothing to install yet';
  const method = install?.method ?? (item.kind === 'skill' ? 'skill' : item.kind === 'mcp' ? 'mcpb' : item.kind === 'app' ? 'app' : 'manual');
  if (method === 'mcpb') return `.mcpb bundle${install?.entry ? ` (${install.entry})` : ''}`;
  if (method === 'skill') return 'Skill folder, from our package';
  return 'Our package, with its INSTALL.md';
}

function stepId(step: InstallStep) {
  return step.type === 'item' || step.type === 'source' ? step.id : undefined;
}

/** A step's name alone: what saying yes to a choice adds besides the item. */
function stepName(step: InstallStep) {
  if (step.type === 'repo') return `the ${step.repo} repo`;
  if (step.type === 'github-release') return step.name;
  return step.title;
}

/** A plan step as a title and a detail line. */
function describeStep(step: InstallStep): { title: string; detail?: string } {
  switch (step.type) {
    case 'repo':
      return { title: `Clone ${step.repo}`, detail: step.why };
    case 'github-release':
      return {
        title: `Download ${step.name}`,
        detail: `${step.repo} release · ${step.asset}${step.kind === 'chrome-extension' ? ' · loaded in Chrome by hand' : ''}`,
      };
    case 'item':
      return { title: `${KIND_LABEL[step.kind]}: ${step.title}`, detail: `v${step.version}, our package${step.entry ? ` (${step.entry})` : ''}` };
    case 'source':
      return { title: `${KIND_LABEL[step.kind]}: ${step.title}`, detail: describeSource(step.source) };
  }
}

export function ReleaseItem({ id }: { id: string }) {
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  // bumped after a change, to load the item again without the skeleton
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    setDetail(null);
    setError(null);
  }, [id]);

  useEffect(() => {
    let live = true;
    fetchItemDetail(id)
      .then(loaded => live && setDetail(loaded))
      .catch(e => live && setError({ message: (e as Error).message, status: (e as { status?: number }).status }));
    return () => {
      live = false;
    };
  }, [id, reloads]);

  if (error) {
    const title = error.status === 403 ? 'Admins only' : error.status === 404 ? `No item ${id}` : "Couldn't load it";
    const body =
      error.status === 403
        ? 'Release pages are for the site owner.'
        : error.status === 404
          ? 'It isn’t in the catalog database or the repo. Check the id on the Releases page.'
          : error.message;
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShieldAlert className="size-5" />
          </span>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{body}</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/releases">All releases</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-96 max-w-3xl rounded-2xl" />
      </div>
    );
  }

  return <ReleaseEditor detail={detail} onChanged={() => setReloads(n => n + 1)} />;
}

type TabId = 'listing' | 'readme' | 'made' | 'access' | 'history';

const TAB_LABEL: Record<TabId, string> = { listing: 'Listing', readme: 'README', made: 'Made with this', access: 'Access', history: 'History' };

/** The tab a link opens: `?tab=readme`, or History for a link to one release (…#v0.7.0). */
function tabFromUrl(tabs: TabId[]): TabId {
  if (typeof window === 'undefined') return 'listing';
  const asked = new URLSearchParams(window.location.search).get('tab') as TabId | null;
  if (asked && tabs.includes(asked)) return asked;
  return /^#v\d/.test(window.location.hash) ? 'history' : 'listing';
}

/**
 * The page once the item has loaded: its header, then its tabs. Listing holds what an admin sets
 * (components/releases/listing-editor); README its README, full width; Made with this its
 * productions and screenshots; Access who can open it, what installing it does, its connections and
 * where it lives; History its versions and tier changes. What waits to be saved sits in the save bar
 * at the foot, whichever tab is open.
 */
function ReleaseEditor({ detail, onChanged }: { detail: ItemDetail; onChanged: () => void }) {
  const now = Date.now();
  const tier = tierOf(detail.item, now);
  const isVideo = VIDEO_KINDS.includes(detail.item.kind);
  const tabs: TabId[] = isVideo ? ['listing', 'access', 'history'] : ['listing', ...(detail.readme ? (['readme'] as const) : []), 'made', 'access', 'history'];
  const [tab, setTab] = useState<TabId>('listing');
  const state = useListingDraft(detail, onChanged);

  // the tab a link names, once on the client
  useEffect(() => {
    setTab(tabFromUrl(tabs));
  }, []);
  // a link to one release (…#v0.7.0) lands on it
  useEffect(() => {
    if (tab === 'history' && window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: 'center' });
  }, [tab]);

  const open = (next: TabId) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'listing') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <Link href="/app/releases" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Releases
      </Link>

      <Header detail={detail} tier={tier} />

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1" role="tablist" aria-label="Release page">
        {tabs.map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => open(id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition-colors',
              tab === id ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TAB_LABEL[id]}
            {id === 'made' && (detail.listing?.media.length || proofOf(detail.readinessMark).length) ? (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {(detail.listing?.media.length ?? 0) + proofOf(detail.readinessMark).length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === 'listing' && (
        <div className="flex max-w-3xl flex-col gap-10">
          <StatusSection detail={detail} tier={tier} state={state} onChanged={onChanged} />
          {!isVideo && (
            <>
              <hr />
              <CardSection detail={detail} state={state} />
            </>
          )}
          {detail.item.kind === 'skill' && detail.skillDetails && (
            <>
              <hr />
              <SkillDetailsSection detail={detail} onChanged={onChanged} />
            </>
          )}
          <hr />
          {detail.item.kind === 'course' ? <CoursePanel detail={detail} onSaved={onChanged} /> : <VideoPanel detail={detail} onSaved={onChanged} />}
        </div>
      )}
      {tab === 'readme' && <ReadmeEditor detail={detail} state={state} />}
      {tab === 'made' && (
        <div className="flex max-w-3xl flex-col gap-10">
          <MadeWithSection detail={detail} onChanged={onChanged} />
          {!isVideo && (
            <>
              <hr />
              <ScreenshotsSection detail={detail} onChanged={onChanged} />
            </>
          )}
        </div>
      )}
      {tab === 'access' && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-6">
            <ReachPanel detail={detail} tier={tier} now={now} />
            <WherePanel detail={detail} />
          </div>
          {!isVideo && (
            <div className="flex min-w-0 flex-col gap-6">
              <InstallPanel detail={detail} />
              <ConnectionsPanel detail={detail} />
            </div>
          )}
        </div>
      )}
      {tab === 'history' && (
        <div className="max-w-3xl">
          <HistoryPanel item={detail.item} />
        </div>
      )}

      <SaveBar state={state} />
    </div>
  );
}

/** What the item is, in one line: its picture, its name and where it stands, and the links an admin opens. */
function Header({ detail, tier }: { detail: ItemDetail; tier: ItemTier }) {
  const { item, archive, installPrompt, code } = detail;
  const Icon = KIND_ICON[item.kind];
  const version = item.versions.at(-1)?.version ?? item.version;
  const picture = detail.listing?.icon ?? detail.listing?.headshot ?? item.cover ?? item.video?.thumbnail;
  const video = VIDEO_KINDS.includes(item.kind);
  return (
    <header className="flex flex-wrap items-start gap-4">
      <span className={cn('flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl', TIER_META[tier].soft)}>
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picture} alt="" onLoad={onYouTubeThumbnailLoad} onError={e => (e.currentTarget.style.display = 'none')} className="size-full object-cover" />
        ) : (
          <Icon className="size-6 opacity-80" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{item.title}</h2>
        <p className="text-sm text-muted-foreground">
          {KIND_LABEL[item.kind]}
          {version ? ` · v${version}` : ''} · <span className="font-mono text-xs">{item.id}</span>
          {item.status === 'coming-soon' ? ` · ${STATUS_LABEL[item.status]}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ReadinessPill readiness={item.readiness} />
          <TierPill tier={tier} />
          <AdvicePill advice={detail.listing?.advice} />
          {detail.listing?.editorsPick && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Star className="size-3 fill-current" /> Editors&apos; pick
            </span>
          )}
          {archive && <ArchivedPill />}
          {item.health && item.health !== 'healthy' && <HealthBadge health={item.health} note={item.healthNote} className="text-xs" />}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {installPrompt && <CopyPrompt prompt={installPrompt} />}
        {code && (
          <Button variant="ghost" size="sm" asChild>
            <a href={code} target="_blank" rel="noreferrer">
              <Code2 /> Code
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <a href={video ? watchPath(item.id) : itemPagePath(item.id)} target="_blank" rel="noreferrer">
            <ExternalLink /> {item.kind === 'course' ? 'Course page' : 'Its page'}
          </a>
        </Button>
      </div>
    </header>
  );
}

/** Copies the item's install prompt, for a computer without MediaMake: whoever pastes it signs in as themselves. */
function CopyPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      title="Copy its install prompt"
      onClick={async () => {
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : 'Install prompt'}
    </Button>
  );
}

function InstallPanel({ detail }: { detail: ItemDetail }) {
  const { item, plan } = detail;
  const title = 'What installing it does';
  if (!plan.ok) {
    return (
      <Panel title={title}>
        <p className="text-sm text-muted-foreground">
          {item.href && !item.versions.length && !item.install?.source
            ? `Nothing to install: it is a page of the app, ${item.href}.`
            : plan.error === 'Not found'
              ? 'Nothing to install.'
              : plan.error}
        </p>
      </Panel>
    );
  }
  const outright = plan.steps.filter(step => !step.forChoices);
  return (
    <Panel title={title} description="What Claude does with its install prompt, in order. It asks about the choices first.">
      <ol className="flex flex-col gap-3">
        {outright.map((step, i) => {
          const { title: stepTitle, detail: stepDetail } = describeStep(step);
          const other = stepId(step);
          const self = other === item.id;
          return (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">{i + 1}</span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {other && !self ? (
                    <Link href={itemPath(other)} className="hover:underline">
                      {stepTitle}
                    </Link>
                  ) : (
                    stepTitle
                  )}
                  {self && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">this item</span>}
                </p>
                {stepDetail && <p className="text-xs text-muted-foreground">{stepDetail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {plan.choices.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <GroupLabel>Choices it offers</GroupLabel>
          <ul className="flex flex-col gap-2">
            {plan.choices.map(choice => (
              <ChoiceRow key={choice.id} choice={choice} steps={plan.steps.filter(step => step.forChoices?.includes(choice.id))} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function ChoiceRow({ choice, steps }: { choice: InstallChoice; steps: InstallStep[] }) {
  // what saying yes adds besides the item itself (an extension, another skill)
  const extra = steps.filter(step => stepId(step) !== choice.id).map(stepName);
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2">
      <Link href={itemPath(choice.id)} className="text-sm font-medium hover:underline">
        {choice.title}
      </Link>
      <NeedBadge need={choice.need} />
      {choice.available ? (
        extra.length > 0 && <span className="text-xs text-muted-foreground">· also adds {extra.join(', ')}</span>
      ) : (
        <span className="text-xs text-destructive">Can&apos;t be installed: {choice.unavailable?.startsWith('MediaMake') ? 'not in the catalog' : choice.unavailable}</span>
      )}
    </li>
  );
}

function ConnectionsPanel({ detail }: { detail: ItemDetail }) {
  const { item, usedBy, names } = detail;
  const requires = item.install?.requires ?? [];
  const uses = item.install?.uses ?? [];
  const title = 'Connections';
  if (!requires.length && !uses.length && !usedBy.length) {
    return (
      <Panel title={title}>
        <p className="text-sm text-muted-foreground">Stands alone: it needs nothing, and nothing needs or uses it.</p>
      </Panel>
    );
  }
  return (
    <Panel title={title} description="What it needs first, what it works with, and what relies on it.">
      <div className="flex flex-col gap-5">
        {requires.length > 0 && (
          <div>
            <GroupLabel>Needs first</GroupLabel>
            <ul className="flex flex-col gap-1.5">
              {requires.map(req => (
                <li key={req.type === 'item' ? req.id : req.type === 'repo' ? req.repo : `${req.repo}:${req.asset}`} className="text-sm">
                  {req.type === 'item' ? (
                    <Link href={itemPath(req.id)} className="font-medium hover:underline">
                      {names[req.id] ?? req.id}
                    </Link>
                  ) : req.type === 'repo' ? (
                    <>
                      <a href={`https://github.com/${req.repo}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                        {req.repo}
                      </a>
                      <span className="text-muted-foreground"> repo{req.why ? `: ${req.why}` : ''}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{req.name}</span>
                      <span className="text-muted-foreground"> from {req.repo} releases ({req.asset})</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {uses.length > 0 && (
          <div>
            <GroupLabel>Works with</GroupLabel>
            <ul className="divide-y rounded-lg border">
              {uses.map(use => (
                <li key={use.id} className="flex flex-col gap-1 px-3 py-2.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={itemPath(use.id)} className="text-sm font-medium hover:underline">
                      {names[use.id] ?? use.id}
                    </Link>
                    <NeedBadge need={use.need} />
                    {!names[use.id] && <span className="text-xs text-destructive">not in the catalog yet</span>}
                  </span>
                  <span className="text-sm text-muted-foreground">{use.for}</span>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Without it:</span> {use.without}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {usedBy.length > 0 && (
          <div>
            <GroupLabel>Used by</GroupLabel>
            <ul className="flex flex-col gap-1.5">
              {usedBy.map(user => (
                <li key={user.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href={itemPath(user.id)} className="font-medium hover:underline">
                    {user.title}
                  </Link>
                  {user.how === 'requires' ? (
                    <span className="text-xs text-muted-foreground">needs it installed first</span>
                  ) : (
                    <>
                      <NeedBadge need={user.need!} />
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{user.for}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

/** A change of tier in the history; entries from before the ladder carry a stage only. */
const STAGE_TEXT: Record<CatalogItemRecord['visibility'], string> = {
  private: 'Moved to development (now the cohort)',
  network: 'Opened to the community (now Pro)',
  public: 'Released to the public',
};

function stageTitle(stage: NonNullable<CatalogItemRecord['stageHistory']>[number], first: boolean) {
  const why =
    stage.by === 'gate' ? ' (its gate ended)' : stage.by === 'migration' ? ' (moved onto the membership ladder)' : stage.by === 'skills-public' || stage.by === 'made-by-others' ? ' (always public)' : '';
  if (!stage.tier) return (first && stage.visibility === 'private' ? 'Added, in development' : STAGE_TEXT[stage.visibility]) + why;
  const where = stage.tier === 'admin' ? 'the vault' : tierLabel(stage.tier);
  return `${first ? 'Added, in' : stage.tier === 'public' ? 'Released to' : 'Moved to'} ${where}${why}`;
}

function HistoryPanel({ item }: { item: CatalogItemRecord }) {
  const events = [
    ...item.versions.map(version => ({
      key: `v${version.version}`,
      at: version.publishedAt,
      title: `v${version.version} published`,
      body: version.notes,
      meta: formatBytes(version.bytes),
    })),
    ...(item.stageHistory ?? []).map((stage, i) => ({
      key: `stage-${i}`,
      at: stage.at,
      title: stageTitle(stage, i === 0),
      body: undefined as string | undefined,
      meta: undefined as string | undefined,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (!events.length) events.push({ key: 'listed', at: item.releasedAt, title: 'Listed in the catalog', body: undefined, meta: undefined });

  return (
    <Panel title="History">
      <ol className="relative flex flex-col gap-4">
        <span className="absolute bottom-2 left-[5px] top-2 w-px bg-border" aria-hidden />
        {events.map(event => (
          <li key={event.key} id={event.key} className="relative flex scroll-mt-24 gap-3 rounded-lg target:bg-muted/60">
            <span className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-muted-foreground/40 bg-card" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{event.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(event.at)}</span>
                {event.meta && <span className="text-xs text-muted-foreground">· {event.meta}</span>}
              </p>
              {event.body && <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{event.body}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function ReachPanel({ detail, tier, now }: { detail: ItemDetail; tier: ItemTier; now: number }) {
  const { item, members, grants, publicReleasesOpen } = detail;
  const always = isAlwaysPublic(item);
  const inCode = detail.definedIn === 'items.ts';
  const gate = gateOf(item, now);
  const rows = [
    { label: 'Admins', on: true },
    ...reachOf(members, tier).map(row => ({ label: `${tierLabel(row.tier)} · ${row.count}`, on: row.on })),
    {
      label:
        always || item.openToAll
          ? 'Everyone, always'
          : publicReleasesOpen
            ? 'Everyone'
            : 'Everyone (public releases are locked site-wide)',
      on: tier === 'public' && (always || !!item.openToAll || publicReleasesOpen),
    },
  ];
  const description = always
    ? item.madeBy
      ? 'Made by others: always public, never gated.'
      : 'A skill in the public repo: always public, never gated.'
    : item.openToAll
      ? 'A page anyone can open, even while public releases are locked.'
      : TIER_META[tier].who;
  return (
    <Panel
      title="Who can open it"
      description={description}
      footer={
        !inCode &&
        !always && (
          <>
            <span className="mr-auto text-xs text-muted-foreground">
              {grants.length === 1 ? '1 grant reaches it' : `${grants.length} grants reach it`}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/app/releases?access=${encodeURIComponent(item.id)}`}>
                <Users /> Manage access
              </Link>
            </Button>
          </>
        )
      }
    >
      <p className="text-sm">
        <span className="text-muted-foreground">Tier:</span> <span className="font-medium">{TIER_META[tier].label}</span>
        <span className="text-xs text-muted-foreground"> · set under Listing</span>
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map(row => (
          <li key={row.label} className={cn('flex items-center gap-2 text-sm', !row.on && 'text-muted-foreground line-through decoration-muted-foreground/40')}>
            <span className={cn('size-1.5 shrink-0 rounded-full', row.on ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
            {row.label}
          </li>
        ))}
      </ul>
      {gate && (
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(gate.progress * 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            Public by itself in {formatLeft(gate.msLeft)}, on {formatDate(gate.end)}
          </p>
        </div>
      )}
    </Panel>
  );
}

function WherePanel({ detail }: { detail: ItemDetail }) {
  const { item, definedIn, code, site = '' } = detail;
  const pageUrl = `${site}${itemPagePath(item.id)}`;
  const latest = item.versions.at(-1);
  const directoryUrl = directoryUrlOf(item.install?.source);
  const rows: [string, React.ReactNode][] = [
    ['Made by', item.madeBy ? `${item.madeBy.name}${item.madeBy.license ? ` · ${item.madeBy.license}` : ''}` : 'Us'],
    ...(detail.authors
      ? ([
          [
            'Authors',
            detail.authors.length > 0 ? (
              <AuthorsLine key="authors" authors={detail.authors} label={false} className="text-sm" />
            ) : (
              <span key="authors" className="text-muted-foreground">
                None yet: <code className="text-xs">mm submit authors {item.slug} --add=&lt;email&gt;</code>
              </span>
            ),
          ],
        ] as [string, React.ReactNode][])
      : []),
    [
      'Code',
      code ? (
        <a href={code} target="_blank" rel="noreferrer" className="break-all hover:underline">
          {shortGithub(code)}
        </a>
      ) : (
        <span className="text-muted-foreground">Not recorded</span>
      ),
    ],
    [
      'Package',
      latest ? (
        `v${latest.version} · ${formatBytes(latest.bytes)} · ${formatDate(latest.publishedAt)}`
      ) : (
        <span className="text-muted-foreground">
          {item.install?.source
            ? 'None: it installs from its source'
            : item.href
              ? 'None: it is a page of the app'
              : VIDEO_KINDS.includes(item.kind)
                ? 'None: it is a video'
                : 'None published'}
        </span>
      ),
    ],
    ...(latest ? ([['Stored at', <code key="key" className="break-all text-xs">{latest.storageKey}</code>]] as [string, React.ReactNode][]) : []),
    ['Installs as', installsAs(item)],
    ...(directoryUrl
      ? ([
          [
            'Claude directory',
            <a key="directory" href={directoryUrl} target="_blank" rel="noreferrer" className="break-all hover:underline">
              {directoryUrl.replace('https://', '')}
            </a>,
          ],
        ] as [string, React.ReactNode][])
      : []),
    ['Defined in', definedIn ? DEFINED_IN[definedIn] : '—'],
    ...(item.video?.youtubeId
      ? ([
          [
            'Video',
            <a key="video" href={youtubeUrl(item.video.youtubeId)} target="_blank" rel="noreferrer" className="break-all hover:underline">
              {youtubeUrl(item.video.youtubeId).replace('https://www.', '')}
            </a>,
          ],
        ] as [string, React.ReactNode][])
      : []),
    VIDEO_KINDS.includes(item.kind)
      ? [
          'Plays at',
          <a key="page" href={watchPath(item.id)} target="_blank" rel="noreferrer" className="break-all hover:underline">
            {watchPath(item.id)}
          </a>,
        ]
      : [
          'Item page',
          <a key="page" href={pageUrl} target="_blank" rel="noreferrer" className="break-all hover:underline">
            {pageUrl.replace(/^https?:\/\//, '')}
          </a>,
        ],
    // an app opens somewhere of its own; a skill's or MCP's link is its item page, already above
    ...(item.href && !VIDEO_KINDS.includes(item.kind) && item.href !== itemPagePath(item.id)
      ? ([
          [
            'Opens at',
            <a key="opens" href={item.href} target="_blank" rel="noreferrer" className="break-all hover:underline">
              {item.href}
            </a>,
          ],
        ] as [string, React.ReactNode][])
      : []),
  ];
  return (
    <Panel title="Where it lives">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
