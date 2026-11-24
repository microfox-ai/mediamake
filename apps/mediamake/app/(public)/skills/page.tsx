import { redirect } from 'next/navigation';
import { exploreHref } from '@/lib/catalog/paths';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The list of skills is Explore, in the app, with search and filters; each skill has its own page at
 * /skills/<name>. Old links keep their search.
 */
export default async function SkillsPage({ searchParams }: Props) {
  const q = await searchParams;
  const query = Array.isArray(q.q) ? q.q[0] : q.q;
  redirect(exploreHref('skill', query));
}
