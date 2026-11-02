import { redirect } from 'next/navigation';
import { queryOf, type SearchParams } from '@/lib/revisions/redirect';

/** Renamed to /remotion-revision, now /video-revision; old links (and their ?folder=&video=) keep working. */
export default async function RevisionsRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  redirect(`/video-revision${await queryOf(searchParams)}`);
}
