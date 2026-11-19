import Link from 'next/link';
import { BoxIcon, HardDriveIcon, LayersIcon, OctagonAlertIcon, ShapesIcon, Share2Icon, ShieldCheckIcon, TagIcon, TriangleAlertIcon, UsersIcon } from 'lucide-react';
import { VideoThumb, YouTubeEmbed } from '@/components/catalog/video';
import { placeholderBackground } from '@/lib/catalog/video';
import { sizeLabel, type ListingBadge } from '@/lib/catalog/listing';
import type { ItemReadme } from '@/lib/catalog/readme';
import { adviceInfo, levelInfo, type ItemAdvice, type Readiness } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';

/**
 * The parts of an item's listing, shared by its own page (/skills/<name>,
 * /mcps/<slug>, /apps/<slug>) and the item dialog. The page opens like an
 * app store's (ItemHero: its icon, title, one line, badges and the install
 * button; AdviceBanner when it is not recommended or deprecated; ItemMedia:
 * its video or headshot), then its tabs with the README (ReadmeView with
 * `header={false}`) and a narrow About column on the right (AboutCard). The
 * dialog draws the README with its own header (the video first, the title,
 * the badges). No hooks, so server pages and the dialog both use them.
 */

/** Strong, solid colours: a level, a failure or a warning is read at a glance (Production green, Beta amber, Alpha and warnings red). */
const TONE: Record<ListingBadge['tone'], string> = {
  good: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
  warn: 'bg-amber-400 text-amber-950',
  bad: 'bg-red-600 text-white dark:bg-red-500 dark:text-red-950',
  plain: 'bg-muted text-muted-foreground',
};

/** The README's look: no typography plugin in this app, so the elements are styled here. */
export const README_PROSE = [
  'min-w-0 text-sm leading-relaxed text-foreground/90',
  '[&>*+*]:mt-4',
  '[&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:border-b [&_h2]:pb-1.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-semibold [&_h4]:font-semibold',
  '[&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 [&_li>ul]:mt-1 [&_li>ol]:mt-1',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_table]:block [&_table]:overflow-x-auto [&_table]:text-xs [&_th]:border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top',
  '[&_hr]:border-border [&_img]:max-w-full [&_img]:rounded-md',
  // a video dropped into the README plays in place, at 16:9
  '[&_.readme-video]:relative [&_.readme-video]:aspect-video [&_.readme-video]:overflow-hidden [&_.readme-video]:rounded-lg [&_.readme-video]:bg-black',
  '[&_.readme-video>*]:absolute [&_.readme-video>*]:inset-0 [&_.readme-video>*]:size-full [&_.readme-video>*]:border-0',
  // a run of pictures is a grid of example outputs, captioned by their alt text
  '[&_.readme-gallery]:grid [&_.readme-gallery]:grid-cols-2 [&_.readme-gallery]:gap-3 sm:[&_.readme-gallery]:grid-cols-3',
  '[&_.readme-gallery_figure]:flex [&_.readme-gallery_figure]:min-w-0 [&_.readme-gallery_figure]:flex-col [&_.readme-gallery_figure]:gap-1.5',
  '[&_.readme-gallery_a]:block [&_.readme-gallery_img]:aspect-video [&_.readme-gallery_img]:w-full [&_.readme-gallery_img]:rounded-lg [&_.readme-gallery_img]:border [&_.readme-gallery_img]:bg-muted [&_.readme-gallery_img]:object-cover',
  '[&_.readme-gallery_figcaption]:line-clamp-2 [&_.readme-gallery_figcaption]:text-xs [&_.readme-gallery_figcaption]:text-muted-foreground',
].join(' ');

export function ListingBadges({ badges, className }: { badges: ListingBadge[]; className?: string }) {
  if (!badges.length) return null;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map(badge => (
        <li key={badge.label} title={badge.title} className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE[badge.tone])}>
          {badge.label}
        </li>
      ))}
    </ul>
  );
}

/** An MCP's or an app's icon; without one, its first letter on its own colour. */
export function ItemIcon({ id, title, src, className }: { id: string; title: string; src?: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn('size-10 shrink-0 rounded-lg border bg-background object-cover', className)} />
  ) : (
    <span aria-hidden className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-semibold text-white', className)} style={{ background: placeholderBackground(id) }}>
      {title.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The top of an item's page, as an app store opens a listing: its icon (an MCP's or an app's), its
 * title, what it is in a line, its badges (its level first, in a strong colour) and its main action
 * (`actions`: install, open, request access). Stacks on a phone.
 */
export function ItemHero({
  id,
  kind,
  title,
  description,
  icon,
  badges,
  actions,
  footnote,
}: {
  id: string;
  kind: 'skill' | 'mcp' | 'app';
  title: string;
  description?: string;
  icon?: string;
  badges: ListingBadge[];
  actions?: React.ReactNode;
  /** A small line under the actions: who made it, where else it is. */
  footnote?: React.ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
      {kind !== 'skill' && <ItemIcon id={id} title={title} src={icon} className="size-16 rounded-2xl text-2xl sm:size-20" />}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && (
            <p className="line-clamp-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground" title={description}>
              {description}
            </p>
          )}
        </div>
        <ListingBadges badges={badges} />
        {actions && <div className="pt-1">{actions}</div>}
        {footnote && <div className="text-xs text-muted-foreground">{footnote}</div>}
      </div>
    </header>
  );
}

/**
 * A warning under the hero when MediaMake says not to use the item (its listing's advice): Not
 * recommended or Deprecated, why, and what to use instead.
 */
export function AdviceBanner({ advice, note, instead }: { advice?: ItemAdvice; note?: string; instead?: { title: string; href?: string } }) {
  if (!advice || advice === 'recommended') return null;
  const Icon = advice === 'deprecated' ? OctagonAlertIcon : TriangleAlertIcon;
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-100">
      <Icon className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold">{adviceInfo(advice).label}</p>
        {note && <p className="leading-relaxed">{note}</p>}
        {instead && (
          <p>
            Use{' '}
            {instead.href ? (
              <Link href={instead.href} className="font-semibold underline underline-offset-4">
                {instead.title}
              </Link>
            ) : (
              <span className="font-semibold">{instead.title}</span>
            )}{' '}
            instead.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * What an item's page shows under its hero: the video its README opens with or its intro, else its
 * headshot. Nothing without one: the hero already shows its name, so a title on a colour would only
 * take room.
 */
export function ItemMedia({
  id,
  title,
  readme,
  video,
  headshot,
}: {
  id: string;
  title: string;
  readme: ItemReadme;
  video?: { youtubeId?: string; title?: string } | null;
  headshot?: string;
}) {
  const youtubeId = readme.video?.youtubeId ?? (readme.video?.src ? undefined : video?.youtubeId);
  if (youtubeId) return <YouTubeEmbed youtubeId={youtubeId} title={video?.title ?? title} className="border" />;
  if (readme.video?.src) return <video src={readme.video.src} controls playsInline preload="metadata" poster={headshot} className="aspect-video w-full rounded-xl border bg-black" />;
  if (!headshot) return null;
  return <VideoThumb id={id.replace(/^catalog:/, '')} title={title} src={headshot} className="rounded-xl border" />;
}

/**
 * The README. With its header (the item dialog), what every README opens with, drawn the same for
 * every item (its video, else its headshot; its title with an MCP's or app's icon; its badges), then
 * the README's own text. Without it (`header={false}`, the item's page, whose hero drew them), its text alone.
 */
export function ReadmeView({
  id,
  kind,
  title,
  readme,
  badges,
  video,
  headshot,
  icon,
  heading: Heading = 'h1',
  header = true,
  className,
}: {
  /** The item's id or key: picks the colour of an icon without a picture. */
  id: string;
  kind: 'skill' | 'mcp' | 'app';
  title: string;
  readme: ItemReadme;
  badges: ListingBadge[];
  /** The item's intro video, played when the README opens with none of its own. */
  video?: { youtubeId?: string; title?: string } | null;
  headshot?: string;
  icon?: string;
  heading?: 'h1' | 'h2';
  /** False on the item's page: its hero and media already show the video, the title and the badges. */
  header?: boolean;
  className?: string;
}) {
  const name = readme.title ?? title;
  if (!header) {
    return readme.html ? <article className={cn(README_PROSE, className)} dangerouslySetInnerHTML={{ __html: readme.html }} /> : null;
  }
  return (
    <div className={cn('flex min-w-0 flex-col gap-5', className)}>
      <ItemMedia id={id} title={name} readme={readme} video={video} headshot={headshot} />
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          {kind !== 'skill' && <ItemIcon id={id} title={name} src={icon} />}
          <Heading className="min-w-0 break-words text-2xl font-semibold tracking-tight">{name}</Heading>
        </div>
        <ListingBadges badges={badges} />
      </div>
      {readme.html && <article className={README_PROSE} dangerouslySetInnerHTML={{ __html: readme.html }} />}
    </div>
  );
}

/** One fact in the About column: an icon, what it is, its value. */
export function AboutRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * The top of the right column, as GitHub's About: what the item is in a
 * line or two, its tags, its rating (`rating`, a slot) and its facts.
 */
export function AboutCard({
  kind,
  description,
  tags,
  rating,
  facts,
  children,
}: {
  kind: 'skill' | 'mcp' | 'app';
  description?: string;
  tags?: string[];
  rating?: React.ReactNode;
  facts: {
    /** Its level: Alpha, Beta or Production (`ready`). */
    level?: Readiness;
    tier?: string;
    version?: string;
    size?: { bytes: number; files?: number };
    deps?: number;
    people?: string;
    /** A skill's nature and type (lib/catalog/skill-profile): the word, and what it means. */
    nature?: { label: string; about: string };
    /** `of`: a subset's superset skill, and its page when it has one. */
    type?: { label: string; about: string; of?: string; ofHref?: string };
  };
  children?: React.ReactNode;
}) {
  const KIND = { skill: 'Skill', mcp: 'MCP', app: 'App' }[kind];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">About</h2>
      {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {tags && tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {tags.map(tag => (
            <li key={tag} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium">
              {tag}
            </li>
          ))}
        </ul>
      )}
      {rating}
      <ul className="flex flex-col gap-2">
        <AboutRow icon={BoxIcon} label="Kind">
          {KIND}
          {facts.version && <span className="text-muted-foreground"> · v{facts.version.replace(/^v/, '')}</span>}
        </AboutRow>
        {facts.nature && (
          <AboutRow icon={Share2Icon} label="Nature">
            <span title={facts.nature.about}>{facts.nature.label}</span>
          </AboutRow>
        )}
        {facts.type && (
          <AboutRow icon={ShapesIcon} label="Type">
            <span title={facts.type.about}>{facts.type.label}</span>
            {facts.type.of ? (
              <>
                {' of '}
                {facts.type.ofHref ? (
                  <a href={facts.type.ofHref} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                    {facts.type.of}
                  </a>
                ) : (
                  <span className="font-mono text-[13px] font-medium">{facts.type.of}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground"> · {facts.type.about}</span>
            )}
          </AboutRow>
        )}
        {facts.level !== undefined && (
          <AboutRow icon={ShieldCheckIcon} label="Level">
            {levelInfo(facts.level).label}
            <span className="text-muted-foreground"> · {levelInfo(facts.level).about}</span>
          </AboutRow>
        )}
        {facts.tier && (
          <AboutRow icon={TagIcon} label="Membership">
            {facts.tier}
          </AboutRow>
        )}
        {facts.people && (
          <AboutRow icon={UsersIcon} label="Who can use it">
            {facts.people}
          </AboutRow>
        )}
        {facts.size?.bytes ? (
          <AboutRow icon={HardDriveIcon} label="Size">
            {sizeLabel(facts.size.bytes)}
            {facts.size.files ? <span className="text-muted-foreground"> · {facts.size.files} file{facts.size.files === 1 ? '' : 's'}</span> : null}
          </AboutRow>
        ) : null}
        {facts.deps ? (
          <AboutRow icon={LayersIcon} label="Works with">
            {facts.deps} dependenc{facts.deps === 1 ? 'y' : 'ies'}
          </AboutRow>
        ) : null}
      </ul>
      {children}
    </section>
  );
}
