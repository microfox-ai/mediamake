import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { getEntitlements, getViewer } from '@/lib/access';
import { isValidSlug, toCard, toEntry } from '@/lib/catalog';
import { getCatalogRecord } from '@/lib/catalog/records';
import { catalogVideosDB } from '@/lib/catalog/store';
import { videoThumbnail } from '@/lib/catalog/video';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CoursePlayer, type Lesson } from '@/components/catalog/course-player';

export const dynamic = 'force-dynamic';

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * A course and the lessons this viewer can open, in order. Hidden (as if it
 * didn't exist) from viewers who can't open the course, like /access.
 */
const loadCourse = cache(async (slug: string) => {
  const viewer = await getViewer();
  const id = `course/${slug}`;
  const record = isValidSlug(slug) ? await getCatalogRecord(id) : null;
  if (!record) return { viewer, course: null };
  const entitlements = await getEntitlements(viewer);
  if (toEntry(entitlements, toCard(record)).access === 'locked') return { viewer, course: null };

  const video = await catalogVideosDB.get(id).catch(() => null);
  const ids = video?.lessons ?? [];
  const [records, videos] = await Promise.all([Promise.all(ids.map(getCatalogRecord)), catalogVideosDB.getMany(ids).catch(() => [])]);
  const byId = new Map(videos.map(v => [v.id, v]));
  // a lesson this viewer can't open (still in development, say) is left out for them
  const lessons: Lesson[] = ids.flatMap((lessonId, i) => {
    const lesson = records[i];
    const found = byId.get(lessonId);
    if (!lesson || !found?.youtubeId || toEntry(entitlements, toCard(lesson)).access === 'locked') return [];
    return [{ id: lessonId, youtubeId: found.youtubeId, title: found.title, description: found.description, thumbnail: videoThumbnail(found) }];
  });
  return {
    viewer,
    course: {
      id,
      title: video?.title ?? record.title,
      description: video?.description ?? record.summary,
      thumbnail: video ? videoThumbnail(video, byId) : undefined,
      lessons,
    },
  };
});

/** /courses/<slug>: a course's tutorials, played in order. */
export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const { viewer, course } = await loadCourse(slug);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:py-14">
        <Link href="/?tab=tutorials" className="text-sm text-muted-foreground hover:text-foreground">
          ← MediaMake tutorials
        </Link>

        {!course ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Not found</CardTitle>
              <CardDescription>
                There is no course called {slug}, or it is not shared with you.
                {!viewer.clientId && (
                  <>
                    {' '}
                    If someone shared it with you,{' '}
                    <Link href={`/login?redirectTo=${encodeURIComponent(`/courses/${slug}`)}`} className="underline">
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
            <header className="flex max-w-3xl flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Course · {course.lessons.length} lesson{course.lessons.length === 1 ? '' : 's'}
              </p>
              <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
              {course.description && <p className="whitespace-pre-line text-muted-foreground">{course.description}</p>}
            </header>
            <CoursePlayer courseId={course.id} lessons={course.lessons} />
          </>
        )}
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { course } = await loadCourse(slug);
  if (!course) return { title: 'Course · MediaMake' };
  return {
    title: `${course.title} · MediaMake`,
    description: course.description.split('\n')[0],
    ...(course.thumbnail && { openGraph: { images: [course.thumbnail] } }),
  };
}
