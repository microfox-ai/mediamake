import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon, ExternalLinkIcon, GitForkIcon, LibraryIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MadeByLine, NeedBadge } from '@/components/catalog/uses';
import { YouTubeEmbed } from '@/components/catalog/video';
import { SkillActions } from '@/components/skills/skill-actions';
import { getCatalogRecord } from '@/lib/catalog/records';
import { installPromptFor } from '@/lib/catalog/install-prompt';
import { catalogArchiveDB, catalogVideosDB } from '@/lib/catalog/store';
import { slugOf } from '@/lib/catalog/types';
import type { RegistrySkill } from '@/lib/library/types';
import { skillMarkdownHtml } from '@/lib/skills/skill-md';
import { registry, skillMdUrl, skillNamed, skillRelations } from '@/lib/skills/registry';

/**
 * /skills/<name>: one skill's own page, the link to share. Every skill in skills.json is public, so
 * the page is the same for everyone: what it does, its intro video, what it works with, how it
 * relates to the other skills, its SKILL.md, and the install prompt. The list of skills is the
 * homepage's Skills tab (/?tab=skills).
 */

type Props = { params: Promise<{ slug: string }> };

// skills.json is bundled at build time; the video, the archive mark and SKILL.md's text are read again every few minutes
export const revalidate = 300;

export function generateStaticParams() {
  return (registry?.skills ?? []).map(skill => ({ slug: skill.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const skill = skillNamed((await params).slug);
  if (!skill) return { title: 'Skill · MediaMake' };
  const title = `${skill.name} · MediaMake skill`;
  return {
    title,
    description: skill.summary,
    openGraph: { title, description: skill.summary, type: 'article' },
    twitter: { card: 'summary', title, description: skill.summary },
  };
}

export default async function SkillPage({ params }: Props) {
  const { slug } = await params;
  const skill = skillNamed(slug);
  if (!skill) {
    // a skill listed in third-party.json or released by hand has its item page instead
    if (await getCatalogRecord(`skill/${slug}`).catch(() => null)) redirect(`/access?item=skill/${encodeURIComponent(slug)}`);
    notFound();
  }

  const id = `skill/${skill.name}`;
  const [video, archived, markdown] = await Promise.all([
    catalogVideosDB.get(id).catch(() => null),
    catalogArchiveDB.get(id).catch(() => null),
    skillMarkdownHtml(skill),
  ]);
  const { variants, usedBy } = skillRelations(skill);
  const category = registry?.categories.find(c => c.id === skill.category);
  const [owner] = skill.upstream?.split('/') ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <img src="/brand/mediamake-mark.svg" alt="" className="size-6" />
            MediaMake
          </Link>
          <Link href="/?tab=skills" className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" /> All skills
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Skill</Badge>
              <Badge variant="secondary" title={category?.about}>
                {skill.category}
              </Badge>
              {skill.internal && (
                <Badge variant="secondary" title="A sub-skill or housekeeping skill: other skills run it, or it looks after your machine">
                  Internal
                </Badge>
              )}
              {archived && (
                <Badge variant="secondary" title="Not in use any more: left off the homepage, still installs">
                  Archived
                </Badge>
              )}
              {skill.version && <span className="font-mono text-xs text-muted-foreground">v{skill.version}</span>}
            </div>
            <h1 className="break-words font-mono text-3xl font-semibold tracking-tight">{skill.name}</h1>
            {skill.title && skill.title.toLowerCase() !== skill.name.replace(/-/g, ' ') && <p className="text-lg font-medium">{skill.title}</p>}
            <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{skill.summary}</p>
            {/* on a phone the side column comes after SKILL.md: the buttons go up here too */}
            <div className="lg:hidden">
              <SkillActions itemId={id} installPrompt={installPromptFor(id)} title={skill.name} />
            </div>
            {skill.upstream && <MadeByLine madeBy={{ name: owner, repo: skill.upstream }} />}
            {skill.variantOf && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <GitForkIcon className="size-4" /> A variant of <SkillLink name={skill.variantOf} />
                {skill.variantRef && <> · modelled on {skill.variantRef}</>}
              </p>
            )}
          </div>

          {video?.youtubeId && (
            <section className="flex flex-col gap-2">
              <YouTubeEmbed youtubeId={video.youtubeId} title={video.title} className="overflow-hidden rounded-xl border" />
              <h2 className="pt-1 text-sm font-semibold">{video.title}</h2>
              {video.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{video.description}</p>}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 border-b pb-2">
              <h2 className="font-mono text-sm font-semibold">SKILL.md</h2>
              <a href={skillMdUrl(skill)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                On GitHub <ExternalLinkIcon className="size-3" />
              </a>
            </div>
            {markdown ? (
              <article className={MARKDOWN} dangerouslySetInnerHTML={{ __html: markdown }} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load it just now.{' '}
                <a href={skillMdUrl(skill)} target="_blank" rel="noreferrer" className="underline">
                  Read it on GitHub
                </a>
                .
              </p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Paste the install prompt into Claude: it sets the skill up, with what it needs.</p>
            <SkillActions itemId={id} installPrompt={installPromptFor(id)} title={skill.name} />
            <div className="flex flex-col gap-1 pt-1 text-xs">
              <a href={skillMdUrl(skill)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                SKILL.md on GitHub <ExternalLinkIcon className="size-3" />
              </a>
              <Link href={`/library?view=skills&skill=${encodeURIComponent(skill.name)}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                Runs and outputs in the Library <LibraryIcon className="size-3" />
              </Link>
            </div>
          </section>

          {skill.mcps && skill.mcps.length > 0 && (
            <Related title="Works with">
              {skill.mcps.map(mcp => (
                <li key={mcp.id} className="flex flex-col gap-1 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/access?item=${encodeURIComponent(mcp.id)}`} className="font-mono text-sm font-medium hover:underline">
                      {slugOf(mcp.id)}
                    </Link>
                    <NeedBadge need={mcp.need} />
                  </div>
                  <p className="text-xs text-muted-foreground">{mcp.for}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Without it:</span> {mcp.without}
                  </p>
                </li>
              ))}
            </Related>
          )}
          {skill.dependsOn && skill.dependsOn.length > 0 && <SkillList title="Runs these skills too" names={skill.dependsOn} />}
          {usedBy.length > 0 && <SkillList title="Used by" names={usedBy.map(s => s.name)} skills={usedBy} />}
          {variants.length > 0 && <SkillList title="Variants" names={variants.map(s => s.name)} skills={variants} />}
        </aside>
      </main>
    </div>
  );
}

function Related({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="divide-y">{children}</ul>
    </section>
  );
}

function SkillList({ title, names, skills }: { title: string; names: string[]; skills?: RegistrySkill[] }) {
  return (
    <Related title={title}>
      {names.map(name => {
        const skill = skills?.find(s => s.name === name) ?? skillNamed(name);
        return (
          <li key={name} className="flex flex-col gap-0.5 py-2">
            <SkillLink name={name} />
            {skill && <p className="line-clamp-2 text-xs text-muted-foreground">{skill.summary}</p>}
          </li>
        );
      })}
    </Related>
  );
}

function SkillLink({ name }: { name: string }) {
  return (
    <Link href={`/skills/${encodeURIComponent(name)}`} className="font-mono text-sm font-medium text-foreground hover:underline">
      {name}
    </Link>
  );
}

/** SKILL.md's look: no typography plugin in this app, so the elements are styled here. */
const MARKDOWN = [
  'min-w-0 text-sm leading-relaxed text-foreground/90',
  '[&>*+*]:mt-4',
  '[&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-semibold [&_h4]:font-semibold',
  '[&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 [&_li>ul]:mt-1 [&_li>ol]:mt-1',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_table]:block [&_table]:overflow-x-auto [&_table]:text-xs [&_th]:border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top',
  '[&_hr]:border-border [&_img]:max-w-full [&_img]:rounded-md',
].join(' ');
