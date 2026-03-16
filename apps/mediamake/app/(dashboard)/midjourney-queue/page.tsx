"use client";

import { useEffect, useMemo, useState } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowJob } from "@/hooks/useWorkflowJob";
import { useSession } from "@/components/session-provider";

type QueueStatus = "pending" | "triggered" | "saved" | "completed" | "failed" | "cancelled";

interface ProjectOption {
  id: string;
  displayName: string;
}

interface QueueItem {
  id: string;
  clientId: string;
  projectId: string | null;
  prompt: string;
  priority: number;
  tags: string[];
  status: QueueStatus;
  jobId: string | null;
  errorMessage: string | null;
  folder: string | null;
  triggeredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function buildMidjourneyJobLinks(jobId: string, folder?: string | null): string[] {
  const folderParam = folder && folder.trim() ? folder.trim() : "default";
  return [0, 1, 2, 3].map(
    (i) => `https://www.midjourney.com/jobs/${jobId}?index=${i}&folder=${encodeURIComponent(folderParam)}`,
  );
}

interface QueueListResponse {
  items: QueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ALL_STATUSES: QueueStatus[] = [
  "pending",
  "triggered",
  "saved",
  "failed",
  "cancelled",
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function statusVariant(status: QueueStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "pending":
      return "outline";
    case "triggered":
      return "secondary";
    case "saved":
      return "default";
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "cancelled":
      return "outline";
    default:
      return "outline";
  }
}

export default function MidjourneyQueuePage() {
  const session = useSession();
  const [prompt, setPrompt] = useState("");
  const [priority, setPriority] = useState<string>("1");
  const [projectId, setProjectId] = useState<string>("default");
  const [tagsInput, setTagsInput] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [minPriority, setMinPriority] = useState<string>("");
  const [maxPriority, setMaxPriority] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<QueueStatus[]>(["pending", "triggered", "saved"]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"createdAt" | "priority" | "triggeredAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [imagesByJobId, setImagesByJobId] = useState<Record<
    string,
    { filePath: string; id: string }[]
  >>({});

  const { trigger: triggerMidjourneyImport, loading: importingLoading } = useWorkflowJob({
    type: "worker",
    workerId: "midjourney-import",
    pollIntervalMs: 10000,
    pollTimeoutMs: 900_000,
    autoPoll: false,
  });

  // Load projects for dropdown
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setProjectsLoading(true);
        const res = await fetch("/api/project");
        if (!res.ok) {
          setProjects([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(
            data.map((p: any) => ({
              id: p.id,
              displayName: p.displayName,
            })),
          );
        } else {
          setProjects([]);
        }
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Load available tags for tag selection
  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await fetch("/api/tags");
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableTags(
            data
              .map((t: any) => t.id || t.displayName || "")
              .filter((t: string) => typeof t === "string" && t.trim() !== "")
              .sort(),
          );
        }
      } catch {
        // ignore
      }
    };

    loadTags();
  }, []);

  const loadQueue = async (pageToLoad: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pageToLoad.toString());
      params.append("limit", "20");
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      if (statusFilter.length > 0 && statusFilter.length < ALL_STATUSES.length) {
        params.append("status", statusFilter.join(","));
      }

      if (projectId && projectId !== "default") {
        params.append("projectId", projectId);
      }

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (minPriority.trim()) {
        params.append("minPriority", minPriority.trim());
      }

      if (maxPriority.trim()) {
        params.append("maxPriority", maxPriority.trim());
      }

      const res = await fetch(`/api/midjourney-queue?${params.toString()}`);
      if (!res.ok) {
        console.error("Failed to fetch midjourney queue");
        return;
      }

      const data: QueueListResponse = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error("Error fetching midjourney queue:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, minPriority, maxPriority, statusFilter, projectId, sortBy, sortOrder]);

  useEffect(() => {
    loadQueue(page);
  }, [page, search, minPriority, maxPriority, statusFilter, projectId, sortBy, sortOrder]);

  const handleCreateRequest = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const numericPriority = parseInt(priority, 10);
    const finalPriority = Number.isNaN(numericPriority) ? 1 : numericPriority;

    let tags: string[] =
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) || [];

    if (selectedTags.length > 0) {
      tags = Array.from(new Set([...tags, ...selectedTags]));
    }

    const body: any = {
      prompt: trimmedPrompt,
      priority: finalPriority,
      tags,
      folder: null as string | null,
    };

    if (projectId && projectId !== "default") {
      body.projectId = projectId;
    } else if (projectId === "default") {
      body.projectId = "default";
    }

    try {
      const res = await fetch("/api/midjourney-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error("Failed to create midjourney queue item");
        return;
      }

      setPrompt("");
      setTagsInput("");
      setPriority("1");
      setIsRefreshing(true);
      await loadQueue(1);
      setPage(1);
    } catch (err) {
      console.error("Error creating midjourney queue item:", err);
    }
  };

  const toggleStatus = (status: QueueStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const statusSummary = useMemo(() => {
    const counts: Record<QueueStatus, number> = {
      pending: 0,
      triggered: 0,
      saved: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    items.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [items]);

  const fetchImagesForJob = async (jobId: string, projectId: string | null, clientId: string) => {
    if (!jobId || imagesByJobId[jobId]) return;
    try {
      const params = new URLSearchParams();
      params.append("contentType", "image");
      params.append("contentSource", "midjourney");
      params.append("midjourneyJobId", jobId);
      params.append("sort", "createdAt");
      params.append("order", "asc");
      params.append("limit", "4");

      const res = await fetch(`/api/media-files?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !Array.isArray(data.files)) return;

      const files = data.files;

      if (files.length > 0) {
        setImagesByJobId((prev) => ({
          ...prev,
          [jobId]: files.map((f: any) => ({
            filePath: f.filePath,
            id: String(f._id ?? f.filePath),
          })),
        }));
      }
    } catch (err) {
      console.error("Failed to load midjourney images:", err);
    }
  };

  return (
    <SidebarInset>
      <SiteHeader title="Midjourney Request Queue" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {/* Create request form */}
            <Card className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Create Midjourney Request</h2>
                <p className="text-sm text-muted-foreground">
                  Add prompts to the queued request list with priorities and project context.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want Midjourney to generate..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Input
                    type="number"
                    min={1}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher numbers are processed first.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <Select
                    value={projectId}
                    onValueChange={(value) => setProjectId(value)}
                    disabled={projectsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          projectsLoading ? "Loading projects..." : "Select a project"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        Stocksearch (shared namespace)
                      </SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose which project the generated images will belong to.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma-separated tags (optional)"
                />
                {availableTags.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Click to add or remove tags:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <Badge
                            key={tag}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer text-[11px]"
                            onClick={() => {
                              setSelectedTags((prev) =>
                                prev.includes(tag)
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag],
                              );
                            }}
                          >
                            {tag}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  onClick={handleCreateRequest}
                  disabled={!prompt.trim()}
                >
                  Add to queue
                </Button>
                <div className="text-xs text-muted-foreground">
                  {total} total queued items (across filters)
                </div>
              </div>
            </Card>

            {/* Queue table and filters */}
            <Card className="p-4 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Queued Requests</h2>
                  <p className="text-sm text-muted-foreground">
                    View and filter all Midjourney requests for this client.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRefreshing(true);
                    loadQueue(page);
                  }}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>

              {/* Filters */}
              <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search prompts..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.map((status) => {
                      const selected = statusFilter.includes(status);
                      const isFailed = status === "failed";
                      const baseClasses =
                        "cursor-pointer capitalize text-xs px-2.5 py-1.5 border rounded-full transition-colors";
                      const selectedClasses = isFailed
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-black text-white border-black";
                      const unselectedClasses = isFailed
                        ? "bg-background text-destructive border-destructive/40"
                        : "bg-background text-foreground border-border";

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => toggleStatus(status)}
                          className={cn(
                            baseClasses,
                            selected ? selectedClasses : unselectedClasses,
                          )}
                        >
                          {status}
                          {statusSummary[status] ? (
                            <span className="ml-1 text-[10px] opacity-75">
                              {statusSummary[status]}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Min priority</label>
                      <Input
                        type="number"
                        value={minPriority}
                        onChange={(e) => setMinPriority(e.target.value)}
                        placeholder="Any"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Max priority</label>
                      <Input
                        type="number"
                        value={maxPriority}
                        onChange={(e) => setMaxPriority(e.target.value)}
                        placeholder="Any"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Sort by</label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={sortBy}
                        onValueChange={(value) =>
                          setSortBy(value as "createdAt" | "priority" | "triggeredAt")
                        }
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt">Created at</SelectItem>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="triggeredAt">Triggered at</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  No requests found for the current filters.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-3">
                    {items.map((item) => {
                      const midjourneyLinks: string[] =
                        item.jobId && buildMidjourneyJobLinks(item.jobId, item.folder)
                          ? buildMidjourneyJobLinks(item.jobId, item.folder)
                          : [];
                      const images =
                        item.jobId && imagesByJobId[item.jobId]
                          ? imagesByJobId[item.jobId]
                          : [];

                      if (item.jobId) {
                        fetchImagesForJob(
                          item.jobId,
                          item.projectId,
                          session?.clientId ?? item.clientId ?? "default",
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className="border rounded-lg p-4 flex flex-col gap-3 bg-card"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1 md:max-w-xl">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  P{item.priority}
                                </Badge>
                                <Badge variant={statusVariant(item.status)} className="capitalize">
                                  {item.status}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {item.projectId ?? "default"}
                                </span>
                              </div>
                              <div className="text-sm font-medium line-clamp-3">
                                {item.prompt}
                              </div>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.slice(0, 4).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[11px]">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {item.tags.length > 4 && (
                                    <Badge variant="secondary" className="text-[11px]">
                                      +{item.tags.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {item.errorMessage && (
                                <div className="mt-1 text-[11px] text-destructive">
                                  {item.errorMessage}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">Created:</span>{" "}
                                {formatDateTime(item.createdAt)}
                              </div>
                              <div>
                                <span className="font-medium">Triggered:</span>{" "}
                                {formatDateTime(item.triggeredAt)}
                              </div>
                              <div>
                                <span className="font-medium">Updated:</span>{" "}
                                {formatDateTime(item.updatedAt)}
                              </div>
                              {item.jobId && (
                                <div className="mt-1">
                                  <span className="font-medium">Job:</span>{" "}
                                  <span className="break-all text-[11px]">{item.jobId}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {item.jobId && (
                            <div className="flex flex-wrap gap-2">
                              {midjourneyLinks.map((href: string, idx: number) => (
                                <Button
                                  key={href}
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  className="text-[11px] px-2 py-1"
                                >
                                  <a href={href} target="_blank" rel="noreferrer">
                                    Midjourney {idx + 1}
                                  </a>
                                </Button>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            {item.status === "saved" && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    Imported images
                                  </span>
                                  {item.jobId && images.length === 0 && (
                                    <span className="text-[11px] text-muted-foreground">
                                      Loading images...
                                    </span>
                                  )}
                                </div>
                                {images.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {images.map((img) => (
                                      <a
                                        key={img.id}
                                        href={img.filePath}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block h-20 w-20 overflow-hidden rounded-md border bg-muted"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={img.filePath}
                                          alt="Imported"
                                          className="h-full w-full object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground">
                                    No images imported yet.
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  !item.jobId ||
                                  item.status !== "triggered" ||
                                  (importingLoading && importingId === item.id)
                                }
                                onClick={async () => {
                                  if (!item.jobId) return;
                                  setImportingId(item.id);
                                  try {
                                    await triggerMidjourneyImport({
                                      queueItemId: item.id,
                                      jobId: item.jobId,
                                      prompt: item.prompt,
                                      tags: item.tags || [],
                                      projectId: item.projectId,
                                      clientId: session?.clientId ?? item.clientId ?? "default",
                                      folder: item.folder,
                                    });
                                    await loadQueue(page);
                                  } catch (err) {
                                    console.error("Failed to trigger midjourney import worker:", err);
                                  } finally {
                                    setImportingId(null);
                                  }
                                }}
                              >
                                {importingLoading && importingId === item.id
                                  ? "Importing..."
                                  : "Import images"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await fetch(`/api/midjourney-queue`, {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        prompt: item.prompt,
                                        priority: item.priority,
                                        projectId: item.projectId ?? undefined,
                                        tags: item.tags ?? [],
                                        folder: item.folder ?? undefined,
                                      }),
                                    });
                                    await loadQueue(page);
                                  } catch (err) {
                                    console.error("Failed to re-add midjourney queue item:", err);
                                  }
                                }}
                              >
                                Re-add to queue
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const newPriorityRaw = window.prompt(
                                    "New priority value:",
                                    String(item.priority),
                                  );
                                  if (!newPriorityRaw) return;
                                  const newPriority = parseInt(newPriorityRaw, 10);
                                  if (!Number.isFinite(newPriority)) return;
                                  try {
                                    await fetch(`/api/midjourney-queue/${item.id}`, {
                                      method: "PATCH",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ priority: newPriority }),
                                    });
                                    await loadQueue(page);
                                  } catch (err) {
                                    console.error("Failed to update priority:", err);
                                  }
                                }}
                              >
                                Change priority
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive"
                                onClick={async () => {
                                  const confirmed = window.confirm(
                                    "Remove this queue item? This cannot be undone.",
                                  );
                                  if (!confirmed) return;
                                  try {
                                    await fetch(`/api/midjourney-queue/${item.id}`, {
                                      method: "DELETE",
                                    });
                                    await loadQueue(page);
                                  } catch (err) {
                                    console.error("Failed to delete queue item:", err);
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Page {page} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}

