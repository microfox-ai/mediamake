/** Same env as apps/mediamake — avoids importing the RAG SDK in list routes. */
export function isMediamakeRagConfigured(): boolean {
  return !!(
    process.env.STOCKSEARCH_RAG_VECTOR_REST_URL?.trim() &&
    process.env.STOCKSEARCH_RAG_VECTOR_REST_TOKEN?.trim()
  );
}
