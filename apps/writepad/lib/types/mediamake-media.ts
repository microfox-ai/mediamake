/** Row returned by GET /api/mediamake-media (serializable JSON). */
export interface MediamakeMediaListItem {
  id: string;
  filePath: string;
  fileName?: string | null;
  contentType?: string | null;
  contentMimeType?: string | null;
  createdAt?: string | null;
  tags?: string[] | null;
  projectId?: string | null;
  contentSource?: string | null;
}

export interface MediamakeMediaListResponse {
  configured: boolean;
  files: MediamakeMediaListItem[];
  total: number;
  hasMore: boolean;
  /** True when STOCKSEARCH_RAG_VECTOR_* is set (semantic search available). */
  ragConfigured?: boolean;
}

export interface MediamakeTagRow {
  id: string;
  displayName: string;
}

export interface MediamakeProjectRow {
  id: string;
  displayName: string;
}
