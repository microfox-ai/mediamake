import { redirect } from 'next/navigation';

/** Renamed to /image-revision; old links (and their ?job=) keep working. */
export default async function ThumbnailRevisionRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : [])
      params.append(key, v);
  }
  const query = params.toString();
  redirect(`/image-revision${query ? `?${query}` : ''}`);
}
