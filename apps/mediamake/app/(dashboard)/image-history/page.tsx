"use client";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TagMultiSelect } from "@/components/ui/tag-multi-select";
import { useSession } from "@/components/session-provider";
import useLocalState from "@/components/studio/context/hooks/useLocalState";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RenderRequest } from "@/lib/render-history";
import { ExternalLink, RefreshCcw } from "lucide-react";

type ProjectLite = { id: string; displayName: string };

export default function ImageHistoryPage() {
  const session = useSession();
  const [apiKey] = useLocalState(
    "apiKey",
    process.env.NEXT_PUBLIC_DEV_API_KEY ?? "",
  );

  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("any");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const [items, setItems] = useState<RenderRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      if (!session?.clientId) return;
      setProjectsLoading(true);
      try {
        const res = await fetch("/api/project", {
          headers: { "x-client-id": session.clientId },
        });
        const data = res.ok ? await res.json() : [];
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };
    void loadProjects();
  }, [session?.clientId]);

  const projectNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.displayName);
    return m;
  }, [projects]);

  const buildHeaders = useCallback(() => {
    return {
      ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(session?.clientId ? { "x-client-id": session.clientId } : {}),
    } as Record<string, string>;
  }, [apiKey, session?.clientId]);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "60", renderType: "still" });
      if (selectedProjectId !== "any") params.set("projectId", selectedProjectId);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      const res = await fetch(`/api/remotion/history?${params}`, {
        headers: buildHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(Boolean(data?.hasMore));
    } catch (e) {
      console.error(e);
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildHeaders, selectedProjectId, selectedTags]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "60",
        cursor: nextCursor,
        renderType: "still",
      });
      if (selectedProjectId !== "any") params.set("projectId", selectedProjectId);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      const res = await fetch(`/api/remotion/history?${params}`, {
        headers: buildHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newItems = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => [...prev, ...newItems]);
      setNextCursor(data?.nextCursor ?? null);
      setHasMore(Boolean(data?.hasMore));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [buildHeaders, loading, nextCursor, selectedProjectId, selectedTags]);

  useEffect(() => {
    void fetchFirstPage();
  }, [fetchFirstPage]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.fileName ?? "").toLowerCase().includes(q));
  }, [items, search]);

  return (
    <SidebarInset>
      <SiteHeader title="Image Render History" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Past image renders</CardTitle>
              <div className="text-sm text-muted-foreground">
                Rendered images are stored separately from uploaded media files.
              </div>
            </div>
            <Button variant="outline" onClick={fetchFirstPage} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Project</div>
                <Select
                  value={selectedProjectId}
                  onValueChange={(v) => setSelectedProjectId(v)}
                  disabled={projectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={projectsLoading ? "Loading..." : "All projects"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-1">
                <div className="text-sm font-medium">Tags</div>
                <TagMultiSelect
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  label=""
                  required={false}
                  showCreateNew={false}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Search</div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by filename..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredItems.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading..." : "No image renders found."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((r) => (
              <div
                key={r.id}
                className="group rounded-lg border bg-background overflow-hidden"
              >
                <div className="relative aspect-video bg-muted">
                  {r.downloadUrl ? (
                    <img
                      src={r.downloadUrl}
                      alt={r.fileName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                      No image URL
                    </div>
                  )}
                  {r.downloadUrl && (
                    <a
                      href={r.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2 right-2 rounded-md bg-white/80 p-2 opacity-0 transition-opacity group-hover:opacity-100"
                      title="Open"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4 text-neutral-800" />
                    </a>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-sm font-medium truncate" title={r.fileName}>
                    {r.fileName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.projectId && (
                      <Badge variant="secondary" className="text-xs">
                        {projectNameById.get(r.projectId) ?? r.projectId}
                      </Badge>
                    )}
                    {(r.tags ?? []).slice(0, 6).map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        #{t}
                      </Badge>
                    ))}
                    {(r.tags ?? []).length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{(r.tags ?? []).length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}

