import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLinkIcon, GitForkIcon, LibraryIcon } from 'lucide-react';
import { DetailsButton } from '@/components/app-shell/item-details';
import { ItemShell } from '@/components/app-shell/item-shell';
import { AboutCard, README_PROSE, ReadmeView } from '@/components/catalog/item-listing';
import { CatalogItemPage } from '@/components/catalog/item-page';
import { ItemTabs } from '@/components/catalog/item-tabs';
import { ListingScreenshots } from '@/components/catalog/listing';
import { MadeWithThis } from '@/components/catalog/made-with';
import { ItemFeedback } from '@/components/feedback/item-feedback';
import { DependsOn, SkillFilesCard, SkillOwnerTools } from '@/components/catalog/skill-details';
import { MadeByLine } from '@/components/catalog/uses';
import { ItemRating } from '@/components/ratings/item-rating';
import { SkillActions } from '@/components/skills/skill-actions';
import { detailsKey } from '@/lib/app-shell/details-key';
import { getCatalogRecord } from '@/lib/catalog/records';
import { installPromptFor } from '@/lib/catalog/install-prompt';
import { skillHeadshot } from '@/lib/catalog/items';
import { listingBadges } from '@/lib/catalog/listing';
import { itemReadme, skillReadmeText } from '@/lib/catalog/readme-data';
import { natureInfo, natureOf, readmeChecks, readmeProfile, registryDependencies, registrySkillFiles, skillDetailsView, suggestedType, typeInfo, typeOf } from '@/lib/catalog/skill-profile';
import { itemPath } from '@/lib/catalog/summary';
import { catalogArchiveDB, catalogListingDB, catalogReadinessDB, catalogVideosDB, skillProfilesDB } from '@/lib/catalog/store';
import { proofOf } from '@/lib/catalog/types';
import type { RegistrySkill } from '@/lib/library/types';
import { ratingsDB } from '@/lib/ratings/store';
import { skillMarkdownHtml } from '@/lib/skills/skill-md';
import { registry, skillMdUrl, skillNamed, skillRelations, SKILLS_GITHUB } from '@/lib/skills/registry';

/**
 * /skills/<name>: one skill's own page, the link to share, laid out as GitHub lays out a repo. On the
 * left its README, the skill's store listing (a video first, its title, its badges, how to use it;
 * components/catalog/item-listing), with tabs beside it for how it works (its SKILL.md), what was made
 * with it and feedback. On the right a narrow column: what it is, its tags, its rating, its size, the
 * install prompt, and what it works with. Every skill in skills.json is public, so the page is the same
 * for everyone, inside the app's sidebar (ItemShell: signed out, the sidebar holds a Sign in button;
 * admins get a Release page button). The list of skills is the homepage's Skills tab (/?tab=skills).
 */

type Props = { params: Promise<{ slug: string }> };

// skills.json is bundled at build time; the video, the archive and Ready marks, the listing and SKILL.md's text are read again every few minutes
export const revalidate = 300;

export function generateStaticParams() {
  return (registry?.skills ?? []).map(skill => ({ slug: skill.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const skill = skillNamed((await params).slug);
  if (!skill) return { title: 'Skill · MediaMake' };
  const title = `${skill.name} · MediaMake skill`;
  const description = skill.listing?.description ?? skill.summary;
  // its headshot is the picture a shared link shows
  const headshot = skillHeadshot(skill);
  return {
    title,
    description,
    openGraph: { title, description, type: 'article', ...(headshot && { images: [headshot] }) },
    twitter: { card: headshot ? 'summary_large_image' : 'summary', title, description, ...(headshot && { images: [headshot] }) },
  };
}

export default async function SkillPage({ params }: Props) {
  const { slug } = await params;
  const skill = skillNamed(slug);
  if (!skill) {
    // a skill listed in third-party.json or released by hand: the same page, from its catalog record
    if (await getCatalogRecord(`skill/${slug}`).catch(() => null)) return <CatalogItemPage kind="skill" slug={slug} />;
    notFound();
  }

  const id = `skill/${skill.name}`;
  const key = detailsKey.catalog(id);
  const { variants: forks, usedBy } = skillRelations(skill);
  const [video, archived, readiness, listing, markdown, rating, profile, readmeText, named] = await Promise.all([
    catalogVideosDB.get(id).catch(() => null),
    catalogArchiveDB.get(id).catch(() => null),
    catalogReadinessDB.get(id).catch(() => null),
    catalogListingDB.get(id).catch(() => null),
    skillMarkdownHtml(skill),
    ratingsDB.summary(id).catch(() => null),
    skillProfilesDB.get(key).catch(() => null),
    skillReadmeText(skill),
    skillProfilesDB.subsetsOf(skill.name).catch(() => []),
  ]);
  // its subset skills: its variants, and the store skills that name it as their superset
  const variants = [...forks, ...named.map(skillNamed).filter((found): found is RegistrySkill => !!found && !forks.includes(found))];
  const category = registry?.categories.find(c => c.id === skill.category);
  const [owner] = skill.upstream?.split('/') ?? [];
  const proof = proofOf(readiness);
  const ready = proof.length > 0;
  // what an admin set on the listing wins over what the README.md says
  const description = listing?.description ?? skill.listing?.description ?? skill.summary;
  const headshot = listing?.headshot ?? skillHeadshot(skill) ?? video?.thumbnail;
  const ownTags = [...new Set([skill.category, ...(skill.listing?.tags ?? [])])];
  const tags = [...new Set([...ownTags, ...(listing?.tags ?? [])])];
  // its details (lib/catalog/skill-profile): what was set on this page, else what its README.md states, else the likely type
  const written = listing?.readme?.trim() ? listing.readme : readmeText;
  const details = skillDetailsView({
    key,
    profile,
    stated: { nature: natureOf(skill.listing?.nature), type: typeOf(skill.listing?.type), ...readmeProfile(readmeText) },
    suggested: suggestedType(skill, variants.length > 0),
    variantOf: skill?.variantOf,
    tags: listing?.tags,
    ownTags,
  });
  if (details.superset && skillNamed(details.superset)) details.supersetHref = `/skills/${details.superset}`;
  const depends = registryDependencies(skill, name => skillNamed(name)?.summary);
  const files = registrySkillFiles(skill, SKILLS_GITHUB);
  const size = skill.bytes !== undefined ? { bytes: skill.bytes, files: skill.files } : undefined;
  const deps = (skill.dependsOn?.length ?? 0) + (skill.mcps?.length ?? 0);
  const title = skill.title && skill.title.toLowerCase() !== skill.name.replace(/-/g, ' ') ? skill.title : skill.name;
  const readme = await itemReadme({
    facts: { kind: 'skill', name: skill.name, title, summary: description, description: skill.description, youtubeId: video?.youtubeId },
    skill,
    listingReadme: listing?.readme,
  });
  const made = proof.length + (listing?.media.length ?? 0);

  return (
    <ItemShell back={{ href: '/?tab=skills', label: 'All skills' }} releasePath={itemPath(id)}>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-muted-foreground">
            <span title={category?.about}>{skill.category}</span>
            <span aria-hidden>/</span>
            <span className="font-semibold text-foreground">{skill.name}</span>
            {skill.internal && <span className="rounded-full border px-2 py-0.5 font-sans text-[11px]">Internal</span>}
            {archived && <span className="rounded-full border px-2 py-0.5 font-sans text-[11px]">Archived</span>}
          </p>
          <ItemTabs
            aliases={{ 'made-with-this': 'made', screenshots: 'made', 'skill-md': 'how' }}
            tabs={[
              {
                id: 'readme',
                label: 'README',
                content: (
                  <div className="flex min-w-0 flex-col gap-5">
                    {files && <SkillFilesCard files={files} />}
                    <ReadmeView id={id} kind="skill" title={title} readme={readme} badges={listingBadges({ beta: !ready, tier: 'public', version: skill.version, size, deps })} video={video} headshot={headshot} />
                  </div>
                ),
              },
              {
                id: 'how',
                label: 'How it works',
                content: (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                      <h2 className="font-mono text-sm font-semibold">SKILL.md</h2>
                      <a href={skillMdUrl(skill)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
                        On GitHub <ExternalLinkIcon className="size-3" />
                      </a>
                    </div>
                    {markdown ? (
                      <article className={README_PROSE} dangerouslySetInnerHTML={{ __html: markdown }} />
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
                ),
              },
              {
                id: 'made',
                label: 'Made with this',
                count: made,
                content: (
                  <div className="flex flex-col gap-6">
                    <MadeWithThis itemId={id} mark={readiness} />
                    <ListingScreenshots itemId={id} media={listing?.media} />
                  </div>
                ),
              },
              { id: 'feedback', label: 'Feedback', content: <ItemFeedback itemId={id} title={skill.name} version={skill.version} /> },
            ]}
          />
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <AboutCard
            kind="skill"
            description={description}
            tags={tags}
            rating={<ItemRating itemId={id} title={skill.name} version={skill.version} initial={rating} />}
            facts={{ ready, tier: 'Public · open to everyone', version: skill.version, size, nature: natureInfo(details.nature), ...(details.type && { type: { ...typeInfo(details.type), of: details.superset, ofHref: details.supersetHref } }) }}
          >
            {skill.upstream && <MadeByLine madeBy={{ name: owner, repo: skill.upstream }} />}
            {skill.variantOf && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <GitForkIcon className="size-4" /> A variant of <SkillLink name={skill.variantOf} />
                {skill.variantRef && <> · modelled on {skill.variantRef}</>}
              </p>
            )}
            <SkillOwnerTools itemKey={key} title={title} view={details} checks={readmeChecks(written, details.nature, depends.length > 0)} />
          </AboutCard>

          <section className="flex flex-col gap-3 border-t pt-5">
            <h2 className="text-sm font-semibold">Install</h2>
            <p className="text-xs text-muted-foreground">Paste the install prompt into Claude: it sets the skill up, with what it needs.</p>
            <SkillActions installPrompt={installPromptFor(id)} title={skill.name} />
            <div className="flex flex-col gap-1 pt-1 text-xs">
              <Link href={`/library?view=skills&skill=${encodeURIComponent(skill.name)}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                Runs and outputs in the Library <LibraryIcon className="size-3" />
              </Link>
            </div>
          </section>

          {depends.length > 0 && (
            <div className="border-t pt-5">
              <DependsOn depends={depends} />
            </div>
          )}
          {usedBy.length > 0 && <SkillList title="Used by" names={usedBy.map(s => s.name)} skills={usedBy} />}
          {variants.length > 0 && <SkillList title="Subset skills" names={variants.map(s => s.name)} skills={variants} />}
        </aside>
      </main>
    </ItemShell>
  );
}

function Related({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1 border-t pt-5">
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
    <DetailsButton detailsKey={detailsKey.catalog(`skill/${name}`)} href={`/skills/${encodeURIComponent(name)}`} className="font-mono text-sm font-medium text-foreground">
      {name}
    </DetailsButton>
  );
}
