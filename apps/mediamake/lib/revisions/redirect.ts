export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

/** "?folder=…&video=…" from a page's search params, or "" without any: for pages that moved. */
export async function queryOf(searchParams: SearchParams): Promise<string> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : [])
      params.append(key, v);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
