import { redirect } from 'next/navigation';

/** Remaster Revisions is part of the Stem Player now (/stem-player), with the same ?job= and ?path=. */
export default async function RemasterRevisionRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const q = query.toString();
  redirect(`/stem-player${q ? `?${q}` : ''}`);
}
