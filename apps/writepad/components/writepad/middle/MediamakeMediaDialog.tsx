'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  MediamakeMediaListItem,
  MediamakeMediaListResponse,
  MediamakeProjectRow,
  MediamakeTagRow,
} from '@/lib/types/mediamake-media';
import {
  mdImageWithMediamakeRef,
  mdLinkWithMediamakeRef,
  isImageLikeMedia,
  isVideoLikeMedia,
  withMediaStartSeconds,
} from '@/lib/mediamake-markdown';
import { ImageIcon, Link2, Copy, Loader2, Music, FileImage, Sparkles, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediamakeVideoThumb } from './MediamakeVideoThumb';

type ContentFilter = 'all' | 'image' | 'video' | 'audio';

type ProjectScope = 'all' | 'default' | string;

type SearchMode = 'browse' | 'semantic';

const CONTENT_SOURCES: Record<string, string> = {
  pinterest: 'Pinterest',
  midjourney: 'Midjourney',
  youtube: 'YouTube',
  upload: 'Upload',
  web: 'Web',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  webrecorder: 'Web Recorder',
};

function filterLabel(f: ContentFilter): string {
  switch (f) {
    case 'all':
      return 'All';
    case 'image':
      return 'Images';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
  }
}

interface MediamakeMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (markdown: string) => void;
}

export function MediamakeMediaDialog({
  open,
  onOpenChange,
  onInsert,
}: MediamakeMediaDialogProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('browse');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [semanticQ, setSemanticQ] = useState('');
  const [semanticAttempted, setSemanticAttempted] = useState(false);

  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [projectScope, setProjectScope] = useState<ProjectScope>('all');
  const [contentSourceFilter, setContentSourceFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [ragConfigured, setRagConfigured] = useState(false);
  const [files, setFiles] = useState<MediamakeMediaListItem[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const [tagsCatalog, setTagsCatalog] = useState<MediamakeTagRow[]>([]);
  const [projects, setProjects] = useState<MediamakeProjectRow[]>([]);

  const [videoStartSec, setVideoStartSec] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useLayoutEffect(() => {
    if (open) {
      setPage(1);
      setFiles([]);
    }
  }, [
    open,
    debouncedQ,
    contentFilter,
    projectScope,
    contentSourceFilter,
    sortOrder,
    tagFilters,
    searchMode,
  ]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [tr, pr] = await Promise.all([
          fetch('/api/mediamake-tags', { credentials: 'include' }).then((r) => r.json()),
          fetch('/api/mediamake-projects', { credentials: 'include' }).then((r) => r.json()),
        ]);
        if (tr.configured && Array.isArray(tr.tags)) setTagsCatalog(tr.tags);
        if (pr.configured && Array.isArray(pr.projects)) setProjects(pr.projects);
      } catch {
        /* ignore */
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) setSemanticAttempted(false);
  }, [open]);

  useEffect(() => {
    if (searchMode === 'semantic') setSemanticAttempted(false);
  }, [searchMode]);

  const contentTypeParam = useMemo(() => {
    if (contentFilter === 'all') return '';
    return contentFilter;
  }, [contentFilter]);

  const buildBrowseParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');
    if (debouncedQ) params.set('q', debouncedQ);
    if (contentTypeParam) params.set('contentType', contentTypeParam);
    if (projectScope === 'default') params.set('projectId', 'default');
    else if (projectScope !== 'all') params.set('projectId', projectScope);
    if (contentSourceFilter !== 'all') params.set('contentSource', contentSourceFilter);
    if (tagFilters.length) params.set('tags', tagFilters.join(','));
    params.set('sort', 'createdAt');
    params.set('order', sortOrder === 'latest' ? 'desc' : 'asc');
    return params;
  }, [
    page,
    debouncedQ,
    contentTypeParam,
    projectScope,
    contentSourceFilter,
    tagFilters,
    sortOrder,
  ]);

  const loadBrowse = useCallback(async () => {
    if (!open || searchMode !== 'browse') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mediamake-media?${buildBrowseParams().toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError(res.status === 401 ? 'Sign in required.' : 'Failed to load media.');
        setFiles([]);
        return;
      }
      const data = (await res.json()) as MediamakeMediaListResponse;
      setConfigured(data.configured);
      setRagConfigured(data.ragConfigured ?? false);
      setFiles((prev) => (page === 1 ? data.files : [...prev, ...data.files]));
      setHasMore(data.hasMore);
    } catch {
      setError('Network error.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [open, searchMode, page, buildBrowseParams]);

  useEffect(() => {
    void loadBrowse();
  }, [loadBrowse]);

  const runSemanticSearch = useCallback(async () => {
    const query = semanticQ.trim();
    if (!query || !open) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, topK: '40' });
      if (projectScope === 'default') params.set('projectId', 'default');
      else if (projectScope !== 'all') params.set('projectId', projectScope);
      if (tagFilters.length) params.set('tags', tagFilters.join(','));

      const res = await fetch(`/api/mediamake-media/rag?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError(res.status === 401 ? 'Sign in required.' : 'Search failed.');
        setFiles([]);
        return;
      }
      const data = (await res.json()) as MediamakeMediaListResponse & { message?: string };
      setConfigured(data.configured);
      setRagConfigured(data.ragConfigured ?? false);
      setFiles(data.files);
      setHasMore(false);
      if (!data.ragConfigured && data.message) {
        setError(data.message);
      } else {
        setError(null);
      }
    } catch {
      setError('Network error.');
      setFiles([]);
    } finally {
      setLoading(false);
      setSemanticAttempted(true);
    }
  }, [open, semanticQ, projectScope, tagFilters]);

  const addTagFilter = (tag: string) => {
    const t = tag.trim();
    if (!t || tagFilters.includes(t)) return;
    setTagFilters((prev) => [...prev, t]);
  };

  const removeTagFilter = (tag: string) => {
    setTagFilters((prev) => prev.filter((x) => x !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagFilter(tagInput);
      setTagInput('');
    }
  };

  const resolveUrlForItem = (item: MediamakeMediaListItem) => {
    if (!item.filePath) return '';
    const isVid = isVideoLikeMedia(item.contentType, item.contentMimeType);
    const raw = videoStartSec[item.id]?.trim() ?? '';
    const sec = raw === '' ? NaN : parseFloat(raw);
    const start = isVid && Number.isFinite(sec) && sec > 0 ? sec : null;
    return withMediaStartSeconds(item.filePath, start);
  };

  const handleInsertImage = (item: MediamakeMediaListItem) => {
    if (!item.filePath) return;
    const label = item.fileName || 'Media';
    onInsert(mdImageWithMediamakeRef(label, item.filePath, item.id));
    onOpenChange(false);
  };

  const handleInsertLink = (item: MediamakeMediaListItem) => {
    const label = item.fileName || 'Media';
    const url = resolveUrlForItem(item);
    if (!url) return;
    onInsert(mdLinkWithMediamakeRef(label, url, item.id));
    onOpenChange(false);
  };

  const handleCopyUrl = async (item: MediamakeMediaListItem) => {
    const url = resolveUrlForItem(item);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  const filters: ContentFilter[] = ['all', 'image', 'video', 'audio'];

  const projectSelectValue =
    projectScope === 'all' ? 'all' : projectScope === 'default' ? 'default' : projectScope;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle>Mediamake library</DialogTitle>
          {/* <DialogDescription>
            Browse or semantically search your Mediamake media (same data as the Mediamake app).
            Filters match project, tags, and source; semantic search uses the same RAG index when
            configured.
          </DialogDescription> */}
        </DialogHeader>

        <div className="flex shrink-0 flex-col gap-3 border-b border-border px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Mode
            </span>
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setSearchMode('browse')}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-[11px]',
                  searchMode === 'browse'
                    ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <ListFilter size={12} />
                Browse
              </button>
              <button
                type="button"
                title={
                  ragConfigured
                    ? 'Semantic search'
                    : 'Set STOCKSEARCH_RAG_VECTOR_* env (same as Mediamake)'
                }
                onClick={() => ragConfigured && setSearchMode('semantic')}
                disabled={!ragConfigured}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-[11px]',
                  searchMode === 'semantic'
                    ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
                    : 'text-muted-foreground hover:bg-muted',
                  !ragConfigured && 'cursor-not-allowed opacity-40',
                )}
              >
                <Sparkles size={12} />
                Semantic
              </button>
            </div>
            {!ragConfigured && (
              <span className="text-[10px] text-muted-foreground">
                Semantic search needs vector env vars (see Mediamake).
              </span>
            )}
          </div>

          {searchMode === 'browse' ? (
            <Input
              placeholder="Filter by name, URL, or description…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9"
            />
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Describe images or scenes (semantic search)…"
                value={semanticQ}
                onChange={(e) => setSemanticQ(e.target.value)}
                className="h-9 flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void runSemanticSearch();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                disabled={loading || !semanticQ.trim()}
                onClick={() => void runSemanticSearch()}
              >
                Search
              </Button>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Project</span>
              <Select
                value={projectSelectValue}
                onValueChange={(v) => {
                  if (v === 'all') setProjectScope('all');
                  else if (v === 'default') setProjectScope('default');
                  else setProjectScope(v);
                }}
              >
                <SelectTrigger className="h-9 text-[11px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  <SelectItem value="default">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Source</span>
              <Select value={contentSourceFilter} onValueChange={setContentSourceFilter}>
                <SelectTrigger className="h-9 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {Object.entries(CONTENT_SOURCES).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Sort</span>
              <Select
                value={sortOrder}
                onValueChange={(v) => setSortOrder(v as 'latest' | 'oldest')}
                disabled={searchMode === 'semantic'}
              >
                <SelectTrigger className="h-9 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] text-muted-foreground">Tag ids</span>
              <Input
                placeholder="Add tag id, Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) {
                    addTagFilter(tagInput);
                    setTagInput('');
                  }
                }}
                className="h-9 text-[11px]"
                list="mediamake-tag-hints"
              />
              <datalist id="mediamake-tag-hints">
                {tagsCatalog.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.displayName}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {tagFilters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tagFilters.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="gap-1 pr-1 text-[10px] font-normal"
                >
                  {t}
                  <button
                    type="button"
                    className="rounded hover:bg-muted"
                    onClick={() => removeTagFilter(t)}
                    aria-label={`Remove ${t}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {searchMode === 'browse' && (
            <div className="flex flex-wrap gap-1">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setContentFilter(f);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] transition-colors',
                    contentFilter === f
                      ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400'
                      : 'bg-muted text-muted-foreground hover:bg-accent',
                  )}
                >
                  {filterLabel(f)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6">
          <div className="py-3">
            {!configured && (
              <p className="text-sm text-muted-foreground">
                Mediamake is not configured. Set{' '}
                <code className="rounded bg-muted px-1 text-xs">MEDIAMAKE_DB_URL</code> on the
                server.
              </p>
            )}
            {configured && loading && files.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {configured && !loading && !error && files.length === 0 && searchMode === 'browse' && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No media matches. Adjust filters or upload in Mediamake.
              </p>
            )}
            {configured &&
              !loading &&
              !error &&
              files.length === 0 &&
              searchMode === 'semantic' && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {semanticAttempted
                    ? 'No media matched that description.'
                    : 'Enter a description and click Search to run semantic search.'}
                </p>
              )}
            {configured && files.length > 0 && (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {files.map((item) => {
                  const isImg = isImageLikeMedia(item.contentType, item.contentMimeType);
                  const isVid = isVideoLikeMedia(item.contentType, item.contentMimeType);
                  const ct = (item.contentType || '').toLowerCase();
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <div className="relative aspect-video bg-muted">
                        {isImg && item.filePath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.filePath}
                            alt=""
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : isVid && item.filePath ? (
                          <MediamakeVideoThumb src={item.filePath} title={item.fileName ?? undefined} />
                        ) : ct === 'audio' ? (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Music className="size-10 opacity-50" />
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <FileImage className="size-10 opacity-50" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-2">
                        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground">
                          {item.fileName || item.filePath || 'Untitled'}
                        </p>
                        <div className="flex flex-wrap gap-1 text-[9px] text-muted-foreground">
                          {item.contentSource && (
                            <span className="rounded bg-muted px-1">{item.contentSource}</span>
                          )}
                          {item.projectId && (
                            <span className="truncate rounded bg-muted px-1 font-mono">
                              proj:{item.projectId.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {item.id}
                        </p>
                        {isVid && (
                          <label className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="shrink-0">Start at</span>
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="sec"
                              className="h-7 w-18 px-2 text-[10px]"
                              value={videoStartSec[item.id] ?? ''}
                              onChange={(e) =>
                                setVideoStartSec((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                            />
                            <span className="text-muted-foreground/70">(optional)</span>
                          </label>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {isImg && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-7 flex-1 gap-1 text-[10px]"
                              onClick={() => handleInsertImage(item)}
                            >
                              <ImageIcon className="size-3" />
                              Image
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 flex-1 gap-1 text-[10px]"
                            onClick={() => handleInsertLink(item)}
                          >
                            <Link2 className="size-3" />
                            Link
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[10px]"
                            title="Copy URL"
                            onClick={() => void handleCopyUrl(item)}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {configured && hasMore && searchMode === 'browse' && (
          <div className="flex shrink-0 justify-center border-t border-border py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Load more'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
