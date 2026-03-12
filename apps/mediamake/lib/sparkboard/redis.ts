import { Redis } from '@upstash/redis';
import { RagUpstashSdk } from '@microfox/rag-upstash';
import { Paginator, CrudHash } from '@microfox/db-upstash';
import type { RagImageMetadata } from '@/app/types/media';

export type RagSearchResult = {
  id: string | number;
  score: number;
  metadata?: RagImageMetadata;
  data?: any;
};

export type ImageIndexing = {
  imageCount: number;
  maxSize: number;
};

export const sparkboardRedis = new Redis({
  url: process.env.UPSTASH_STOCKSEARCH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_STOCKSEARCH_REDIS_REST_TOKEN || '',
});

export const indexPaginator = (id: string) =>
  new Paginator<ImageIndexing>(sparkboardRedis, 'stocksearch:' + id);

export const missedAnalysisStore = new CrudHash<{
  imageUrl: string;
  id: string;
  count: number;
}>(sparkboardRedis, 'stocksearch:missed-analysis');

const _ragVectorUrl = process.env.STOCKSEARCH_RAG_VECTOR_REST_URL?.trim();
const _ragVectorToken = process.env.STOCKSEARCH_RAG_VECTOR_REST_TOKEN?.trim();
const _hasRagConfig =
  typeof _ragVectorUrl === 'string' &&
  _ragVectorUrl.length > 0 &&
  typeof _ragVectorToken === 'string' &&
  _ragVectorToken.length > 0;

export const ragStocksearchVectorbase: RagUpstashSdk<RagImageMetadata> | null =
  _hasRagConfig
    ? new RagUpstashSdk<RagImageMetadata>({
        upstashUrl: _ragVectorUrl!,
        upstashToken: _ragVectorToken!,
      })
    : null;

/** Default RAG namespace when no project is selected */
export const DEFAULT_STOCKSEARCH_NAMESPACE = 'stocksearch';

/** Project namespace from projectId (safe for RAG/Upstash; avoids long display names) */
export function toProjectNamespace(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, '_').trim() || 'default';
  return `project:${safe}`;
}

/** Normalize tag for namespace (lowercase, no spaces) */
export function toTagNamespace(tag: string): string {
  const normalized = tag.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '_');
  return `tag:${normalized || 'untagged'}`;
}

export async function searchSparkboardImages(params: {
  q: string;
  topK: number;
  filterString?: string;
}): Promise<RagSearchResult[]> {
  if (!ragStocksearchVectorbase) return [];
  const { q, topK, filterString } = params;

  const results = await ragStocksearchVectorbase.queryDocsFromRAG(
    {
      data: q,
      topK,
      filter: filterString,
      includeData: true,
      includeMetadata: true,
    },
    'stocksearch',
  );

  return results as RagSearchResult[];
}

export async function searchSparkboardImagesInNamespaces(params: {
  q: string;
  topK: number;
  projectNamespace: string;
  tags?: string[];
  filterString?: string;
}): Promise<RagSearchResult[]> {
  if (!ragStocksearchVectorbase) return [];
  const { q, topK, projectNamespace, tags, filterString } = params;
  const projectNs = projectNamespace;
  const namespaces = [projectNs];
  if (tags?.length) {
    for (const tag of tags) {
      namespaces.push(toTagNamespace(tag));
    }
  }

  if (namespaces.length === 1) {
    const results = await ragStocksearchVectorbase.queryDocsFromRAG(
      {
        data: q,
        topK,
        filter: filterString,
        includeData: true,
        includeMetadata: true,
      },
      projectNs,
    );
    return results as RagSearchResult[];
  }

  const perNamespaceTopK = Math.max(Math.ceil(topK / namespaces.length), 5);
  const allResults: RagSearchResult[] = [];
  const seenIds = new Set<string | number>();

  for (const namespace of namespaces) {
    const results = await ragStocksearchVectorbase.queryDocsFromRAG(
      {
        data: q,
        topK: perNamespaceTopK,
        filter: filterString,
        includeData: true,
        includeMetadata: true,
      },
      namespace,
    );
    for (const r of results as RagSearchResult[]) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allResults.push(r);
      }
    }
  }

  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, topK);
}

/** Query docs in a single tag namespace (broad query to list media in that tag). */
export async function searchSparkboardImagesInTagNamespace(
  tag: string,
  topK: number = 200,
): Promise<RagSearchResult[]> {
  if (!ragStocksearchVectorbase) return [];
  const namespace = toTagNamespace(tag);
  const results = await ragStocksearchVectorbase.queryDocsFromRAG(
    {
      data: 'image media content',
      topK,
      includeData: true,
      includeMetadata: true,
    },
    namespace,
  );
  return results as RagSearchResult[];
}
