import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The skill library is the Library's Skills view now; old links keep their skill or production. */
export default async function SkillLibraryPage({ searchParams }: Props) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const skill = one(q.skill);
  const production = one(q.production);
  const params = new URLSearchParams(production && !skill ? { view: 'productions', production } : { view: 'skills', ...(skill && { skill }) });
  redirect(`/library?${params}`);
}
