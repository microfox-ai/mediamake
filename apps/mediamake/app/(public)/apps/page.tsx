import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Clapperboard, FilePenLine, Images, KeyRound, LayoutDashboard, Lock, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getViewer } from '@/lib/access';

export const metadata: Metadata = { title: 'Apps · MediaMake' };

// Who is signed in decides the Core card's label.
export const dynamic = 'force-dynamic';

interface AppCard {
  title: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  /** Needs a MediaMake account (everything under /core). */
  signIn?: boolean;
  tags: string[];
}

const apps: AppCard[] = [
  {
    title: 'MediaMake Core',
    summary: 'Projects, the editor, presets, media, transcriber, renders, workers and agents, with the sidebar.',
    href: '/core/projects',
    icon: LayoutDashboard,
    signIn: true,
    tags: ['projects', 'render'],
  },
  {
    title: 'Remotion Editor',
    summary: 'Edit lyric videos right in the browser.',
    href: '/remotion-editor',
    icon: FilePenLine,
    tags: ['lyrics', 'editor'],
  },
  {
    title: 'Video Revisions',
    summary: 'Watch a render, leave comments on frames and ranges, and track each revision.',
    href: '/remotion-revision',
    icon: Clapperboard,
    tags: ['review', 'video'],
  },
  {
    title: 'Image Revisions',
    summary: 'Review thumbnails, posters and image sets: pick finals, keep, drop and pin comments.',
    href: '/image-revision',
    icon: Images,
    tags: ['review', 'images'],
  },
  {
    title: 'Access & invites',
    summary: 'Redeem an invite code, or install an item shared with you.',
    href: '/access',
    icon: KeyRound,
    tags: ['catalog'],
  },
];

/** Where "Open App" leads: the public pages and the signed-in Core app, as cards. */
export default async function AppsPage() {
  const { clientId } = await getViewer();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <img src="/brand/mediamake-mark.svg" alt="" className="size-7" />
            MediaMake
          </Link>
          <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Apps</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const needsLogin = app.signIn && !clientId;
            const href = needsLogin ? `/login?redirectTo=${encodeURIComponent(app.href)}` : app.href;
            const Icon = app.icon;
            return (
              <Link key={app.href} href={href} className="block h-full">
                <div className="group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5 text-muted-foreground" />
                    <Badge variant="outline">{app.signIn ? 'App' : 'Public'}</Badge>
                    {needsLogin && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3.5" />
                        Sign in
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="flex items-center gap-1 font-semibold">
                      {app.title}
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </h2>
                    <p className="text-sm text-muted-foreground">{app.summary}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {app.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
