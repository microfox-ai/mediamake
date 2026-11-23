import { redirect } from 'next/navigation';

/** The screen's first name: it is the Transcript Cleaner now (/transcript-cleaner), with the same ?path= and &song=. */
export default async function TranscriptRevisionRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const q = query.toString();
  redirect(`/transcript-cleaner${q ? `?${q}` : ''}`);
}
