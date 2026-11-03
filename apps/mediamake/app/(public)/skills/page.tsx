import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The list of skills is the homepage's Skills tab now, with search and filters; each skill has its
 * own page at /skills/<name>. Old links keep their search, and the browser carries an old
 * /skills#<name> link's fragment over, which the tab turns into that skill's page.
 */
export default async function SkillsPage({ searchParams }: Props) {
  const q = await searchParams;
  const query = Array.isArray(q.q) ? q.q[0] : q.q;
  redirect(`/?${new URLSearchParams({ tab: 'skills', ...(query && { q: query }) })}`);
}
