import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { getEntitlements, getViewer } from '@/lib/access';
import { isValidSlug, toCard, toEntry } from '@/lib/catalog';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogVideosDB } from '@/lib/catalog/store';
import { videoThumbnail } from '@/lib/catalog/video';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { YouTubeEmbed } from '@/components/catalog/video';

export const dynamic = 'force-dynamic';

interface TutorialPageProps {
  params: Promise<{ slug: string }>;
}

/** A tutorial and its video. Hidden (as if it didn't exist) from viewers who can't open it, like a course. */
const loadTutorial = cache(async (slug: string) => {
  const viewer = await getViewer();
  const id = `tutorial/${slug}`;
  const record = isValidSlug(slug) ? await getCatalogRecord(id) : null;
  if (!record) return { viewer, tutorial: null };
  const entitlements = await getEntitlements(viewer);
  if (toEntry(entitlements, toCard(record)).access === 'locked') return { viewer, tutorial: null };
  const video = await catalogVideosDB.get(id).catch(() => null);
  return {
    viewer,
    tutorial: {
      title: video?.title ?? record.title,
      description: video?.description ?? record.summary ?? '',
      youtubeId: video?.youtubeId,
      thumbnail: video ? videoThumbnail(video) : undefined,
    },
  };
});

/** /tutorials/<slug>: where a tutorial plays. */
export default async function TutorialPage({ params }: TutorialPageProps) {
  const { slug } = await params;
  const { viewer, tutorial } = await loadTutorial(slug);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:py-14">
        <Link href="/?tab=tutorials" className="text-sm text-muted-foreground hover:text-foreground">
          ← MediaMake tutorials
        </Link>

        {!tutorial ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Not found</CardTitle>
              <CardDescription>
                There is no tutorial called {slug}, or it is not shared with you.
                {!viewer.clientId && (
                  <>
                    {' '}
                    If someone shared it with you,{' '}
                    <Link href={`/login?redirectTo=${encodeURIComponent(`/tutorials/${slug}`)}`} className="underline">
                      sign in
                    </Link>{' '}
                    first.
                  </>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tutorial</p>
              <h1 className="text-3xl font-bold tracking-tight">{tutorial.title}</h1>
            </header>
            {tutorial.youtubeId ? (
              <YouTubeEmbed youtubeId={tutorial.youtubeId} title={tutorial.title} />
            ) : (
              <p className="text-sm text-muted-foreground">Its video isn&apos;t up yet.</p>
            )}
            {tutorial.description && <p className="whitespace-pre-line text-muted-foreground">{tutorial.description}</p>}
          </>
        )}
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: TutorialPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { tutorial } = await loadTutorial(slug);
  if (!tutorial) return { title: 'Tutorial · MediaMake' };
  return {
    title: `${tutorial.title} · MediaMake`,
    description: tutorial.description.split('\n')[0],
    ...(tutorial.thumbnail && { openGraph: { images: [tutorial.thumbnail] } }),
  };
}
