'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Copy, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SETUP_PROMPT } from '@/lib/catalog/install-prompt';
import { itemPagePath } from '@/lib/catalog/paths';
import type { CatalogEntry } from '@/lib/catalog/types';
import { onYouTubeThumbnailLoad, parseYouTubeId, youtubeEmbedUrl, youtubeThumbnail } from '@/lib/catalog/video';
import { Reveal } from './reveal';
import type { HomeTab } from './tabs';
import { WORKS, type Work } from './works';

/** The guiding rule, in the owner's words (UI refactor plan, question 21). Shown here and in the footer. */
export const RULE = "We publish nothing we don't use.";

/**
 * Where "Enter App" goes. The signed-in app at /app is plan step 1c: until it ships, this is
 * the apps page, where the old "Open App" button went.
 */
export const ENTER_APP_HREF = '/apps';

const MEDIAMAKE_REPO = 'https://github.com/microfox-ai/mediamake';

/** What MediaMake is for (plan 1d, section 1): the fields of entertainment. */
const FIELDS = [
  'Music',
  'Film',
  'Games',
  'Novels',
  'Manga',
  'Comics',
  'Manhwa',
  'Microdrama',
  'TV series',
  'Anime',
  'K-pop',
  'C-drama',
  'K-drama',
];

/** What a person asks Claude for, and what comes back: the hero's demo cycles through these. */
const ASKS = [
  { ask: 'Make a lyric video from this song', makes: 'Lyric video', skill: 'make-lyrics-video' },
  { ask: 'Edit this footage to this track', makes: 'Song edit', skill: 'make-video-music-remix' },
  { ask: 'Cut three Shorts from this edit', makes: 'Shorts', skill: 'make-video-music-remix-shorts' },
  { ask: 'Make a thumbnail for this video', makes: 'Thumbnail', skill: 'create-thumbnail' },
  { ask: 'Build a brand kit from this logo', makes: 'Brand kit', skill: 'pack-brand-kit' },
];

/**
 * The items shown under "What's inside": Ready ones only. Readiness becomes a field of every
 * item in plan step 1b; until then this is the list the owner approved (question 10: every
 * skill starts as Beta except pack-brand-kit).
 */
const READY_ITEMS = [
  {
    id: 'skill/pack-brand-kit',
    title: 'pack-brand-kit',
    pitch:
      'A brand kit from a logo, or from a name alone: the logo, favicons, fonts and colours, and for a channel going live its logo animation, intros, end screens and a visual guide. The Microfox kit this page wears was made with it.',
  },
];

const KINDS: { tab: HomeTab; kinds: CatalogEntry['kind'][]; label: string; about: string }[] = [
  { tab: 'skills', kinds: ['skill'], label: 'Skills', about: 'Recipes Claude follows to make one kind of thing well, from the first question to the final file.' },
  { tab: 'mcps', kinds: ['mcp'], label: 'MCPs', about: 'Connections that let Claude use other tools for you: voices, images, 3D, your browser.' },
  { tab: 'apps', kinds: ['app'], label: 'Apps', about: 'Pages for the parts you do by eye: reviewing a render, marking a frame, editing a line.' },
];

/**
 * The homepage's Home tab: a scrolling site that says what MediaMake is, shows work made with
 * it, how it works, the rule it is run by, what is inside and how to get in. Written for
 * creators first, with one block for builders. Full width: each section sets its own measure.
 */
export function Landing({ cards, onSelectTab }: { cards: CatalogEntry[]; onSelectTab: (tab: HomeTab) => void }) {
  const listed = cards.filter((c) => !c.archivedAt);

  return (
    <div className="overflow-x-clip">
      <Hero />
      <Fields />
      <Works />
      <HowItWorks />
      <TheRule />

      {/* 5 · What is inside */}
      <Section id="inside" eyebrow="What's inside" title="Start with what is proven.">
        <p className="max-w-2xl text-lg text-muted-foreground">
          Ready means an item has made at least one finished production. Everything else is in Beta: it works, we use it,
          and it is still earning its place.
        </p>
        <div className="mt-10 grid gap-4">
          {READY_ITEMS.map((item) => (
            <Reveal key={item.id}>
              <Link
                href={itemPagePath(item.id)}
                className="group flex flex-col gap-3 rounded-3xl bg-mf-cream p-7 transition-transform duration-300 hover:-translate-y-1 md:flex-row md:items-center md:gap-10 md:p-9"
              >
                <div className="flex shrink-0 flex-col gap-3 md:w-72">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-mf-rust">
                    <span className="rounded-full bg-mf-fox px-2.5 py-1 tracking-wide text-mf-ink">Ready</span>
                    Skill
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight">{item.title}</h3>
                </div>
                <p className="flex-1 text-lg text-mf-bark/80">{item.pitch}</p>
                <ArrowUpRight className="size-6 shrink-0 text-mf-ember transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {KINDS.map((kind, i) => {
            const count = listed.filter((c) => kind.kinds.includes(c.kind)).length;
            return (
              <Reveal key={kind.tab} delay={i * 90}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab(kind.tab);
                    window.scrollTo({ top: 0 });
                  }}
                  className="group flex h-full w-full cursor-pointer flex-col gap-2 rounded-3xl border bg-card p-7 text-left transition-colors hover:border-mf-fox"
                >
                  <span className="flex items-baseline gap-3">
                    {count > 0 && <span className="text-4xl font-bold tracking-tight text-mf-ember">{count}</span>}
                    <span className="text-xl font-semibold">{kind.label}</span>
                    <ArrowRight className="ml-auto size-5 self-center text-mf-sand transition-transform group-hover:translate-x-1 group-hover:text-mf-ember" />
                  </span>
                  <span className="text-sm text-muted-foreground">{kind.about}</span>
                </button>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <GetIn />
      <Closing />
    </div>
  );
}

/* ── 1 · What MediaMake is ──────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24">
      <div className="flex flex-col items-start gap-6">
        <Eyebrow>The creator space for entertainment</Eyebrow>
        <h1 className="text-balance text-[2.6rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Your idea, made into <span className="text-mf-ember">finished work.</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-mf-bark/80">
          MediaMake is a set of skills, MCPs and apps that work inside Claude. Bring a song, some footage or a picture,
          say what you want, and get a lyric video, an edit, Shorts, a thumbnail or a whole brand kit.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <EnterAppButton size="lg" />
          <a
            href="#work"
            className="inline-flex h-12 items-center gap-2 rounded-full px-5 font-semibold text-mf-rust underline-offset-4 hover:underline"
          >
            See what it makes
          </a>
        </div>
      </div>
      <AskDemo />
    </section>
  );
}

/** The hero's picture: an ask typed to Claude, and the piece it turns into. */
function AskDemo() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % ASKS.length), 2800);
    return () => clearInterval(timer);
  }, []);
  const current = ASKS[index];

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
      {/* the kit's confetti of fur-coloured triangles */}
      <Triangle className="-left-3 top-24 size-7 rotate-12 text-mf-honey" />
      <Triangle className="-right-2 -top-4 size-6 -rotate-12 text-mf-fox" />
      <Triangle className="-bottom-5 right-16 size-5 rotate-180 text-mf-ember" />

      <div className="relative rounded-3xl bg-mf-cream p-4 shadow-[0_30px_80px_-40px_rgba(138,69,32,0.55)] sm:p-5">
        <div className="rounded-2xl bg-mf-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mf-rust">You, to Claude</p>
          <p key={current.ask} className="mt-2 min-h-14 text-xl font-semibold leading-snug animate-in fade-in slide-in-from-bottom-1 duration-500">
            {current.ask}
            <span className="mf-motion ml-0.5 inline-block h-5 w-0.5 translate-y-0.5 animate-pulse bg-mf-ember" />
          </p>
        </div>

        <div className="relative mt-3 flex aspect-video flex-col justify-between overflow-hidden rounded-2xl bg-mf-night p-4 text-mf-cream">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span key={current.makes} className="rounded-full bg-mf-fox px-3 py-1 font-semibold text-mf-ink animate-in fade-in zoom-in-95 duration-500">
              {current.makes}
            </span>
            <span className="truncate font-mono text-mf-sand">{current.skill}</span>
          </div>
          <div className="flex h-2/5 items-end gap-[3px]">
            {Array.from({ length: 36 }, (_, i) => (
              <span
                key={i}
                className="mf-motion flex-1 origin-bottom rounded-full"
                style={{
                  height: `${35 + ((i * 37) % 65)}%`,
                  background: i % 5 === 0 ? '#f7d397' : '#f28b2a',
                  animation: `mf-bar ${1.1 + ((i * 13) % 9) / 10}s ${-((i * 7) % 11) / 10}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fields() {
  const row = [...FIELDS, ...FIELDS];
  return (
    <div className="border-y bg-mf-cream/60 py-4" aria-label={`Made for ${FIELDS.join(', ')}`}>
      <div className="mf-motion flex w-max gap-10 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.2em] text-mf-rust [animation:mf-marquee_40s_linear_infinite]">
        {row.map((field, i) => (
          <span key={i} className="flex items-center gap-10" aria-hidden>
            {field}
            <Triangle className="static size-2.5 text-mf-fox" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 2 · Why it matters: real work ──────────────────────────────────────────────────────────── */

const REASONS = [
  {
    title: 'Start from what you have',
    text: 'A song, a folder of footage, one picture, or only a name. The skill asks what it needs and finds the rest.',
  },
  {
    title: 'Direct it, don’t operate it',
    text: 'You get ideas to pick from, then short previews to react to. Leave a note on a frame and the next cut answers it.',
  },
  {
    title: 'Keep everything',
    text: 'The project, the renders and the media stay on your computer. The skills are open source, so you can read and change them.',
  },
];

function Works() {
  const [first, ...rest] = WORKS;
  return (
    <Section id="work" eyebrow="Why it matters" title="Made with MediaMake.">
      <p className="max-w-2xl text-lg text-muted-foreground">
        Every piece here was made from start to finish with the skills on this site, by the people who wrote them.
        They are the same skills you get.
      </p>

      {first && (
        <div className="mt-10 grid gap-4">
          <Reveal>
            <WorkCard work={first} featured />
          </Reveal>
          {rest.length > 0 && (
            <div className={cn('grid gap-4 sm:grid-cols-2', rest.length === 3 && 'lg:grid-cols-3', rest.length >= 4 && 'lg:grid-cols-4')}>
              {rest.map((work, i) => (
                <Reveal key={work.title} delay={i * 80}>
                  <WorkCard work={work} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}

      <ul className="mt-14 grid gap-8 md:grid-cols-3">
        {REASONS.map((reason, i) => (
          <Reveal as="li" key={reason.title} delay={i * 90} className="border-t-2 border-mf-fox pt-5">
            <h3 className="text-xl font-semibold">{reason.title}</h3>
            <p className="mt-2 text-muted-foreground">{reason.text}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/** One finished work: its video (played in place on click) or, with no link yet, its title. */
function WorkCard({ work, featured }: { work: Work; featured?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = work.youtube ? parseYouTubeId(work.youtube) ?? parseYouTubeId(`https://youtu.be/${work.youtube}`) : null;

  return (
    <figure className={cn('flex h-full flex-col overflow-hidden rounded-3xl bg-mf-night text-mf-cream', featured && 'md:flex-row')}>
      <div className={cn('relative aspect-video w-full shrink-0 overflow-hidden', featured && 'md:w-2/3')}>
        {youtubeId && playing ? (
          <iframe
            src={`${youtubeEmbedUrl(youtubeId)}&autoplay=1`}
            title={work.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        ) : youtubeId ? (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${work.title}`} className="group absolute inset-0 cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbnail(youtubeId)}
              alt=""
              loading="lazy"
              onLoad={onYouTubeThumbnailLoad}
              className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-mf-night/20 transition-colors group-hover:bg-transparent" />
            <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-mf-fox text-mf-ink shadow-lg transition-transform group-hover:scale-110">
              <Play className="size-7 translate-x-0.5 fill-current" />
            </span>
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_30%_20%,#36211c,#17120f_70%)] p-6 text-center">
            <span className={cn('text-balance font-bold leading-tight tracking-tight', featured ? 'text-3xl sm:text-5xl' : 'text-2xl')}>{work.title}</span>
          </div>
        )}
      </div>
      <figcaption className={cn('flex flex-1 flex-col gap-1.5 p-5', featured && 'md:justify-end md:p-8')}>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-mf-fox">{work.kind}</span>
        <span className={cn('font-semibold leading-snug', featured ? 'text-2xl' : 'text-lg')}>{work.title}</span>
        {work.by && <span className="text-sm text-mf-sand">{work.by}</span>}
        <Link
          href={itemPagePath(`skill/${work.skill}`)}
          className="mt-2 inline-flex items-start gap-1 font-mono [overflow-wrap:anywhere] text-xs text-mf-honey underline-offset-4 hover:underline"
        >
          Made with {work.skill}
          <ArrowUpRight className="size-3.5 shrink-0" />
        </Link>
      </figcaption>
    </figure>
  );
}

/* ── 3 · How it works ───────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    title: 'Set it up once',
    text: 'Copy the setup prompt into Claude Code. It installs MediaMake on your computer and tells you what it did.',
  },
  {
    title: 'Ask for what you want',
    text: 'Say it the way you would to an editor. Claude picks the skill, asks about your taste and shows you ideas before it builds.',
  },
  {
    title: 'Review, then publish',
    text: 'Watch short previews, leave notes where something is off, and sign off. The final render and the upload pack are made for you.',
  },
];

function HowItWorks() {
  return (
    <Section id="how" eyebrow="How it works" title="Three steps, all of them inside Claude." className="bg-mf-cream/60">
      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 110} className="flex flex-col gap-3 rounded-3xl bg-mf-paper p-7">
            <span className="font-marker text-5xl leading-none text-mf-fox">{i + 1}</span>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-muted-foreground">{step.text}</p>
            {i === 0 && <CopySetupButton className="mt-auto self-start" />}
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

/* ── 4 · The rule ───────────────────────────────────────────────────────────────────────────── */

function TheRule() {
  return (
    <section id="rule" className="scroll-mt-28 bg-mf-night px-4 py-24 text-mf-cream sm:py-36">
      <Reveal className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mf-fox">The one rule</p>
        <h2 className="text-balance text-[2.75rem] font-bold leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl">
          We publish{' '}
          <span className="relative inline-block text-mf-fox">
            nothing
            <svg viewBox="0 0 300 20" preserveAspectRatio="none" className="mf-underline absolute -bottom-2 left-0 h-3 w-full sm:-bottom-3 sm:h-4" aria-hidden>
              <path d="M4 13 C 60 3, 120 17, 180 8 S 270 6, 296 11" pathLength={1} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </span>{' '}
          we don&rsquo;t use.
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-mf-cream/80">
          Every skill, MCP and app here was used by its maker on real work before it was published. If it has not made
          something finished, it is not marked Ready. If it stops working, it comes off the shelf until it is fixed.
        </p>
      </Reveal>
    </section>
  );
}

/* ── 6 · How you get in ─────────────────────────────────────────────────────────────────────── */

const MEMBERSHIPS = [
  {
    name: 'Public',
    how: 'Free. Sign up and you are in.',
    opens: 'Every public skill, MCP and app, with the setup prompt that installs them.',
  },
  {
    name: 'Plus',
    how: 'Earned by contributing.',
    opens: 'Everything in Public, and cloud projects, so your work follows you from one computer to the next.',
  },
  {
    name: 'Pro',
    how: 'Earned by contributing something bigger.',
    opens: 'Everything in Plus, and the Pro MCPs, such as Browse Hack and ProjectSync.',
  },
];

function GetIn() {
  return (
    <Section id="join" eyebrow="How you get in" title="Free to use. More when you give back." className="bg-mf-cream/60">
      <p className="max-w-2xl text-lg text-muted-foreground">
        Nothing here is sold. Plus and Pro are earned by sharing something you made and use, and they last three months
        at a time, renewed as you keep contributing.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {MEMBERSHIPS.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 90} className="flex flex-col gap-2 rounded-3xl bg-mf-paper p-7">
            <h3 className="text-2xl font-bold tracking-tight">{tier.name}</h3>
            <p className="font-semibold text-mf-rust">{tier.how}</p>
            <p className="text-muted-foreground">{tier.opens}</p>
            {i === 0 && (
              <Link href="/signup" className="mt-3 inline-flex items-center gap-1.5 self-start font-semibold text-mf-ember underline-offset-4 hover:underline">
                Sign up
                <ArrowRight className="size-4" />
              </Link>
            )}
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-4 flex flex-col gap-4 rounded-3xl border-2 border-dashed border-mf-sand/60 p-7 md:flex-row md:items-center md:gap-10">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mf-rust">For builders</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight">Made something you use? Put it on the shelf.</h3>
          <p className="mt-2 text-muted-foreground">
            A skill, an MCP or an app that did real work for you can be published here. It enters as Beta, becomes Ready
            once it is proven, and earns you the membership it is published at. The one condition is the rule above.
          </p>
        </div>
        <a
          href={MEDIAMAKE_REPO}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full border-2 border-mf-ink px-6 font-semibold transition-colors hover:bg-mf-ink hover:text-mf-paper md:self-center"
        >
          Contribute on GitHub
          <ArrowUpRight className="size-4" />
        </a>
      </Reveal>
    </Section>
  );
}

/* ── 7 · Enter App ──────────────────────────────────────────────────────────────────────────── */

function Closing() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mediamake-mark-glow.svg" alt="" className="h-16 w-auto" />
        <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Now it can be <span className="font-marker font-normal text-mf-ember">your idea.</span>
        </h2>
        <p className="max-w-xl text-lg text-muted-foreground">Open the app, pick what you want to make, and start.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <EnterAppButton size="lg" />
          <CopySetupButton />
        </div>
      </Reveal>
    </section>
  );
}

/* ── Shared parts ───────────────────────────────────────────────────────────────────────────── */

/** The one way into the app, in the header and on the page. Ember, the kit's button colour. */
export function EnterAppButton({ size = 'sm', className }: { size?: 'sm' | 'lg'; className?: string }) {
  return (
    <Link
      href={ENTER_APP_HREF}
      className={cn(
        'group inline-flex shrink-0 items-center gap-2 rounded-full bg-mf-ember font-semibold text-white transition-colors hover:bg-mf-rust',
        size === 'lg' ? 'h-12 px-7 text-lg' : 'h-9 px-4 text-sm',
        className,
      )}
    >
      Enter App
      <ArrowRight className={cn('transition-transform group-hover:translate-x-0.5', size === 'lg' ? 'size-5' : 'size-4')} />
    </Link>
  );
}

/** Copies the setup prompt (the same one as the banner at the top). */
function CopySetupButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_PROMPT);
    } catch {
      // No clipboard access: show it to copy by hand.
      window.prompt('Copy this prompt and paste it into Claude Code:', SETUP_PROMPT);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={SETUP_PROMPT}
      className={cn(
        'inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-2 border-mf-ink px-6 font-semibold transition-colors hover:bg-mf-ink hover:text-mf-paper',
        className,
      )}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : 'Copy setup prompt'}
    </button>
  );
}

function Section({
  id,
  eyebrow,
  title,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn('scroll-mt-28 py-20 sm:py-28', className)}>
      <div className="mx-auto w-full max-w-6xl px-4">
        <Reveal className="mb-5 flex flex-col gap-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">{title}</h2>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mf-ember">{children}</p>;
}

function Triangle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={cn('absolute', className)} aria-hidden>
      <path d="M10 2 19 18H1Z" />
    </svg>
  );
}
