import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * How ProjectSync works and why it matters, at the bottom of the Projects
 * page: your computer, the cloud project, and the teammates and devices that
 * share it, drawn inline (strokes take the text colour, so both themes work;
 * the one accent is the sync itself). The facts are the ProjectSync MCP's
 * (packages/projectsync-mcp/README.md): change them there first.
 */

const ACCENT = 'var(--chart-1)';

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const soft = { ...line, opacity: 0.35 } as const;
const tint = { fill: 'currentColor', opacity: 0.06, stroke: 'none' } as const;

function Art({ label, viewBox, className, children }: { label: string; viewBox: string; className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} className={cn('text-foreground', className)}>
      {children}
    </svg>
  );
}

/** A laptop with the workspace folder open, and Claude holding the ProjectSync plug. */
function ComputerArt() {
  return (
    <Art label="A laptop with a MediaMake folder of projects" viewBox="0 0 200 140" className="h-32 w-auto">
      <rect x="34" y="14" width="132" height="88" rx="8" {...tint} />
      <rect x="34" y="14" width="132" height="88" rx="8" {...line} />
      <path d="M18 112h164l-8 12H26z" {...line} />
      <path d="M88 118h24" {...soft} />
      {/* the workspace folder */}
      <path d="M48 40h18l5 6h29v32a3 3 0 0 1-3 3H51a3 3 0 0 1-3-3z" {...line} />
      <path d="M56 58h36M56 66h26M56 74h31" {...soft} />
      {/* Claude with the ProjectSync plug */}
      <rect x="112" y="34" width="42" height="50" rx="6" {...line} strokeDasharray="3 4" />
      <path d="M133 46v10M128.700 48.500l8.600 5M128.700 53.500l8.600-5" {...line} />
      <circle cx="133" cy="72" r="5" fill={ACCENT} />
      <path d="M133 77v7" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
    </Art>
  );
}

/** A cloud holding the project: four shelves for what it keeps. */
function CloudArt() {
  return (
    <Art label="A cloud holding a project's productions, releases, brand kit and media" viewBox="0 0 200 140" className="h-32 w-auto">
      <path d="M52 112a30 30 0 0 1-4-59.700A42 42 0 0 1 129 38a34 34 0 0 1 21 74z" {...tint} />
      <path d="M52 112a30 30 0 0 1-4-59.700A42 42 0 0 1 129 38a34 34 0 0 1 21 74z" {...line} />
      <rect x="62" y="56" width="34" height="20" rx="4" {...line} />
      <rect x="104" y="56" width="34" height="20" rx="4" {...line} />
      <rect x="62" y="82" width="34" height="20" rx="4" {...line} />
      <rect x="104" y="82" width="34" height="20" rx="4" {...line} />
      {/* production: a play mark; release: a box; kit: swatches; media: a picture */}
      <path d="M76 61.500v9l7-4.500z" {...line} />
      <path d="M114 63l7-3 7 3v7l-7 3-7-3zM114 63l7 3 7-3M121 66v7" {...line} strokeWidth="1.200" />
      <circle cx="72" cy="92" r="3.500" fill={ACCENT} />
      <circle cx="80" cy="92" r="3.500" fill="currentColor" opacity="0.5" />
      <circle cx="88" cy="92" r="3.500" {...line} strokeWidth="1.200" />
      <path d="M112 97l6-6 5 4 4-3 5 5" {...line} strokeWidth="1.200" />
      <circle cx="129" cy="88" r="1.500" fill="currentColor" />
    </Art>
  );
}

/** Two teammates, a second laptop and a phone. */
function PeopleArt() {
  return (
    <Art label="Two teammates, another laptop and a phone" viewBox="0 0 200 140" className="h-32 w-auto">
      <circle cx="52" cy="38" r="12" {...tint} />
      <circle cx="52" cy="38" r="12" {...line} />
      <path d="M30 76a22 22 0 0 1 44 0" {...line} />
      <circle cx="96" cy="44" r="10" {...line} />
      <path d="M80 76a17 17 0 0 1 33-4" {...soft} />
      {/* another laptop */}
      <rect x="112" y="62" width="58" height="38" rx="5" {...tint} />
      <rect x="112" y="62" width="58" height="38" rx="5" {...line} />
      <path d="M104 108h74l-5 8h-64z" {...line} />
      <path d="M124 76h34M124 84h22" {...soft} />
      {/* a phone */}
      <rect x="34" y="88" width="26" height="42" rx="5" {...line} />
      <path d="M43 124h8" {...soft} />
      <circle cx="47" cy="104" r="4" fill={ACCENT} />
    </Art>
  );
}

/** Up and down between two stops: across on a wide screen, down on a phone. */
function Link2({ up, down }: { up: string; down: string }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-3 md:w-28 md:flex-col md:gap-1.5" aria-hidden>
      <span className="w-24 text-right text-[11px] leading-tight text-muted-foreground md:order-1 md:w-auto md:text-center">{up}</span>
      <svg viewBox="0 0 96 28" className="h-7 w-24 shrink-0 rotate-90 md:order-2 md:rotate-0" style={{ color: ACCENT }}>
        <path d="M6 9h78m-7-5 7 5-7 5" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M90 20H12m7-5-7 5 7 5" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
      </svg>
      <span className="w-24 text-[11px] leading-tight text-muted-foreground md:order-3 md:w-auto md:text-center">{down}</span>
    </div>
  );
}

function Stop({ art, title, tag, children }: { art: React.ReactNode; title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center">
      {art}
      <p className="mt-1 text-sm font-semibold">{title}</p>
      <p className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

const SYNCS: { title: string; about: string; art: React.ReactNode }[] = [
  {
    title: 'Productions',
    about: "A video's code and its renders. Each upload is a new version, and the earlier ones are kept.",
    art: (
      <>
        <rect x="14" y="10" width="40" height="28" rx="4" {...soft} />
        <rect x="9" y="15" width="40" height="28" rx="4" {...soft} opacity={0.6} />
        <rect x="4" y="20" width="40" height="28" rx="4" fill="var(--card)" stroke="currentColor" strokeWidth="1.500" />
        <path d="M20 28v12l10-6z" fill={ACCENT} />
      </>
    ),
  },
  {
    title: 'Releases',
    about: 'A whole kit ready to publish: a YouTube upload pack, a DistroKid release.',
    art: (
      <>
        <path d="M8 22l22-10 22 10v20L30 52 8 42z" {...line} />
        <path d="M8 22l22 10 22-10M30 32v20" {...line} />
        <path d="M19 17l22 10" stroke={ACCENT} strokeWidth="2.500" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: 'Brand kits',
    about: 'The logo, fonts, colours, intros and end screens every skill reads, so each video looks like the channel.',
    art: (
      <>
        <rect x="6" y="12" width="48" height="36" rx="6" {...line} />
        <circle cx="19" cy="26" r="5" fill={ACCENT} />
        <circle cx="32" cy="26" r="5" fill="currentColor" opacity="0.55" />
        <circle cx="45" cy="26" r="5" {...line} />
        <path d="M14 40h14M34 40h12" {...soft} />
      </>
    ),
  },
  {
    title: 'Media',
    about: 'Pictures, songs, clips and the overlays a team shares. Stored as they are, and never uploaded twice.',
    art: (
      <>
        <rect x="6" y="10" width="34" height="28" rx="4" {...line} />
        <path d="M10 33l9-9 7 6 5-4 6 6" {...line} />
        <circle cx="32" cy="18" r="2" fill="currentColor" />
        <path d="M38 50V30l14-4v20" {...line} />
        <circle cx="34" cy="50" r="4" fill={ACCENT} />
        <circle cx="48" cy="46" r="4" {...line} />
      </>
    ),
  },
];

const WHY: { title: string; about: string }[] = [
  { title: 'Nothing lives on one laptop', about: 'A dead disk or a new computer costs you nothing: ask Claude to pull the project and carry on where you stopped.' },
  { title: 'A team works from the same files', about: 'Editors add and change, viewers read. Everyone gets the same brand kit, the same footage and the latest cut, without sending folders around.' },
  { title: 'Every version is kept', about: 'Version 7 never overwrites version 6. Only the files that changed go up, and what you delete goes to the trash, not away.' },
  { title: 'It stays private', about: 'Files are stored privately and opened through links that last an hour, only by the people you gave the project to.' },
];

export function ProjectSyncExplainer({ canSync, className }: { /** Their membership opens the ProjectSync MCP (Pro and above). */ canSync?: boolean; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-8 border-t pt-10', className)} aria-labelledby="projectsync-how">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ProjectSync</p>
        <h2 id="projectsync-how" className="mt-1 text-xl font-semibold tracking-tight">
          How your projects get here, and why it matters
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You make videos on your own computer. ProjectSync is how that work reaches the cloud project and comes back down on another computer or for a teammate. You ask Claude, it shows what would go up, and
          then it moves the files.
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-3 md:flex-row">
        <Stop art={<ComputerArt />} title="Your computer" tag="Claude with the ProjectSync MCP">
          Your workspace folder: projects, renders, brand kits. You say “sync this production” and Claude does the rest.
        </Stop>
        <Link2 up="Up: only what changed" down="Down: any version" />
        <Stop art={<CloudArt />} title="The cloud project" tag="This page">
          One project per channel or brand. It keeps the productions, releases, brand kit and media, and the list of who can open them.
        </Stop>
        <Link2 up="Shared by role" down="Their changes come back" />
        <Stop art={<PeopleArt />} title="Teammates and your other devices" tag="Owner, editor, viewer">
          Anyone you add opens the same project from their own Claude, and so does your second computer.
        </Stop>
      </div>

      <div>
        <h3 className="text-sm font-semibold">What syncs</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SYNCS.map(item => (
            <li key={item.title} className="flex gap-3 rounded-xl border p-4 lg:flex-col">
              <Art label="" viewBox="0 0 60 60" className="size-12 shrink-0">
                {item.art}
              </Art>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.about}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Whether something goes up as a production, a release or media is your choice each time. A production&apos;s inputs go up only when they come to 200 MB or less; bigger footage stays in your media
          library.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Why it matters</h3>
        <ul className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {WHY.map((item, index) => (
            <li key={item.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums">{index + 1}</span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.about}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            This page <span className="rounded-full border bg-background px-2 py-0.5 text-[11px]">Plus and above</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Cloud projects and everything here: browse them, decide who has access, keep the brand kit, open and download what is stored.</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            The ProjectSync MCP <span className="rounded-full border bg-background px-2 py-0.5 text-[11px]">Pro and above</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            The part that runs on your computer, so Claude can upload and pull productions, releases and media for you.{' '}
            <Link href="/mcps/projectsync" className="font-medium text-foreground underline underline-offset-4">
              {canSync ? 'Install ProjectSync' : 'See ProjectSync'}
            </Link>
            {!canSync && (
              <>
                {' · '}
                <Link href="/app/subscription" className="font-medium text-foreground underline underline-offset-4">
                  Your membership
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
