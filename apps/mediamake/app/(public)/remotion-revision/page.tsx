import { redirect } from 'next/navigation';
import { queryOf, type SearchParams } from '@/lib/revisions/redirect';

/** Renamed to /video-revision; old links (and their ?folder=&video=) keep working. */
export default async function RemotionRevisionRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  redirect(`/video-revision${await queryOf(searchParams)}`);
}
