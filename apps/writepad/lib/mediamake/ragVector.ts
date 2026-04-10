/**
 * Mediamake Sparkboard / stocksearch RAG — same env vars as apps/mediamake (STOCKSEARCH_RAG_VECTOR_*).
 */
import { RagUpstashSdk } from '@microfox/rag-upstash';

export type RagSearchResult = {
  id: string | number;
  score: number;
  metadata?: Record<string, unknown>;
  data?: unknown;
};

const _ragVectorUrl = process.env.STOCKSEARCH_RAG_VECTOR_REST_URL?.trim();
const _ragVectorToken = process.env.STOCKSEARCH_RAG_VECTOR_REST_TOKEN?.trim();
const _hasRagConfig =
  typeof _ragVectorUrl === 'string' &&
  _ragVectorUrl.length > 0 &&
  typeof _ragVectorToken === 'string' &&
  _ragVectorToken.length > 0;

export const ragStocksearchVectorbase: RagUpstashSdk<Record<string, unknown>> | null =
  _hasRagConfig
    ? new RagUpstashSdk<Record<string, unknown>>({
        upstashUrl: _ragVectorUrl!,
        upstashToken: _ragVectorToken!,
      })
    : null;

export { isMediamakeRagConfigured } from './ragEnv';

export const DEFAULT_STOCKSEARCH_NAMESPACE = 'stocksearch';

export function toProjectNamespace(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, '_').trim() || 'default';
  return `project:${safe}`;
}

export function toTagNamespace(tag: string): string {
  const normalized = tag
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_-]/g, '_');
  return `tag:${normalized || 'untagged'}`;
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
